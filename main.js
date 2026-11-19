const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');

const W_OPEN = 362, W_TAB = 14;
let win = null, tray = null, primary = null;

const rightX = w => primary.x + primary.width - w;
function computePrimary(){ primary = screen.getPrimaryDisplay().workArea; }

function createWindow(){
  computePrimary();
  win = new BrowserWindow({
    width: W_TAB, height: primary.height, x: rightX(W_TAB), y: primary.y,
    frame: false, transparent: true, alwaysOnTop: true, resizable: false,
    skipTaskbar: false, hasShadow: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));

  win.on('blur', () => { if (win && !win.isDestroyed()) win.webContents.send('blur'); });
  win.on('closed', () => { win = null; });
}

function sendToggle(){
  if (win && !win.isDestroyed()){ win.show(); win.webContents.send('toggle'); }
}

function buildTray(){
  const tpl = path.join(__dirname, 'assets', 'trayTemplate.png');
  try { tray = new Tray(nativeImage.createFromPath(tpl)); }
  catch (e) { tray = new Tray(nativeImage.createEmpty()); }
  tray.setToolTip('SideNote · 侧边备忘');
  tray.on('click', sendToggle);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 / 隐藏', click: sendToggle },
    { type: 'separator' },
    { label: '新建一条', click: () => { if (win){ win.show(); win.webContents.send('new'); } } },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]));
}

function buildDock(){
  if (app.dock){
    try { app.dock.setIcon(nativeImage.createFromPath(path.join(__dirname, 'assets', 'dock.png'))); } catch (e) {}
    app.dock.setMenu(Menu.buildFromTemplate([
      { label: '显示 / 隐藏', click: sendToggle },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() }
    ]));
  }
  app.on('activate', sendToggle);
}

app.whenReady().then(() => {
  createWindow();
  buildTray();
  buildDock();

  globalShortcut.register('CommandOrControl+E', sendToggle);
  globalShortcut.register('CommandOrControl+N', () => { if (win){ win.show(); win.webContents.send('new'); } });

  ipcMain.on('ready', () => {});
  ipcMain.on('expand', () => { if (win && !win.isDestroyed()) win.setBounds({ x: rightX(W_OPEN), width: W_OPEN }, true); });
  ipcMain.on('collapseNow', () => { if (win && !win.isDestroyed()) win.setBounds({ x: rightX(W_TAB), width: W_TAB }, true); });

  screen.on('display-metrics-changed', () => {
    if (!win) return;
    computePrimary();
    const b = win.getBounds();
    win.setBounds({ x: rightX(b.width), y: primary.y, width: b.width, height: primary.height }, true);
  });
});

app.on('window-all-closed', () => { /* 常驻：关闭窗口不退出 */ });
app.on('will-quit', () => globalShortcut.unregisterAll());
