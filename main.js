"use strict";

let gl;
let shProgram;
let spaceball;
let stereoCam;
let video;
let iTextureWebCam = null;

let surface;

let fullscreenQuad = {
    iVertexBuffer: null,
    iTexCoordBuffer: null
};

let sensorSocket = null;
let orientationMatrix = m4.identity();
let calibration = null;

function init() {
    let canvas = document.getElementById("webglcanvas");
    try {
        gl = canvas.getContext("webgl");
        if (!gl) throw "Browser does not support WebGL";
    } catch(e) {
        alert("Could not initialize WebGL context: " + e);
        return;
    }

    initShaders();

    surface = new ModelSurface();
    surface.CreateSurfaceData();

    initFullScreenQuad();

    stereoCam = new StereoCamera(
        0.7,
        14.0,
        canvas.width / canvas.height,
        0.4,
        8.0,
        20.0
    );

    gl.enable(gl.DEPTH_TEST);

    video = document.createElement('video');
    video.autoplay = true;
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            const { width, height } = stream.getVideoTracks()[0].getSettings();
            iTextureWebCam = CreateWebCamTexture(width, height);
            video.play();
        })
        .catch(err => console.log(err));

    spaceball = new TrackballRotator(canvas, drawScene, 0);

    setInterval(drawScene, 1000 / 30);
}


function connectSensor() {
    if (sensorSocket) sensorSocket.close();

    const ip = document.getElementById("sensorIp").value.trim();
    if (!ip) {
        alert("Введіть IP телефону");
        return;
    }

    const url = `ws://${ip}:8080/sensor/connect?type=android.sensor.accelerometer`;
    sensorSocket = new WebSocket(url);

    sensorSocket.onopen = () => setStatus("Connected", true);
    sensorSocket.onclose = () => setStatus("Disconnected", false);
    sensorSocket.onerror = () => setStatus("Error", false);
    sensorSocket.onmessage = handleSensorData;
}

function setStatus(txt, ok) {
    const el = document.getElementById("sensorStatus");
    el.textContent = txt;
    el.className = ok ? "connected" : "disconnected";
}

let sp = 0, sr = 0;
const ALPHA = 0.15;

function handleSensorData(evt) {
    let msg;
    try {
        msg = JSON.parse(evt.data);
    } catch {
        return;
    }

    const v = Array.isArray(msg) ? msg :
        (Array.isArray(msg.values) ? msg.values : null);
    if (!v || v.length < 3) return;

    const [ax, ay, az] = v;

    const pitch = Math.atan2(-ax, Math.sqrt(ay*ay + az*az));
    const roll  = Math.atan2(ay,  az);

    sp = ALPHA * pitch + (1 - ALPHA) * sp;
    sr = ALPHA * roll  + (1 - ALPHA) * sr;

    if (calibration === null) calibration = { pitch: sp, roll: sr };

    const dPitch = sp - calibration.pitch;
    const dRoll  = sr - calibration.roll;

    const rotX = m4.xRotation(-dRoll);
    const rotY = m4.yRotation( dPitch);
    orientationMatrix = m4.multiply(rotY, rotX);
}

function calibrateOrientation() { calibration = null; }

function initShaders() {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vertexShaderSource);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Vertex shader error: " + gl.getShaderInfoLog(vsh));
    }

    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Fragment shader error: " + gl.getShaderInfoLog(fsh));
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error: " + gl.getProgramInfoLog(prog));
    }

    gl.useProgram(prog);

    shProgram = {};
    shProgram.prog = prog;
    shProgram.iAttribVertex     = gl.getAttribLocation(prog, "aVertex");
    shProgram.iAttribTexCoord   = gl.getAttribLocation(prog, "aTexCoord");
    shProgram.iModelViewMatrix  = gl.getUniformLocation(prog, "uModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "uProjectionMatrix");
    shProgram.iUseTexture       = gl.getUniformLocation(prog, "uUseTexture");
    shProgram.iSampler          = gl.getUniformLocation(prog, "uSampler");
    shProgram.iColor            = gl.getUniformLocation(prog, "uColor");
    shProgram.iFullScreenQuad   = gl.getUniformLocation(prog, "uFullScreenQuad");
}



