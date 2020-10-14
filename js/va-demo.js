const va = VisionAppster;
window.addEventListener("DOMContentLoaded", init, false);
let api;

const apps = {
    "com.visionappster.styletransfer/1": {
        "name": "Style Transfer",
        "functionName": "mosaic",
        "resultHandler": handleStyleResult,
        "resultElement": "#result-image-style",
        "sourceElement": "#source-image-style"
    },
    "com.visionappster.resnet/1": {
        "name": "ResNet",
        "functionName": "classify",
        "resultHandler": handleResnetResult,
        "resultElement": "#resultTable",
        "sourceElement": "#source-image-resnet"
    },
    "com.visionappster.yolo/1": {
        "name": "Yolo",
        "functionName": "classify",
        "resultHandler": handleYoloResult,
        "resultElement": "#resultImage",
        "sourceElement": "#source-image-yolo"
    },
    "com.visionappster.qrcodereading/1": {
        "name": "QR",
        "functionName": "readCode",
        "resultHandler": handleQrResult,
        "resultElement": "#resultTable",
        "sourceElement": "#source-image-qr"
    }
}

let lastImage;
let lastBlob;

function $(id) {
    return document.querySelector(id);
}

function setVisible(element, visible) {
    (typeof element == 'string' ? $(element) : element).style.display = visible ? 'block' : 'none';
}

function cameraActive() {
    return !!$('#video').srcObject;
}

function resendLastImage() {
    if (!cameraActive() && lastImage) {
        const app = apps[activeAppId];
        app.api[app.functionName](lastImage, app.resultHandler, console.log);
    }
}

function sendImage(image) {
    lastImage = image;
    const app = apps[activeAppId];
    const handleResult = function(result) {
        app.resultHandler(result);
        //if (cameraActive)
        //    takeImageFromCamera();
    };
    app.api[app.functionName](image, handleResult, console.log);
}

function clearCanvas(id) {
    const canvas = $(id);
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function clearOutputImage() {
    clearCanvas('#resultImage');
}

function clearOutputTable() {
    $('#resultTableHead').innerHTML = '';
    $('#resultTableBody').innerHTML = '';
}

function clearOutput() {
    clearOutputImage();
    clearOutputTable();
}

function activateStyle() {
    activeAppId = "com.visionappster.styletransfer/1";
}

function loadLocalFileForStyle() {
    activateStyle();
    loadLocalFile();
}

function grabWebFrameForStyle() {
    activateStyle();
    connectWebcam();
}

function activateResnet() {
    activeAppId = "com.visionappster.resnet/1";
}

function loadLocalFileForResnet() {
    activateResnet();
    loadLocalFile();
}

function grabWebFrameForResnet() {
    activateResnet();
    connectWebcam();
}

function activateYolo() {
    activeAppId = "com.visionappster.yolo/1";
}

function loadLocalFileForYolo() {
    activateYolo();
    loadLocalFile();
}

function grabWebFrameForYolo() {
    activateYolo();
    connectWebcam();
}

function activateQr() {
    activeAppId = "com.visionappster.qrcodereading/1";
}

function loadLocalFileForQr() {
    activateQr();
    loadLocalFile();
}

function grabWebFrameForQr() {
    activateQr();
    connectWebcam();
}

async function init() {

    //$('#loadUrlOption').addEventListener('click', loadWebUrl, false);
    $('#image-input').addEventListener('change', sendLocalFile, false);

    for (const appId in apps) {
        const ctrl = new va.RemoteObject('/some/path/apis/' + appId);
        apps[appId].api = await ctrl.connect();
    }
}

function connectWebcam() {
    lastImage = null;
    const video = $('#video');
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
        video.addEventListener('playing', takeImageFromCamera);
    }).catch(e => console.log(e));
}

function disconnectWebcam() {
    lastImage = null;
    let stream = video.srcObject;
    if (stream) {
        stream.getTracks()[0].stop();
        video.srcObject = null;
    }
}

function takeImageFromCamera() {
    const video = $('#video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (canvas.width === 0 || canvas.height === 0) {
        return;
    }
    var context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    const img = va.Image.fromImageData(context.getImageData(0, 0, canvas.width, canvas.height));

    const sourceCanvas = $(apps[activeAppId].sourceElement);
    sourceCanvas.width = video.videoWidth;
    sourceCanvas.height = video.videoHeight;
    const ctx = sourceCanvas.getContext('2d');
    const imageData = img.toImageData(ctx);
    drawImage(imageData, sourceCanvas);
    const imgElement = sourceCanvas.parentElement.firstElementChild;
    imgElement.style.opacity = 0;
    sendImage(img);
}

function loadLocalFile() {
    disconnectWebcam();
    const input = $('#image-input');
    input.click();
}

