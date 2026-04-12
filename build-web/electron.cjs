const { app, BrowserWindow, Menu, ipcMain, clipboard } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

let mainWindow;
let floatingWidget;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:8080'
    : `file://${path.join(__dirname, '../build-web/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle minimize to floating widget
  mainWindow.on('minimize', () => {
    mainWindow.hide();
    if (floatingWidget && !floatingWidget.isDestroyed()) {
      floatingWidget.show();
      floatingWidget.focus();
    }
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    // Instead of closing, minimize to tray
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (floatingWidget && !floatingWidget.isDestroyed()) {
        floatingWidget.show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const createFloatingWidget = () => {
  floatingWidget = new BrowserWindow({
    width: 70,
    height: 70,
    minWidth: 70,
    minHeight: 70,
    maxWidth: 70,
    maxHeight: 70,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const startUrl = isDev
    ? 'http://localhost:8080?widget=true'
    : `file://${path.join(__dirname, '../build-web/index.html')}?widget=true`;

  floatingWidget.loadURL(startUrl);

  // Store position in user preferences (simple approach)
  const mainDisplay = require('electron').screen.getPrimaryDisplay();
  floatingWidget.setPosition(mainDisplay.bounds.width - 100, 20);

  floatingWidget.on('closed', () => {
    floatingWidget = null;
  });
};

app.on('ready', () => {
  createWindow();
  createFloatingWidget();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.isQuitting = true;
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for clipboard and other operations
ipcMain.handle('copy-to-clipboard', async (event, text) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC handler to restore main window from floating widget
ipcMain.handle('restore-main-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    if (floatingWidget && !floatingWidget.isDestroyed()) {
      floatingWidget.hide();
    }
  }
});

// IPC handler to minimize main window
ipcMain.handle('minimize-main-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

// IPC handler to close app
ipcMain.handle('quit-app', async () => {
  app.isQuitting = true;
  app.quit();
});
