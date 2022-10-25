const { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } = require("electron");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const log = require("electron-log");
const Path = require("path");
const isDev = require("electron-is-dev");

const { info, readUserInfo, writeuserInfo, registerStartupApp } = require("./utils");

const CAPTURE_INTERVAL = 10000;
let captureJob = null;
let tray = null;
let userInfo = null;

const tmpDir = Path.resolve(__dirname, "tmp");
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
}

function createTray() {
    const icon = path.join(__dirname, "/app.png"); // required.
    const trayicon = nativeImage.createFromPath(icon);
    tray = new Tray(trayicon.resize({ width: 16 }));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Show App",
            click: () => {
                if (!mainWindow?.isDestroyed()) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createWindow();
                    mainWindow.show();
                }
            },
        },
        {
            label: "Update Server URL",
            click: () => {
                if (!mainWindow?.isDestroyed()) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.focus();
                    userInfo = readUserInfo(app);
                    mainWindow.webContents.send("UPDATE_SERVER_INFO", userInfo.serverURL);
                }
            },
        },
        {
            label: "Hide",
            click: () => {
                // app.quit(); // actually quit the app.
                if (!mainWindow?.isDestroyed()) mainWindow.hide();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip("Track");
}

let mainWindow;
function createWindow() {
    if (!tray) {
        // if tray hasn't been created already.
        createTray();
    }

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: isDev,
        frame: isDev,
        backgroundThrottling: isDev,
        minWidth: 200,
        minHeight: 200,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            devTools: isDev,
            sandbox: false,
            nodeIntegrationInWorker: true,
            nodeIntegration: true,
        },
    });

    mainWindow.loadFile("index.html");

    mainWindow.on("closed", () => {});

    mainWindow.on("show", () => {});

    !isDev && Menu.setApplicationMenu(null);
}

function startCaptureImage() {
    if (captureJob) return;

    log.info("[startCaptureImage]");

    captureJob = setInterval(async () => {
        // cause memory leak
        // desktopCapturer.getSources({ types: ["screen"] }).then(async (sources) => {
        //     for (const source of sources) {
        //         if (source.name === "Entire screen") {
        //             mainWindow && mainWindow.webContents.send("SET_SOURCE", source.id);
        //             return;
        //         }
        //     }
        // });
        // mainWindow && mainWindow.webContents.send("TAKE_SCREENSHOT");
    }, CAPTURE_INTERVAL);
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    app.on("second-instance", (event, argv, cwd) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });

    ipcMain.handle("upload", async (event, imgData) => {
        log.info("[upload file to the server] ", imgData);
        await handleUpload(imgData);
    });

    ipcMain.handle("set-username", async (event, data) => {
        log.info("[set-username event] data", data);
        registerStartupApp()
        writeuserInfo(app, data.userName, data.serverURL);
        startCaptureImage();
        mainWindow.hide();
    });

    userInfo = readUserInfo(app);
    if (!userInfo) {
        mainWindow.webContents.send("LOAD_USER_INFO");
        mainWindow.show();
    } else if (!captureJob) {
        startCaptureImage();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        // app.quit();
        if (!mainWindow?.isDestroyed()) mainWindow.hide();
    }
});

const handleUpload = async (path) => {
    try {
        const config = {
            headers: {
                "content-type": "multipart/form-data",
            },
        };
        const file = fs.readFileSync(path);
        const url = userInfo.serverURL + "/upload";
        try {
            const result = await axios.post(url, { file, ...info(), ...userInfo }, config);
            log.info("[response:] ", result.status, result.data);
        } catch (e) {
            log.info("[Error in electron]", e);
        } finally {
            fs.unlinkSync(path);
        }
    } catch (error) {
        console.error(error);
    }
};