async function sendLocalFile(event) {
    var files = event.target.files;
    const sourceCanvas = $(apps[activeAppId].sourceElement);
    const imgElement = sourceCanvas.parentElement.firstElementChild;
    imgElement.style.opacity = 0;
    sourceCanvas.width = imgElement.clientWidth;
    sourceCanvas.height = imgElement.clientHeight;
    for (let file of files) {
        lastBlob = file;
        drawImage(await va.Image.htmlImageFromBlob(file), sourceCanvas);
        sendImage(await va.Image.fromBlob(file));
    }
}

function loadWebUrl() {
    disconnectWebcam();
    const url = prompt("Url:");
    if (!url)
        return;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", 'https://cors-anywhere.herokuapp.com/' + url);
    xhr.responseType = "blob";
    xhr.onload = async() => {
        const blob = xhr.response;
        lastBlob = blob;
        drawImage(await va.Image.htmlImageFromBlob(blob), $(apps[activeAppId].sourceElement));
        sendImage(await va.Image.fromBlob(blob));
    };
    xhr.send();
}

function handleStyleResult(img) {
    const sourceCanvas = $('#source-image-style');
    const resultCanvas = $('#result-image-style');
    const size = Math.max(sourceCanvas.width, sourceCanvas.height);
    resultCanvas.width = size;
    resultCanvas.height = size;
    const imgElement = resultCanvas.parentElement.firstElementChild;
    imgElement.style.opacity = 0;
    const ctx = resultCanvas.getContext('2d');
    const imageData = img.toImageData(ctx);
    drawImage(imageData, resultCanvas);
}

function handleResnetResult(classifications) {
    var html = "";
    for (var i = 0; i < classifications.rows; ++i) {
        var name = classifications.entry(i, 0);
        var confidence = classifications.entry(i, 1);
        if (name) {
            html +=
                '  <tr>\n' +
                '    <td class="modelClass">' + name + '</td>\n' +
                '    <td class="confidence">' + confidence + '</td>\n' +
                '  </tr>\n';
        }
    }
    $('#result-table-body-resnet').innerHTML = html;
}

function toDrawable(imageData) {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = imageData.width;
    newCanvas.height = imageData.height;
    newCanvas.getContext('2d').putImageData(imageData, 0, 0);
    return newCanvas;
}

function drawImage(img, canvas, overlay) {
    if (img instanceof va.Image) {
        img = img.toImageData();
    }
    if (img instanceof ImageData) {
        img = toDrawable(img);
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Scale and center
    const [width, height] = img instanceof Image ? [img.naturalWidth, img.naturalHeight] : [img.width, img.height];
    const factor = Math.min(1, canvas.width / width, canvas.height / height);
    ctx.scale(factor, factor);
    const diffX = (canvas.width - width * factor) / 2;
    const diffY = (canvas.height - height * factor) / 2;
    ctx.translate(diffX, diffY);
    ctx.drawImage(img, 0, 0, width, height);
    if (overlay) {
        overlay(ctx, factor);
    }
    ctx.translate(-diffX, -diffY);
    ctx.scale(1 / factor, 1 / factor);
}

async function handleYoloResult(tbl) {
    try {
        const sourceCanvas = $('#source-image-yolo');
        const resultCanvas = $('#result-image-yolo');
        const imgElement = resultCanvas.parentElement.firstElementChild;
        imgElement.style.opacity = 0;
        resultCanvas.width = sourceCanvas.width;
        resultCanvas.height = sourceCanvas.height;
        const img = lastImage.info.id === va.Image.Type.Compressed ? await va.Image.htmlImageFromBlob(lastBlob) : lastImage;
        drawImage(img, resultCanvas, (ctx, factor) => {
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ff0000';
            const fontSize = Math.round(10 / factor);
            ctx.font = fontSize + 'px sans-serif';
            for (let i = 0; i < tbl.rows; ++i) {
                const e = c => tbl.entry(i, c);
                let x = e(0);
                let y = e(1);
                ctx.strokeRect(x, y, e(2), e(3));
                const className = e(4);
                const sz = ctx.measureText(className);
                ctx.fillStyle = '#ff0000';
                if (x < 0) {
                    x = 0;
                }
                if (y < fontSize + 6) {
                    y = fontSize + 6;
                }
                ctx.fillRect(x, y - fontSize - 6, sz.width + 10, fontSize + 6);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(className, x + 5, y - fontSize / 2);
            }
        });
    } catch (e) {
        console.log(e);
    }
}

function handleQrResult(table) {
    const tableElement = $('#qr-result-table');
    const imgElement = tableElement.parentElement.firstElementChild;
    imgElement.style.display = 'none';
    var html = "";

    for (var i = 0; i < table.rows; ++i) {
        var code = table.entry(i, 0);
        if (code)
            html += '<tr><td>' + code + '</td></tr>';
    }
    if (html) {
        html = '<tr><th>Code</th></tr>' + html;
    }
    tableElement.innerHTML = html;
}
