import * as THREE from 'three';

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

export function buildBike() {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xcf3f36, roughness: 0.35, metalness: 0.25 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.92 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.3, metalness: 0.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.6, metalness: 0.2 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0x4a3327, roughness: 0.7 });
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.45, metalness: 0.7 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf6c453, roughness: 0.25, metalness: 0.9, emissive: 0xf6c453, emissiveIntensity: 0.08 });

  const group = new THREE.Group();

  function tube(a, b, r, mat, geoCache) {
    const key = `${r}`;
    let geo = geoCache && geoCache[key];
    if (!geo) {
      geo = new THREE.CylinderGeometry(r, r, 1, 10);
      if (geoCache) geoCache[key] = geo;
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

  const geoCache = {};
  const wheelGeo = {
    tire: new THREE.TorusGeometry(0.44, 0.06, 14, 44),
    rim: new THREE.TorusGeometry(0.365, 0.018, 8, 40),
    hub: new THREE.CylinderGeometry(0.04, 0.04, 0.1, 12),
    spoke: new THREE.CylinderGeometry(0.006, 0.006, 0.365, 5)
  };
  wheelGeo.spoke.translate(0, 0.1825, 0);
  wheelGeo.hub.rotateX(Math.PI / 2);

  function makeWheel(x) {
    const w = new THREE.Group();
    w.position.set(x, DIM.wheelR, 0);
    const tire = new THREE.Mesh(wheelGeo.tire, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(wheelGeo.rim, rimMat);
    const hub = new THREE.Mesh(wheelGeo.hub, rimMat);
    w.add(tire, rim, hub);
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(wheelGeo.spoke, rimMat);
      s.rotation.z = (i / 12) * Math.PI * 2;
      w.add(s);
    }
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

  tube(bb, seat, 0.03, frameMat, geoCache);
  tube(bb, head, 0.03, frameMat, geoCache);
  tube(seat, V3(0.46, 1.1, 0), 0.026, frameMat, geoCache);
  tube(seat, seatTop, 0.018, rimMat, geoCache);
  for (const z of [-0.05, 0.05]) {
    tube(bb, V3(rearHub.x, rearHub.y, z), 0.016, frameMat, geoCache);
    tube(V3(seat.x, seat.y, z * 0.4), V3(rearHub.x, rearHub.y, z), 0.014, frameMat, geoCache);
    tube(V3(crown.x, crown.y, z), V3(frontHub.x, frontHub.y, z), 0.018, rimMat, geoCache);
  }
  tube(crown, V3(0.47, 1.24, 0), 0.034, frameMat, geoCache);

  const bar = tube(V3(0.47, 1.24, -0.24), V3(0.47, 1.24, 0.24), 0.018, darkMat, geoCache);
  tube(V3(0.47, 1.24, 0.24), V3(0.47, 1.24, 0.30), 0.023, saddleMat);
  tube(V3(0.47, 1.24, -0.24), V3(0.47, 1.24, -0.30), 0.023, saddleMat);

  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), saddleMat);
  saddle.scale.set(0.4, 0.09, 0.22);
  saddle.position.copy(seatTop).add(V3(0.0, 0.04, 0));
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

  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff3cf, emissive: 0xffe08a, emissiveIntensity: 0.15, roughness: 0.3 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.09, 14), darkMat);
  lamp.rotation.z = Math.PI / 2;
  lamp.position.set(0.60, 1.06, 0);
  group.add(lamp);
  const lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), lampMat);
  lampGlow.position.set(0.645, 1.06, 0);
  group.add(lampGlow);

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

  return { group, wheelF, wheelB, crank, pedalL, pedalR, bell, bellDome, lampMat };
}
