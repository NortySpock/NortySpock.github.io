<!-- title: Back to Mosquitto MQTT for v5-->

### Why?
My Home Assistant instance started throwing warnings about an upcoming deprecation of support for MQTT protocol version 3.1.1 and migration to MQTT protocol version 5 . (I will call them v3.1.1 and v5 in this rest of this blog for simplicity) 

I have not seen reasoning why this is, just [this PR](https://github.com/home-assistant/core/pull/172404/changes) that says it needs to be done and this other change says [your broker probably supports it.](https://github.com/home-assistant/home-assistant.io/pull/45178) 

Well, my current, non-standard broker of [nats](/blog/nats-mqtt-broker-in-docker) does not support v5, so I apparently need to switch back to Eclipse Mosquitto.

While I'm doing that, I might as well try to fix some of the minor warnings I was getting, such as:

```
Warning: File /mosquitto/config/mosquitto.passwd has world readable permissions. Future versions will refuse to load this file.
To fix this, use chmod 0700 /mosquitto/config/mosquitto.passwd.
Warning: File /mosquitto/config/mosquitto.passwd owner is not mosquitto. Future versions will refuse to load this file.To fix this, use chown mosquitto /mosquitto/config/mosquitto.passwd.
Warning: File /mosquitto/config/mosquitto.passwd group is not mosquitto. Future versions will refuse to load this file.
```

### Constraints
I figured I needed to support both v5 and v3.1.1 , as I don't know if all my tasmota devices speak v5. So the broker would need to be able to speak both versions. 

I assumed this would be difficult do both "speak both versions" and also "have both protocols be transparently bridged" but it turned out to be the default behavior for Eclipse Mosquitto. Nonetheless, I wanted to make it explicit in the configuration.

### Switching back to Eclipse Mosquitto
For details on the original setup, refer back to [Ephemeral Mosquitto MQTT broker in Docker](/blog/mosquitto-mqtt-broker-in-docker/). 

To the mosquitto.conf , I added a single line to make the "accept all protocols" explicit. In the below line, "3" represents MQTT version 3, "4" represents MQTT version 3.1.1, and 5 represents "MQTT version 5".  

```
accept_protocol_versions 3, 4, 5
```

To assist in watching for permissions failures or devices failing to connect (indicating I had not migrated a password correctly from nats to eclipse-mosquitto), I added 
```
connection_messages true
```

### Fixing permissions warnings, first attempt
While I was rebooting the container to verify this worked, I kept getting the warnings mentioned at the top about "future versions will refuse to load this file". So to save me that arbitrary pain later, I decided to tackle that issue now. My first attempt of just running whatever the warning recommended to run (such as `chmod 0700 /mosquitto/config/mosquitto.passwd` and `chown root:root  /mosquitto/config/mosquitto.passwd` ) eventually got me into a state where the container would restart-loop because it lacked permission to access the password file. So, lesson learned, the error message may have a suggestion but it may not be the best suggestion. 

### Fixing permissions warnings, second attempt
Since this whole thing ran in a docker container, I figured the solution was probably going to need to be handled by Docker. If that's not your situation, this may not apply to you. But what I ended up doing was taking a suggestion from an LLM (Kimi 2.7 Code), which was to create a small Dockerfile that took the base image, baked the password file into the image with the correct permissions, and removed the password from the mounted volume

```
# (filename: Dockerfile ) 
FROM eclipse-mosquitto:latest
COPY --chown=1883:1883 password-mosquitto.passwd /mosquitto/config/mosquitto.passwd
RUN chmod 0600 /mosquitto/config/mosquitto.passwd
```

```
# (filename: docker-compose.yaml)
version: '2.4'
services:
  mqtt-mosquitto:    
    image: my-mqtt-mosquitto:local
    build:
      context: .
    container_name: mqtt-mosquitto
    mem_limit: 20m
    cpus: 1

    volumes:
      - ./config-mosquitto.conf:/mosquitto/config/mosquitto.conf:ro

    network_mode: host

    restart: unless-stopped

    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"

```

This solved the warnings, but has the awkward effect of permanently baking your passwords into the image... So, let's press on.

### Fixing permissions warnings, third attempt
I told this Kimi 2.7 Code LLM that (a) I wanted this file to be visible from a bind mount or volume so that I could edit and save it if necessary and (b) that I had seen another Docker Compose file that spelled out the user UID and GID with 

```
environment:
  - PUID=1883
  - PGID=1883
  - TZ=America/Chicago
```

The LLM queried around the eclipse-mosquitto repository, found the [docker-endpoint.sh file](https://github.com/eclipse-mosquitto/mosquitto/blob/master/docker/local/docker-entrypoint.sh), and suggested rewriting the entrypoint slightly to perform the permissions changes on startup. That seemed simple enough, especially when the LLM proposed the entire new file...

I did have to do some more tweaking since, at the end of the day, I want this to generally be read-only in all cases. I do not want the config or password database being edited by the broker. I still want this broker to be ephemeral and have no persisted state. So I settled on "serve the config and password database file as read-only to a temp folder, and have the docker-entrypoint.sh copy them from there and fix the permissions from inside the container". 

```
# (filename docker-entrypoint.sh)

#!/bin/ash
set -e

PUID=${PUID:-1883}
PGID=${PGID:-1883}

# to prevent permission-mangling on the host system
# we will serve the files read-only in tmp, then copy them to the desired location
# then change the permissions in the desired location
cp /tmp/config-mosquitto.conf /mosquitto/config/mosquitto.conf
cp /tmp/password-mosquitto.passwd /mosquitto/config/mosquitto.passwd


# Fix ownership and permissions on bind-mounted secrets
if [ -f /mosquitto/config/mosquitto.passwd ]; then
    chown ${PUID}:${PGID} /mosquitto/config/mosquitto.passwd
    chmod 0600 /mosquitto/config/mosquitto.passwd
fi

if [ -f /mosquitto/config/mosquitto.acl ]; then
    chown ${PUID}:${PGID} /mosquitto/config/mosquitto.acl
    chmod 0600 /mosquitto/config/mosquitto.acl
fi

# Preserve the original image's behavior for data/log directories
if [ -d /mosquitto/data ]; then
    chown -R ${PUID}:${PGID} /mosquitto/data 2>/dev/null || true
fi

if [ -d /mosquitto/log ]; then
    chown -R ${PUID}:${PGID} /mosquitto/log 2>/dev/null || true
fi

exec "$@"
```


```
#(filename Dockerfile)

FROM eclipse-mosquitto:latest
COPY --chmod=0755 docker-entrypoint.sh /docker-entrypoint.sh
```

```
#(filename docker-compose.yml)

version: '2.4'
services:
  mqtt-mosquitto:
    image: my-mqtt-mosquitto:local
    build:
      context: .
    container_name: mqtt-mosquitto
    mem_limit: 20m
    cpus: 1

    environment:
      - PUID=1883
      - PGID=1883
      - TZ=America/Chicago

    volumes:
      - ./config-mosquitto.conf:/tmp/config-mosquitto.conf:ro
      - ./password-mosquitto.passwd:/tmp/password-mosquitto.passwd:ro

    network_mode: host

    restart: unless-stopped

    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"
```

### Result

That, finally, appeared to work, without baking the password file into the image, without warnings, and without having the password file be hidden state that could leak back into the host system. I could see my tasmota devices connecting, Home Assistant could see them via the MQTT broker, and I confirmed that I could (again) turn lights on and off via Home Assistant. Home Assistant also no longer warned me about the MQTT version when I upgraded to 2026.7.4, and the MQTT integration did appear to report that it was using MQTT v5. So it seems like this worked.

Note: this final configuration of copying files inside the container will make it so that the previous trick of "editing the `/mosquitto/config/mosquitto.passwd` and saving it directly back via the docker bind mount" is no longer as trivial as changing the read-write status directly. You would have to instead have to set `/tmp/password-mosquitto.passwd` to be read-write in the docker-compose.yml ,  edit `/tmp/password-mosquitto.passwd` rather than `/mosquitto/config/mosquitto.passwd` with `mosquitto_passwd -b /tmp/password-mosquitto.passwd username password`, and reboot the entire container for the password file to "take". But I'd prefer this over having state creep into the broker over time every time I make a poorly-documented change. (sometimes called "drift" in the DevOps world, I hear).
