const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
    // Get primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Create the browser window in kiosk mode
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreen: true,
        kiosk: true, // Kiosk mode - prevents user from exiting
        frame: false, // No window frame
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#000000',
        show: false, // Don't show until ready
    });

    // Load the app
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173/player');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
            hash: '/player'
        });
    }

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.setFullScreen(true);
    });

    // Prevent window from being closed
    mainWindow.on('close', (event) => {
        // In production, prevent closing
        if (process.env.NODE_ENV !== 'development') {
            event.preventDefault();
            // Optionally minimize instead
            // mainWindow.minimize();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Prevent navigation away from player
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (!parsedUrl.pathname.startsWith('/player')) {
            event.preventDefault();
        }
    });

    // Prevent new window creation
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });

    // Handle external links
    mainWindow.webContents.on('new-window', (event) => {
        event.preventDefault();
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Auto-updater (optional, configure in electron-builder.yml)
if (process.env.NODE_ENV === 'production') {
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
        console.log('Update available');
    });
    
    autoUpdater.on('update-downloaded', () => {
        autoUpdater.quitAndInstall();
    });
}

// Handle app crashes - restart automatically
app.on('render-process-gone', (event, webContents, details) => {
    console.error('Render process crashed:', details);
    // Restart the window after a short delay
    setTimeout(() => {
        if (mainWindow) {
            mainWindow.reload();
        } else {
            createWindow();
        }
    }, 3000);
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, focus our window instead
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// Auto-launch on system startup (Windows/Linux)
if (process.platform !== 'darwin') {
    app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: false,
    });
}
