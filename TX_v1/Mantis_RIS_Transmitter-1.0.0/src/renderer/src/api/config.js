
export const useApiConfig = () => {

  return {
    BASE_URL: `http://0.0.0.0:8091`,
    BACKEND_URL: `http://0.0.0.0:5000`,
    GET_DEVICE: '/sdrangel/devices?direction=1',
    SET_DEVICE: '/sdrangel/deviceset?direction=1',
    PUT_DEVICE: '/sdrangel/deviceset/0/device',
    POST_CHANNEL: '/sdrangel/deviceset/0/channel',
    PUT_CHANNEL: '/sdrangel/deviceset/0/channel/0/settings',
    PUT_DEVICE_SETTING: '/sdrangel/deviceset/0/device/settings',
    DELETE_DEVICE: '/sdrangel/deviceset/0/device/run',
    RUN_DEVICE: '/sdrangel/deviceset/0/device/run',
    SPECTRUM_SERVER: '/sdrangel/deviceset/0/spectrum/server',
    GET_SPECTRUM: '/sdrangel/deviceset/0/spectrum/server',
    DELETE_CHANNEL:'/sdrangel/deviceset/0/channel/0',
    GET_LOGS_PACKET: '/packets',
    DELETE_DEVICESET: '/sdrangel/deviceset',
    GET_IP_ADDRESS: "/ipAddress",
    GET_INTERNET_SPEED: "/internet-speed",
  };
};
