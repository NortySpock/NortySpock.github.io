<!-- title: How to make your Tasmota smart lightbulb turn on reliably -->

### Huh?

For those not in the know, many smart lightbulbs remember their previous setting. If you use software to turn the light off at the bulb, then flip the switch on the wall off, the next person who flips the wall switch back on will be disappointed with no light. This is annoying when it happens to you once a week.

### Tasmota Rules

My light bulbs run Tasmota, and in Tasmota, from the console in the web UI, you can set up "rules" (it is basically a trigger).

And then, you can queue a series of steps with `Backlog`. 

So, we can create a rule that will trigger on boot, that will run a series of steps:

`Rule1 ON Power1#Boot DO Backlog Dimmer0 30; Power1; ENDON;`

In English this reads _Rule1 triggers ON boot (startup, like, when power flows in from the wall), and has a backlog (queue) of commands: first set the target brightness to 30 percent, then turn the lightbulb on._

And then to enable the rule (it apparently starts disabled?), you run `Rule1 1`

The 30% brightness is so that if we flip the light on early in the morning before the sun is up, we are not blinded with full power.

Additionally, we realized we also want to default the color back to a warm-white, because if the lightbulb was previously set to a different color (red, blue, etc) then we would have a very off-color morning. 

You can query your available color range with `CTRange` (which for me returns 153-500), and then you can set the color temperature of the light with `CT 499` or whatever you like. Lower numbers are colder, higher numbers are warmer. Not sure why the numbers are not in Kelvin (apparently this color temperature range is measured in "mireds").

Again, to enable the rule you must then run `Rule1 1`

### The fix to make the smartbulb turn on like a normal light

_30 percent brightness, warmest white possible_

_In the WebUI, click the console button, and then run these two commands_
```
Rule1 ON Power1#Boot DO Backlog Dimmer0 30; CT 499; Power1; ENDON;

Rule1 1
```

### Disabling the rule

If for some reason you need to disable the rule, run `Rule1 0`

### Useful links

[Tasmota Rules](https://tasmota.github.io/docs/Rules/)

[An example of Power1 Boot](https://tasmota.github.io/docs/P1-Smart-Meter/#tasmota-settings)

[Tasmota Light settings](https://tasmota.github.io/docs/Lights/#with-webui)
