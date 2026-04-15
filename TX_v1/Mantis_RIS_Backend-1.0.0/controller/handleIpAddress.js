const os = require('os');


function bringIpAddress(adapterType) {
  if (!adapterType) return null;
  const networkInterfaces = os.networkInterfaces();

  for (const [ifName, addrs] of Object.entries(networkInterfaces)) {
    if (!ifName) continue;
    if (!ifName.toLowerCase().includes(adapterType.toLowerCase())) continue;

    for (const addr of addrs) {
      if (addr && addr.family === "IPv4" && !addr.internal) {
        return { interface: ifName, address: addr.address };
      }
    }
  }
  return null;
}

async function handleIpAddress(req, res){
    try{
        const lan = bringIpAddress("en") || bringIpAddress("eth");
        if (lan) return res.json({ source: "lan", IPAddress: lan });

        const wifi = bringIpAddress("wl") || bringIpAddress("wlan");
        if (wifi) return res.json({ source: "wifi", IPAddress: wifi });

        const net = os.networkInterfaces();
        const all = [];
        for (const [ifName, addrs] of Object.entries(net)) {
            for (const a of addrs) {
            if (a.family === "IPv4" && !a.internal)
                all.push({ interface: ifName, address: a.address });
            }
        }
        if (all.length) return res.json({ source: "other", IPAddress: all });

        return res.status(200).json({
            source: "none",
            IPAddress: "No LAN or WiFi connection found",
        });
    }catch(error){
        console.log(error);
        return res.status(500).json({error: error});
    }
}

module.exports = {handleIpAddress};
