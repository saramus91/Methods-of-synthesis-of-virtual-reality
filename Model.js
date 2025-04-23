function ModelSurface() {
    this.iVertexBuffer = gl.createBuffer();
    this.vertexList = [];
    this.uLineCount = 0;
    this.pointsPerULine = 0;
    this.vLineCount = 0;
    this.pointsPerVLine = 0;

    this.iTexCoordBuffer = gl.createBuffer();
    this.texCoordList = [];

    this.iFillIndexBuffer = null;
    this.fillIndices = [];
    this.fillIndexCount = 0;
    this.fillVertexCount = 0;

    this.CreateSurfaceData = function() {
        const a = 2;
        const c = 1.5;
        const theta = Math.PI / 8;
        const scale = 0.2;

        let du = Math.PI / 24;
        let dt = 0.2;

        this.uLineCount = Math.floor((2 * Math.PI) / du) + 1;
        this.pointsPerULine = Math.floor(4 / dt) + 1;

        for (let u = 0; u <= 2 * Math.PI + 0.0001; u += du) {
            for (let t = -2; t <= 2 + 0.0001; t += dt) {
                const x = scale * (a + t * Math.cos(theta) + c * t * t * Math.sin(theta)) * Math.cos(u);
                const y = scale * (a + t * Math.cos(theta) + c * t * t * Math.sin(theta)) * Math.sin(u);
                const z = scale * (-t * Math.sin(theta) + c * t * t * Math.cos(theta));
                this.vertexList.push(x, y, z);

                let uTex = (u / (2 * Math.PI));
                let vTex = (t + 2) / 4.0;
                this.texCoordList.push(uTex, vTex);
            }
        }
        this.fillVertexCount = this.uLineCount * this.pointsPerULine;

        this.vLineCount = Math.floor(4 / dt) + 1;
        this.pointsPerVLine = this.uLineCount;

        for (let t = -2; t <= 2 + 0.0001; t += dt) {
            for (let u = 0; u <= 2 * Math.PI + 0.0001; u += du) {
                const x = scale * (a + t * Math.cos(theta) + c * t * t * Math.sin(theta)) * Math.cos(u);
                const y = scale * (a + t * Math.cos(theta) + c * t * t * Math.sin(theta)) * Math.sin(u);
                const z = scale * (-t * Math.sin(theta) + c * t * t * Math.cos(theta));
                this.vertexList.push(x, y, z);

                let uTex = (u / (2 * Math.PI));
                let vTex = (t + 2) / 4.0;
                this.texCoordList.push(uTex, vTex);
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexList), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texCoordList), gl.STATIC_DRAW);

        for (let i = 0; i < this.uLineCount - 1; i++) {
            for (let j = 0; j < this.pointsPerULine - 1; j++) {
                let idx = i * this.pointsPerULine + j;
                this.fillIndices.push(idx, idx + this.pointsPerULine, idx + 1);
                this.fillIndices.push(idx + this.pointsPerULine, idx + this.pointsPerULine + 1, idx + 1);
            }
        }
        this.fillIndexCount = this.fillIndices.length;

        this.iFillIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iFillIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.fillIndices), gl.STATIC_DRAW);
    };

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoord);

        for (let i = 0; i < this.uLineCount; i++) {
            gl.drawArrays(gl.LINE_STRIP, i * this.pointsPerULine, this.pointsPerULine);
        }

        let offset = this.uLineCount * this.pointsPerULine;
        for (let i = 0; i < this.vLineCount; i++) {
            gl.drawArrays(gl.LINE_STRIP, offset + i * this.pointsPerVLine, this.pointsPerVLine);
        }
    };

    this.DrawFilled = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoord);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iFillIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.fillIndexCount, gl.UNSIGNED_SHORT, 0);
    };
}
