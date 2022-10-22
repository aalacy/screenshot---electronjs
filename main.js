const { app, BrowserWindow, desktopCapturer, ipcMain, Menu, nativeImage, Tray } = require("electron");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const log = require("electron-log");
const Path = require("path");
const isDev = require("electron-is-dev");

const { info, readUserInfo, writeuserInfo, captureScreenShot } = require("./utils");

const SERVER_ADDR = "https://e804-66-154-105-41.ngrok.io";
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
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                } else {
                    createWindow();
                    mainWindow.show();
                }
            },
        },
        {
            label: "Quit",
            click: () => {
                // app.quit(); // actually quit the app.
                if (mainWindow) mainWindow.hide();
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
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            devTools: isDev,
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    mainWindow.loadFile("index.html");

    mainWindow.on("closed", function () {
        mainWindow = null;
        if (captureJob) clearInterval(captureJob);
    });
}

function captureImage() {
    if (captureJob) return;

    log.info("[captureImage]");

    captureJob = setInterval(() => {
        desktopCapturer.getSources({ types: ["screen"] }).then(async (sources) => {
            for (const source of sources) {
                if (source.name === "Entire screen") {
                    mainWindow.webContents.send("SET_SOURCE", source.id);
                    return;
                }
            }
        });
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
            mainWindow.focus();
        }
    });

    ipcMain.handle("upload", async (event, imgData) => {
        log.info("upload file to the server", imgData);
        await handleUpload(imgData);
    });

    ipcMain.handle("set-username", async (event, data) => {
        log.info("set-username event data", data);
        userInfo = writeuserInfo(app, data);
        captureImage();
        mainWindow.hide();
    });

    userInfo = readUserInfo(app);
    if (!userInfo) {
        mainWindow.webContents.send("LOAD_USER_INFO");
        mainWindow.show();
    } else if (!captureJob) {
        captureImage();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        // app.quit();
        if (mainWindow) mainWindow.hide();
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
        const url = SERVER_ADDR + "/upload";
        try {
            const result = await axios.post(url, { file, ...info(), ...userInfo }, config);
            log.info("response: ", result.status, result.data);
        } catch (e) {
            log.info("Error in electron", e);
        } finally {
            fs.unlinkSync(path);
        }
    } catch (error) {
        console.error(error);
    }
};
