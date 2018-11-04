# node-subg_rfspy

Node module used to communicate over SPI with subg_rfspy firmware on CC111x radio chip.

[subg_rfspy firmware](https://github.com/ps2/subg_rfspy)


## constructor
The constructor accepts an optional settings object to configure the instance.

```javascript
{
  chipSelect: 0,
  clockDivider: 6400, // 400MHz / 6400 = 62.5KHz for Raspberry Pi Zero W
  dataMode: 0,
  resetGPIO: 4
}
```
## user methods

These are the methods commonly used by an application.


### reset
(Promise)
Command the firmware to perform a reset.


### reboot
(Promise)
Toggle the hardware reset pin.

### getPackets
(Promise)
Get an array of packets received by the radio.

### sendPacket
(Promise)
Send a data packet from the radio.

### getState
(Promise)
Get the firmware state.

### readVersion
(Promise)
Get the firmware version.

### setLED
(Promise)
Set an LED state.


## low level methods
These are methods used within the SubgRFSpy class but are available to the user
application.

### readComms
(Promise)
Read waiting data in the radio receive buffer.

### extractPackets
Extract data packets from a stream of data received by the radio.

### setReset
Set the hardware reset pin state.

### sendCommand
(Promise)
Send a command to the firmware.

### transferByteArray
(Promise)
Transfer an array of bytes over the SPI.

### transferByte
(Promise)
Transfer a byte over the SPI.

### reverseByte
Reverse the endianness of the bits in a byte.

### intToLEByteArray
Convert an integer into a little endian 4 byte array.

### wait
(Promise)
Wait n number of millisseconds.
