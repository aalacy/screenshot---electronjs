const moment = require("moment");
const fs = require("fs");
const path = require("path");
const os = require('os');
const log = require('electron-log');
let userInfo = undefined;

const readUserInfo = (app) => {
    if (userInfo) return userInfo;

    let configPath = path.join(app.getPath("userData"), "config.json");
    try {
        userInfo = JSON.parse(fs.readFileSync(configPath));
    } catch {
        log.info("userinfo does not exist");
    }
    log.info("read userInfo", userInfo);
    return userInfo;
};

const writeuserInfo = (app, userName) => {
    log.info('userName from browser', userName)
    const hostName = os.hostname()
    let configPath = path.join(app.getPath("userData"), "config.json");
    userInfo = { userName, hostName }
    fs.writeFileSync(configPath, JSON.stringify(userInfo));
    return userInfo
};

const info = () => {
    const fileName = "image_" + moment().format("HH_mm_ss") + ".png";
    const date = moment().format("YYYY-MM-DD");
    const hostName = os.hostname()
    return { fileName, date, hostName };
};

module.exports = {
    info,
    readUserInfo,
    writeuserInfo,
};
