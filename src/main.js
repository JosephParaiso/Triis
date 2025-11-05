import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- SETTINGS ---
let moveSpeed = 0.005;
let speedUp = 0.08;
const gridHeight = 20;

// --- END SETTINGS ---

const layers = [];

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
camera.position.set(1.6, 1.4, 2.4);

//Mouse controls
const controls = new OrbitControls( camera, canvas );

// renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const size = Math.min(window.innerWidth, window.innerHeight);
renderer.setSize(size * 0.8, size * 0.8);

let trominoMesh; // global ref for current tromino (THREE.Group)

// adds the box to the scene with Phong
const boxGeometry = new THREE.BoxGeometry(1.2, 4, 1.2);
const boxMaterial = new THREE.MeshPhongMaterial({
  color: "white",
  transparent: true,
  opacity: 0.1
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
    const cellMat = new THREE.LineBasicMaterial({ color: 0x000000, });
    const cellLines = new THREE.LineSegments(cellGeom, cellMat);
    cellLines.rotation.x = -Math.PI / 2; // lay it flat on the ground
    cellLines.position.set(x, gridY + 0.0001, z); // slight offset to prevent z-fighting
    gridGroup.add(cellLines);
  }
}
scene.add(gridGroup);

// Snaps the mesh center to the nearest grid cell center
function snapToGrid(mesh) {
  // If gridSize is even, the cell centers are offset by half a cell from the origin (0,0)
  const offset = (gridSize % 2 === 0) ? cellSize / 2 : 0;
  mesh.position.x = Math.round((mesh.position.x - offset) / cellSize) * cellSize + offset;
  mesh.position.z = Math.round((mesh.position.z - offset) / cellSize) * cellSize + offset;
}
// --- END GRID LOGIC ---

//Keep track of where cubes are
const occ = [];
for (let y = 0; y < gridHeight; y++) {
  const layer = [];
  for (let x = 0; x < gridSize; x++) {
    const row = [];
    for (let z = 0; z < gridSize; z++) {
      row.push(null);
    }
    layer.push(row);
  }
  occ.push(layer);
}

// initialize light
const light = new THREE.DirectionalLight(0xffffff, 4);
light.position.set(2, 4, 1);
scene.add(light);

// initialize light2
const light2 = new THREE.DirectionalLight(0xffffff, 4);
light2.position.set(-2, -4, -1);
scene.add(light2);

function spawnTromino() {
  // adds one cube as a part of tromino
  const trominoGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  // Different color for each face of the cube for testing purposes
  const trominoMaterials = [
    new THREE.MeshPhongMaterial({ color: 0xff0000 }), // right
    new THREE.MeshPhongMaterial({ color: 0x00ff00 }), // left
    new THREE.MeshPhongMaterial({ color: 0x0000ff }), // top
    new THREE.MeshPhongMaterial({ color: 0xffff00 }), // bottom
    new THREE.MeshPhongMaterial({ color: 0xff00ff }), // front
    new THREE.MeshPhongMaterial({ color: 0x00ffff })  // back
  ];

  const cube = new THREE.Mesh(trominoGeometry, trominoMaterials);
  // keep cube local; position relative to its parent
  cube.position.set(0, 0, 0);
  return cube;
}

function spawnStraightTromino() {
  // Create a group to represent the tromino
  const group = new THREE.Group();

  // Create three cubes using spawnTromino()
  const center = spawnTromino();
  const left = spawnTromino();
  const right = spawnTromino();

  // Arrange them in a straight line along the X axis (3 long)
  // Use cellSize (0.2) so each cube sits exactly on grid cells
  left.position.x = -cellSize;   // -0.2
  right.position.x = cellSize;   // +0.2
  // center stays at 0

  // Add cubes to the group
  group.add(center);
  group.add(left);
  group.add(right);

  // Place the whole tromino above the box and snap to grid once
  group.position.y = 2; // puts the tromino at the top of the box
  snapToGrid(group);    // snaps the whole tromino to grid

  // Save and add to scene
  trominoMesh = group;
  scene.add(trominoMesh);
}

