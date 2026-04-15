const { handleCapturePacket } = require("../controller/handleCapturePacket.js");
const { handleInternetSpeed } = require("../controller/handleInternetSpeed.js");
const { handleIpAddress } = require("../controller/handleIpAddress.js");
const { handleSerialToUsb } = require("../controller/handleSerialToUsb.js")

const postSerialToUsb = (req, res) => {
    return handleSerialToUsb(req, res);
}

const getLogsPackets = (req, res) => {
    return handleCapturePacket(req, res);
}

const getIPAddress = (req, res) => {
    return handleIpAddress(req, res);
}

const getInternetSpeed = (req, res) => {
    return handleInternetSpeed(req, res);
}

module.exports = {
    postSerialToUsb,
    getLogsPackets,
    getIPAddress,
    getInternetSpeed,
}

    