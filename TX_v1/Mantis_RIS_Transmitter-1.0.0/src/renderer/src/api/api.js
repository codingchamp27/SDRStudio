import { useApiConfig } from './config';
import axios from 'axios';

const handleError = (error) => {
  if (error?.response) {
    console.error('Error response data:', error.response.data);
    console.error('Error response status:', error.response.status);
    console.error('Error response headers:', error.response.headers);
  } else if (error?.request) {
    console.error('No response received:', error.request);
  } else {
    console.error('Error setting up request:', error.message);
  }
};

export const useApiFunctions = () => {
  const API_CONFIG = useApiConfig();

  const _getDevices = async () => {
    try {
      const response = await axios.get(API_CONFIG.BASE_URL + API_CONFIG.GET_DEVICE,
        {
          headers: { 'Content-Type': 'application/json' },
        },

      );
      return response;

    } catch (error) {
      return error;
    }
  }

  const _postDevice = async () => {
    try {
      const response = await axios.post(API_CONFIG.BASE_URL + API_CONFIG.SET_DEVICE,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    } catch (error) {
      return error;
    }
  }

  const _putDevice = async (body) => {

    try {
      const response = await axios.put(API_CONFIG.BASE_URL + API_CONFIG.PUT_DEVICE,
        body,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      console.log("put response", response);

      return response;

    } catch (error) {
      return error;
    }
  }

  const _postChannel = async () => {

    const body = {
      "channelType": "DATVMod",
      "direction": 1,
      "originatorDeviceSetIndex": -1,
      "originatorChannelIndex": -1,
      "DATVModSettings": {
        "inputFrequencyOffset": 0,
        "rfBandwidth": 0,
        "standard": 0,
        "modulation": 0,
        "fec": 0,
        "symbolRate": 0,
        "rollOff": 0,
        "tsSource": 0,
        "tsFileName": "string",
        "tsFilePlayLoop": 0,
        "tsFilePlay": 0,
        "udpAddress": "string",
        "udpPort": 0,
        "channelMute": 0,
        "rgbColor": 0,
        "title": "string",
        "streamIndex": 0,
        "useReverseAPI": 0,
        "reverseAPIAddress": "string",
        "reverseAPIPort": 0,
        "reverseAPIDeviceIndex": 0,
        "reverseAPIChannelIndex": 0,
        "channelMarker": {
          "centerFrequency": 0,
          "color": 0,
          "title": "string",
          "frequencyScaleDisplayType": 0
        },
        "rollupState": {
          "version": 0,
          "childrenStates": [
            {
              "objectName": "string",
              "isHidden": 0
            }
          ]
        }
      }
    };

    try {

      const response = await axios.post(API_CONFIG.BASE_URL + API_CONFIG.POST_CHANNEL,
        body,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response;

    } catch (error) {
      return error;
    }
  };

  const _putChannel = async (data) => {

    try {
      const response = await axios.put(API_CONFIG.BASE_URL + API_CONFIG.PUT_CHANNEL,
        JSON.stringify(data),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response;

    } catch (error) {
      return error;
    }
  }

  const _putDeviceSetting = async (data) => {
    try {
      const response = await axios.put(API_CONFIG.BASE_URL + API_CONFIG.PUT_DEVICE_SETTING,
        data,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    } catch (error) {
      return error;
    }
  };

  const _deleteDeviceSetting = async (data) => {
    try {
      const response = await axios.delete(API_CONFIG.BASE_URL + API_CONFIG.DELETE_DEVICE,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    } catch (error) {
      return error;
    }
  };

  const _postRunDevice = async () => {
    try {
      const response = await axios.post(API_CONFIG.BASE_URL + API_CONFIG.RUN_DEVICE,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    } catch (error) {
      return error;
    }
  }

  const _postSpectrumServer = async () => {
    try {
      const response = await axios.post(API_CONFIG.BASE_URL + API_CONFIG.SPECTRUM_SERVER,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    } catch (error) {
      return error;
    }
  }

  const _getSpectrumServer = async () => {
    try {

      const response = await axios.get(API_CONFIG.BASE_URL + API_CONFIG.GET_SPECTRUM,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;

    } catch (error) {
      return error;
    }
  }

  const _deletechannel = async () => {
    try {
      const response = await axios.delete(API_CONFIG.BASE_URL + API_CONFIG.DELETE_CHANNEL,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    } catch (error) {
      return error;
    }
  }

  const _getLogsPacket = async () => {
    try {
      const response = await axios.get(API_CONFIG.BACKEND_URL + API_CONFIG.GET_LOGS_PACKET,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
      return response;
    } catch (error) {
      return error;
    }
  }

  const _deleteDeviceSet = async () => {
    try{
      const response = await axios.delete(API_CONFIG.BASE_URL + API_CONFIG.DELETE_DEVICESET,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response;
    }catch(error){
      return error;
    }
  };

  const _getIpAddress = async () => {
    try {
      const response = await axios.get(
        API_CONFIG.BACKEND_URL + API_CONFIG.GET_IP_ADDRESS
      );

      console.log("get ip", response);
      return response;
    } catch (error) {
      return error;
    }
  };

  const _getInternetSpeed = async () => {
    try {
      const response = await axios.get(
        API_CONFIG.BACKEND_URL + API_CONFIG.GET_INTERNET_SPEED
      );

      return response;
    } catch (error) {
      return error;
    }
  };

  return {
    _getDevices,
    _postDevice,
    _putDevice,
    _postChannel,
    _putChannel,
    _putDeviceSetting,
    _deleteDeviceSetting,
    _postRunDevice,
    _postSpectrumServer,
    _getSpectrumServer,
    _deletechannel,
    _getLogsPacket,
    _deleteDeviceSet,
    _getIpAddress,
    _getInternetSpeed,
  };
};
