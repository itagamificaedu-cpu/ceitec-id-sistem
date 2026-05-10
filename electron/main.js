const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');

const APP_URL = 'https://itatecnologiaeducacional.tech';
const APP_NAME = 'ITA Tecnologia Educacional';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: APP_NAME,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // mostra só depois de carregar (evita flash branco)
    backgroundColor: '#1e3a5f',
  });

  // Remove menu padrão do Electron (File, Edit, View...)
  Menu.setApplicationMenu(null);

  win.loadURL(APP_URL);

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Links externos abrem no navegador padrão, não dentro do app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Página offline quando sem internet
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (errorCode === -2 || errorCode === -106) {
      // ERR_FAILED ou ERR_INTERNET_DISCONNECTED
      win.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  // Tentar reconectar quando clicar em "Tentar novamente" na página offline
  win.webContents.on('ipc-message', (_event, channel) => {
    if (channel === 'retry-connection') {
      win.loadURL(APP_URL);
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
