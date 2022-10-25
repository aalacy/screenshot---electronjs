const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const Path = require("path");
const log = require("electron-log");

const { info, takeScreenshot } = require("./utils");

contextBridge.exposeInMainWorld("electronAPI", {
    send: (channel, data) => ipcRenderer.invoke(channel, data),
    handle: (channel, callable, event, data) => ipcRenderer.on(channel, callable(event, data)),
});

const drawImage = (base64data) => {
    document.getElementById("my-preview").setAttribute("src", base64data);
    const { datetime, fileName } = info();
    document.getElementById("datetime").innerHTML = datetime;
    const path = Path.resolve(__dirname, "tmp", fileName);
    const imgBuffer = Buffer.from(base64data.replace("data:image/png;base64,", ""), "base64");
    fs.writeFileSync(path, imgBuffer);
    log.info("[save] image", path);
    ipcRenderer.invoke("upload", path);
};

ipcRenderer.on("LOAD_USER_INFO", (event) => {
    log.info("[show userinfo modal]");
    document.getElementById("openModal").style.display = "block";
});

ipcRenderer.on("UPDATE_SERVER_INFO", (event, serverURL) => {
    log.info("[show update server modal], serverURL: ", serverURL);
    document.getElementById("openModal").style.display = "block";
    document.getElementById("userName").style.display = "none";
    document.getElementById("usernameLabel").style.display = "none";
    if (serverURL) {
        document.getElementById("serverURL").value = serverURL;
    }
});

ipcRenderer.on("TAKE_SCREENSHOT", async (event) => {
    const base64data = await takeScreenshot();
    drawImage(base64data);
});

ipcRenderer.on("SET_SOURCE", async (event, sourceId) => {
    log.info("[capture] image", sourceId);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: sourceId,
                    minWidth: 1280,
                    maxWidth: 1280,
                    minHeight: 1024,
                    maxHeight: 1024,
                },
            },
        });

        handleStream(
            stream,
            (base64data) => {
                // Draw image in the img tag
                drawImage(base64data);
            },
            "image/png"
        );
    } catch (e) {
        handleError(e);
    }
});

const handleStream = (stream, callback, imageFormat) => {
    // Create hidden video tag
    var video = document.createElement("video");
    video.style.cssText = "position:absolute;top:-10000px;left:-10000px;";
    const videoHeight = 1024;
    const videoWidth = 1280;
    imageFormat = imageFormat || "image/jpeg";

    // Event connected to stream
    video.onloadedmetadata = function () {
        // Set video ORIGINAL height (screenshot)
        video.style.height = videoHeight + "px"; // videoHeight
        video.style.width = videoWidth + "px"; // videoWidth

        video.play();

        // Create canvas
        var canvas = document.createElement("canvas");
        canvas.captureStream(1);
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        var ctx = canvas.getContext("2d");
        // Draw video on canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        callback(canvas.toDataURL(imageFormat));
        // Remove hidden video tag
        video.remove();
        try {
            // Destroy connect to stream
            stream.getTracks()[0].stop();
        } catch (e) {}
    };

    video.srcObject = stream;
    document.body.appendChild(video);
};

const handleError = function (e) {
    log.info(e);
};
