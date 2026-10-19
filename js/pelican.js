import * as THREE from 'three';
import { mergeGeos } from './util.js';

export function buildPelican() {
  const PL_ORIGIN = new THREE.Vector3(-0.20, 1.65, 0);
  const PL = (x, y, z) => new THREE.Vector3(x, y, z).sub(PL_ORIGIN);
  const L = (x, y, z) => new THREE.Vector3(x, y, z).sub(PL_ORIGIN);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf7f5ef, roughness: 0.6 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xff9a2e, roughness: 0.5 });
  const pouchMat = new THREE.MeshStandardMaterial({ color: 0xffb45e, roughness: 0.55 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xff8b2d, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.25 });
  const glintMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x2ea8a2, roughness: 0.3, metalness: 0.2 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0xff5a3c, roughness: 0.85 });
  const scarfTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.85 });

  const group = new THREE.Group();
  group.position.copy(PL_ORIGIN);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 22), whiteMat);
  body.scale.set(1.2, 0.98, 0.92);
  body.castShadow = true;
  group.add(body);

  {
    const fluffGeos = [[0.18, 1.44, 0.14], [0.23, 1.34, 0], [0.18, 1.44, -0.14]].map(([x, y, z]) => {
      const g = new THREE.SphereGeometry(0.1, 14, 10);
      g.scale(1, 0.75, 0.9);
      g.translate(x - PL_ORIGIN.x, y - PL_ORIGIN.y, z - PL_ORIGIN.z);
      return g;
    });
    const fluff = new THREE.Mesh(mergeGeos(fluffGeos), whiteMat);
    fluff.castShadow = true;
    group.add(fluff);
  }

  let tail;
  {
    const tailGeos = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.BoxGeometry(0.36, 0.035, 0.09);
      if (i === 2) g.scale(1.15, 1, 1);
      g.translate(-0.18, 0, 0);
      g.rotateY((i - 2) * 0.26);
      tailGeos.push(g);
    }
    tail = new THREE.Mesh(mergeGeos(tailGeos), whiteMat);
    tail.position.copy(PL(-0.64, 1.78, 0));
    tail.rotation.z = -0.38;
    tail.castShadow = true;
    group.add(tail);
  }

  const headPivot = PL(0.10, 1.82, 0);
  const headGroup = new THREE.Group();
  headGroup.position.copy(headPivot);
  group.add(headGroup);
  const H = (x, y, z) => PL(x, y, z).sub(headPivot);

  const neckPts = [H(0.06, 1.74, 0), H(0.30, 2.05, 0), H(0.46, 2.30, 0), H(0.52, 2.38, 0)];
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

  const beakTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), beakMat);
  beakTip.position.copy(H(1.36, 2.315, 0));
  headGroup.add(beakTip);
  const hook = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 8), beakMat);
  hook.position.copy(H(1.36, 2.29, 0));
  hook.rotation.z = Math.PI;
  headGroup.add(hook);

  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), pouchMat);
  pouch.position.copy(H(0.96, 2.24, 0));
  pouch.scale.set(0.66, 0.27, 0.25);
  headGroup.add(pouch);

  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.10, 14, 10), pouchMat);
  chin.position.copy(H(0.72, 2.28, 0));
  headGroup.add(chin);

  const eyeGeo = new THREE.SphereGeometry(0.038, 12, 10);
  const glintGeo = new THREE.SphereGeometry(0.013, 8, 6);
  const lidGeo = new THREE.SphereGeometry(0.045, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
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
  const lidL = new THREE.Mesh(lidGeo, whiteMat);
  const lidR = new THREE.Mesh(lidGeo, whiteMat);
  lidL.position.copy(eyeL.position).add(new THREE.Vector3(0.004, 0.014, 0.003));
  lidR.position.copy(eyeR.position).add(new THREE.Vector3(0.004, 0.014, -0.003));
  lidL.rotation.z = lidR.rotation.z = -0.22;
  headGroup.add(eyeL, eyeR, lidL, lidR);

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
    const grip = PL(0.49, 1.14, side * 0.20);
    const dir = grip.clone().sub(shoulder);
    const len = dir.length();

    const wing = new THREE.Group();
    wing.position.copy(shoulder);
    wing.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
    wing.userData.baseQuat = wing.quaternion.clone();

    const geos = [];
    const ball = new THREE.SphereGeometry(0.15, 16, 12);
    ball.scale(1, 0.85, 0.95);
    ball.translate(0.04, 0, 0);
    geos.push(ball);

    const main = new THREE.SphereGeometry(0.5, 20, 14);
    main.scale(0.62, 0.145, 0.30);
    main.translate(len * 0.52, 0, 0);
    geos.push(main);

    for (let i = 0; i < 3; i++) {
      const f1 = new THREE.BoxGeometry(0.26, 0.04, 0.02);
      f1.rotateZ(-0.12 - i * 0.18);
      f1.translate(len * 0.92, -0.03 - i * 0.015, (i - 1) * 0.035);
      geos.push(f1);
      const f2 = new THREE.BoxGeometry(0.2, 0.032, 0.018);
      f2.rotateZ(-0.3 - i * 0.2);
      f2.translate(len * 0.78, 0.012 - i * 0.012, (i - 1) * 0.042);
      geos.push(f2);
    }

    const hand = new THREE.SphereGeometry(0.055, 12, 10);
    hand.translate(len, 0, 0);
    geos.push(hand);

    const wingMesh = new THREE.Mesh(mergeGeos(geos), whiteMat);
    wingMesh.castShadow = true;
    wing.add(wingMesh);
    group.add(wing);
    return wing;
  }
  const wingL = makeWing(1);
  const wingR = makeWing(-1);

  const scarfAnchor = L(0.56, 0.36, 0.08);
  const scarf = { anchor: scarfAnchor, segs: [] };
  {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.052, 10, 22), scarfMat);
    ring.position.copy(H(0.33, 2.13, 0));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.52, 0.85, 0).normalize());
    headGroup.add(ring);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 10), scarfMat);
    knot.position.copy(H(0.38, 2.02, 0.12));
    knot.scale.set(1, 0.84, 0.92);
    headGroup.add(knot);
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.16 - t * 0.05, 0.024, 0.12 - t * 0.05), i >= 6 ? scarfTrimMat : scarfMat);
      seg.castShadow = true;
      group.add(seg);
      scarf.segs.push(seg);
    }
  }

  const legs = new THREE.Group();
  const thighGeo = new THREE.CylinderGeometry(0.05, 0.042, 1, 10);
  const shinGeo = new THREE.CylinderGeometry(0.04, 0.031, 1, 10);
  const kneeGeo = new THREE.SphereGeometry(0.052, 10, 8);
  const thighL = new THREE.Mesh(thighGeo, legMat);
  const thighR = new THREE.Mesh(thighGeo, legMat);
  const shinL = new THREE.Mesh(shinGeo, legMat);
  const shinR = new THREE.Mesh(shinGeo, legMat);
  const kneeL = new THREE.Mesh(kneeGeo, legMat);
  const kneeR = new THREE.Mesh(kneeGeo, legMat);
  for (const m of [thighL, thighR, shinL, shinR, kneeL, kneeR]) m.castShadow = true;

  const footGeo = new THREE.CylinderGeometry(0.024, 0.085, 0.25, 10);
  footGeo.rotateZ(-Math.PI / 2);
  const footL = new THREE.Mesh(footGeo, legMat);
  const footR = new THREE.Mesh(footGeo, legMat);
  footL.scale.y = 0.36;
  footR.scale.y = 0.36;
  footL.castShadow = footR.castShadow = true;

  legs.add(thighL, thighR, shinL, shinR, kneeL, kneeR, footL, footR);

  return {
    group, legs,
    legL: thighL, legR: thighR, shinL, shinR, kneeL, kneeR, footL, footR,
    headGroup, pouch, wingL, wingR, eyeL, eyeR, lidL, lidR, tail, helmet, scarf, scarfMat
  };
}

