const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const axios = require('axios'); // You'll need to install this: npm install axios

// Flask backend URL
const FLASK_API_URL = 'http://127.0.0.1:5000';

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

    // Register global shortcuts that work even when the app is not in focus
    // Shift+F1 to toggle speaking
    globalShortcut.register('Shift+F1', async () => {
        try {
            const response = await axios.post(`${FLASK_API_URL}/toggle_speak`);
            const isSpeaking = response.data.speaking;
            
            // Send event to renderer to update UI
            mainWindow.webContents.send('speaking-toggled', isSpeaking);
            
            console.log(`Speaking toggled: ${isSpeaking ? 'ON' : 'OFF'}`);
        } catch (error) {
            console.error('Error toggling speak:', error.message);
        }
    });

    // Shift+F2 to toggle listening
    globalShortcut.register('Shift+F2', async () => {
        try {
            const response = await axios.post(`${FLASK_API_URL}/toggle_listen`);
            const isListening = response.data.listening;
            
            // Send event to renderer to update UI
            mainWindow.webContents.send('listening-toggled', isListening);
            
            console.log(`Listening toggled: ${isListening ? 'ON' : 'OFF'}`);
        } catch (error) {
            console.error('Error toggling listen:', error.message);
        }
    });

    // Handle unregistering shortcuts when the app quits
    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
});

// Handle IPC messages from the renderer
ipcMain.on('check-status', async (event) => {
    try {
        const response = await axios.get(`${FLASK_API_URL}/get_status`);
        event.reply('status-update', response.data);
    } catch (error) {
        console.error('Error checking status:', error.message);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});