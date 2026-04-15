const { postSerialToUsb, getLogsPackets, getIPAddress, getInternetSpeed } = require("./api.js")

module.exports = (server) => {
    server.post('/serial-to-usb', postSerialToUsb);
    server.get('/packets', getLogsPackets);
    server.get('/ipAddress', getIPAddress);
    server.get('/internet-speed', getInternetSpeed);
}