function moveTromino() {
   window.addEventListener('keydown', (event) => {
    if (!trominoMesh) return;
    const step = cellSize;

    switch (event.key) {
      case 'p':
        moveSpeed = speedUp;
        break;
      case 'ArrowLeft':
        if (trominoMesh.position.x > -0.4) {
          trominoMesh.position.x -= step;
        }
        break;
      case 'ArrowRight':
        if (trominoMesh.position.x < 0.4) {
          trominoMesh.position.x += step;
        }
        break;
      case 'ArrowUp':
        if (trominoMesh.position.z > -0.4) {
          trominoMesh.position.z -= step;
        }
        break;
      case 'ArrowDown':
        if (trominoMesh.position.z < 0.4) {
          trominoMesh.position.z += step;
        }
        break;
      case 'a':
        trominoMesh.rotation.x -= Math.PI / 2;
        break;
      case 'z':
        trominoMesh.rotation.x += Math.PI / 2;
        break;
      case 's':
        trominoMesh.rotation.y += Math.PI / 2;
        break;
      case 'x':
        trominoMesh.rotation.y -= Math.PI / 2;
        break;
      case 'd':
        trominoMesh.rotation.z += Math.PI / 2;
        break;
      case 'c':
        trominoMesh.rotation.z -= Math.PI / 2;
        break;
    }

    snapToGrid(trominoMesh); // snaps to grid after each movement
  });


  window.addEventListener('keyup', (event) => {
    if (event.key === 'p') {
      moveSpeed = 0.005;
    }
  });
}

// --- Some helper function ----
const half = gridSize / 2;

// converts cube's y position (world y position) into an index for layer
function yToLayerIndex(worldY) {
  return Math.round((worldY - gridY) / cellSize - 0.5);
}

// converts a cube’s world position (its actual X/Z coordinates in 3D space) into grid indices
function xzToCellIndices(worldX, worldZ) {
  const ix = Math.round(worldX / cellSize + half - 0.5);
  const iz = Math.round(worldZ / cellSize + half - 0.5);
  return { ix, iz };
}

// The inBounds function is essential to prevent array index out of bounds errors
// when cubes move or are placed outside the grid. It ensures that only valid grid
// indices are accessed, avoiding runtime crashes due to invalid array access.
function inBounds(ix, iy, iz) {
  return (
    iy >= 0 && iy < gridHeight &&
    ix >= 0 && ix < gridSize &&
    iz >= 0 && iz < gridSize
  );
}
// ------ -------

//Ungroups trominoGroup and adds each cube to appropriate layer group
function addToLayer(trominoGroup) {
  trominoGroup.updateMatrixWorld(true);

  const cubes = trominoGroup.children.slice();
  cubes.forEach((cube) => {
    const wp = new THREE.Vector3();
    cube.getWorldPosition(wp);

    const iy = yToLayerIndex(wp.y);
    const { ix, iz } = xzToCellIndices(wp.x, wp.z);

    // Ungroup 
    scene.attach(cube);

    // Snap to exact cell center
    // Currently when adding snapToGrid() function cubes lock slightly ABOVE the ground
    cube.position.set(
      (ix - half + 0.5) * cellSize,
      gridY + (iy + 0.5) * cellSize,
      (iz - half + 0.5) * cellSize
    );

    // Record in layers
    if (!layers[iy]) {
      layers[iy] = [];
    }
    layers[iy].push(cube);

    if (inBounds(ix, iy, iz)) {
      occ[iy][ix][iz] = cube;
    }
  });

  scene.remove(trominoGroup);
  trominoMesh = null;
}

function collisionCheck(TrominoGroup) {
  // ensure children world positions are current
  TrominoGroup.updateMatrixWorld(true);

  for (const cube of TrominoGroup.children) {
    const wp = new THREE.Vector3();
    cube.getWorldPosition(wp);

    // current cell
    const iy = yToLayerIndex(wp.y);
    const { ix, iz } = xzToCellIndices(wp.x, wp.z);

    // the cell one layer below
    const nextIy = iy - 1;

    // hit the floor?
    if (nextIy < 0) return true;

    // out of bounds horizontally?
    if (!inBounds(ix, nextIy, iz)) return true;

    // landed on an occupied cell below?
    if (occ[nextIy][ix][iz]) return true;
  }

  return false;
}

spawnStraightTromino();
moveTromino();

// animation
const animate = function () {

   if (trominoMesh) {
    if (collisionCheck(trominoMesh)) {
      addToLayer(trominoMesh);
      spawnStraightTromino();
    } else {
      trominoMesh.position.y -= moveSpeed;
    }
  }

  requestAnimationFrame( animate );

  controls.update();
  // maintain grid snapping for tromino
  //snapToGrid(trominoMesh); // Only call this when the tromino is moved
  renderer.render(scene, camera);
};

animate();

// joseph var hér