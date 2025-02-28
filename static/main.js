const { app, BrowserWindow, globalShortcut } = require('electron');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');

    // Register global shortcuts
    globalShortcut.register('Shift+F1', () => {
        mainWindow.webContents.send('voice-input');
    });

    globalShortcut.register('Shift+F2', () => {
        mainWindow.webContents.send('toggle-mute');
    });
});

app.on('will-quit', () => {
    // Unregister all shortcuts when the app quits
    globalShortcut.unregisterAll();
});