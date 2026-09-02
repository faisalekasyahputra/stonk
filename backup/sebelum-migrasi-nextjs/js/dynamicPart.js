import * as THREE from "three";

// --- Materials for Dynamic Part ---
const skinMaterial = new THREE.MeshStandardMaterial({
	color: 0xfffffe, // White color for shaft and testicles
	roughness: 0.8,
	metalness: 0.0,
	side: THREE.DoubleSide,
});
const glansMaterial = new THREE.MeshStandardMaterial({
	color: 0x64c78d, // Green color instead of pink
	roughness: 0.3,
	metalness: 0.05,
});

// --- Dynamic Genital Part Setup ---
const genital = new THREE.Group();
genital.position.set(0, -0.02, 0.07);
genital.rotation.set(1.45, 0, 0);
genital.scale.set(0.4438, 0.4438, 0.4438);

let shaft, glans, testicle1, testicle2;

function addOrganicNoise(geometry, amplitude = 0.05) {
	const positions = geometry.attributes.position;
	for (let i = 0; i < positions.count; i++) {
		positions.setX(i, positions.getX(i) + (Math.random() - 0.5) * amplitude);
		positions.setY(i, positions.getY(i) + (Math.random() - 0.5) * amplitude);
		positions.setZ(i, positions.getZ(i) + (Math.random() - 0.5) * amplitude);
	}
	geometry.attributes.position.needsUpdate = true;
	geometry.computeVertexNormals();
	return geometry;
}

function createLatheGeometry(profilePoints, segments = 24) {
	let geometry = new THREE.LatheGeometry(
		profilePoints,
		segments,
		0,
		Math.PI * 2
	);
	geometry = addOrganicNoise(geometry, 0.05);
	return geometry;
}

function createBulletGeometry(
	baseRadius,
	tipRadius,
	length,
	taperCurve,
	segments = 24,
	bluntness = 0.8,
	constantLength = 0.7,
	tipRoundness = 0.9,
	pillShape = true,
	pillTaper = 0.3,
	pillAsymmetry = 0.5,
	overallRoundness = 0.9,
	cornerSmoothing = 0.8,
	edgeRadius = 0.15
) {
	// Gunakan pendekatan titik-titik profil yang lebih sederhana dan efektif
	const points = [];

	if (pillShape) {
		// Bentuk pill - satu sisi lebih tumpul
		// Mulai dari dasar
		points.push(new THREE.Vector2(0.0, -length * 0.2));

		// Dasar datar
		points.push(new THREE.Vector2(baseRadius, -length * 0.2));

		// Badan silinder (sebagian besar panjang)
		const cylinderLength = length * constantLength;
		points.push(new THREE.Vector2(baseRadius, cylinderLength));

		// Transisi ke bentuk pill
		const pillTransitionY = cylinderLength + length * 0.2;
		const pillRadius = baseRadius * (1 - pillTaper * 0.3);
		points.push(new THREE.Vector2(pillRadius, pillTransitionY));

		// Ujung pill - satu sisi lebih tumpul
		const tipY = length * 0.9;
		const asymmetricRadius =
			baseRadius * (1 - pillTaper * (0.5 + pillAsymmetry * 0.3));
		points.push(new THREE.Vector2(asymmetricRadius, tipY));

		// Puncak pill yang sangat tumpul
		const finalTipRadius =
			baseRadius * (1 - pillTaper * (0.7 + pillAsymmetry * 0.2));
		points.push(new THREE.Vector2(finalTipRadius, length));

		// Puncak paling atas (benar-benar tumpul)
		points.push(new THREE.Vector2(0.0, length * 1.05));
	} else {
		// Bentuk bullet biasa
		// Mulai dari dasar (agak ke dalam untuk ujung tumpul)
		points.push(new THREE.Vector2(0.0, -length * 0.3));

		// Lurus ke luar untuk dasar datar
		points.push(new THREE.Vector2(baseRadius, -length * 0.3));

		// Lurus ke atas untuk badan silinder (sebagian besar panjang)
		const cylinderLength = length * constantLength;
		points.push(new THREE.Vector2(baseRadius, cylinderLength));

		// Titik untuk membuat lengkungan di ujung (lebih tumpul)
		const tipRadiusActual = baseRadius * (1 - bluntness * 0.4);
		points.push(new THREE.Vector2(tipRadiusActual, length * 0.8));

		// Titik puncak (sangat tumpul)
		const finalTipRadius = baseRadius * (1 - bluntness * 0.7);
		points.push(new THREE.Vector2(finalTipRadius, length));

		// Titik puncak paling atas (benar-benar tumpul)
		points.push(new THREE.Vector2(0.0, length * 1.1));
	}

	// Apply roundness to all points
	const roundedPoints = points.map((point) => {
		const x = point.x;
		const y = point.y;

		// Apply overall roundness
		const roundedX = x * (1 - overallRoundness * 0.2);
		const roundedY = y * (1 - overallRoundness * 0.1);

		// Apply corner smoothing
		const smoothFactor = cornerSmoothing * 0.3;
		const smoothedX = roundedX * (1 - smoothFactor);
		const smoothedY = roundedY * (1 - smoothFactor);

		// Apply edge radius
		const edgeFactor = edgeRadius * 0.5;
		const finalX = smoothedX * (1 - edgeFactor);
		const finalY = smoothedY * (1 - edgeFactor);

		return new THREE.Vector2(finalX, finalY);
	});

	// Buat LatheGeometry dari titik-titik yang sudah di-rounded
	let geometry = new THREE.LatheGeometry(roundedPoints, segments);
	geometry = addOrganicNoise(geometry, 0.01); // Kurangi noise untuk bentuk yang lebih halus
	return geometry;
}