function initFullScreenQuad() {
    fullscreenQuad.iVertexBuffer = gl.createBuffer();
    fullscreenQuad.iTexCoordBuffer = gl.createBuffer();

    let quadVerts = new Float32Array([
        -1, -1,  0,
        1, -1,  0,
        1,  1,  0,

        -1, -1,  0,
        1,  1,  0,
        -1,  1,  0
    ]);
    let quadTex = new Float32Array([
        0, 0,
        1, 0,
        1, 1,

        0, 0,
        1, 1,
        0, 1
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuad.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuad.iTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadTex, gl.STATIC_DRAW);
}


function drawScene() {
    if (!gl) return;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (iTextureWebCam && video.readyState === video.HAVE_ENOUGH_DATA) {
        gl.bindTexture(gl.TEXTURE_2D, iTextureWebCam);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, video);
    }

    drawBackground();

    let modelView = spaceball.getViewMatrix();
    modelView = m4.multiply(orientationMatrix, modelView);

    let leftFrustum = stereoCam.calcLeftFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, leftFrustum);

    let translateLeftEye = m4.translation(stereoCam.eyeSeparation / 2, 0, 0);
    let matSurfaceLeft = m4.multiply(translateLeftEye, modelView);
    matSurfaceLeft = m4.multiply(m4.translation(0, 0, -10), matSurfaceLeft);

    gl.colorMask(true, false, false, true);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 0);

    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matSurfaceLeft);
    gl.uniform1i(shProgram.iUseTexture, 0);
    gl.uniform4f(shProgram.iColor, 0.5, 0.5, 0.5, 1.0);
    surface.DrawFilled();

    gl.uniform4f(shProgram.iColor, 1.0, 0.0, 0.0, 1.0);
    surface.Draw();

    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.clear(gl.DEPTH_BUFFER_BIT);

    let rightFrustum = stereoCam.calcRightFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, rightFrustum);

    let translateRightEye = m4.translation(-stereoCam.eyeSeparation / 2, 0, 0);
    let matSurfaceRight = m4.multiply(translateRightEye, modelView);
    matSurfaceRight = m4.multiply(m4.translation(0, 0, -10), matSurfaceRight);

    gl.colorMask(false, true, true, true);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 0);

    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matSurfaceRight);
    gl.uniform1i(shProgram.iUseTexture, 0);
    gl.uniform4f(shProgram.iColor, 0.5, 0.5, 0.5, 1.0);
    surface.DrawFilled();

    gl.uniform4f(shProgram.iColor, 0.0, 1.0, 1.0, 1.0);
    surface.Draw();

    gl.disable(gl.POLYGON_OFFSET_FILL);

    gl.colorMask(true, true, true, true);
}


function drawBackground() {
    gl.useProgram(shProgram.prog);

    gl.uniform1i(shProgram.iFullScreenQuad, 1);

    let identity = m4.identity();
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, identity);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, identity);

    gl.uniform1i(shProgram.iUseTexture, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, iTextureWebCam);
    gl.uniform1i(shProgram.iSampler, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuad.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuad.iTexCoordBuffer);
    gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribTexCoord);

    gl.uniform4f(shProgram.iColor, 1, 1, 1, 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.uniform1i(shProgram.iFullScreenQuad, 0);
}


function updateStereoParams() {
    let eyeSep = parseFloat(document.getElementById("eyeSeparation").value);
    let conv   = parseFloat(document.getElementById("convergence").value);
    let fov    = parseFloat(document.getElementById("fov").value);
    let nearC  = parseFloat(document.getElementById("nearClip").value);
    let farC   = parseFloat(document.getElementById("farClip").value);

    document.getElementById("eyeSepVal").innerText  = eyeSep.toFixed(2);
    document.getElementById("convVal").innerText    = conv.toFixed(1);
    document.getElementById("fovVal").innerText     = fov.toFixed(2);
    document.getElementById("nearVal").innerText    = nearC.toFixed(1);
    document.getElementById("farVal").innerText     = farC.toFixed(0);

    stereoCam.eyeSeparation = eyeSep;
    stereoCam.convergence = conv;
    stereoCam.FOV = fov;
    stereoCam.nearClippingDistance = nearC;
    stereoCam.farClippingDistance = farC;

    drawScene();
}
