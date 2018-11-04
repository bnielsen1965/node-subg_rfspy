
const CHANNEL = 8;
const RCV_TIMEOUT = 250; // millisseconds to wait for a packet to be received
const RESEND_COUNT = 4; // number of times to resend a packet
const RESEND_DELAY = 100; // millisseconds between each resend

const SubgRFSpy = require('subgrfspy');
let radio = new SubgRFSpy();

if (process.argv.length < 3) {
  console.log('No command specified.');
  process.exit(1);
}

let command = process.argv[2];


switch (command) {
  case 'reset':
  radio.reset()
  .then(() => { complete(); })
  .catch(err => { failed(err); });
  break;

  case 'reboot':
  radio.reboot()
  .then(() => { complete(); })
  .catch(err => { failed(err); });
  break;

  case 'get_state':
  radio.getState()
  .then(state => {
    console.log(state);
    complete();
  })
  .catch(err => { failed(err); });
  break;

  case 'version':
  radio.readVersion()
  .then(version => {
    console.log(version);
    complete();
  })
  .catch(err => { failed(err); });
  break;

  case 'leds_on':
  radio.setLED(0, 1)
  .then(() => {
    return radio.setLED(1, 1);
  })
  .then(() => {
    complete();
  })
  .catch(err => { failed(err); });
  break;

  case 'leds_off':
  radio.setLED(0, 0)
  .then(() => {
    return radio.setLED(1, 0);
  })
  .then(() => {
    complete();
  })
  .catch(err => { failed(err); });
  break;

  case 'led_on':
  radio.setLED(parseInt(process.argv[3]), 1)
  .then(() => {
    complete();
  })
  .catch(err => { failed(err); });
  break;

  case 'led_off':
  radio.setLED(parseInt(process.argv[3]), 0)
  .then(() => {
    complete();
  })
  .catch(err => { failed(err); });
  break;

  case 'ping':
  let message = process.argv[3] || '';
  if (!message.length) {
    failed(new Error('Ping message required'));
  }
  let pingCount = process.argv[4];
  pingCount = pingCount ? parseInt(pingCount) : 1;
  ping(message, pingCount)
  .then(response => {
    console.log('Success rate: ' + (Math.round(response * 10000) / 100) + '%');
    complete();
  })
  .catch(err => { failed(err); });
  break;

  case 'echo_server':
  echo(CHANNEL, RCV_TIMEOUT, RESEND_COUNT, RESEND_DELAY)
  .catch(err => { failed(err); });
  break;

  case 'send_packet':
  let str = process.argv[3] || 'ABCD';
  str = str.replace(/\s/g, '');
  if (!str.length) {
    failed(new Error('Message required'));
  }
  radio.sendPacket(CHANNEL, stringToByteArray(str), RESEND_COUNT, RESEND_DELAY)
  .then(() => {
    complete();
  })
  .catch(err => { failed(err); });
  break;

  case 'get_packets':
  radio.getPackets(CHANNEL, RCV_TIMEOUT)
  .then(packets => {
    packets.forEach((p, i) => {
      let ps = p.reduce((s, c) => { s += String.fromCharCode(c); return s; }, '');
      console.log(i + " : " + ps);
    });
    complete();
  })
  .catch(err => { failed(err); });
  break;

  default:
  failed(new Error('Unknown command.'));
}


// ping with message and return success rate ratio
async function ping(message, pingCount) {
  let data = stringToByteArray(message);
  let sendCount = 0;
  let receiveCount = 0;
  do {
    pingCount -= 1;
    echoRetries = 3;
    sendCount += 1;
    // send ping packet
    await radio.sendPacket(CHANNEL, data, RESEND_COUNT, RESEND_DELAY);
    // try to receive echo packet
    do {
      echoRetries -= 1;
      // try to receive echo packet
      let packets = await radio.getPackets(CHANNEL, RCV_TIMEOUT);
      // check packets
      let success = false;
      packets.forEach(p => {
        let ps = p.reduce((s, c) => { s += String.fromCharCode(c); return s; }, '');
        if (ps === message) { success = true; }
      });
      if (success) {
        receiveCount += 1;
        break;
      }
    } while (echoRetries > 0);
  } while (pingCount > 0);
  return receiveCount / sendCount;
}


// listen for incoming packets and echo back
async function echo(channel, receiveTimeout, resendCount, resendDelay, forMS) {
  forMS = forMS || 0; // if not specified then run indefinitely
  let runMS = 0;
  do {
    let packets = await radio.getPackets(channel, receiveTimeout);
    for (let pi = 0; pi < packets.length; pi++) {
      await radio.sendPacket(channel, packets[pi], resendCount, resendDelay);
    }
    runMS += (forMS ? readWait : 0);
    if (runMS > forMS) {
      break;
    }
  } while (true);
}


function stringToByteArray(str) {
  // convert message string into byte array
  let data = str.split("");
  data = data.map(c => { return c.charCodeAt(0); });
  return data;
}


// process complete
function complete() {
  console.log('Complete.');
  process.exit(0);
}

// process failed
function failed(err) {
  console.log(err.message, err);
  process.exit(1);
}