// Restore the original, thicker base profile
const baseProfilePoints = [
	new THREE.Vector2(0.4, 0),
	new THREE.Vector2(0.45, 0.5),
	new THREE.Vector2(0.5, 1.5),
	new THREE.Vector2(0.48, 2.5),
	new THREE.Vector2(0.52, 3.5),
	new THREE.Vector2(0.5, 4.5),
];

function updateArbre(scale, glansControls = null) {
	console.log(`[DEBUG] updateArbre called with scale: ${scale}`);

	// The scale at which the base and testicles stop growing (corresponds to 35cm length)
	const maxScaleForBase = 0.35;

	// The scale for the base radius and testicles is capped.
	const baseRadiusScale = Math.min(scale, maxScaleForBase);

	// The scale for the tip radius and length is the full, uncapped scale.
	const tipScale = scale;

	console.log(
		`[DEBUG] tipScale: ${tipScale}, baseRadiusScale: ${baseRadiusScale}`
	);

	const scaledProfile = baseProfilePoints.map((p) => {
		const newY = p.y * tipScale; // Length uses the full scale
		const maxHeight = 4.5;

		// This factor is 0 at the base (y=0) and 1 at the tip (y=4.5)
		const interpolationFactor = p.y / maxHeight;

		// Interpolate the radius scale from the capped base scale to the uncapped tip scale.
		const radiusScale =
			baseRadiusScale + (tipScale - baseRadiusScale) * interpolationFactor;

		const newX = p.x * radiusScale;

		return new THREE.Vector2(newX, newY);
	});

	const shaftGeometry = createLatheGeometry(scaledProfile);
	if (shaft) genital.remove(shaft);
	shaft = new THREE.Mesh(shaftGeometry, skinMaterial);
	shaft.position.y = 0;
	shaft.castShadow = true;
	shaft.receiveShadow = true;
	genital.add(shaft);

	// Glans (pink part) with customizable shape
	const glansRadius = glansControls
		? glansControls.radius * tipScale
		: 0.6 * tipScale;
	const glansWidthSegments = glansControls ? glansControls.widthSegments : 24;
	const glansHeightSegments = glansControls ? glansControls.heightSegments : 18;
	const glansPhiStart = glansControls ? glansControls.phiStart : 0;
	const glansPhiLength = glansControls ? glansControls.phiLength : Math.PI * 2;
	const glansThetaStart = glansControls ? glansControls.thetaStart : 0;
	const glansThetaLength = glansControls
		? glansControls.thetaLength
		: Math.PI / 1.2;
	const glansNoiseAmplitude = glansControls
		? glansControls.noiseAmplitude * tipScale
		: 0.03 * tipScale;

	let glansGeometry;

	// Ensure bullet shape is enabled by default if no controls provided
	const useBulletShape = glansControls ? glansControls.bulletShape : true;

	// Use same scaling as sphere for consistent positioning
	const positionScale = tipScale; // Same as sphere scaling for consistent position
	const sizeScale = Math.max(tipScale * 3, 0.3); // More aggressive scaling for size

	if (useBulletShape) {
		// Create bullet shape with default values if controls not available
		console.log(
			`[DEBUG] Glans scaling - tipScale: ${tipScale}, positionScale: ${positionScale}, sizeScale: ${sizeScale}`
		);
		const baseRadius = (glansControls?.baseRadius || 0.4) * sizeScale;
		const tipRadius = (glansControls?.tipRadius || 0.2) * sizeScale;
		const bulletLength = (glansControls?.bulletLength || 1.08) * sizeScale;
		const taperCurve = glansControls?.taperCurve || 5;

		glansGeometry = createBulletGeometry(
			baseRadius,
			tipRadius,
			bulletLength,
			taperCurve,
			glansWidthSegments,
			glansControls?.bluntness || 0,
			glansControls?.constantLength || 0.61,
			glansControls?.tipRoundness || 0.37,
			glansControls?.pillShape || true,
			glansControls?.pillTaper || 0.57,
			glansControls?.pillAsymmetry || 0.13,
			glansControls?.overallRoundness || 0.87,
			glansControls?.cornerSmoothing || 1,
			glansControls?.edgeRadius || 0.09
		);
	} else {
		// Create sphere shape
		glansGeometry = new THREE.SphereGeometry(
			glansRadius,
			glansWidthSegments,
			glansHeightSegments,
			glansPhiStart,
			glansPhiLength,
			glansThetaStart,
			glansThetaLength
		);
		addOrganicNoise(glansGeometry, glansNoiseAmplitude);
	}

	if (glans) genital.remove(glans);

	// Create material with customizable properties
	const glansMaterialCustom = new THREE.MeshStandardMaterial({
		color: glansControls ? glansControls.color : 0x64c78d,
		roughness: glansControls ? glansControls.roughness : 0.3,
		metalness: glansControls ? glansControls.metalness : 0.05,
	});

	glans = new THREE.Mesh(glansGeometry, glansMaterialCustom);
	glans.name = "penis_tip"; // Give the tip a name for tracking

	// Apply placement and rotation from controls with defaults
	glans.position.set(
		glansControls?.glansPosX || 0.0,
		4.5 * positionScale + (glansControls?.glansPosY || 0.0),
		glansControls?.glansPosZ || 0.0
	);
	glans.rotation.set(
		-Math.PI / 2 + (glansControls?.glansRotX || 0.0),
		glansControls?.glansRotY || 0.0,
		glansControls?.glansRotZ || 0.0
	);

	glans.castShadow = true;
	glans.receiveShadow = true;
	genital.add(glans);

	// Testicles scale with the capped base scale
	const testRadius = 0.6 * baseRadiusScale;
	const testGeometry1 = new THREE.SphereGeometry(testRadius, 18, 12);
	addOrganicNoise(testGeometry1, 0.04 * baseRadiusScale);
	if (testicle1) genital.remove(testicle1);
	testicle1 = new THREE.Mesh(testGeometry1, skinMaterial);
	testicle1.position.set(
		-0.4 * baseRadiusScale,
		-testRadius * -0.5,
		0.8 * baseRadiusScale
	);
	testicle1.castShadow = true;
	testicle1.receiveShadow = true;
	genital.add(testicle1);

	const testGeometry2 = new THREE.SphereGeometry(testRadius, 18, 12);
	addOrganicNoise(testGeometry2, 0.04 * baseRadiusScale);
	if (testicle2) genital.remove(testicle2);
	testicle2 = new THREE.Mesh(testGeometry2, skinMaterial);
	testicle2.position.set(
		0.4 * baseRadiusScale,
		-testRadius * -0.5,
		0.8 * baseRadiusScale
	);
	testicle2.castShadow = true;
	testicle2.receiveShadow = true;
	genital.add(testicle2);
}

