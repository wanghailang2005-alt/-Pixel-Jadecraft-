const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'jadecraft', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

app.setName('Pixel Jadecraft');

app.whenReady().then(() => {
  const root = path.join(app.getAppPath(), 'dist');
  protocol.handle('jadecraft', request => {
    const url = new URL(request.url);
    const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (url.host !== 'game' || !file.startsWith(`${root}${path.sep}`)) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(file).href);
  });

  function createWindow() {
    const window = new BrowserWindow({
      title: '像素琢玉 · Pixel Jadecraft',
      width: 1440,
      height: 960,
      minWidth: 960,
      minHeight: 680,
      backgroundColor: '#172b2b',
      autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    });
    window.setMenu(null);
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) shell.openExternal(url);
      return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('jadecraft://game/')) event.preventDefault();
    });
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') {
        event.preventDefault();
        window.setFullScreen(!window.isFullScreen());
      }
    });
    window.loadURL('jadecraft://game/index.html');
  }

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
