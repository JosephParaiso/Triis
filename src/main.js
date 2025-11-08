import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';

// --- SETTINGS ---
let moveSpeed = 0.005;
let speedUp = 0.08;
const gridHeight = 20;
let allowLTrominos = true;
const ghostEmmisionTint = 0xffff00;
let score = 0;
// --- END SETTINGS ---

let isGameOver = false;
const gui = new GUI();
const gameOverText = document.getElementById("gameOverText");

const layers = [];

//get the canvas
const canvas = document.querySelector("#c");

// --- AUDIO AUTOPLAY KICK ---
const bg = document.getElementById('bgMusic');
if (bg) {
  // Ensure it loops and try to autoplay muted
  bg.loop = true;
  bg.muted = true;
  const p = bg.play();
  if (p && typeof p.then === 'function') {
    p.catch(() => { /* ignore autoplay block errors */ });
  }

  // Unmute and ensure playing on first user interaction
  const unmuteKick = () => {
    bg.muted = false;
    const q = bg.play();
    if (q && typeof q.then === 'function') {
      q.catch(() => { /* ignore */ });
    }
    window.removeEventListener('pointerdown', unmuteKick);
    window.removeEventListener('keydown', unmuteKick);
    window.removeEventListener('touchstart', unmuteKick);
  };
  window.addEventListener('pointerdown', unmuteKick, { once: true });
  window.addEventListener('keydown', unmuteKick, { once: true });
  window.addEventListener('touchstart', unmuteKick, { once: true });
}
// --- END AUDIO AUTOPLAY KICK ---

const scoreValueEl = document.getElementById("scoreValue");
function updateScoreDisplay() {
  if (scoreValueEl) scoreValueEl.textContent = String(score);
}
updateScoreDisplay();

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
const boxGeometry = new THREE.BoxGeometry(1.201, 4, 1.201);
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

// Assign a random color from a set of options
const colors = ["red", "green", "blue", "yellow", "purple", "cyan", "orange"];
let trominoSpawnCount = 2;
let lastColor = colors[0];

function spawnTromino() {
  trominoSpawnCount++;
  if (trominoSpawnCount === 3) {
    lastColor = colors[Math.floor(Math.random() * colors.length)];
    trominoSpawnCount = 0;
  }
  // adds one cube as a part of tromino
  const trominoGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const trominoMaterials = new THREE.MeshPhongMaterial({ 
    color: lastColor,
  });

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

  if (ghostGroup) {
    scene.remove(ghostGroup);
    ghostGroup = null;
  }
}

function spawnLTromino() {
  // Create a group to represent the tromino
  const group = new THREE.Group();

  // Create three cubes using spawnTromino()
  const center = spawnTromino();
  const left = spawnTromino();
  const down = spawnTromino();

  // Arrange them in an L-shape: center (0,0), left (-cellSize, 0), down (0, -cellSize)
  // Use cellSize (0.2) so each cube sits exactly on grid cells
  left.position.x = -cellSize;   // -0.2
  down.position.y = -cellSize;   // -0.2
  // center stays at 0

  // Add cubes to the group
  group.add(center);
  group.add(left);
  group.add(down);

  // Place the whole tromino above the box and snap to grid once
  group.position.y = 2; // puts the tromino at the top of the box
  snapToGrid(group);    // snaps the whole tromino to grid

  // Save and add to scene
  trominoMesh = group;
  scene.add(trominoMesh);

  if (ghostGroup) {
    scene.remove(ghostGroup);
    ghostGroup = null;
  }
}

function slam() {
  if (!trominoMesh) return;
  while (!collisionCheck(trominoMesh)) {
    trominoMesh.position.y -= cellSize;
    trominoMesh.updateMatrixWorld(true);
  }
}

