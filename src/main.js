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
camera.position.set(0, 1, 3);

//Mouse controls
const controls = new OrbitControls( camera, canvas );

// renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

// add objects to the scene with Phong
const cubeGeometry = new THREE.BoxGeometry();
const cubeMaterial = new THREE.MeshPhongMaterial({ color: "red" });

const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
scene.add(cubeMesh);

// initialize ligth
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 4, 1);
scene.add(light);

// animation
const animate = function () {
  requestAnimationFrame( animate );

  controls.update();
  renderer.render(scene, camera);
};

animate();

// gummi var hér