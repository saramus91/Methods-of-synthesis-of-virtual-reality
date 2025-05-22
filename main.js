import {createModelSurfaceGeometry} from "./ModelSurfaceGeometry.js";

const scene    = new THREE.Scene();
const camera   = new THREE.Camera();
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const arSource = new THREEx.ArToolkitSource({ sourceType:'webcam' });
arSource.init(onResize);
window.addEventListener('resize', onResize);

function onResize () {
    arSource.onResizeElement();
    arSource.copyElementSizeTo(renderer.domElement);
    if (arContext.arController) {
        arSource.copyElementSizeTo(arContext.arController.canvas);
    }
}

const arContext = new THREEx.ArToolkitContext({
    cameraParametersUrl:
        'https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/data/camera_para.dat',
    detectionMode: 'mono',
});
arContext.init(() => camera.projectionMatrix.copy(arContext.getProjectionMatrix()));

const markerRoot = new THREE.Group();
scene.add(markerRoot);

new THREEx.ArMarkerControls(arContext, markerRoot, {
    type: 'pattern',
    patternUrl: './data/marker.patt',
});

const geom = createModelSurfaceGeometry();
const mat  = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const mesh = new THREE.Mesh(geom, mat);
mesh.scale.set(2, 2, 2);
markerRoot.add(mesh);

(function animate () {
    requestAnimationFrame(animate);
    if (arSource.ready) arContext.update(arSource.domElement);
    renderer.render(scene, camera);
})();
