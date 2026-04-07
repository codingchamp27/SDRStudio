import axios from 'axios';

export interface SdrChannelDef {
  id: string;
  name: string;
  version: string;
  direction: number;
}

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
    const response = await sdrApi.post(`/deviceset?direction=${direction}`);
    return response.data;
  },

  deleteDeviceSet: async () => {
    // Note: SDRangel's native API restricts deletion to only the last populated workspace natively.
    const response = await sdrApi.delete(`/deviceset`);
    return response.data;
  },

  getAvailableDevices: async (direction: number) => {
    const response = await sdrApi.get(`/devices?direction=${direction}`);
    return response.data.devices as any[];
  },

  attachDeviceHardware: async (deviceSetIndex: number, hwDevice: any) => {
    const response = await sdrApi.put(`/deviceset/${deviceSetIndex}/device`, hwDevice);
    return response.data;
  },

  getChannels: async (direction: number) => {
    const response = await sdrApi.get(`/channels?direction=${direction}`);
    return response.data.channels as SdrChannelDef[];
  },

  addChannel: async (deviceSetIndex: number, channelType: string, direction: number) => {
    const response = await sdrApi.post(`/deviceset/${deviceSetIndex}/channel`, {
      channelType,
      direction,
    });
    return response.data;
  },

  deleteChannel: async (deviceSetIndex: number, channelIndex: number) => {
    const response = await sdrApi.delete(`/deviceset/${deviceSetIndex}/channel/${channelIndex}`);
    return response.data;
  },

  patchChannelSettings: async (deviceSetIndex: number, channelIndex: number, settings: Record<string, any>) => {
    // SDRangel requires the settings wrapped in channelType-named key; we POST the raw patch payload
    const response = await sdrApi.patch(`/deviceset/${deviceSetIndex}/channel/${channelIndex}/settings`, settings);
    return response.data;
  },

  getChannelSettings: async (deviceSetIndex: number, channelIndex: number) => {
    const response = await sdrApi.get(`/deviceset/${deviceSetIndex}/channel/${channelIndex}/settings`);
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

  setDeviceState: async (deviceSetIndex: number, state: 0 | 1 ) => {
    if (state === 1) {
      const response = await sdrApi.post(`/deviceset/${deviceSetIndex}/device/run`);
      return response.data;
    } else {
      const response = await sdrApi.delete(`/deviceset/${deviceSetIndex}/device/run`);
      return response.data;
    }
  },

  // ---- FEATURES ----
  getAvailableFeatures: async () => {
    const response = await sdrApi.get('/features');
    return response.data.features as Array<{ id: string; name: string; version: string }>;
  },

  getFeatureSet: async () => {
    const response = await sdrApi.get('/featureset');
    const data = response.data;
    if (data && data.features) {
       const featuresWithState = await Promise.all(data.features.map(async (f: any) => {
         try {
           const runRes = await sdrApi.get(`/featureset/feature/${f.index}/run`);
           f.state = runRes.data.state;
         } catch {
           f.state = 'idle';
         }
         return f;
       }));
       data.features = featuresWithState;
    }
    return data;
  },

  addFeature: async (featureType: string) => {
    // Correct endpoint: POST /featureset/feature  (no /0/ in path)
    const response = await sdrApi.post('/featureset/feature', { featureType });
    return response.data;
  },

  deleteFeature: async (featureIndex: number) => {
    const response = await sdrApi.delete(`/featureset/feature/${featureIndex}`);
    return response.data;
  },

  runFeature: async (featureIndex: number, start: boolean) => {
    const response = await sdrApi.post(`/featureset/feature/${featureIndex}/run`, {
      state: start ? 'running' : 'idle'
    });
    return response.data;
  },

  // ---- PRESETS ----
  getPresets: async () => {
    const response = await sdrApi.get('/presets');
    return response.data.presets as Array<{ type: string; group: string; description: string; centerFrequency: number }>;
  },

  loadPreset: async (group: string, description: string, deviceSetIndex: number) => {
    const response = await sdrApi.patch('/preset', {
      preset: { group, description },
      deviceSetIndex,
    });
    return response.data;
  },

  savePreset: async (group: string, description: string, deviceSetIndex: number) => {
    const response = await sdrApi.put('/preset', {
      preset: { group, description },
      deviceSetIndex,
    });
    return response.data;
  },

  deletePreset: async (group: string, description: string) => {
    const response = await sdrApi.delete('/preset', {
      data: { preset: { group, description } }
    });
    return response.data;
  },

  // ---- SPECTRUM SERVER (WebSocket) ----
  setSpectrumServer: async (deviceSetIndex: number, run: boolean, port = 8887) => {
    const response = await sdrApi.post(`/deviceset/${deviceSetIndex}/spectrum/server`, {
      run: run ? 1 : 0,
      serverAddress: '127.0.0.1',
      serverPort: port,
      address: '127.0.0.1',
      port: port,
      spectrumServerSettings: {
        run: run ? 1 : 0,
        serverAddress: '127.0.0.1',
        serverPort: port
      }
    }).catch(() => ({ data: null }));
    return response.data;
  },

  // ---- AUDIO OUTPUT & RECORDING ----
  getAudio: async () => {
    const response = await sdrApi.get('/audio');
    return response.data;
  },

  patchAudioOutput: async (parameters: any) => {
    // Expected structure: {"copyToUDP": 0, "index": 0, "name": "...", "recordToFile": 1, ...}
    const response = await sdrApi.patch('/audio/output/parameters', parameters);
    return response.data;
  }
};
