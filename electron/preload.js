const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-electron', 'true');
  document.title = 'ITA Tecnologia Educacional';
});

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  retryConnection: () => ipcRenderer.send('retry-connection'),
  // Abre URL no navegador padrão do sistema (Chrome, Edge, etc.)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
