import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- SETTINGS ---
const moveSpeed = 0.005;

// --- END SETTINGS ---


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
  var isCubeDown = false; // for p key

  window.addEventListener('keydown', (event) => {
    if (!trominoMesh) return;
    const step = cellSize;

    switch (event.key) {
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
      case 'p': //toggle cube up or down for testing purposes
        if (isCubeDown) {
          trominoMesh.position.y += step*10;
          isCubeDown = false;
        } else {
          trominoMesh.position.y -= step*10;
          isCubeDown = true;
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
}

spawnStraightTromino();
moveTromino();

// animation
const animate = function () {

  // cube moves down until it reaches the bottom
  if (trominoMesh && trominoMesh.position.y > -1.9) {
    trominoMesh.position.y -= moveSpeed;
  } else {
    spawnStraightTromino();
  }

  requestAnimationFrame( animate );

  controls.update();
  // maintain grid snapping for tromino
  //snapToGrid(trominoMesh); // Only call this when the tromino is moved
  renderer.render(scene, camera);
};

animate();

// gummi var hér