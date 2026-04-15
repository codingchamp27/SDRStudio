import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const customAPI = {
  // Define your custom APIs here
  //turnOnHotspot: (ssid, password) => ipcRenderer.invoke('turn-on-hotspot', ssid, password),

  //get functions
  // getNetStatus: () => ipcRenderer.invoke('getNetStatus'),
  // getWifiDevices: () => ipcRenderer.invoke('getWifiDevices'),
  // getLoraDevices: () => ipcRenderer.invoke('getLoraDevices'),
  // getAllCamera: () => ipcRenderer.invoke('get-camera'),
  // getCameraStatus: () => ipcRenderer.invoke('camera-status'),
  // getAllIp: () => ipcRenderer.invoke('get-ip'),

  // //post functions
  // updateCredentials: (ssid, password) => ipcRenderer.invoke('update-credentials', ssid, password),
  // toggleHotspot: (isHotspotOn) => ipcRenderer.invoke('toggle-hotspot', isHotspotOn),
  // startStream: (camera) => ipcRenderer.invoke('startStream', camera),
  // endStream: () => ipcRenderer.invoke('endStream'),
  // startLora: (isLora) => ipcRenderer.invoke('start-lora', isLora),


  // minimize: () => ipcRenderer.send('window-minimize'),
  // close: () => ipcRenderer.send('window-close'),
  
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// attach them directly to the global `window` object.
if (process.contextIsolated) {
  try {
    // Expose Electron's built-in APIs
    contextBridge.exposeInMainWorld('electron', electronAPI);

    // Expose custom APIs
    contextBridge.exposeInMainWorld('electronAPI', customAPI);
  } catch (error) {
    console.error('Error exposing APIs with contextBridge:', error);
  }
} else {
  console.warn('Context isolation is disabled. Exposing APIs directly to the global window.');

  // Attach APIs directly to the global window object
  window.electron = electronAPI;
  window.electronAPI = customAPI;
}
