import * as THREE from 'three';
import { canvasTexture, mergeGeos } from './util.js';

export const DIM = {
  bb: { x: -0.03, y: 0.40 },
  crankR: 0.17,
  pedalZ: 0.115,
  wheelR: 0.5
};

export function pedalPos(phi, side) {
  return new THREE.Vector3(
    DIM.bb.x - Math.sin(phi) * DIM.crankR,
    DIM.bb.y + Math.cos(phi) * DIM.crankR,
    side * DIM.pedalZ
  );
}

export function buildBike(anisotropy) {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xcf3a30, roughness: 0.26, metalness: 0.35 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.24, metalness: 0.9 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.55, metalness: 0.25 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0x53392a, roughness: 0.6 });
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x7b828e, roughness: 0.4, metalness: 0.75 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf6c453, roughness: 0.22, metalness: 0.95, emissive: 0xf6c453, emissiveIntensity: 0.08 });
  const wickerTex = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#a9743f';
    ctx.fillRect(0, 0, s, s);
    for (let x = 4; x < s; x += 10) {
      ctx.fillStyle = 'rgba(92,58,26,.55)';
      ctx.fillRect(x, 0, 3, s);
    }
    for (let y = 4; y < s; y += 10) {
      ctx.fillStyle = 'rgba(70,45,20,.4)';
      ctx.fillRect(0, y, s, 3);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = 'rgba(210,166,110,.35)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 4, 1.5);
    }
  }, 3, 1, anisotropy);
  const wickerMat = new THREE.MeshStandardMaterial({ map: wickerTex, roughness: 0.85, side: THREE.DoubleSide });

  const group = new THREE.Group();
  const geoCache = {};

  function tube(a, b, r, mat) {
    const key = `${r}`;
    let geo = geoCache[key];
    if (!geo) {
      geo = new THREE.CylinderGeometry(r, r, 1, 10);
      geoCache[key] = geo;
    }
    const mesh = new THREE.Mesh(geo, mat);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.scale.set(1, len, 1);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  function joint(x, y, z, r) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), frameMat);
    s.position.set(x, y, z);
    s.castShadow = true;
    group.add(s);
    return s;
  }

  const wheelGeo = {
    tire: new THREE.TorusGeometry(0.44, 0.06, 14, 44),
    rim: new THREE.TorusGeometry(0.365, 0.018, 8, 40),
    hub: new THREE.CylinderGeometry(0.04, 0.04, 0.1, 12),
    fender: new THREE.TorusGeometry(0.545, 0.026, 8, 22, Math.PI * (2 / 3))
  };
  wheelGeo.hub.rotateX(Math.PI / 2);
  wheelGeo.fender.rotateZ(0.44);
  const spokeGeos = [];
  for (let i = 0; i < 12; i++) {
    const s = new THREE.CylinderGeometry(0.006, 0.006, 0.365, 5);
    s.translate(0, 0.1825, 0);
    s.rotateZ((i / 12) * Math.PI * 2);
    spokeGeos.push(s);
  }
  wheelGeo.spokes = mergeGeos(spokeGeos);

  function makeWheel(x) {
    const w = new THREE.Group();
    w.position.set(x, DIM.wheelR, 0);
    const tire = new THREE.Mesh(wheelGeo.tire, tireMat);
    tire.castShadow = true;
    w.add(tire);
    w.add(new THREE.Mesh(wheelGeo.rim, rimMat));
    w.add(new THREE.Mesh(wheelGeo.hub, rimMat));
    w.add(new THREE.Mesh(wheelGeo.spokes, rimMat));
    const fender = new THREE.Mesh(wheelGeo.fender, rimMat);
    fender.castShadow = true;
    w.add(fender);
    group.add(w);
    return w;
  }

  const wheelB = makeWheel(-0.58);
  const wheelF = makeWheel(0.58);

  const bb = V3(DIM.bb.x, DIM.bb.y, 0);
  const seat = V3(-0.38, 1.02, 0);
  const head = V3(0.48, 1.02, 0);
  const crown = V3(0.55, 0.95, 0);
  const rearHub = V3(-0.58, DIM.wheelR, 0);
  const frontHub = V3(0.58, DIM.wheelR, 0);
  const seatTop = V3(-0.42, 1.18, 0);

  tube(bb, seat, 0.03, frameMat);
  tube(bb, head, 0.03, frameMat);
  tube(seat, V3(0.46, 1.1, 0), 0.026, frameMat);
  tube(seat, seatTop, 0.018, rimMat);
  for (const z of [-0.05, 0.05]) {
    tube(bb, V3(rearHub.x, rearHub.y, z), 0.016, frameMat);
    tube(V3(seat.x, seat.y, z * 0.4), V3(rearHub.x, rearHub.y, z), 0.014, frameMat);
    tube(V3(crown.x, crown.y, z), V3(frontHub.x, frontHub.y, z), 0.018, rimMat);
  }
  tube(crown, V3(0.47, 1.24, 0), 0.034, frameMat);
  joint(bb.x, bb.y, 0, 0.034);
  joint(seat.x, seat.y, 0, 0.031);
  joint(seatTop.x, seatTop.y, 0, 0.02);
  joint(head.x, head.y, 0, 0.031);
  joint(crown.x, crown.y, 0, 0.036);

  tube(V3(0.47, 1.24, -0.20), V3(0.47, 1.24, 0.20), 0.018, darkMat);
  const dropGeo = new THREE.TorusGeometry(0.11, 0.016, 8, 16, -Math.PI * 0.55);
  const gripGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.09, 10);
  for (const side of [-1, 1]) {
    tube(V3(0.47, 1.24, side * 0.20), V3(0.58, 1.24, side * 0.20), 0.016, darkMat);
    const drop = new THREE.Mesh(dropGeo, darkMat);
    drop.position.set(0.47, 1.24, side * 0.20);
    drop.castShadow = true;
    group.add(drop);
    const grip = new THREE.Mesh(gripGeo, saddleMat);
    grip.position.set(0.489, 1.132, side * 0.20);
    grip.rotation.z = -1.396;
    grip.castShadow = true;
    group.add(grip);
  }

  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), saddleMat);
  saddle.scale.set(0.4, 0.09, 0.22);
  saddle.position.copy(seatTop).add(V3(0, 0.04, 0));
  saddle.castShadow = true;
  group.add(saddle);

  const crank = new THREE.Group();
  crank.position.copy(bb);
  group.add(crank);

  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.018, 36), chainMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.045;
  crank.add(ring);
  for (let i = 0; i < 5; i++) {
    const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), darkMat);
    const a = (i / 5) * Math.PI * 2;
    bolt.position.set(Math.cos(a) * 0.093, Math.sin(a) * 0.093, 0.058);
    crank.add(bolt);
  }

  const armGeo = new THREE.BoxGeometry(0.036, 0.17, 0.036);
  const leftArm = new THREE.Mesh(armGeo, darkMat);
  leftArm.position.set(0, 0.085, 0.09);
  leftArm.castShadow = true;
  crank.add(leftArm);

  const rightWrap = new THREE.Group();
  rightWrap.rotation.z = Math.PI;
  const rightArm = new THREE.Mesh(armGeo, darkMat);
  rightArm.position.set(0, 0.085, -0.09);
  rightArm.castShadow = true;
  rightWrap.add(rightArm);
  crank.add(rightWrap);

  const pedalGeo = new THREE.BoxGeometry(0.12, 0.022, 0.088);
  const pedalL = new THREE.Mesh(pedalGeo, darkMat);
  const pedalR = new THREE.Mesh(pedalGeo, darkMat);
  pedalL.castShadow = pedalR.castShadow = true;
  group.add(pedalL, pedalR);

  const cog = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 20), chainMat);
  cog.rotation.x = Math.PI / 2;
  cog.position.set(rearHub.x, rearHub.y, 0.04);
  group.add(cog);

  tube(V3(0.105, 0.53, 0.045), V3(rearHub.x, 0.555, 0.04), 0.008, chainMat);
  tube(V3(0.105, 0.27, 0.045), V3(rearHub.x, 0.445, 0.04), 0.008, chainMat);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.26), frameMat);
  deck.position.set(-0.58, 0.95, 0);
  deck.castShadow = true;
  group.add(deck);

  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.125, 0.16, 12, 1, true), wickerMat);
  basket.position.set(0.72, 0.92, 0);
  basket.castShadow = true;
  group.add(basket);
  const basketBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.014, 12), wickerMat);
  basketBottom.position.set(0.72, 0.845, 0);
  group.add(basketBottom);
  for (const sz of [-0.09, 0.09]) {
    tube(V3(0.70, 0.85, sz), V3(0.60, 0.64, sz * 0.6), 0.011, darkMat);
  }
  tube(V3(0.63, 0.99, 0), V3(0.52, 1.16, 0), 0.011, darkMat);

  const fish = new THREE.Group();
  const fishBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf09040, roughness: 0.45 })
  );
  fishBody.scale.set(0.23, 0.10, 0.08);
  fishBody.castShadow = true;
  fish.add(fishBody);
  const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 6), fishBody.material);
  fishTail.geometry.rotateZ(Math.PI / 2);
  fishTail.position.x = -0.13;
  fishTail.scale.set(1, 1, 0.4);
  fish.add(fishTail);
  const fishEyeGeo = new THREE.SphereGeometry(0.011, 6, 5);
  const fishEyeMat = new THREE.MeshStandardMaterial({ color: 0x201c18, roughness: 0.3 });
  const eyeA = new THREE.Mesh(fishEyeGeo, fishEyeMat);
  const eyeB = new THREE.Mesh(fishEyeGeo, fishEyeMat);
  eyeA.position.set(0.085, 0.012, 0.03);
  eyeB.position.set(0.085, 0.012, -0.03);
  fish.add(eyeA, eyeB);
  fish.position.set(0.71, 1.0, 0.03);
  fish.rotation.y = 0.5;
  group.add(fish);

  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff3cf, emissive: 0xffe08a, emissiveIntensity: 0.05, roughness: 0.3 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.09, 14), darkMat);
  lamp.rotation.z = Math.PI / 2;
  lamp.position.set(0.615, 1.05, 0);
  group.add(lamp);
  const lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), lampMat);
  lampGlow.position.set(0.658, 1.05, 0);
  group.add(lampGlow);

  const headlight = new THREE.SpotLight(0xffe9b0, 0, 24, 0.5, 0.45, 1.6);
  headlight.position.set(0.60, 1.05, 0);
  headlight.target.position.set(7, 0.05, 0);
  group.add(headlight, headlight.target);

  const bell = new THREE.Group();
  const bellMount = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 10), darkMat);
  bellMount.position.y = 0.02;
  const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.05, 18, 12), goldMat);
  bellDome.position.y = 0.06;
  bellDome.scale.y = 0.82;
  bellDome.castShadow = true;
  bell.add(bellMount, bellDome);
  bell.position.set(0.47, 1.235, 0.13);
  group.add(bell);

  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 64, 8, 128, 64, 108);
    g.addColorStop(0, 'rgba(18,24,40,0.55)');
    g.addColorStop(0.55, 'rgba(18,24,40,0.32)');
    g.addColorStop(1, 'rgba(18,24,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.25),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.9 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.032, 0);
  group.add(shadow);

  return { group, wheelF, wheelB, crank, pedalL, pedalR, bell, bellDome, lampMat, headlight, fish, shadow };
}
