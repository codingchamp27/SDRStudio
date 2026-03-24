import axios from 'axios';

// Create a configured axios instance
// The Vite proxy will route anything starting with /sdrangel to 127.0.0.1:8091
export const sdrApi = axios.create({
  baseURL: '/sdrangel',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Example API calls based on standard SDRangel Swagger specs
export const SdrService = {
  // Get global status
  getAudioStatus: async () => {
    const response = await sdrApi.get('/audio');
    return response.data;
  },
  
  // Get all active device sets (Rx/Tx)
  getDeviceSets: async () => {
    const response = await sdrApi.get('/deviceset');
    return response.data;
  },
  
  // Create a new device set (0 for Rx, 1 for Tx)
  createDeviceSet: async (direction: 0 | 1) => {
    const response = await sdrApi.post('/deviceset', { direction });
    return response.data;
  }
};
