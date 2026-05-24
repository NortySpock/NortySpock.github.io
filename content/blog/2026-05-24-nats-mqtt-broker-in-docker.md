<!-- title: Ephemeral NATS MQTT broker in Docker-->

### Why?

Though I had gotten Mosquitto MQTT broker [working](/blog/mosquitto-mqtt-broker-in-docker/) and it was successfully passing messages back and forth from Home Assistant, I still had nagging concerns and annoyances. 
   > 1. Mosquitto is written in C and C++, which have a history of memory safety problems. I wondered if there were brokers written in a memory-safe language. 
   > 2.  I lacked easy insight into _how many_ messages were passing through my smarthome. In theory I could have wired this up in Home Assistant, but I wanted to be able to see this information from the broker itself.


### Goals and Constraints
So, still having the limitations of running on a Raspberry Pi 4 with limited RAM, I looked for a small broker that was easy to run, served MQTT (for Home Assistant), and offered some broker-level throughput statistics. 

Similar to the previous Mosquitto broker, I wanted this to be ephemeral (nearly-stateless) to reduce SD card / disk wear. If I lost a few Home Assistant messages due to the broker restarting, I'm perfectly fine with that. If I do some load testing, I'd rather not have a million messages written to disk, I'd rather see the broker rate-limit or drop messages. Also, removing persistence means I can fix any "weird" behavior (caching issues, trapped messages,etc) by just rebooting the container. This makes troubleshooting easier.

### About NATS
[NATS](https://github.com/nats-io/nats-server) is a message broker written in Go, it supports single-config-file setup, it has a convenient sidecar tool that serves up a Prometheus-compatible metrics page, and it has a MQTT 3.1.1 mode (as long as you enable 'JetStream', the durable message queue). Also, the documentation is pretty easy to read. Cool!

### Using the container to enforce stateless behavior
MQTT-mode in NATS requires write-to-disk via their JetStream service[1]. I'm going to use Docker tempfs for that volume so that NATS thinks it has a durable write location, but it actually gets reset when the container restarts.

### Setup process:

_Reminder: MQTT usernames/passwords are sent in clear text, so either accept that risk or enable Transport Level Security (TLS)_



1. Write the docker-compose file

```
version: "2.4"
services:
  nats-prometheus-exporter: #this serves up a `/metrics` page so Prometheus can scrape it for tracking metrics.
    container_name: nats-prometheus-exporter
    mem_limit: 100m
    cpus: 1
    image: natsio/prometheus-nats-exporter:latest
    ports:
      - "7222:7777"
    command: '-varz -routez -gatewayz "http://nats:8222"' # which NATS metrics pages get served to `/metrics`
    networks: ["nats"]

    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"
    restart: unless-stopped
    depends_on:
      - nats

  nats:
    container_name: nats
    mem_limit: 300m
    cpus: 2
    image: nats:latest
    ports:
      - "4222:4222"
      - "6222:6222"
      - "8222:8222"
      - "1883:1883" #MQTT port
    command: "-c nats.conf"
    networks: ["nats"]

    volumes:
        - type: bind
          read_only: true
          source: ./nats.conf
          target: /nats.conf

        - type: tmpfs # not actually retaining data, just faking it for MQTT support
          read_only: false
          target: /jetstream-data
          tmpfs:
            size: 100M #jetstream should be configured smaller than this, but this limit should save us if NATS misbehaves



    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Chicago
      - NATS_USER=${NATS_USER}
      - NATS_PASSWORD=${NATS_PASSWORD}

    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"        
    restart: unless-stopped

networks:
  nats:
    name: nats

```

2. Write the nats config file 

_The main documentation is [here](https://docs.nats.io/), the NATS-MQTT config documentation is [here](https://docs.nats.io/running-a-nats-service/configuration/mqtt/mqtt_config)._

```
server_name: helium #your custom_server_name, must be unique across cluster
port: 4222
http_port: 8222
logfile_size_limit: 20971520  # 20 MB converted to bytes
max_pending: 20971520 # 20 MB converted to bytes

jetstream {
   store_dir: jetstream-data
   max_memory_store: 20971520 # 20 MB converted to bytes
   max_file_store: 20971520 # 20 MB converted to bytes
}

# I did get raft clustering working very easily across three nodes [2], but I don't need it.
# but I don't need it, so it is commented out
#cluster {
#  name: main
#  port: 6222
#  routes: ["nats://192.168.1.12:6222","nats://192.168.1.13:6222"]
#}

authorization {
  mqtt_perms = {
            publish = [">"]
            subscribe = [">"]
        }
  users =
  [
    {user: "nats_username_for_access1", password: "cleartext_password_redacted1", permissions: $mqtt_perms},
    {user: "nats_username_for_access2", password: "cleartext_password_redacted2", permissions: $mqtt_perms},
    {user: "nats_username_for_access3", password: "cleartext_password_redacted3", permissions: $mqtt_perms},
    {user: "nats_username_for_access4", password: "cleartext_password_redacted4", permissions: $mqtt_perms},
]
}

# See above; it is easy to create a few different users that you can set up for connection to the broker
# then each device uses there username / password to acess the broker and you can see "which device sent a message"
# or add new devices. 
# While cleartext passwords are not great, I think it's fine for this low-security-requirements use-case here
# I have not yet explored actually isolating users and accounts via permissions.
# but it looks easy enough to create a permission that allows certain users to talk only on certain subjects / topics / channels / queues


mqtt {
  port: 1883
  ack_wait: "1m"
  max_ack_pending: 100
}


```

3. Fire it up and check to see if messages are flowing!

_Obviously this required shutting down the original Mosquitto broker, but with some minor tweaks it worked._

NATS was configured to show its info page on port 8222, and it has a snappy list of links to the current stats including total messages sent (`/varz`),  current connections (`/connz`) , JetStream durability (`/jsz`) , subscriptions (`/subsz`). 

Finally, my "how many messages are sent per minute?" question could be answered! (At the time of writing, the uptime is 1 hour 15 minutes, and it has served 479 messages, so an average of 6.4 mesages per minute.)

I don't know what I expected the number to be (9 per second? 2 per hour?) but it is cool to now be able to have a feel for how much message traffic flows through the broker itself.

### Upcoming

In a later post I plan to write about how I am also putting the nats-prometheus-exporter sidecar to use serving these numbers up so they can be scraped into a central metrics exporter. But that is a post for another day.


--------------------

Footnotes:

[1] JetStream does sound like a simple and easy-to-use durable message queue. I just do not want it to be persistent in this particular case.

[2] I did get clustering working, I am just choose not to use it at this time. This was because voting for a new cluster leader causes a few seconds of downtime (I think). Also I don't need a high-availability message broker, because if the Home Assistant node goes down, there's no real point in my current system for having a message broker. Nothing else normally reads from the message broker.
