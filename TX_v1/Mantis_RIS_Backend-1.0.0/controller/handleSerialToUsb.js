const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const SERIAL_PORT = '/dev/ttyUSB0';
const BAUD_RATE = 115200;
const READ_TIMEOUT_MS = 2000;

async function handleSerialToUsb(req, res) {

    // console.log(req);

  if (!req?.body || typeof req.body.pattern !== 'string') {
    return res.status(400).json({ error: 'Missing pattern in request body' });
  }

  const port = new SerialPort({
    path: SERIAL_PORT,
    baudRate: BAUD_RATE,
    autoOpen: false,
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  try {
    await new Promise((resolve, reject) => {
      port.open((err) => (err ? reject(err) : resolve()));
    });
    console.log(`Connected to RIS on ${SERIAL_PORT} @ ${BAUD_RATE} baud`);

    const response = await new Promise((resolve, reject) => {
      let finished = false;

      const timer = setTimeout(() => {
        finished = true;
        parser.removeListener('data', onData);
        reject(new Error('Read timeout'));
      }, READ_TIMEOUT_MS);

      function onData(line) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        parser.removeListener('data', onData);
        resolve(line.toString().trim());
      }

      parser.once('data', onData);

      port.write(req.body.pattern + '\n', (err) => {
        if (err && !finished) {
          finished = true;
          clearTimeout(timer);
          parser.removeListener('data', onData);
          reject(err);
        } else {
          console.log('Pattern sent.');
        }
      });
    });

    console.log('RIS Response:', response);
    return res.status(200).json({ data: response });

  } catch (error) {
    console.error('Serial error:', error);
    return res.status(500).json({ error: error?.message || String(error) });
  } finally {
    try {
      if (port && port.isOpen) {
        await new Promise((resolve) => port.close(() => resolve()));
        console.log('Port closed.');
      }
    } catch (closeErr) {
      console.warn('Error closing port:', closeErr);
    }
  }
}

module.exports = { handleSerialToUsb };
