<!-- title: Running a code companion on a 2080 Ti -->



I've been looking for a model that can read code quickly and provide a summary. Mostly because at the moment I'm often digging into unfamiliar code in an unfamilar language and trying to get my bearings. *("What on earth does this code do?")* I am not looking for a wizard, just a helpful chatbot.

*Blurb: NeoHorse-1-4B is post-trained from Qwen3.5-4B for text-based agent harnesses, tool use, coding, and instruction following.*

My hardware:

    Intel i5-7600K 3.8GHz (quad-core)
    48 GB DDR4 running at 2133 MT/s (recently expanded from 16 GB, yay!)
    Nvidia RTX 2080 Ti (11 GB vram)

Using the Zed editor (and using the default prompt provided by Zed), I asked Neohorse repeatedly to explain various files worth of Beyond All Reason's Lua code to me, until I hit around 100k tokens of context consumed. By then I was **still** getting **775** prompt-processing t/s followed by **28** generated t/s. Very useable!

Max context was configured at 128k tokens. Model and kv quantized at q8\_0

My experience: I didn't ask it to write code, just read some code and either explain it or point out the interesting bits. The bits it pointed out were indeed interesting and the explanations were in the right ballpark. Not always spot on, and it didn't catch some things that looked wrong until I pointed it out (i.e. [https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/unit\_transportee\_hider.lua#L100](https://github.com/beyond-all-reason/Beyond-All-Reason/blob/master/luarules/gadgets/unit_transportee_hider.lua#L100) looks like it could in theory go below zero and fail to register a full transport ).

NeoHorse was able to search gitHub when local tool calls "failed" (it failed to run `git --no-pager diff master`, instead confusing it with "query the GitHub API" even though I literally gave it that exact command to run).

Not the most clever model (I'm used to OpenRouter DeepSeek v4 Flash or Kimi 2.7 Code) but hey, it runs quick on my machine and gives me a basic tool for code review and research with a usable context window. I'll definitely keep it around for light use and initial exploration.

llama serve command:

    llama serve -ngl 999 -np 1 \
    -ctk q8_0 -ctv q8_0 \
    -c 128000   \
    --temp 0.6  --top-p 0.95    \
    --top-k 20  --min_p 0.0 \
    --presence-penalty 1.5 --repeat-penalty 1.0  \
    -fa on --no-mmproj-offload    \
    --model ~/.cache/huggingface/hub/models--TokenRhythm--NeoHorse-1-4B-GGUF/snapshots/3c5d58ca82e580b5b0b3ce6eeffd34ac7d0fd95a/NeoHorse-1-4B-Q8_0.gguf \
    --jinja --chat-template-file  ~/neohorse_chat_template.jinja.txt 

HuggingFace link: [https://huggingface.co/TokenRhythm/NeoHorse-1-4B-GGUF](https://huggingface.co/TokenRhythm/NeoHorse-1-4B-GGUF) q8\_0 quant is listed as 4.48 GB

nvidia-smi reports that llama is using 7312MiB of VRAM to do this.

Thanks to `u/zippydazoop` for mentioning NeoHorse-1-4B!

The original post:  [https://www.reddit.com/r/LowEndLocalAI/comments/1wdhp3a/i\_tested\_20\_local\_models\_on\_a\_4\_gb\_laptop\_gpu/](https://www.reddit.com/r/LowEndLocalAI/comments/1wdhp3a/i_tested_20_local_models_on_a_4_gb_laptop_gpu/)
