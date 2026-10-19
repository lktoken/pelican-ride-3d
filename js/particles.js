import * as THREE from 'three';

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
