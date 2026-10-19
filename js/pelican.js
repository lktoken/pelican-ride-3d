import * as THREE from 'three';

export function buildPelican() {
  const PL_ORIGIN = new THREE.Vector3(-0.20, 1.65, 0);
  const PL = (x, y, z) => new THREE.Vector3(x, y, z).sub(PL_ORIGIN);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.62 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xff9a2e, roughness: 0.5 });
  const pouchMat = new THREE.MeshStandardMaterial({ color: 0xffb45e, roughness: 0.55 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xff8b2d, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.25 });
  const glintMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x2ea8a2, roughness: 0.35, metalness: 0.15 });

  const group = new THREE.Group();
  group.position.copy(PL_ORIGIN);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 22), whiteMat);
  body.scale.set(1.2, 0.98, 0.92);
  body.castShadow = true;
  group.add(body);

  const headPivot = PL(0.10, 1.82, 0);
  const headGroup = new THREE.Group();
  headGroup.position.copy(headPivot);
  group.add(headGroup);
  const H = (x, y, z) => PL(x, y, z).sub(headPivot);

  const neckPts = [PL(0.06, 1.76, 0), PL(0.28, 2.04, 0), PL(0.44, 2.30, 0), PL(0.52, 2.38, 0)];
  const neck = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPts), 32, 0.11, 12),
    whiteMat
  );
  neck.castShadow = true;
  headGroup.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 18), whiteMat);
  head.position.copy(H(0.52, 2.40, 0));
  head.scale.set(1, 0.96, 0.94);
  head.castShadow = true;
  headGroup.add(head);

  const beakGeo = new THREE.CylinderGeometry(0.022, 0.10, 0.74, 14);
  beakGeo.rotateZ(-Math.PI / 2);
  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.position.copy(H(1.01, 2.40, 0));
  beak.rotation.z = -0.11;
  beak.scale.set(1, 0.55, 0.9);
  beak.castShadow = true;
  headGroup.add(beak);

  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), pouchMat);
  pouch.position.copy(H(0.96, 2.24, 0));
  pouch.scale.set(0.66, 0.27, 0.25);
  headGroup.add(pouch);

  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.10, 14, 10), pouchMat);
  chin.position.copy(H(0.72, 2.28, 0));
  headGroup.add(chin);

  const eyeGeo = new THREE.SphereGeometry(0.038, 12, 10);
  const glintGeo = new THREE.SphereGeometry(0.013, 8, 6);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.copy(H(0.66, 2.40, 0.14));
  eyeR.position.copy(H(0.66, 2.40, -0.14));
  const glintL = new THREE.Mesh(glintGeo, glintMat);
  const glintR = new THREE.Mesh(glintGeo, glintMat);
  glintL.position.set(0.016, 0.014, 0.012);
  glintR.position.set(0.016, 0.014, -0.012);
  eyeL.add(glintL);
  eyeR.add(glintR);
  headGroup.add(eyeL, eyeR);

  const helmetGeo = new THREE.SphereGeometry(0.215, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const helmet = new THREE.Mesh(helmetGeo, helmetMat);
  helmet.position.copy(H(0.47, 2.46, 0));
  helmet.rotation.z = 0.10;
  helmet.castShadow = true;
  headGroup.add(helmet);

  const strapGeo = new THREE.BoxGeometry(0.018, 0.11, 0.012);
  const strapL = new THREE.Mesh(strapGeo, helmetMat);
  const strapR = new THREE.Mesh(strapGeo, helmetMat);
  strapL.position.copy(H(0.55, 2.34, 0.14));
  strapR.position.copy(H(0.55, 2.34, -0.14));
  headGroup.add(strapL, strapR);

  function makeWing(side) {
    const shoulder = PL(-0.12, 1.78, side * 0.40);
    const grip = PL(0.47, 1.31, side * 0.28);
    const dir = grip.clone().sub(shoulder);
    const len = dir.length();

    const wing = new THREE.Group();
    wing.position.copy(shoulder);
    wing.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
    wing.userData.baseQuat = wing.quaternion.clone();

    const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), whiteMat);
    shoulderBall.scale.set(1, 0.85, 0.95);
    shoulderBall.position.set(0.04, 0, 0);
    shoulderBall.castShadow = true;
    wing.add(shoulderBall);

    const main = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), whiteMat);
    main.scale.set(0.62, 0.145, 0.30);
    main.position.set(len * 0.52, 0, 0);
    main.castShadow = true;
    wing.add(main);

    for (let i = 0; i < 3; i++) {
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.02), whiteMat);
      feather.position.set(len * 0.92, -0.03 - i * 0.015, (i - 1) * 0.035);
      feather.rotation.z = -0.12 - i * 0.18;
      feather.castShadow = true;
      wing.add(feather);
    }

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), whiteMat);
    hand.position.set(len, 0, 0);
    hand.castShadow = true;
    wing.add(hand);

    group.add(wing);
    return wing;
  }
  const wingL = makeWing(1);
  const wingR = makeWing(-1);

  const tailGeo = new THREE.CylinderGeometry(0.05, 0.22, 0.5, 10);
  tailGeo.rotateZ(Math.PI / 2);
  const tail = new THREE.Mesh(tailGeo, whiteMat);
  tail.position.copy(PL(-0.88, 1.66, 0));
  tail.rotation.z = -0.25;
  tail.scale.set(1, 0.35, 1);
  tail.castShadow = true;
  group.add(tail);

  const legs = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.042, 0.034, 1, 10);
  const legL = new THREE.Mesh(legGeo, legMat);
  const legR = new THREE.Mesh(legGeo, legMat);
  legL.castShadow = legR.castShadow = true;

  const footGeo = new THREE.CylinderGeometry(0.03, 0.115, 0.21, 10);
  footGeo.rotateZ(-Math.PI / 2);
  const footL = new THREE.Mesh(footGeo, legMat);
  const footR = new THREE.Mesh(footGeo, legMat);
  footL.scale.y = 0.45;
  footR.scale.y = 0.45;
  footL.castShadow = footR.castShadow = true;

  legs.add(legL, legR, footL, footR);

  return { group, legs, legL, legR, footL, footR, headGroup, pouch, wingL, wingR, tail, eyeL, eyeR, helmet };
}

export function setLeg(mesh, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.scale.set(1, len, 1);
}
