

const RPIO = require('rpio');
const DEFAULTS = {
  chipSelect: 0,
  clockDivider: 6400, // 400MHz / 6400 = 62.5KHz for Raspberry Pi Zero W
  dataMode: 0,
  resetGPIO: 4
};
const CMD_GET_STATE = 0x01;
const CMD_GET_VERSION = 0x02;
const CMD_GET_PACKET = 0x03;
const CMD_SEND_PACKET = 0x04;
const CMD_RESET = 0x07;
const CMD_SET_LED = 0x08;


// define the class to communicate with the radio firmware
module.exports = class SubgRFSpy {
  constructor(settings) {
    this.rxBuff = []; // bytes read but not yet requested by client
    this.rxLen = 0; // number of bytes waiting to be read
    this.rxLenNext = false; // is the next received by the length of waiting bytes?
    this.settings = settings || {};
    RPIO.init({gpiomem: false});    /* Use /dev/mem for i²c/PWM/SPI */
    RPIO.init({mapping: 'gpio'});   /* Use the GPIOxx numbering */
    RPIO.spiBegin();

    // chip select
    // Value | Pin
    // ------|---------------------
    //   0   | SPI_CE0 (24 / GPIO8)
    //   1   | SPI_CE1 (26 / GPIO7)
    //   2   | Both
    RPIO.spiChipSelect(this.settings.chipSelect || DEFAULTS.chipSelect);
    RPIO.spiSetClockDivider(this.settings.clockDivider || DEFAULTS.clockDivider);

    // data mode
    // Mode | CPOL | CPHA
    // -----|------|-----
    //   0  |  0   |  0
    //   1  |  0   |  1
    //   2  |  1   |  0
    //   3  |  1   |  1
    RPIO.spiSetDataMode(this.settings.dataMode || DEFAULTS.dataMode);

    // configure GPIO for reset pin on TI CC1110 RF transciever
    RPIO.open(this.settings.resetGPIO || DEFAULTS.resetGPIO, RPIO.OUTPUT, RPIO.HIGH);
  }


  // reset radio firmware
  async reset() {
    await this.sendCommand(CMD_RESET);
    await this.wait(100);
  }


  // extract data packets from the recieve buffer
  extractPackets(rxBuff) {
    if (!rxBuff) { return []; }
    let packets = [];
    let packet = [];
    for (let bi = 0; bi < rxBuff.length; bi++) {
      if (rxBuff[bi] === 0x00) {
        if (packet.length > 2) {
          packets.push(packet.slice(2));
        }
        packet = [];
      }
      else {
        packet.push(rxBuff[bi]);
      }
    }
    return packets;
  }


  async getPackets(channel, receiveTimeout) {
    let data = [channel & 0xff].concat(this.intToLEByteArray(receiveTimeout));
    await this.sendCommand(CMD_GET_PACKET, data);
    await this.wait(receiveTimeout + 50);
    let rxBuff = await this.readComms();
    return this.extractPackets(rxBuff);
  }


  // send packet
  async sendPacket(channel, data, resendCount, resendDelay) {
    resendCount = resendCount || 0;
    resendDelay = resendDelay || 0;
    data = [channel & 0xff, resendCount & 0xff, resendDelay & 0xff].concat(data, [0x00]);
    await this.sendCommand(CMD_SEND_PACKET, data);
  }


  // get radio firmware state
  async getState() {
    await this.sendCommand(CMD_GET_STATE);
    let rxBuff = await this.readComms();
    if (rxBuff) {
      return Buffer.from(rxBuff).toString();
    }
    throw new Error('Get state failed.');
  }


  // read radio firmware version
  async readVersion() {
    await this.sendCommand(CMD_GET_VERSION);
    let rxBuff = await this.readComms();
    if (rxBuff) {
      return Buffer.from(rxBuff).toString();
    }
    throw new Error('Read version failed.');
  }


  // set LED output value
  async setLED(led, value) {
    await this.sendCommand(CMD_SET_LED, [led, value]);
  }


  // reboot radio by toggling reset pin
  async reboot() {
    await this.setReset(RPIO.HIGH, 500)
    await this.setReset(RPIO.LOW, 500);
    await this.setReset(RPIO.HIGH, 3000);
  }


  // set reset pin value with optional delay
  setReset(v, d) {
  	return new Promise((resolve, reject) => {
  		RPIO.write(this.settings.resetGPIO || DEFAULTS.resetGPIO, v);
  		setTimeout(() => { resolve(); }, d);
  	});
  }


  // read comms buffer by resyncing and reading buffer
  async readComms() {
    // get length of buffer waiting to be read
    await this.transferByte(0x99);
    this.rxLen = await this.transferByte(0x00);
    if (this.rxLen) {
      // read the remaining bytes into the buffer
      let txBuff = Buffer.alloc(this.rxLen, 0, 'binary');
      await this.transferByteArray(txBuff);
    }
    let response = this.rxBuff.slice(0);
    this.rxBuff = [];
    return response;
  }


  // send command and data
  async sendCommand(cmd, data) {
    data = data || [];
    await this.transferByte(0x99);
    this.rxLenNext = true;
    await this.transferByteArray([data.length + 1, cmd].concat(data));
    if (this.rxLen) {
      // read the remaining bytes into the buffer
      let txBuff = Array.apply(null, Array(this.rxLen)).map(Number.prototype.valueOf, 0);
      await this.transferByteArray(txBuff);
    }
  }


  // transfer byte array over spi
  async transferByteArray(a) {
    for( let ai = 0; ai < a.length; ai++) {
      let rx = await this.transferByte(a[ai]);
      if (this.rxLenNext) {
        // received byte is expected to be the len of bytes waiting to be read
        this.rxLenNext = false;
        this.rxLen = rx;
      }
      else if (this.rxLen) {
        // add the received byte to the receive buffer
        this.rxBuff.push(rx);
        this.rxLen -= 1;
      }
    }
    return;
  }

  // transfer single byte over spi
  async transferByte(b) {
    let txBuff = new Buffer([this.reverseByte(b)]);
    let rxBuff = new Buffer(1);
    RPIO.spiTransfer(txBuff, rxBuff, 1);
    return rxBuff[0] || rxBuff[0] === 0 ? this.reverseByte(rxBuff[0]) : null;
  }

  // reverse the bits in a byte to conform to radio firmware protocol
  reverseByte(b) {
    if (!b) { return 0; }
  	let bits = b.toString(2);
  	bits = "00000000".substring(0, 8 - bits.length) + bits;
  	return parseInt(bits.split('').reverse().join(''), 2);
  }


  // convert an integer into a little endian byte array
  intToLEByteArray(n) {
    // convert int to 4 byte hex string
    let hex = Number(n).toString(16);
    hex = hex.length > 8 ? hex.substring(hex.length - 8) : hex;
    hex = "00000000".substring(0, 8 - hex.length) + hex;
    // convert hex string to bytes in little endian order
    let bytes = [];
    for (let hi = 6; hi >= 0;) {
      bytes.push(parseInt(hex.substring(hi, hi + 2), 16));
      hi -= 2;
    }
    return bytes;
  }


  wait(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(() => { resolve(); }, ms);
    });
  }

}
