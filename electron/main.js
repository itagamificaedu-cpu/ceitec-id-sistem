const { app, BrowserWindow, shell, Menu, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const APP_URL = 'https://itatecnologiaeducacional.tech';
const APP_NAME = 'ITA Tecnologia Educacional';

let offlineMode = false;
let retryTimer = null;

// Verifica se tem internet tentando alcançar o servidor
function verificarInternet() {
  return new Promise((resolve) => {
    const req = https.get(APP_URL, { timeout: 5000 }, () => resolve(true));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: APP_NAME,
    icon: fs.existsSync(path.join(__dirname, 'icon.png')) ? path.join(__dirname, 'icon.png') : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#1e3a5f',
  });

  Menu.setApplicationMenu(null);

  win.loadURL(APP_URL);

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Links externos abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Sem internet — mostra página offline e inicia verificação automática
  win.webContents.on('did-fail-load', (_event, errorCode) => {
    if (errorCode === -2 || errorCode === -106 || errorCode === -3) {
      offlineMode = true;
      win.loadFile(path.join(__dirname, 'offline.html'));
      iniciarRetryAutomatico(win);
    }
  });

  // Carregou com sucesso — para o retry automático
  win.webContents.on('did-finish-load', () => {
    if (offlineMode) {
      offlineMode = false;
      pararRetryAutomatico();
    }
  });

  // Botão "Tentar novamente" da página offline
  ipcMain.on('retry-connection', () => {
    win.loadURL(APP_URL);
  });

  // F5 — atualiza a página atual
  // Ctrl+R — também atualiza
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'F5' || (input.control && input.key === 'r')) {
        if (offlineMode) {
          win.loadURL(APP_URL);
        } else {
          win.webContents.reload();
        }
      }
    }
  });
}

// Tenta reconectar automaticamente a cada 30 segundos quando offline
function iniciarRetryAutomatico(win) {
  pararRetryAutomatico();
  retryTimer = setInterval(async () => {
    const temInternet = await verificarInternet();
    if (temInternet) {
      win.loadURL(APP_URL);
    }
  }, 30000); // verifica a cada 30 segundos
}

function pararRetryAutomatico() {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  pararRetryAutomatico();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
