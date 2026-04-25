import axios from 'axios';

const api = axios.create({ baseURL: '/sdrangel', timeout: 5000 });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstanceSummary {
  version: string;
  qtVersion?: string;
  rxBits?: number;
  logging?: { dumpToFile: number; fileName?: string; debugLevel?: number };
  devicesetlist?: { deviceSets?: DeviceSet[] };
}

export interface DeviceSet {
  devicesetIndex?: number;
  samplingDevice?: { hwType?: string; serial?: string; direction?: number; state?: string; centerFrequency?: number; bandwidth?: number; sequence?: number; index?: number };
  channelcount?: number;
  channels?: Channel[];
}

export interface Channel {
  deltaFrequency?: number;
  direction?: number;
  index?: number;
  title?: string;
  uid?: number;
  id?: string;
}

export interface AvailableDevice {
  displayedName: string;
  hwType: string;
  serial: string;
  sequence: number;
  direction?: number;
  nbStreams?: number;
}

export interface ChannelPlugin {
  displayedName: string;
  version: string;
  copyright: string;
  sourceFileName: string;
  pluginIdHex: string;
}

// ─── Instance ─────────────────────────────────────────────────────────────────

export const getInstanceSummary = (): Promise<InstanceSummary> =>
  api.get('').then(r => r.data);

export const getAvailableDevices = (direction: 0 | 1 | 2 = 2): Promise<{ devices?: AvailableDevice[] }> =>
  api.get(`/devices?direction=${direction}`).then(r => r.data);

export const getChannelPlugins = (direction: 0 | 1 = 0): Promise<{ channels?: ChannelPlugin[] }> =>
  api.get(`/channels?direction=${direction}`).then(r => r.data);

// ─── Device Sets ──────────────────────────────────────────────────────────────

export const getDeviceSets = (): Promise<{ deviceSets?: DeviceSet[] }> =>
  api.get('/devicesets').then(r => r.data);

export const addDeviceSet = (tx: 0 | 1): Promise<{ devicesetIndex: number }> =>
  api.post('/deviceset', { tx }).then(r => r.data);

export const deleteDeviceSet = (index: number): Promise<unknown> =>
  api.delete(`/deviceset/${index}`).then(r => r.data);

// ─── Device Control ───────────────────────────────────────────────────────────

export const getDeviceSettings = (index: number): Promise<Record<string, any>> =>
  api.get(`/deviceset/${index}/device/settings`).then(r => r.data);

export const patchDeviceSettings = (index: number, settings: Record<string, any>): Promise<unknown> =>
  api.patch(`/deviceset/${index}/device/settings`, settings).then(r => r.data);

export const startDevice = (index: number): Promise<unknown> =>
  api.post(`/deviceset/${index}/device/run`).then(r => r.data);

export const stopDevice = (index: number): Promise<unknown> =>
  api.delete(`/deviceset/${index}/device/run`).then(r => r.data);

export const getDeviceReport = (index: number): Promise<Record<string, any>> =>
  api.get(`/deviceset/${index}/device/report`).then(r => r.data);

export const setDevice = (
  index: number, hwType: string, tx: 0 | 1, serial = ''
): Promise<unknown> =>
  api.put(`/deviceset/${index}/device`, { hwType, direction: tx, tx, serial, sequence: 0 }).then(r => r.data);

// ─── Spectrum ─────────────────────────────────────────────────────────────────

export const getSpectrumSettings = (index: number): Promise<Record<string, any>> =>
  api.get(`/deviceset/${index}/spectrum/settings`).then(r => r.data);

// ─── Channels ─────────────────────────────────────────────────────────────────

export const getChannels = (deviceIndex: number): Promise<{ channels?: Channel[]; channelcount?: number }> =>
  api.get(`/deviceset/${deviceIndex}/channels`).then(r => r.data);

export const addChannel = (deviceIndex: number, channelType: string, direction: 0 | 1): Promise<unknown> =>
  api.post(`/deviceset/${deviceIndex}/channel`, { channelType, direction }).then(r => r.data);

export const deleteChannel = (deviceIndex: number, channelIndex: number): Promise<unknown> =>
  api.delete(`/deviceset/${deviceIndex}/channel/${channelIndex}`).then(r => r.data);

export const getChannelSettings = (di: number, ci: number): Promise<Record<string, any>> =>
  api.get(`/deviceset/${di}/channel/${ci}/settings`).then(r => r.data);

export const patchChannelSettings = (di: number, ci: number, settings: Record<string, any>): Promise<unknown> =>
  api.patch(`/deviceset/${di}/channel/${ci}/settings`, settings).then(r => r.data);

// ---- SPECTRUM SERVER (WebSocket) ----
// SDRangel REST API:
//   POST   /deviceset/{idx}/spectrum/server  → opens the WS server (no body needed)
//   DELETE /deviceset/{idx}/spectrum/server  → closes the WS server
export const setSpectrumServer = async (deviceSetIndex: number, run: boolean, _port = 8887) => {
  try {
    if (run) {
      const response = await api.post(`/deviceset/${deviceSetIndex}/spectrum/server`);
      return response.data;
    } else {
      const response = await api.delete(`/deviceset/${deviceSetIndex}/spectrum/server`);
      return response.data;
    }
  } catch {
    return null;
  }
};

// Patch only specific keys — SDRangel only applies keys listed in `channelSettingsKeys`
export const patchChannelSettingsKeys = async (
  di: number, ci: number,
  channelType: string, direction: number,
  settingsKey: string, patch: Record<string, any>
): Promise<unknown> => {
  const payload: Record<string, any> = {
    channelType,
    direction,
    [settingsKey]: patch,
  };
  return api.patch(`/deviceset/${di}/channel/${ci}/settings`, payload).then(r => r.data);
};

export const SdrService = {
  getInstanceSummary, getAvailableDevices, getChannelPlugins,
  getDeviceSets, addDeviceSet, deleteDeviceSet,
  getDeviceSettings, patchDeviceSettings, startDevice, stopDevice,
  getDeviceReport, setDevice, getSpectrumSettings, setSpectrumServer,
  getChannels, addChannel, deleteChannel, getChannelSettings, patchChannelSettings,
  patchChannelSettingsKeys,
};
