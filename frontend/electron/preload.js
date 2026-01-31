/**
 * Preload script for Electron
 * Provides secure bridge between renderer and main process
 */

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the APIs safely
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },
    // Add any other safe APIs here
});
