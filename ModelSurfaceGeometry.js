export function createModelSurfaceGeometry(
    a = 2,
    c = 1.5,
    theta = Math.PI / 8,
    scale = 0.2,
    du = Math.PI / 24,
    dt = 0.2
) {
    const positions = [];
    const uvs       = [];
    const indices   = [];

    const uLineCount      = Math.floor((2 * Math.PI) / du) + 1;
    const pointsPerULine  = Math.floor(4 / dt) + 1;

    for (let ui = 0; ui < uLineCount; ui++) {
        const u = ui * du;
        for (let tj = 0; tj < pointsPerULine; tj++) {
            const t = -2 + tj * dt;

            const common = a + t * Math.cos(theta) + c * t * t * Math.sin(theta);
            const x = scale * common * Math.cos(u);
            const y = scale * common * Math.sin(u);
            const z = scale * (-t * Math.sin(theta) + c * t * t * Math.cos(theta));

            positions.push(x, y, z);

            const uTex = u / (2 * Math.PI);
            const vTex = (t + 2) / 4;
            uvs.push(uTex, vTex);
        }
    }

    for (let i = 0; i < uLineCount - 1; i++) {
        for (let j = 0; j < pointsPerULine - 1; j++) {
            const idx      = i * pointsPerULine + j;
            const idxNextU = idx + pointsPerULine;

            indices.push(idx, idxNextU, idx + 1);
            indices.push(idxNextU, idxNextU + 1, idx + 1);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}
