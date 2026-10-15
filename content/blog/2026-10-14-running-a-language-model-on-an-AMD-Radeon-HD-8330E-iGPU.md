<!-- title: Running a language model on an AMD Radeon HD 8330E iGPU -->

### What? 

Running Qwen2.5-0.5B-Instruct-GGUF:Q8_0 on a AMD Radeon HD 8330E at 7.1 generated tokens per second

This GPU is a weaker cousin of the GPU on the (2013) Xbox One. 

### HW Specs
This is running on a Dell WYSE 7020 Thin Client ZX0Q, which I use as a light-duty server
- Quad-core AMD GX-415GA at 1.5 GHz
- AMD Radeon HD 8330E integrated GPU, using what looks like slightly under 512MB for VRAM
- 16 GB DDR3 (2x8GB SODIMM, running at 1600 MT/s, 64 bit data bus width)


### Why? 

To see if I can! All that GPU hardware is just sitting idle anyways...

### How?
Well, I had an LLM talk me through it...

The neat thing is, llama.cpp can work with Vulkan 1.2, and this GPU supports it. In fact, a lot of GPUs, even some integrated GPUs like this one, support it.

For starters, I got this up and running in Docker on the CPU, but that only got 1 token per second, so I moved on to figuring out how to switch to the `vulkan` version of the llama server image. 

1. Install firmware-amd-graphics and radeontop for monitoring with `sudo apt install firmware-amd-graphics radeontop`
2. set linux kernel modprobe configs to use the new amd driver (and _not_ the radeon driver)

```
# bash
echo 'options amdgpu cik_support=1' | sudo tee /etc/modprobe.d/amdgpu.conf
echo 'blacklist radeon' | sudo tee /etc/modprobe.d/radeon.conf
sudo update-initramfs -u -k all
sudo reboot
```

After reboot, `lsmod | grep amdgpu` should show several `amdgpu` entries (and presumably no radeon entries).

3. I decided to place the whole thing in a docker compose file, since nearly everything else on the server is in docker compose, so I ended up with the following 

```
# docker-compose.yml

services:
    llama-serve:
      command: [          
          '-hf', 'bartowski/Qwen2.5-0.5B-Instruct-GGUF:Q8_0', # about 531 megabytes
          '-c', '32768',
          '--host', '0.0.0.0',
          '--port', '8080',
          '-ngl', '999',
          '-np', '2',
          '-ctk', 'f16',
          '-ctv', 'f16',
          '--temp', '1.0',
          '--top-k', '40',
          '--top-p', '0.9',
          '--min-p', '0.05',
          '--repeat-penalty', '1.05',
          '--frequency-penalty','1.05',
          '--presence-penalty','1.05',
          '--kv-unified',
          '-fa', 'on',
          '--no-mmproj-offload',
          '--reasoning', 'off']

      image: 'ghcr.io/ggml-org/llama.cpp:server-vulkan' 
      restart: no    #turned off to avoid the countainer thrashing if GPU unavailable
      mem_limit: 10G
      cpus: 2
      environment:
          # where llama server will store 
          - LLAMA_CACHE=/root/.cache/llama.cpp
      devices:
          - /dev/dri
      ports:
        - target: 8080 
          published: 8090 
          protocol: tcp

      volumes:         
          - '/host/path/to/models:/root/.cache/llama.cpp' 

          # the container's side of the path is managed by the LLAMA_CACHE variable described above
          # I believe LLAMA_CACHE needs to be defined 
          # for the `-hf` hugging face repository naming convention to be usable.
 
```

_Note:  I had tried LiquidAI/LFM2.5-350M and that ran at about 20 generated tokens per second, but it really **really** expects to use tool-calls and I just had no tools for it to call, so it would refuse to answer without a temperature of '2.0' ... Qwen 0.5B is bigger and slower to generate tokens on this hardware, but is far more willing to jump in and answer the user's question without tooling._


### Results

It worked!

In the end, Qwen2.5-0.5B , with Q8_0 model quantization,  f16 K/V cache quantization, and a max context of 32,768 tokens, gives me 7.1 tokens generated per second early in the conversation.

I tried smaller quants and the intelligence rapidly degraded, so I left the model and KV cache quantization as large as I could manage.

Running `sudo radeontop` does indeed show memory usage at 467M / 491M VRAM (95.21%) , 694M / 7705M GTT (9.00%), and a graphics pipe utilization bouncing between 93% and 97% when generating tokens . Looking at docker stats, the container shows a memory utilization (at low context usage) of 130MB . Apparently the video RAM (VRAM) and Graphics Translation Table (GTT) don't count towards docker's listed memory usage. Something to keep in mind I guess, not to assume that the docker stats for the container tell the whole story.