const X_AXIS = new THREE.Vector3(1, 0, 0);

function bodySurfaceY(x, z) {
  const q = 1 - (x / 0.6) * (x / 0.6) - (z / 0.46) * (z / 0.46);
  return q > 0 ? 0.49 * Math.sqrt(q) : 0.04;
}

export function updateScarf(scarf, time, speed) {
  const amp = Math.min(0.09, 0.02 + speed * 0.012);
  const lift = Math.min(0.15, speed * 0.019);
  const a = scarf.anchor;
  const prev = new THREE.Vector3().copy(a);
  const pos = new THREE.Vector3();
  const dir = new THREE.Vector3();
  scarf.segs.forEach((seg, idx) => {
    const f = idx + 1;
    const px = a.x - f * 0.1;
    const fz = Math.sin(time * (3.9 + speed * 0.7) - f * 0.7) * amp * f * 0.3;
    const fy = Math.sin(time * (4.5 + speed * 0.9) - f * 0.85) * amp * f * 0.4;
    pos.set(px, bodySurfaceY(px, fz) + 0.055 + fy + lift * (f / 8), fz);
    dir.subVectors(pos, prev).normalize();
    seg.quaternion.setFromUnitVectors(X_AXIS, dir);
    seg.position.copy(pos);
    prev.copy(pos);
  });
}

export function setLeg(mesh, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.scale.set(1, len, 1);
}
