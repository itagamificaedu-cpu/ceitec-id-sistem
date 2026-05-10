const { contextBridge, ipcRenderer } = require('electron');

// Informa ao sistema web que está rodando como app desktop
window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-electron', 'true');
  document.title = 'ITA Tecnologia Educacional';
});

// Expõe função para reconectar da página offline
contextBridge.exposeInMainWorld('electronAPI', {
  retryConnection: () => ipcRenderer.send('retry-connection'),
  isElectron: true,
});
