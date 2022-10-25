const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");
const os = require("os");
const log = require("electron-log");
const screenshot = require("farateam-screenshot-desktop");
let userInfo = undefined;

const readUserInfo = (app) => {
    if (userInfo) return userInfo;

    let configPath = path.join(app.getPath("userData"), "config.json");
    try {
        userInfo = JSON.parse(fs.readFileSync(configPath));
    } catch {
        log.info("userinfo does not exist");
    }
    log.info("[readUserInfo]", userInfo);
    return userInfo;
};

const writeuserInfo = (app, userName, serverURL) => {
    log.info("userName, serverURL from browser", userName, serverURL);
    const hostName = os.hostname();
    let configPath = path.join(app.getPath("userData"), "config.json");
    let newUserInfo = { ...userInfo, hostName };
    {
        userName, hostName, serverURL;
    }
    if (userName) {
        newUserInfo = { ...newUserInfo, userName };
    }
    if (serverURL) {
        newUserInfo = { ...newUserInfo, serverURL };
    }
    fs.writeFileSync(configPath, JSON.stringify(newUserInfo));
    return userInfo;
};

const info = () => {
    const curDate = moment().tz("Asia/Shanghai");
    const fileName = "screen_" + curDate.format("HH_mm_ss") + ".png";
    const date = curDate.format("YYYY-MM-DD");
    const datetime = curDate.format("YYYY-MM-DD HH:mm:ss");
    const hostName = os.hostname();
    console.log("fileName", fileName, date, datetime);
    return { fileName, date, datetime, hostName };
};

const takeScreenshot = async () => {
    log.info("[take screenshot]");
    const image = await screenshot({ format: "png" });
    const dataImagePrefix = `data:image/png;base64,`;
    return `${dataImagePrefix}${image.toString("base64")}`;
};

const registerStartupForLinux = () => {
    const launchDesktopIni = [
        "[Desktop Entry]",
        `Type=Application`,
        `Exec=${process.cwd()}/tracker`,
        `Terminal=false`,
        `StartupNotify=false`,
        `Comment=Tracker Desktop`,
        `GenericName=Tracker Client for Linux`,
        `X-GNOME-Autostart-enabled=true`,
        `Name[en_US]=Tracker`,
        `Name=Tracker`,
    ].join("\r\n");
    log.info("[registerStartupForLinux]", launchDesktopIni);
    fs.writeFileSync(path.resolve(os.homedir(), ".config/autostart/tracker.desktop"), launchDesktopIni);
};

const registerStartupForWindow = () => {
    log.info("[registerStartupForWindow]");
};

const registerStartupForMac = () => {
    log.info("[registerStartupForMac]");
};

const registerStartupApp = () => {
    log.info("[registerStartupApp]");

    if (process.platform === "linux") {
        registerStartupForLinux();
    } else if (process.platform === "darwin") {
        registerStartupForMac();
    } else if (process.platform === "win32") {
        registerStartupForWindow();
    } else {
        log.error("[registerStartupApp] unsupported OS type");
    }
};

module.exports = {
    info,
    readUserInfo,
    writeuserInfo,
    takeScreenshot,
    registerStartupApp,
};
