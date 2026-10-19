import * as THREE from 'three';
import { radialTexture } from './util.js';

export function createFeathers(scene) {
  const geo = new THREE.PlaneGeometry(0.075, 0.12);
  const items = [];

  function burst(pos, count = 16) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: Math.random() < 0.3 ? 0xd9d2c4 : 0xfdfbf4,
        side: THREE.DoubleSide,
        transparent: true,
        roughness: 0.85
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ));
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      scene.add(m);
      items.push({
        m,
        v: new THREE.Vector3((Math.random() - 0.5) * 1.7, 1.1 + Math.random() * 1.9, (Math.random() - 0.5) * 1.7),
        av: new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7),
        t: 0,
        life: 1.7 + Math.random() * 1.0,
        ph: Math.random() * 7
      });
    }
    while (items.length > 140) {
      const it = items.shift();
      scene.remove(it.m);
      it.m.material.dispose();
    }
  }

  function update(dt) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      it.v.y -= 2.6 * dt;
      it.v.multiplyScalar(1 - 0.85 * dt);
      it.m.position.addScaledVector(it.v, dt);
      it.m.position.x += Math.sin(it.t * 5 + it.ph) * 0.2 * dt;
      it.m.rotation.x += it.av.x * dt;
      it.m.rotation.y += it.av.y * dt;
      it.m.rotation.z += it.av.z * dt;
      if (it.m.position.y < 0.06) {
        it.m.position.y = 0.06;
        it.v.set(it.v.x * 0.35, 0, it.v.z * 0.35);
        it.av.multiplyScalar(0.6);
      }
      const fade = it.t > it.life - 0.6 ? (it.life - it.t) / 0.6 : 1;
      it.m.material.opacity = Math.max(0, Math.min(1, fade));
      if (it.t >= it.life) {
        scene.remove(it.m);
        it.m.material.dispose();
        items.splice(i, 1);
      }
    }
  }

  return { burst, update };
}

export function createRings(scene) {
  const geo = new THREE.RingGeometry(0.055, 0.084, 36);
  const items = [];

  function spawn(pos) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffdf8a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, fog: false
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    scene.add(m);
    items.push({ m, t: 0 });
  }

  function update(dt, camera) {
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.t += dt;
      const k = it.t / 0.6;
      it.m.scale.setScalar(1 + k * 6.5);
      it.m.material.opacity = Math.max(0, 0.95 * (1 - k));
      it.m.quaternion.copy(camera.quaternion);
      if (it.t > 0.6) {
        scene.remove(it.m);
        it.m.material.dispose();
        items.splice(i, 1);
      }
    }
  }

  return { spawn, update };
}

export function createDust(scene) {
  const tex = radialTexture(64, [
    [0, 'rgba(196,174,138,0.75)'],
    [0.45, 'rgba(184,164,132,0.32)'],
    [1, 'rgba(176,158,128,0)']
  ]);
  const POOL = 36;
  const items = [];
  for (let i = 0; i < POOL; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.visible = false;
    scene.add(sp);
    items.push({ sp, t: 0, life: 1, vx: 0, vy: 0, vz: 0, size: 1, active: false });
  }
  let acc = 0;
  let cursor = 0;

  function spawn(speed) {
    const it = items[cursor];
    cursor = (cursor + 1) % POOL;
    it.active = true;
    it.t = 0;
    it.life = 0.7 + Math.random() * 0.55;
    it.size = 0.14 + Math.random() * 0.18;
    it.sp.position.set(
      -0.58 + (Math.random() - 0.5) * 0.12,
      0.07 + Math.random() * 0.05,
      (Math.random() - 0.5) * 0.14
    );
    it.vx = -(speed * 0.55 + 0.25) * (0.7 + Math.random() * 0.5);
    it.vy = 0.35 + Math.random() * 0.4;
    it.vz = (Math.random() - 0.5) * 0.5;
    it.sp.visible = true;
  }

  function update(dt, speed, dayF) {
    acc += dt * (speed * 3.1 + 0.5);
    while (acc >= 1) {
      acc -= 1;
      spawn(speed);
    }
    for (const it of items) {
      if (!it.active) continue;
      it.t += dt;
      it.vx *= 1 - 1.4 * dt;
      it.vy = Math.max(0, it.vy - 1.1 * dt);
      it.sp.position.x += it.vx * dt;
      it.sp.position.y += it.vy * dt;
      it.sp.position.z += it.vz * dt;
      const k = it.t / it.life;
      const s = it.size * (0.6 + k * 1.5);
      it.sp.scale.set(s, s * 0.85, 1);
      const vis = (0.15 + Math.min(0.22, speed * 0.028)) * (0.5 + 0.5 * dayF);
      it.sp.material.opacity = Math.max(0, vis * (1 - k) * Math.min(1, it.t * 6));
      if (it.t >= it.life) {
        it.active = false;
        it.sp.visible = false;
      }
    }
  }

  return { update };
}

export function createSpeedLines(camera) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff0d0, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false
  });
  const geo = new THREE.BoxGeometry(0.014, 0.014, 1);
  const lines = [];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(geo, mat);
    const a = Math.random() * Math.PI * 2;
    const r = 0.6 + Math.random() * 0.95;
    m.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.58, -1.2 - Math.random() * 1.7);
    m.userData = { len: 0.5 + Math.random() * 1.0, ph: Math.random() * 7 };
    m.scale.z = m.userData.len;
    m.frustumCulled = false;
    group.add(m);
    lines.push(m);
  }
  group.visible = false;
  group.renderOrder = 999;
  camera.add(group);

  function update(dt, speed, time) {
    const k = Math.max(0, (speed - 3.6) / 4.4);
    const op = Math.min(1, k) * 0.55;
    group.visible = op > 0.01;
    mat.opacity = op;
    if (!group.visible) return;
    for (const m of lines) {
      m.position.z += dt * (2 + speed * 2.1);
      if (m.position.z > -0.15) {
        m.position.z = -2.9 - Math.random() * 1.2;
        const a = Math.random() * Math.PI * 2;
        const r = 0.6 + Math.random() * 0.95;
        m.position.x = Math.cos(a) * r;
        m.position.y = Math.sin(a) * r * 0.58;
      }
      m.scale.z = m.userData.len * (1 + k * (0.6 + 0.5 * Math.sin(time * 7 + m.userData.ph)));
    }
  }

  return { update, group };
}
