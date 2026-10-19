import * as THREE from 'three';
import { rand, canvasTexture, mergeGeos } from './util.js';

export function buildScenery(scene, anisotropy) {
  const grassTex = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#7cb06a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 520; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(88,138,76,.5)' : 'rgba(158,204,132,.45)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.7, 1.7);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = 'rgba(196,178,110,.30)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 2.4, 2.4);
    }
  }, 34, 34, anisotropy);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#3d4149';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(26,29,34,.4)' : 'rgba(112,118,128,.26)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(22,25,30,.25)';
    ctx.fillRect(0, 42, s, 44);
    ctx.fillRect(0, 170, s, 44);
    ctx.fillStyle = '#f0e9d8';
    ctx.fillRect(8, 122, 112, 11);
    ctx.fillRect(0, 6, s, 6);
    ctx.fillRect(0, 244, s, 6);
  }, 20, 1, anisotropy);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 6.4),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  scene.add(road);

  const curbMat = new THREE.MeshStandardMaterial({ color: 0xd6d2c8, roughness: 0.9 });
  for (const z of [-3.35, 3.35]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(260, 0.15, 0.34), curbMat);
    curb.position.set(0, 0.075, z);
    curb.receiveShadow = true;
    scene.add(curb);
  }

  function makeRidge(dist, hMin, hMax, color) {
    const geos = [];
    const count = 13;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.14, 0.14);
      const d = dist * rand(0.9, 1.12);
      const h = rand(hMin, hMax);
      const g = new THREE.ConeGeometry(h * rand(0.9, 1.7), h, 5, 1);
      g.translate(0, h / 2 - h * 0.28, 0);
      g.rotateY(rand(0, 3));
      g.scale(1, 1, rand(0.6, 1.25));
      g.translate(Math.cos(a) * d, 0, Math.sin(a) * d);
      geos.push(g);
    }
    const m = new THREE.Mesh(mergeGeos(geos), new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 }));
    scene.add(m);
  }
  makeRidge(150, 26, 42, 0x9aa6bd);
  makeRidge(104, 15, 26, 0x8593a3);
  makeRidge(70, 7, 14, 0x7e8f6b);

  const swayTime = { value: 0 };
  const scrollShift = { value: 0 };
  {
    const bladeGeo = new THREE.PlaneGeometry(0.05, 0.34, 1, 2);
    bladeGeo.translate(0, 0.17, 0);
    const grassMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 });
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = swayTime;
      shader.uniforms.uShift = scrollShift;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uShift;')
        .replace('#include <project_vertex>', `
          vec4 mvPosition = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
            float gx = instanceMatrix[3][0];
            mvPosition.x += mod(gx + uShift + 42.0, 84.0) - 42.0 - gx;
          #endif
          float gph = mvPosition.x * 1.31 + mvPosition.z * 2.17;
          float gbend = smoothstep(0.0, 0.34, position.y);
          mvPosition.x += (sin(uTime * 1.7 + gph) * 0.6 + sin(uTime * 3.2 + gph * 1.9) * 0.4) * 0.055 * gbend;
          mvPosition.z += cos(uTime * 1.4 + gph) * 0.04 * gbend;
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;
        `);
    };
    const COUNT = 2600;
    const grass = new THREE.InstancedMesh(bladeGeo, grassMat, COUNT);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    const palette = [0x6da057, 0x7ab261, 0x86c06c, 0x94c46f, 0xb0a555];
    for (let i = 0; i < COUNT; i++) {
      const x = rand(-40, 44);
      const z = (Math.random() < 0.5 ? -1 : 1) * rand(3.75, 26);
      e.set(rand(-0.12, 0.12), rand(0, Math.PI * 2), rand(-0.12, 0.12));
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, rand(0.7, 1.5), 1));
      grass.setMatrixAt(i, m4);
      col.setHex(palette[(Math.random() * palette.length) | 0]).offsetHSL(0, rand(-0.05, 0.05), rand(-0.05, 0.05));
      grass.setColorAt(i, col);
    }
    scene.add(grass);
  }

  {
    const postGeo = new THREE.BoxGeometry(0.055, 0.75, 0.055);
    postGeo.translate(0, 0.375, 0);
    const bandGeo = new THREE.BoxGeometry(0.062, 0.12, 0.062);
    bandGeo.translate(0, 0.6, 0);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.7 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xd94f43, roughness: 0.7 });
    const N = 16;
    const posts = new THREE.InstancedMesh(postGeo, postMat, N);
    const bands = new THREE.InstancedMesh(bandGeo, bandMat, N);
    posts.castShadow = bands.castShadow = true;
    posts.userData.items = [];
    for (let i = 0; i < N; i++) {
      posts.userData.items.push({
        x: -38 + i * 10.5 + rand(-1.5, 1.5),
        z: (i % 2 === 0 ? -1 : 1) * 3.85
      });
    }
    scene.add(posts, bands);
    posts.userData.bands = bands;
    var postsRef = posts;
  }

  {
    const poleParts = [];
    const pole = new THREE.CylinderGeometry(0.085, 0.115, 4.6, 8);
    pole.translate(0, 2.3, 0);
    poleParts.push(pole);
    const arm = new THREE.BoxGeometry(1.05, 0.08, 0.08);
    arm.translate(0, 4.15, 0);
    poleParts.push(arm);
    for (const sx of [-0.55, 0.55]) {
      const stub = new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5);
      stub.rotateZ(sx > 0 ? -1.35 : 1.35);
      stub.translate(sx * 1.15, 3.98, 0);
      poleParts.push(stub);
    }
    const poleGeo = mergeGeos(poleParts);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x6e5138, roughness: 1 });
    const N = 8;
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, N);
    poles.castShadow = true;
    poles.userData.items = [];
    for (let i = 0; i < N; i++) {
      poles.userData.items.push({ x: -38 + i * 24 + rand(-4, 4), z: -9.5 });
    }
    scene.add(poles);
    var polesRef = poles;
  }

  const cloudTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      const x = 44 + Math.random() * 168;
      const y = 46 + Math.random() * 40;
      const r = 24 + Math.random() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.38)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const cloudMats = [0.95, 0.75].map(op => new THREE.SpriteMaterial({
    map: cloudTex, transparent: true, opacity: op, depthWrite: false, fog: true
  }));
  const nightCloud = new THREE.Color(0x55617e);
  const dayCloud = new THREE.Color(0xffffff);
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const cloud = new THREE.Group();
    const n = 3 + ((Math.random() * 3) | 0);
    for (let j = 0; j < n; j++) {
      const sp = new THREE.Sprite(cloudMats[j % 2]);
      const w = rand(6, 15);
      sp.scale.set(w, w * rand(0.35, 0.5), 1);
      sp.position.set(rand(-6, 6), rand(-0.8, 0.8), rand(-2.5, 2.5));
      cloud.add(sp);
    }
    cloud.position.set(rand(-70, 80), rand(9, 15), rand(-45, 45));
    scene.add(cloud);
    clouds.push(cloud);
  }

  const balloon = new THREE.Group();
  {
    const stripeTex = (() => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 64;
      const ctx = c.getContext('2d');
      const cols = ['#e8604a', '#f7c65c', '#6aa5d8', '#f2efe6'];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect((i / 8) * 128, 0, 128 / 8 + 1, 64);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    })();
    const envelope = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 20, 16),
      new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.75 })
    );
    envelope.scale.y = 1.12;
    balloon.add(envelope);
    const basket = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.34, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x8a6136, roughness: 0.9 })
    );
    basket.position.y = -1.85;
    balloon.add(basket);
    for (const [rx, rz] of [[-0.28, -0.28], [-0.28, 0.28], [0.28, -0.28], [0.28, 0.28]]) {
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.62, 5),
        new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 })
      );
      rope.position.set(rx, -1.52, rz);
      rope.rotation.z = rx * 0.35;
      rope.rotation.x = -rz * 0.35;
      balloon.add(rope);
    }
    balloon.position.set(rand(10, 60), 15.5, rand(-38, -14));
    scene.add(balloon);
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 1 });
  const leafMats = [0x6fae57, 0x5d9c4e, 0x86b95f, 0xc9a84c].map(c =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xa8adb5, roughness: 0.9, flatShading: true });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x58a04f, roughness: 1, flatShading: true });
  const flowerMats = [0xff9fb1, 0xffe08a, 0xbba8ff, 0xffb27a].map(c =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, emissive: c, emissiveIntensity: 0.12 }));

  const scrollers = [];
  const addScroller = (obj, f = 1) => { scrollers.push({ obj, f }); scene.add(obj); return obj; };

  function makeTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 1.4, 7), trunkMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    g.add(trunk);
    const blobs = [[0, 1.75, 0, 0.9], [0.45, 1.4, 0.24, 0.58], [-0.4, 1.45, -0.2, 0.52], [0.05, 2.4, -0.1, 0.58]];
    const geos = blobs.map(([x, y, z, r]) => {
      const s = new THREE.SphereGeometry(r, 8, 6);
      s.translate(x, y, z);
      return s;
    });
    const foliage = new THREE.Mesh(mergeGeos(geos), leafMats[(Math.random() * leafMats.length) | 0]);
    foliage.castShadow = true;
    g.add(foliage);
    return g;
  }

  function makeBush() {
    const geos = [];
    for (let i = 0; i < 3; i++) {
      const r = rand(0.32, 0.55);
      const s = new THREE.SphereGeometry(r, 8, 6);
      s.translate(rand(-0.35, 0.35), r * 0.75, rand(-0.35, 0.35));
      geos.push(s);
    }
    const m = new THREE.Mesh(mergeGeos(geos), bushMat);
    m.castShadow = true;
    return m;
  }

  function makeRock() {
    const r = rand(0.3, 0.62);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), rockMat);
    rock.scale.set(1, rand(0.55, 0.85), rand(0.8, 1.3));
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    rock.position.y = r * 0.35;
    rock.castShadow = true;
    return rock;
  }

  function makeFlowers() {
    const g = new THREE.Group();
    const stemGeos = [];
    const bloomGeos = [];
    for (let i = 0; i < 5; i++) {
      const h = rand(0.25, 0.45);
      const x = rand(-0.45, 0.45), z = rand(-0.45, 0.45);
      const stem = new THREE.CylinderGeometry(0.012, 0.012, h, 5);
      stem.translate(x, h / 2, z);
      stemGeos.push(stem);
      const bloom = new THREE.SphereGeometry(rand(0.05, 0.085), 8, 6);
      bloom.translate(x, h + 0.03, z);
      bloomGeos.push(bloom);
    }
    const stems = new THREE.Mesh(mergeGeos(stemGeos), bushMat);
    const blooms = new THREE.Mesh(mergeGeos(bloomGeos), flowerMats[(Math.random() * flowerMats.length) | 0]);
    g.add(stems, blooms);
    return g;
  }

  function scatter(factory, count, minGap) {
    for (let i = 0; i < count; i++) {
      const obj = addScroller(factory());
      obj.position.set(rand(-36, 46), 0, (Math.random() < 0.5 ? -1 : 1) * rand(minGap, 24));
      obj.rotation.y = Math.random() * Math.PI * 2;
      obj.scale.setScalar(rand(0.75, 1.35));
    }
  }
  scatter(makeTree, 9, 6);
  scatter(makeBush, 9, 4.6);
  scatter(makeRock, 7, 4.4);
  scatter(makeFlowers, 7, 4.2);

  const birdMat = new THREE.MeshStandardMaterial({ color: 0x2f3540, roughness: 0.9 });
  const flocks = [];
  for (let k = 0; k < 2; k++) {
    const flock = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const bird = new THREE.Group();
      const wingGeo = new THREE.BoxGeometry(0.34, 0.02, 0.09);
      const l = new THREE.Mesh(wingGeo, birdMat);
      const r = new THREE.Mesh(wingGeo, birdMat);
      l.position.x = -0.17; r.position.x = 0.17;
      bird.add(l, r);
      bird.userData = { l, r, ph: Math.random() * 7 };
      bird.position.set(rand(-2.4, 2.4), rand(-0.6, 0.6), rand(-2.4, 2.4));
      flock.add(bird);
    }
    flock.position.set(rand(-60, 60), rand(13, 19), rand(-30, 30));
    scene.add(flock);
    flocks.push(flock);
  }

  const tmpM4 = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpP = new THREE.Vector3();
  const ONE = new THREE.Vector3(1, 1, 1);

  function update(dt, time, speed, f) {
    roadTex.offset.x -= (speed * dt) / 13;
    swayTime.value = time;
    scrollShift.value -= speed * dt * 0.12;

    for (const s of scrollers) {
      s.obj.position.x -= speed * s.f * dt;
      if (s.obj.position.x < -36) {
        s.obj.position.x += 76 + Math.random() * 30;
        s.obj.position.z = (Math.random() < 0.5 ? -1 : 1) * rand(4.2, 24);
        s.obj.rotation.y = Math.random() * Math.PI * 2;
        s.obj.scale.setScalar(rand(0.75, 1.35));
      }
    }

    for (const item of postsRef.userData.items) {
      item.x -= speed * 0.55 * dt;
      if (item.x < -40) item.x += 88;
    }
    postsRef.userData.items.forEach((it, i) => {
      tmpP.set(it.x, 0, it.z);
      tmpM4.compose(tmpP, tmpQ.identity(), ONE);
      postsRef.setMatrixAt(i, tmpM4);
      postsRef.userData.bands.setMatrixAt(i, tmpM4);
    });
    postsRef.instanceMatrix.needsUpdate = true;
    postsRef.userData.bands.instanceMatrix.needsUpdate = true;

    polesRef.userData.items.forEach((it, i) => {
      const sp = speed * 0.55;
      it.x -= sp * dt;
      if (it.x < -40) it.x += 88;
      tmpP.set(it.x, 0, it.z);
      tmpM4.compose(tmpP, tmpQ.identity(), ONE);
      polesRef.setMatrixAt(i, tmpM4);
    });
    polesRef.instanceMatrix.needsUpdate = true;

    for (const c of clouds) {
      c.position.x += (0.45 + speed * 0.02) * dt;
      if (c.position.x > 95) c.position.x = -95;
    }
    for (const m of cloudMats) m.color.lerpColors(nightCloud, dayCloud, f);

    balloon.position.y = 15.5 + Math.sin(time * 0.5) * 0.9;
    balloon.position.x -= speed * 0.15 * dt;
    balloon.rotation.z = Math.sin(time * 0.7) * 0.05;
    balloon.rotation.x = Math.sin(time * 0.45 + 1) * 0.04;
    if (balloon.position.x < -70) balloon.position.x = 90;

    for (const flock of flocks) {
      flock.position.x += (2.6 + speed * 0.06) * dt;
      flock.position.y += Math.sin(time * 0.6 + flock.position.z) * 0.02;
      if (flock.position.x > 90) flock.position.set(-90, rand(12, 20), rand(-35, 35));
      for (const bird of flock.children) {
        const w = Math.sin(time * 9 + bird.userData.ph) * 0.5;
        bird.userData.l.rotation.z = w;
        bird.userData.r.rotation.z = -w;
      }
    }
  }

  return { update, ground };
}
