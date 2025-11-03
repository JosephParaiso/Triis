import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

//get the canvas
const canvas = document.querySelector("#c");

// initialize the scene
const scene = new THREE.Scene();

// initialize the camera
const camera = new THREE.PerspectiveCamera(
  75,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  30
);
camera.position.set(2.2, 2.2, 2.2);

//Mouse controls
const controls = new OrbitControls( camera, canvas );

// renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

// adds the box to the scene with Phong
const boxGeometry = new THREE.BoxGeometry(1.2, 4, 1.2);
const boxMaterial = new THREE.MeshPhongMaterial({
  color: "white",
  transparent: true,
  opacity: 0.2
});

const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
scene.add(boxMesh);

// adds the ground to the scene with Phong
const groundGeometry = new THREE.BoxGeometry(1.4, 0.1, 1.4);
const groundMaterial = new THREE.MeshPhongMaterial({
  color: "white",
});


const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.position.set(0, -2.05, 0);
scene.add(groundMesh);

// --- GRID LOGIC ---

const cellSize = 0.2;
const gridSize = 6;

// Visualize the grid as thin wireframe cells sitting on top of the ground
const gridGroup = new THREE.Group();
// Ground top surface is at y = -2.05 + (0.1 / 2) = -2.0
const gridY = -2.0; 

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    // Center the grid on (0, gridY, 0)
    const x = (i - gridSize / 2 + 0.5) * cellSize;
    const z = (j - gridSize / 2 + 0.5) * cellSize;

    const cellGeom = new THREE.EdgesGeometry(new THREE.PlaneGeometry(cellSize, cellSize));
    const cellMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const cellLines = new THREE.LineSegments(cellGeom, cellMat);
    cellLines.rotation.x = -Math.PI / 2; // lay it flat on the ground
    cellLines.position.set(x, gridY + 0.0001, z); // slight offset to prevent z-fighting
    gridGroup.add(cellLines);
  }
}
scene.add(gridGroup);

// Snaps the mesh to the grid
function snapToGrid(mesh) {
  mesh.position.x = (Math.round(mesh.position.x / cellSize) * cellSize - 0.1);
  mesh.position.z = (Math.round(mesh.position.z / cellSize) * cellSize - 0.1);
}
// --- END GRID LOGIC ---

// adds one cube as a part of tromino
const trominoGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const trominoMaterial = new THREE.MeshPhongMaterial({
  color: "red"
});

const trominoMesh = new THREE.Mesh(trominoGeometry, trominoMaterial);
snapToGrid(trominoMesh); // snaps to grid
scene.add(trominoMesh);



// initialize light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 4, 1);
scene.add(light);

// initialize light2
const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(-2, -4, -1);
scene.add(light2);

// animation
const animate = function () {
  requestAnimationFrame( animate );

  controls.update();
  // maintain grid snapping for tromino
  snapToGrid(trominoMesh);
  renderer.render(scene, camera);
};

animate();

// gummi var hér