// Function to update glans shape in real-time
function updateGlansShape(glansControls) {
	if (!glans) {
		console.log("Glans not found, cannot update shape");
		return;
	}

	console.log("Updating glans shape with controls:", glansControls);

	const tipScale = genital.scale.x;
	const glansRadius = glansControls.radius * tipScale;
	const glansWidthSegments = glansControls.widthSegments;
	const glansHeightSegments = glansControls.heightSegments;
	const glansPhiStart = glansControls.phiStart;
	const glansPhiLength = glansControls.phiLength;
	const glansThetaStart = glansControls.thetaStart;
	const glansThetaLength = glansControls.thetaLength;
	const glansNoiseAmplitude = glansControls.noiseAmplitude * tipScale;
	const positionScale = tipScale; // Keep available for placement in all shape branches

	// Create new geometry with bullet shape
	let glansGeometry;

	if (glansControls.bulletShape) {
		// Create bullet shape with same positioning as sphere but aggressive sizing
		const sizeScale = Math.max(tipScale * 3, 0.3); // More aggressive scaling for size
		console.log(
			`[DEBUG] updateGlansShape - tipScale: ${tipScale}, positionScale: ${positionScale}, sizeScale: ${sizeScale}`
		);
		const baseRadius = glansControls.baseRadius * sizeScale;
		const tipRadius = glansControls.tipRadius * sizeScale;
		const bulletLength = glansControls.bulletLength * sizeScale;
		const taperCurve = glansControls.taperCurve;

		glansGeometry = createBulletGeometry(
			baseRadius,
			tipRadius,
			bulletLength,
			taperCurve,
			glansWidthSegments,
			glansControls.bluntness,
			glansControls.constantLength,
			glansControls.tipRoundness,
			glansControls.pillShape,
			glansControls.pillTaper,
			glansControls.pillAsymmetry,
			glansControls.overallRoundness,
			glansControls.cornerSmoothing,
			glansControls.edgeRadius
		);
	} else {
		// Create sphere shape
		glansGeometry = new THREE.SphereGeometry(
			glansRadius,
			glansWidthSegments,
			glansHeightSegments,
			glansPhiStart,
			glansPhiLength,
			glansThetaStart,
			glansThetaLength
		);
		addOrganicNoise(glansGeometry, glansNoiseAmplitude);
	}

	// Update material properties
	glans.material.color.setHex(glansControls.color || 0x64c78d);
	glans.material.roughness = glansControls.roughness;
	glans.material.metalness = glansControls.metalness;
	glans.material.needsUpdate = true;

	// Update placement and rotation
	glans.position.set(
		glansControls.glansPosX,
		4.5 * positionScale + glansControls.glansPosY, // Use positionScale for consistent positioning
		glansControls.glansPosZ
	);
	glans.rotation.set(
		-Math.PI / 2 + glansControls.glansRotX,
		glansControls.glansRotY,
		glansControls.glansRotZ
	);

	// Replace geometry
	if (glans.geometry) {
		glans.geometry.dispose();
	}
	glans.geometry = glansGeometry;

	console.log("Glans shape updated successfully");
}

updateArbre(0.1); // Default scale for 10cm

// Force update all materials to ensure colors are applied
function forceUpdateMaterials() {
	genital.traverse((child) => {
		if (child.isMesh && child.material) {
			// Update shaft and testicles to white
			if (child.material === skinMaterial || child.name !== "penis_tip") {
				child.material.color.setHex(0xfffffe);
				child.material.needsUpdate = true;
			}
			// Update glans to green
			if (child.name === "penis_tip") {
				child.material.color.setHex(0x64c78d);
				child.material.needsUpdate = true;
			}
		}
	});
}

// Apply material updates after a short delay
setTimeout(forceUpdateMaterials, 200);

export {
	genital,
	updateArbre,
	updateGlansShape,
	forceUpdateMaterials,
	skinMaterial,
	glansMaterial,
};
