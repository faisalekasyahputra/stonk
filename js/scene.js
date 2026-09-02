import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let scene,
	camera,
	renderer,
	controls,
	ambientLight,
	directionalLight,
	ground,
	gridHelper;

function setupScene() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	camera.position.set(0, 2, 7); // Set initial position

	renderer = new THREE.WebGLRenderer({ antialias: true });

	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = false; // Disable shadows
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setClearColor(0x000000);
	document.body.appendChild(renderer.domElement);

	controls = new OrbitControls(camera, renderer.domElement);
	controls.target.set(0, 1.5, 0); // Set initial look-at target
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.minDistance = 0.5;
	controls.maxDistance = 50;

	// --- Lights ---
	ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
	scene.add(ambientLight);

	directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	directionalLight.position.set(5, 10, 7.5);
	directionalLight.castShadow = false; // Disable shadows
	directionalLight.shadow.mapSize.width = 2048;
	directionalLight.shadow.mapSize.height = 2048;
	directionalLight.shadow.camera.near = 0.5;
	directionalLight.shadow.camera.far = 50;
	directionalLight.shadow.camera.left = -5;
	directionalLight.shadow.camera.right = 5;
	directionalLight.shadow.camera.top = 5;
	directionalLight.shadow.camera.bottom = -5;
	directionalLight.shadow.bias = -0.0001;
	directionalLight.shadow.normalBias = 0.05;
	camera.add(directionalLight);
	scene.add(camera);

	// --- Ground ---
	const groundGeometry = new THREE.PlaneGeometry(20, 20);
	const groundMaterial = new THREE.ShadowMaterial();
	groundMaterial.opacity = 0.3; // Make shadows semi-transparent
	ground = new THREE.Mesh(groundGeometry, groundMaterial);
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	scene.add(ground);

	gridHelper = new THREE.GridHelper(20, 50);
	gridHelper.visible = false; // Hide the grid
	scene.add(gridHelper);

	return {
		scene,
		camera,
		renderer,
		controls,
		ambientLight,
		directionalLight,
		ground,
		gridHelper,
		groundMaterial, // Although we changed the material, we keep exporting this reference
	};
}

export { setupScene };
