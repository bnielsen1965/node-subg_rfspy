# example script utilizing subgrfspy.js module

This is an example script that can be used to experiment with the subg_rfspy
firmware.

## run as root
Root permissions will be required to access the hardware. Use sudo when executing
the example...

> sudo node index.js command

## commands
Use the following commands with the example script...

### reset
Reset the firmware.
> sudo node index.js reset


### reboot
Reboot the radio hardware.
> sudo node index.js reboot


### get_state
Get the firmware state (replies with "OK").
> sudo node index.js get_state


### version
Get the firmware version (replies with a string, I.E. "subg_rfspy 0.8").


### leds_on
Turn all LEDs on.
> sudo node index.js leds_on


### leds_off
Turn all LEDs off.
> sudo node index.js leds_off


### led_on
Turn a specific LED on (requires an argument of 0 or 1 for the LED).
> sudo node index.js led_on 0


### led_off
Turn a specific LED off (requires an argument of 0 or 1 for the LED).
> sudo node index.js led_off 1


### ping
Ping another device that is running an echo_server.
> sudo node index.js ping [message [count]]

Optionally provide a message string for the ping and a count of the number of
ping attempts.
> sudo node index.js ping "The test string" 30

The final response is the success rate, I.E. "Success: 90%".


### echo_server
Run an echo server that will wait for packets and then echo them back. Used with
the ping command running on another device.
> sudo node index.js echo_server


### send_packet
Send a packet of data over the radio.
> sudo node index.js send_packet [message]

Optionally provide a custom message string to send.
> sudo node index.js send_packet "My packet"


### get_packets
Get all packets available on the radio.
> sudo node index.js get_packets
