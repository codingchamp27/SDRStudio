let settings = null;

const isElectron = () => {
  return typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
};

// const loadSettings = async () => {
//   if (isElectron() && !settings) {
//     const electronSettings = await import('electron-settings');
//     settings = electronSettings.default || electronSettings;
//   }
// };

export const getStorageValue = async (key, defaultValue) => {
  // if (isElectron()) {
  //   await loadSettings();
  //   const value = await settings.get(key);
  //   return value !== undefined ? value : defaultValue;
  // } else {
  //   console.log("sessionStoreage");
  //   const value = sessionStorage.getItem(key);
  //   return value !== null ? value : defaultValue;
  // }
  const value = sessionStorage.getItem(key);
  return value !== null ? value : defaultValue;
};

export const setStorageValue = async (key, value) => {
  // if (isElectron()) {
  //   await loadSettings();
  //   await settings.set(key, value);
  // } else {
  //   console.log("sessionStoreage set", key, value);
  //   sessionStorage.setItem(key, value);
  // }
  sessionStorage.setItem(key, value);
};

export const removeStorageValue = async (key) => {
  // if (isElectron()) {
  //   await loadSettings();
  //   await settings.unset(key);
  // } else {
  //   console.log("sessionStoreage");
  //   sessionStorage.removeItem(key);
  // }
  sessionStorage.removeItem(key);
};