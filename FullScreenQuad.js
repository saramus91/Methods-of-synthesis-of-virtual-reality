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

window.initFullScreenQuad = initFullScreenQuad;