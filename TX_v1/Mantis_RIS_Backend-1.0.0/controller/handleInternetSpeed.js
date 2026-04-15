const speedTest = require("speedtest-net");

async function handleInternetSpeed(req, res) {
  try {
    // Accept license/GDPR so the library runs without interactive prompts
    const options = { acceptLicense: true, acceptGdpr: true };

    // Await the promise returned by speedtest-net
    const result = await speedTest(options);

    // result.download.bandwidth and result.upload.bandwidth are typically
    // reported in bytes/sec in many versions. Convert to bits/sec:
    const safeNum = n => (typeof n === 'number' ? n : null);

    const downloadBandwidth = safeNum(result?.download?.bandwidth);
    const uploadBandwidth = safeNum(result?.upload?.bandwidth);
    // convert bytes/sec -> bits/sec by *8, then to Mbps
    const download_mbps = downloadBandwidth ? +(downloadBandwidth * 8 / 1_000_000).toFixed(2) : null;
    const upload_mbps = uploadBandwidth ? +(uploadBandwidth * 8 / 1_000_000).toFixed(2) : null;

    const out = {
      download_mbps,
      upload_mbps,
      ping_ms: result?.ping?.latency ?? result?.ping ?? null,
      server: result?.server ?? null,
      raw: result // include raw result for debugging
    };

    res.json(out);
  } catch (err) {
    console.error('Speed test failed:', err);
    res.status(500).json({ error: String(err) });
  }
}

module.exports = { handleInternetSpeed };
