import axios from 'axios';

// Create a configured axios instance
export const sdrApi = axios.create({
  baseURL: '/sdrangel',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const SdrService = {
  // Global operations
  getAudioStatus: async () => {
    const response = await sdrApi.get('/audio');
    return response.data;
  },
  
  getDeviceSets: async () => {
    const response = await sdrApi.get('/devicesets');
    return response.data;
  },
  
  createDeviceSet: async (direction: 0 | 1) => {
    const response = await sdrApi.post('/deviceset', { direction });
    return response.data;
  },

  // Per-Device Operations
  getDeviceSettings: async (deviceSetIndex: number) => {
    const response = await sdrApi.get(`/deviceset/${deviceSetIndex}/device/settings`);
    return response.data;
  },

  patchDeviceSettings: async (deviceSetIndex: number, settingsPayload: any) => {
    const response = await sdrApi.patch(`/deviceset/${deviceSetIndex}/device/settings`, settingsPayload);
    return response.data;
  },

  // Start or Stop the DSP Hardware on a specific device
  // The state parameter corresponds to the state enum (0: Idle, 1: Running, 2: Error)
  // Usually, sending POST /run with empty body or state: 1 starts it.
  setDeviceState: async (deviceSetIndex: number, state: 0 | 1 ) => {
    const response = await sdrApi.post(`/deviceset/${deviceSetIndex}/device/run`, {
      state: state
    });
    return response.data;
  }
};
