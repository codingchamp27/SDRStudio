const fs = require('fs');
const path = require('path');
const readline = require('readline');

const LOG_FILE_PATH = path.resolve(__dirname, '../service/sdrangel.log');
const MAX_LOG_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_LINES_PER_CALL = 10;
const MAX_LOG_LINES = 200;

let lastPosition = 0;
let packetFlow = [];

async function rotateLogIfTooLarge() {
  try {
    const stats = await fs.promises.stat(LOG_FILE_PATH);
    if (stats.size > MAX_LOG_BYTES) {
      await fs.promises.unlink(LOG_FILE_PATH);
      lastPosition = 0;
      packetFlow = [];
      console.log('🧹 Log rotated (too large)');
    }
  } catch {
    // ignore if log file missing
  }
}

async function trimLogLinesIfNeeded() {
  try {
    if (!fs.existsSync(LOG_FILE_PATH)) return;

    const original = await fs.promises.readFile(LOG_FILE_PATH, 'utf8');
    // split into lines (handle \r\n or \n)
    const lines = original.split(/\r?\n/);

    // If the file ends with a trailing newline, split will produce a trailing empty string — remove it
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (lines.length <= MAX_LOG_LINES) return;

    const keepCount = MAX_LOG_LINES;
    const kept = lines.slice(-keepCount);
    // Ensure trailing newline at end of file for consistency
    const keptContent = kept.join('\n') + '\n';

    const originalBytes = Buffer.byteLength(original, 'utf8');
    const keptBytes = Buffer.byteLength(keptContent, 'utf8');

    // Write trimmed content
    await fs.promises.writeFile(LOG_FILE_PATH, keptContent, 'utf8');
    const removedLinesCount = lines.length - kept.length;
    const removedBytes = Math.max(0, originalBytes - keptBytes);

    // Adjust lastPosition to reflect removed bytes from the start of file
    if (removedBytes > 0) {
      lastPosition = Math.max(0, lastPosition - removedBytes);
      // If lastPosition now beyond file size, clamp to file size
      const newStats = await fs.promises.stat(LOG_FILE_PATH);
      if (lastPosition > newStats.size) lastPosition = newStats.size;
    }

    // Remove older packets from packetFlow to stay consistent
    if (removedLinesCount > 0 && packetFlow.length > 0) {
      packetFlow.splice(0, Math.min(removedLinesCount, packetFlow.length));
    }

    console.log(`🧾 Log trimmed: removed ${removedLinesCount} old lines (${removedBytes} bytes)`);
  } catch (err) {
    console.error('Error trimming log file:', err);
    // don't throw — trimming failing shouldn't block capture
  }
}

async function handleCapturePacket(req, res) {
  try {
    if (!fs.existsSync(LOG_FILE_PATH)) {
      return res.status(404).json({ error: 'Log file does not exist.' });
    }

    // Ensure rotation-by-size first, then trim to keep only recent N lines
    await rotateLogIfTooLarge();
    await trimLogLinesIfNeeded();

    // Re-check file size and clamp lastPosition if needed
    try {
      const stats = await fs.promises.stat(LOG_FILE_PATH);
      if (lastPosition > stats.size) lastPosition = stats.size;
    } catch {
      // if stat fails, continue (file may have been removed)
    }

    const stream = fs.createReadStream(LOG_FILE_PATH, {
      start: lastPosition,
      encoding: 'utf8',
    });

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let linesRead = 0;
    let bytesRead = 0;
    const newPackets = [];

    for await (const line of rl) {
      if (linesRead >= MAX_LINES_PER_CALL) break;

      // account for the line plus a newline (we assume '\n' in the file)
      bytesRead += Buffer.byteLength(line + '\n', 'utf8');

      const match = line.trim().match(/^(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);
      if (match) {
        const [, TimeStamp, Protocol, , Message] = match;
        const packet = { TimeStamp, Protocol, Message };
        packetFlow.push(packet);
        newPackets.push(packet);
      }

      linesRead++;
    }

    if (bytesRead > 0) {
      lastPosition += bytesRead;
    } else {
      // nothing new read; recompute file size and clamp lastPosition
      try {
        const stats = await fs.promises.stat(LOG_FILE_PATH);
        if (lastPosition > stats.size) lastPosition = stats.size;
      } catch {
        // ignore
      }
    }

    return res.status(200).json({ packets: newPackets });
  } catch (err) {
    console.error('Packet capture error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}

module.exports = { handleCapturePacket };