function moveTromino() {
   window.addEventListener('keydown', (event) => {
    if (!trominoMesh) return;
    if (isGameOver) return;
    const step = cellSize;

    switch (event.key) {
      case ' ':
        slam();
        break;
      case 'p':
        moveSpeed = speedUp;
        break;
      case 'ArrowLeft':
        tryTransform(trominoMesh, () => { trominoMesh.position.x -= step; });
        break;
      case 'ArrowRight':
        tryTransform(trominoMesh, () => { trominoMesh.position.x += step; });
        break;
      case 'ArrowUp':
        tryTransform(trominoMesh, () => { trominoMesh.position.z -= step; });
        break;
      case 'ArrowDown':
        tryTransform(trominoMesh, () => { trominoMesh.position.z += step; });
        break;
      case 'a':
        tryTransform(trominoMesh, () => { trominoMesh.rotation.x -= Math.PI / 2; });
        break;
      case 'z':
        tryTransform(trominoMesh, () => { trominoMesh.rotation.x += Math.PI / 2; });
        break;
      case 's':
        tryTransform(trominoMesh, () => { trominoMesh.rotation.y += Math.PI / 2; });
        break;
      case 'x':
        tryTransform(trominoMesh, () => { trominoMesh.rotation.y -= Math.PI / 2; });
        break;
      case 'd':
        tryTransform(trominoMesh, () => { trominoMesh.rotation.z += Math.PI / 2; });
        break;
      case 'c':
        tryTransform(trominoMesh, () => { trominoMesh.rotation.z -= Math.PI / 2; });
        break;
    }

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

// Ensure every cube of a tromino stays within the XZ grid bounds
function withinXZBounds(group) {
  group.updateMatrixWorld(true);
  for (const cube of group.children) {
    const wp = new THREE.Vector3();
    cube.getWorldPosition(wp);
    const { ix, iz } = xzToCellIndices(wp.x, wp.z);
    if (ix < 0 || ix >= gridSize || iz < 0 || iz >= gridSize) {
      return false;
    }
  }
  return true;
}

// Ensure the tromino won't overlap any already-placed cubes at its current (rounded) layer
function overlapsOccSameLayer(group) {
  group.updateMatrixWorld(true);
  for (const cube of group.children) {
    const wp = new THREE.Vector3();
    cube.getWorldPosition(wp);
    const iy = yToLayerIndex(wp.y);
    const { ix, iz } = xzToCellIndices(wp.x, wp.z);

    // If it's out of bounds vertically or horizontally, treat as overlap handled elsewhere
    if (!inBounds(ix, iy, iz)) {
      return true;
    }

    // If the target cell is already occupied by a placed cube, this move would phase through
    if (occ[iy][ix][iz]) {
      return true;
    }
  }
  return false;
}

// Try a transform; keep it only if all children remain in-bounds
function tryTransform(group, apply) {
  const prevPos = group.position.clone();
  const prevRot = group.rotation.clone();
  apply();

  // keep x/z within bounds and also prevent overlapping already placed cubes
  if (withinXZBounds(group) && !overlapsOccSameLayer(group)) {
    snapToGrid(group);
    return true;
  } else {
    group.position.copy(prevPos);
    group.rotation.copy(prevRot);
    group.updateMatrixWorld(true);
    return false;
  }
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

  // Award points for placing a piece
  score += 1;
  updateScoreDisplay();

  scene.remove(trominoGroup);
  trominoMesh = null;
}

//returns a boolean
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

let ghostGroup = null;

function updateGhost() {

  if (!trominoMesh) {
    scene.remove(ghostGroup);
    ghostGroup = null;
    return;
  }

  // Create ghost
  if (!ghostGroup) {
    ghostGroup = trominoMesh.clone(true);

    ghostGroup.traverse(obj => {
      if (obj.isMesh) {
        obj.material = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          opacity: 0.80,
          emissive: ghostEmmisionTint,
          emissiveIntensity: 0.5,
          side: THREE.DoubleSide
        });
      }
    });

    //stop z fighting
    ghostGroup.scale.set(0.99, 0.99, 0.99);

    scene.add(ghostGroup);
  }

  trominoMesh.updateMatrixWorld(true);

  //Match current tromino rotation
  ghostGroup.rotation.copy(trominoMesh.rotation);
  ghostGroup.position.x = trominoMesh.position.x;
  ghostGroup.position.z = trominoMesh.position.z;

  const topY = gridY + (gridHeight - 0.5) * cellSize;
  ghostGroup.position.y = topY;
  ghostGroup.updateMatrixWorld(true);

  while (true) {
    if (collisionCheck(ghostGroup)) {
      break;
    }

    ghostGroup.position.y -= cellSize;
    ghostGroup.updateMatrixWorld(true);
  }
}

//returns a boolean
function isLayerFull(y){
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      if (occ[y][x][z] === null) {
        return false;
      }
    }
  }
  return true;
}

