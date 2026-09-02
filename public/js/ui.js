import { GUI } from "lil-gui";
import * as THREE from "three";

function createGUI(params) {
	const {
		settings,
		gridHelper,
		groundMaterial,
		ambientLight,
		directionalLight,
		genitalAmbientLight,
		genitalDirectionalLight,
		genital,
	} = params;

	const gui = new GUI();

	// Scene Folder
	const sceneFolder = gui.addFolder("Scene Controls");
	sceneFolder
		.add(settings, "autoRotate")
		.name("Auto Rotate")
		.onChange((value) => {
			const btn = document.getElementById("rotation-toggle");
			if (btn) {
				btn.textContent = value ? "Disable rotation" : "Enable rotation";
			}
		});
	sceneFolder.add(settings, "autoZoom").name("Auto Zoom Camera");
	sceneFolder.add(gridHelper, "visible").name("Show Grid");
	sceneFolder.addColor(groundMaterial, "color").name("Ground Color");

	// Lighting Folder
	const lightFolder = gui.addFolder("Lighting");
	lightFolder.addColor(ambientLight, "color").name("Ambient Color");
	lightFolder
		.add(ambientLight, "intensity", 0, 2)
		.name("Ambient Intensity")
		.setValue(0);
	const dirLightFolder = lightFolder.addFolder("Directional Light");
	dirLightFolder.addColor(directionalLight, "color").name("Color");
	dirLightFolder.add(directionalLight.position, "x", -20, 20).name("Pos X");
	dirLightFolder.add(directionalLight.position, "y", -20, 20).name("Pos Y");
	dirLightFolder.add(directionalLight.position, "z", -20, 20).name("Pos Z");
	dirLightFolder
		.add(directionalLight, "intensity", 0, 4)
		.name("Intensity")
		.setValue(2.07);

	const lightCopyObj = {
		copyLighting: () => {
			const config = {
				ambientLight: {
					color: "#" + ambientLight.color.getHexString(),
					intensity: parseFloat(ambientLight.intensity.toFixed(2)),
				},
				directionalLight: {
					color: "#" + directionalLight.color.getHexString(),
					position: {
						x: parseFloat(directionalLight.position.x.toFixed(2)),
						y: parseFloat(directionalLight.position.y.toFixed(2)),
						z: parseFloat(directionalLight.position.z.toFixed(2)),
					},
					intensity: parseFloat(directionalLight.intensity.toFixed(2)),
				},
			};
			navigator.clipboard
				.writeText(JSON.stringify(config, null, 2))
				.then(() => alert("Lighting config copied to clipboard!"))
				.catch((err) => console.error("Error copying lighting: ", err));
		},
	};
	lightFolder.add(lightCopyObj, "copyLighting").name("📋 Copy Lighting Config");

	// Genital Lighting Folder
	const genitalLightFolder = gui.addFolder("Genital Lighting");
	genitalLightFolder
		.addColor(genitalAmbientLight, "color")
		.name("Genital Ambient Color");
	genitalLightFolder
		.add(genitalAmbientLight, "intensity", 0, 2)
		.name("Genital Ambient Intensity");
	const genitalDirLightFolder = genitalLightFolder.addFolder(
		"Genital Directional Light",
	);
	genitalDirLightFolder
		.addColor(genitalDirectionalLight, "color")
		.name("Color");
	genitalDirLightFolder
		.add(genitalDirectionalLight.position, "x", -20, 20)
		.name("Pos X");
	genitalDirLightFolder
		.add(genitalDirectionalLight.position, "y", -20, 20)
		.name("Pos Y");
	genitalDirLightFolder
		.add(genitalDirectionalLight.position, "z", -20, 20)
		.name("Pos Z");
	genitalDirLightFolder
		.add(genitalDirectionalLight, "intensity", 0, 4)
		.name("Intensity");

	// Genital Folder
	const genitalFolder = gui.addFolder("Genital Controls");
	genitalFolder.add(genital.position, "x", -1, 1).step(0.01).name("Pos X");
	genitalFolder.add(genital.position, "y", -1, 1).step(0.01).name("Pos Y");
	genitalFolder.add(genital.position, "z", -1, 1).step(0.01).name("Pos Z");
	genitalFolder
		.add(genital.rotation, "x", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot X");
	genitalFolder
		.add(genital.rotation, "y", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot Y");
	genitalFolder
		.add(genital.rotation, "z", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot Z");
	const genitalScale = { value: genital.scale.x };
	genitalFolder
		.add(genitalScale, "value", 0.1, 1.5)
		.name("Scale")
		.onChange((v) => genital.scale.set(v, v, v));

	// Glans Shape Controls
	const glansControls = {
		radius: 1.55,
		widthSegments: 21,
		heightSegments: 8,
		phiStart: 1.21,
		phiLength: 6.283,
		thetaStart: 2.04,
		thetaLength: 3.142,
		noiseAmplitude: 0.056,
		color: 0xbda184, // glans matches Jemo's face skin exactly
		roughness: 0.18,
		metalness: 0,
		bulletShape: true,
		baseRadius: 0.29,
		tipRadius: 0.07,
		bulletLength: 0.5,
		taperCurve: 2.3,
		bluntness: 0,
		constantLength: 0.66,
		tipRoundness: 1,
		pillShape: true,
		pillTaper: 0.53,
		pillAsymmetry: 0,
		overallRoundness: 0,
		cornerSmoothing: 1,
		edgeRadius: 0,
		glansPosX: 0,
		glansPosY: 0,
		glansPosZ: 0,
		glansRotX: 1.59,
		glansRotY: 0,
		glansRotZ: 0,
	};

	const glansFolder = gui.addFolder("Glans Shape Controls");
	glansFolder.add(glansControls, "radius", 0.1, 2.0).step(0.01).name("Radius");
	glansFolder
		.add(glansControls, "widthSegments", 8, 64)
		.step(1)
		.name("Width Segments");
	glansFolder
		.add(glansControls, "heightSegments", 8, 32)
		.step(1)
		.name("Height Segments");
	glansFolder
		.add(glansControls, "phiStart", 0, Math.PI * 2)
		.step(0.01)
		.name("Phi Start");
	glansFolder
		.add(glansControls, "phiLength", 0, Math.PI * 2)
		.step(0.01)
		.name("Phi Length");
	glansFolder
		.add(glansControls, "thetaStart", 0, Math.PI)
		.step(0.01)
		.name("Theta Start");
	glansFolder
		.add(glansControls, "thetaLength", 0, Math.PI)
		.step(0.01)
		.name("Theta Length");
	glansFolder
		.add(glansControls, "noiseAmplitude", 0, 0.2)
		.step(0.001)
		.name("Noise Amplitude");
	glansFolder.addColor(glansControls, "color").name("Color");
	glansFolder
		.add(glansControls, "roughness", 0, 1)
		.step(0.01)
		.name("Roughness");
	glansFolder
		.add(glansControls, "metalness", 0, 1)
		.step(0.01)
		.name("Metalness");

	// Bullet Shape Controls
	const bulletFolder = glansFolder.addFolder("Bullet Shape Controls");
	bulletFolder.open(); // Buka folder agar terlihat
	bulletFolder.add(glansControls, "bulletShape").name("Enable Bullet Shape");
	bulletFolder
		.add(glansControls, "baseRadius", 0.1, 0.5)
		.step(0.01)
		.name("Base Radius");
	bulletFolder
		.add(glansControls, "tipRadius", 0.01, 0.2)
		.step(0.01)
		.name("Tip Radius");
	bulletFolder
		.add(glansControls, "bulletLength", 0.5, 3.0)
		.step(0.01)
		.name("Bullet Length");
	bulletFolder
		.add(glansControls, "taperCurve", 1.0, 5.0)
		.step(0.1)
		.name("Taper Curve");

	// Bluntness Controls
	const bluntFolder = bulletFolder.addFolder("Bluntness Controls");
	bluntFolder
		.add(glansControls, "bluntness", 0.0, 1.0)
		.step(0.01)
		.name("Bluntness Level");
	bluntFolder
		.add(glansControls, "constantLength", 0.0, 1.0)
		.step(0.01)
		.name("Constant Length %");
	bluntFolder
		.add(glansControls, "tipRoundness", 0.0, 1.0)
		.step(0.01)
		.name("Tip Roundness");

	// Pill Shape Controls
	const pillFolder = bulletFolder.addFolder("Pill Shape Controls");
	pillFolder.add(glansControls, "pillShape").name("Enable Pill Shape");
	pillFolder
		.add(glansControls, "pillTaper", 0.0, 1.0)
		.step(0.01)
		.name("Pill Taper");
	pillFolder
		.add(glansControls, "pillAsymmetry", 0.0, 1.0)
		.step(0.01)
		.name("Pill Asymmetry");

	// Roundness Controls
	const roundnessFolder = bulletFolder.addFolder("Roundness Controls");
	roundnessFolder.open(); // Buka folder agar terlihat
	roundnessFolder
		.add(glansControls, "overallRoundness", 0.0, 1.0)
		.step(0.01)
		.name("Overall Roundness");
	roundnessFolder
		.add(glansControls, "cornerSmoothing", 0.0, 1.0)
		.step(0.01)
		.name("Corner Smoothing");
	roundnessFolder
		.add(glansControls, "edgeRadius", 0.0, 0.5)
		.step(0.01)
		.name("Edge Radius");

	// Placement and Rotation Controls
	const placementFolder = glansFolder.addFolder("Placement & Rotation");
	placementFolder.open(); // Buka folder agar terlihat
	placementFolder
		.add(glansControls, "glansPosX", -2.0, 2.0)
		.step(0.01)
		.name("Position X");
	placementFolder
		.add(glansControls, "glansPosY", -2.0, 2.0)
		.step(0.01)
		.name("Position Y");
	placementFolder
		.add(glansControls, "glansPosZ", -2.0, 2.0)
		.step(0.01)
		.name("Position Z");
	placementFolder
		.add(glansControls, "glansRotX", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rotation X");
	placementFolder
		.add(glansControls, "glansRotY", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rotation Y");
	placementFolder
		.add(glansControls, "glansRotZ", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rotation Z");

	// Store glans controls for external access
	gui.glansControls = glansControls;

	// Add onChange listeners for real-time updates - ALL controllers
	function addListenersToFolder(folder) {
		folder.controllers.forEach((controller) => {
			controller.onChange(() => {
				// Trigger custom event for glans update
				window.dispatchEvent(
					new CustomEvent("glansUpdate", {
						detail: glansControls,
					}),
				);
			});
		});

		// Add listeners to subfolders
		folder.children.forEach((child) => {
			if (child.controllers) {
				addListenersToFolder(child);
			}
		});
	}

	// Add listeners to all folders
	addListenersToFolder(glansFolder);

	// Matrix Rain Controls
	const rainControls = {
		enabled: false,
		intensity: 0.5,
		toggle: () => {
			// This will be set by main.js
		},
	};

	const rainFolder = gui.addFolder("Matrix Rain");
	rainFolder
		.add(rainControls, "enabled")
		.name("Enable Rain")
		.onChange((value) => {
			if (window.matrixRain) {
				if (value) {
					window.matrixRain.start();
				} else {
					window.matrixRain.stop();
				}
			}
		});
	rainFolder
		.add(rainControls, "intensity", 0, 1)
		.step(0.1)
		.name("Rain Intensity")
		.onChange((value) => {
			if (window.matrixRain) {
				window.matrixRain.setIntensity(value);
			}
		});
	rainFolder.open(); // Keep rain controls open by default

	const allConfigsCopyObj = {
		copyAllConfigs: () => {
			const config = {
				scene: {
					autoRotate: settings.autoRotate,
					autoZoom: settings.autoZoom,
					showGrid: gridHelper.visible,
					groundColor: "#" + groundMaterial.color.getHexString(),
				},
				lighting: {
					ambientLight: {
						color: "#" + ambientLight.color.getHexString(),
						intensity: parseFloat(ambientLight.intensity.toFixed(2)),
					},
					directionalLight: {
						color: "#" + directionalLight.color.getHexString(),
						position: {
							x: parseFloat(directionalLight.position.x.toFixed(2)),
							y: parseFloat(directionalLight.position.y.toFixed(2)),
							z: parseFloat(directionalLight.position.z.toFixed(2)),
						},
						intensity: parseFloat(directionalLight.intensity.toFixed(2)),
					},
				},
				genital: {
					position: {
						x: parseFloat(genital.position.x.toFixed(2)),
						y: parseFloat(genital.position.y.toFixed(2)),
						z: parseFloat(genital.position.z.toFixed(2)),
					},
					rotation: {
						x: parseFloat(genital.rotation.x.toFixed(2)),
						y: parseFloat(genital.rotation.y.toFixed(2)),
						z: parseFloat(genital.rotation.z.toFixed(2)),
					},
					scale: parseFloat(genital.scale.x.toFixed(2)),
				},
				glansControls: Object.keys(glansControls).reduce((acc, key) => {
					if (typeof glansControls[key] === "number") {
						if (key === "color") {
							acc[key] =
								"#" + new THREE.Color(glansControls[key]).getHexString();
						} else {
							acc[key] = parseFloat(glansControls[key].toFixed(3));
						}
					} else {
						acc[key] = glansControls[key];
					}
					return acc;
				}, {}),
				matrixRain: {
					enabled: rainControls.enabled,
					intensity: parseFloat(rainControls.intensity.toFixed(2)),
				},
			};
			navigator.clipboard
				.writeText(JSON.stringify(config, null, 2))
				.then(() => alert("All Environment configs copied to clipboard!"))
				.catch((err) => console.error("Error copying config: ", err));
		},
	};
	gui
		.add(allConfigsCopyObj, "copyAllConfigs")
		.name("🌟 COPY FULL ENVIRONMENT CONFIGS");

	gui.hide(); // Hide the GUI by default
	return gui;
}

function addModelControls(gui, loadedModel) {
	if (!loadedModel) return;
	const modelFolder = gui.addFolder("Model Controls");

	const posFolder = modelFolder.addFolder("Position");
	posFolder.add(loadedModel.position, "x", -20, 20).step(0.01).name("Pos X");
	posFolder.add(loadedModel.position, "y", -20, 20).step(0.01).name("Pos Y");
	posFolder.add(loadedModel.position, "z", -20, 20).step(0.01).name("Pos Z");

	const rotFolder = modelFolder.addFolder("Rotation");
	rotFolder
		.add(loadedModel.rotation, "x", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot X");
	rotFolder
		.add(loadedModel.rotation, "y", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot Y");
	rotFolder
		.add(loadedModel.rotation, "z", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot Z");

	const scaleFolder = modelFolder.addFolder("Scale");
	const modelScale = {
		uniform: loadedModel.scale.x,
		x: loadedModel.scale.x,
		y: loadedModel.scale.y,
		z: loadedModel.scale.z,
	};
	scaleFolder
		.add(modelScale, "uniform", 0.1, 20)
		.name("Uniform Scale")
		.onChange((v) => {
			loadedModel.scale.set(v, v, v);
		});
	scaleFolder
		.add(modelScale, "x", 0.1, 20)
		.name("Scale X")
		.onChange((v) => loadedModel.scale.setX(v));
	scaleFolder
		.add(modelScale, "y", 0.1, 20)
		.name("Scale Y")
		.onChange((v) => loadedModel.scale.setY(v));
	scaleFolder
		.add(modelScale, "z", 0.1, 20)
		.name("Scale Z")
		.onChange((v) => loadedModel.scale.setZ(v));

	const modelCopyObj = {
		copyModelData: () => {
			const config = {
				position: {
					x: parseFloat(loadedModel.position.x.toFixed(2)),
					y: parseFloat(loadedModel.position.y.toFixed(2)),
					z: parseFloat(loadedModel.position.z.toFixed(2)),
				},
				rotation: {
					x: parseFloat(loadedModel.rotation.x.toFixed(2)),
					y: parseFloat(loadedModel.rotation.y.toFixed(2)),
					z: parseFloat(loadedModel.rotation.z.toFixed(2)),
				},
				scale: {
					x: parseFloat(loadedModel.scale.x.toFixed(2)),
					y: parseFloat(loadedModel.scale.y.toFixed(2)),
					z: parseFloat(loadedModel.scale.z.toFixed(2)),
				},
			};
			navigator.clipboard
				.writeText(JSON.stringify(config, null, 2))
				.then(() => alert("Model config copied to clipboard!"))
				.catch((err) => console.error("Error copying model data: ", err));
		},
	};
	modelFolder.add(modelCopyObj, "copyModelData").name("📋 Copy Model Config");

	modelFolder.open();
}

export { createGUI, addModelControls };