function deleteLayer(y) {
  // Remove cubes and free gpu memory
  for (const cube of layers[y]) {
    scene.remove(cube);
    cube.material.dispose();
    cube.geometry.dispose();
  }

  // Update occupancy array, all null for layer y
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      occ[y][x][z] = null;
    }
  }

  layers[y] = [];

  // Award points for clearing a layer
  score += 100;
  updateScoreDisplay();
}

//This function takes variable startY, which is the layer height deleted, and tells the blocks above it to fall
//Should be called after deleteLayer()
function blockFall(startY) {
  // For every layer above the deleted layer
  for (let y = startY + 1; y < gridHeight; y++) {
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const cube = occ[y][x][z];
        if (!cube) continue;

        const newY = y - 1;

        // move cube down one layer in occ
        occ[y][x][z] = null;
        occ[newY][x][z] = cube;

        // update its world position to match new layer
        cube.position.set(
          (x - half + 0.5) * cellSize,
          gridY + (newY + 0.5) * cellSize,
          (z - half + 0.5) * cellSize
        );
      }
    }
  }

  // Rebuild layers[] from occ so it's consistent
  for (let y = 0; y < gridHeight; y++) {
    layers[y] = [];
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const cube = occ[y][x][z];
        if (cube) {
          layers[y].push(cube);
        }
      }
    }
  }
}

function stopTime() {
  moveSpeed = 0;
}

function resumeTime() {
  moveSpeed = 0.005;
}

function checkGameFail() {
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      if (occ[gridHeight - 1][x][z] !== null) {
        gameOver();
        return;
      }
    }
  }
}

function gameOver() {
  console.log("you failed!");
  stopTime();
  isGameOver = true;
  gameOverText.classList.add("visible");
}

function restartGame() {
  isGameOver = false;
  score = 0;
  updateScoreDisplay();
  gameOverText.classList.remove("visible");

  // clear occ
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        occ[y][x][z] = null;
      }
    }
  }

  // clear layers
  for (let y = 0; y < layers.length; y++) {
    if (!layers[y]) continue;
    for (const cube of layers[y]) {
      scene.remove(cube);
      cube.geometry.dispose();
      cube.material.dispose();
    }
    layers[y] = [];
  }

  if (ghostGroup) {
    scene.remove(ghostGroup);
    ghostGroup = null;
  }

  if (trominoMesh) {
    scene.remove(trominoMesh);
    trominoMesh = null;
  }

  // reset movement and respawn
  moveSpeed = 0.005;
  spawnStraightTromino();
}

const delBtn = document.getElementById("deleteLayer0Button");
delBtn.addEventListener("click", () => {
  deleteLayer(0);
  blockFall(0);
  delBtn.blur();
});

//Stops time for debug, not the same as stopping time for game over or pausing, allows movement
//Actually just sets move spd of tromino to 0
const timeBtn = document.getElementById("timeBtn");
timeBtn.addEventListener("click", () => {
  if (moveSpeed) {
    stopTime();
  } else {
    resumeTime();
  }
  timeBtn.blur();
});

//Disables/enables the random spawning of L blocks
const lBtn = document.getElementById("lBtn");
lBtn.addEventListener("click", () => {
  if (allowLTrominos) {
    allowLTrominos = false;
  } else {
    allowLTrominos = true;
  }
  lBtn.blur();
});

const restartBtn = document.getElementById("restartBtn");
restartBtn.addEventListener("click", () => {
  restartGame();
  restartBtn.blur();
});

const params = {
  muteMusic: false
};

gui.add(params, "muteMusic").onChange(v => bg.muted = v);

spawnStraightTromino();
if(!isGameOver) {
  moveTromino();
}

// animation
const animate = function () {

   if ( trominoMesh && !isGameOver ) {
    if (collisionCheck(trominoMesh)) {
      addToLayer(trominoMesh);

      //Check if every layer is full and delete
      for (let y = 0; y < gridHeight; y++) {
        if (isLayerFull(y)) {
          deleteLayer(y);
          blockFall(y);
          y--; //because of the blocks falling in the deleted layer we need to check it again
        }
      } 

      let r = Math.round(Math.random());
      if (r === 1 && allowLTrominos) {
        spawnLTromino();
      } else {
        spawnStraightTromino();
      }
    } else {
      trominoMesh.position.y -= moveSpeed;
    }
  }

  updateGhost();
  checkGameFail();
  requestAnimationFrame( animate );

  controls.update();
  renderer.render(scene, camera);
};

animate();