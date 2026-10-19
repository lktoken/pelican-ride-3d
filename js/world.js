import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);

export function buildWorld(scene, renderer) {
  const dayTop = new THREE.Color(0x2e6fd6);
  const dayHori = new THREE.Color(0xcfe9ff);
  const nightTop = new THREE.Color(0x05081a);
  const nightHori = new THREE.Color(0x182a4d);
  const daySunCol = new THREE.Color(0xfff2c0);
  const nightSunCol = new THREE.Color(0x4c66b8);
  const dayFog = new THREE.Color(0xcfe9ff);
  const nightFog = new THREE.Color(0x0c1526);

  const sunPos = new THREE.Vector3(30, 26, -18);
  const moonPos = new THREE.Vector3(-34, 24, -16);
  const sunDir = sunPos.clone().normalize();
  const moonDir = moonPos.clone().normalize();

  const skyUniforms = {
    topColor: { value: dayTop.clone() },
    horizonColor: { value: dayHori.clone() },
    sunColor: { value: daySunCol.clone() },
    sunDir: { value: sunDir.clone() },
    sunIntensity: { value: 1.0 }
  };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorld;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      uniform float sunIntensity;
      void main(){
        vec3 dir = normalize(vWorld - cameraPosition);
        float h = clamp(dir.y * 1.35 + 0.06, 0.0, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(h, 0.72));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * (pow(sd, 220.0) * 1.35 + pow(sd, 9.0) * 0.16) * sunIntensity;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(340, 40, 24), skyMat));

  const hemi = new THREE.HemisphereLight(0xbdd7ff, 0x7a9a63, 0.75);
  scene.add(hemi);
  const hemiDaySky = new THREE.Color(0xbdd7ff);
  const hemiNightSky = new THREE.Color(0x2a3a5e);
  const hemiDayGround = new THREE.Color(0x7a9a63);
  const hemiNightGround = new THREE.Color(0x16213a);

  const sunLight = new THREE.DirectionalLight(0xfff0d0, 2.3);
  sunLight.position.copy(sunPos);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 4, far: 90 });
  sunLight.shadow.camera.updateProjectionMatrix();
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.02;
  sunLight.target.position.set(0, 0.8, 0);
  scene.add(sunLight, sunLight.target);

  const fillLight = new THREE.DirectionalLight(0xbcd4ff, 0.45);
  fillLight.position.set(-18, 11, 16);
  scene.add(fillLight);

  const moonLight = new THREE.DirectionalLight(0x93aaff, 0);
  moonLight.position.copy(moonPos);
  scene.add(moonLight);

  const headlight = new THREE.SpotLight(0xffe9b0, 0, 24, 0.5, 0.45, 1.6);
  headlight.position.set(0.62, 1.06, 0);
  headlight.target.position.set(7, 0.05, 0);
  scene.add(headlight, headlight.target);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd88a, emissiveIntensity: 3.4 })
  );
  sunMesh.position.copy(sunPos);
  scene.add(sunMesh);

  const moonMat = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: 0xdfe8ff, emissiveIntensity: 2.2, transparent: true, opacity: 0
  });
  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 16), moonMat);
  moonMesh.position.copy(moonPos);
  moonMesh.visible = false;
  scene.add(moonMesh);

  const starMats = [0.55, 1.2].map(size => new THREE.PointsMaterial({
    color: 0xd8e6ff, size, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false
  }));
  const stars = new THREE.Group();
  {
    const positions = [];
    for (let i = 0; i < 1500; i++) {
      const y = 250 * (0.04 + 0.96 * Math.random());
      const r = Math.sqrt(250 * 250 - y * y);
      const a = Math.random() * Math.PI * 2;
      positions.push(r * Math.cos(a), y, r * Math.sin(a));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    stars.add(new THREE.Points(geo, starMats[0]), new THREE.Points(geo, starMats[1]));
  }
  stars.visible = false;
  scene.add(stars);

  function canvasTexture(size, painter, repeatX, repeatY) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    painter(c.getContext('2d'), size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  const grassTex = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#7cb06a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(90,140,80,.5)' : 'rgba(150,200,130,.45)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.6, 1.6);
    }
  }, 30, 30);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(110, 64),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#454a52';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(30,33,38,.35)' : 'rgba(120,126,136,.28)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(25,28,32,.22)';
    ctx.fillRect(0, 44, s, 42);
    ctx.fillRect(0, 170, s, 42);
    ctx.fillStyle = '#e9edf2';
    ctx.fillRect(8, 122, 112, 12);
    ctx.fillRect(0, 6, s, 6);
    ctx.fillRect(0, 244, s, 6);
  }, 20, 1);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 6.4),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.95 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  scene.add(road);

  const curbMat = new THREE.MeshStandardMaterial({ color: 0xcfd4d9, roughness: 0.9 });
  for (const z of [-3.35, 3.35]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(260, 0.15, 0.34), curbMat);
    curb.position.set(0, 0.075, z);
    curb.receiveShadow = true;
    scene.add(curb);
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c35, roughness: 1 });
  const leafMats = [0x4e8f4a, 0x5da052, 0x3f7f43].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.9, flatShading: true });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x58a04f, roughness: 1 });
  const flowerMats = [0xff9fb1, 0xffe08a, 0xbba8ff, 0xffb27a].map(c =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, emissive: c, emissiveIntensity: 0.12 }));

  const scrollers = [];
  const addScroller = (obj, f = 1) => { scrollers.push({ obj, f }); scene.add(obj); return obj; };

  function makeTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.3, 7), trunkMat);
    trunk.position.y = 0.65;
    trunk.castShadow = true;
    g.add(trunk);
    const mat = leafMats[(Math.random() * leafMats.length) | 0];
    const blobs = [[0, 1.65, 0, 0.85], [0.42, 1.35, 0.22, 0.55], [-0.38, 1.4, -0.18, 0.5], [0.05, 2.25, -0.1, 0.55]];
    for (const [x, y, z, r] of blobs) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      leaf.position.set(x, y, z);
      leaf.castShadow = true;
      g.add(leaf);
    }
    return g;
  }

  function makeBush() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const r = rand(0.32, 0.55);
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), bushMat);
      b.position.set(rand(-0.35, 0.35), r * 0.75, rand(-0.35, 0.35));
      b.castShadow = true;
      g.add(b);
    }
    return g;
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
    const mat = flowerMats[(Math.random() * flowerMats.length) | 0];
    for (let i = 0; i < 4; i++) {
      const h = rand(0.25, 0.45);
      const x = rand(-0.4, 0.4), z = rand(-0.4, 0.4);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 5), bushMat);
      stem.position.set(x, h / 2, z);
      g.add(stem);
      const flower = new THREE.Mesh(new THREE.SphereGeometry(rand(0.05, 0.085), 8, 6), mat);
      flower.position.set(x, h + 0.03, z);
      g.add(flower);
    }
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
  scatter(makeFlowers, 8, 4.2);

  const hillMat = new THREE.MeshStandardMaterial({ color: 0x7aa568, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand(-0.2, 0.2);
    const d = rand(62, 92);
    const hill = new THREE.Mesh(new THREE.SphereGeometry(rand(14, 26), 16, 12), hillMat);
    hill.position.set(Math.cos(a) * d, rand(-6, -2), Math.sin(a) * d);
    hill.scale.y = rand(0.32, 0.5);
    scene.add(hill);
  }

  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.06 });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    const n = 3 + ((Math.random() * 3) | 0);
    for (let j = 0; j < n; j++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(rand(0.8, 1.7), 10, 8), cloudMat);
      p.position.set(rand(-1.8, 1.8), rand(-0.25, 0.35), rand(-0.7, 0.7));
      p.scale.y = 0.62;
      cloud.add(p);
    }
    cloud.position.set(rand(-70, 80), rand(8, 14), rand(-45, 45));
    scene.add(cloud);
    clouds.push(cloud);
  }

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

  const state = { dayFactor: 1 };

  function setDay(target01, dt) {
    state.dayFactor += (target01 - state.dayFactor) * Math.min(1, dt * 1.6);
    const f = state.dayFactor;

    skyUniforms.topColor.value.lerpColors(nightTop, dayTop, f);
    skyUniforms.horizonColor.value.lerpColors(nightHori, dayHori, f);
    skyUniforms.sunColor.value.lerpColors(nightSunCol, daySunCol, f);
    skyUniforms.sunIntensity.value = THREE.MathUtils.lerp(0.3, 1.0, f);
    skyUniforms.sunDir.value.copy(moonDir).lerp(sunDir, f).normalize();

    scene.fog.color.lerpColors(nightFog, dayFog, f);
    scene.fog.density = THREE.MathUtils.lerp(0.019, 0.0115, f);

    hemi.intensity = THREE.MathUtils.lerp(0.18, 0.75, f);
    hemi.color.lerpColors(hemiNightSky, hemiDaySky, f);
    hemi.groundColor.lerpColors(hemiNightGround, hemiDayGround, f);
    sunLight.intensity = 2.3 * f;
    fillLight.intensity = THREE.MathUtils.lerp(0.05, 0.45, f);
    moonLight.intensity = 0.45 * (1 - f);
    headlight.intensity = (1 - f) * 40;
    cloudMat.emissiveIntensity = THREE.MathUtils.lerp(0.04, 0.3, f);

    sunMesh.visible = f > 0.03;
    moonMesh.visible = f < 0.98;
    moonMat.opacity = 1 - f;
    stars.visible = f < 0.98;
    starMats[0].opacity = (1 - f) * 0.85;
    starMats[1].opacity = (1 - f) * 1.0;

    return f;
  }

  function update(dt, time, speed) {
    roadTex.offset.x -= (speed * dt) / 13;
    for (const s of scrollers) {
      s.obj.position.x -= speed * s.f * dt;
      if (s.obj.position.x < -36) {
        s.obj.position.x += 76 + Math.random() * 30;
        s.obj.position.z = (Math.random() < 0.5 ? -1 : 1) * rand(4.2, 24);
        s.obj.rotation.y = Math.random() * Math.PI * 2;
        s.obj.scale.setScalar(rand(0.75, 1.35));
      }
    }
    for (const c of clouds) {
      c.position.x += (0.45 + speed * 0.02) * dt;
      if (c.position.x > 95) c.position.x = -95;
    }
    for (const flock of flocks) {
      flock.position.x += (2.6 + speed * 0.06) * dt;
      flock.position.y += Math.sin(time * 0.6 + flock.position.z) * 0.02;
      if (flock.position.x > 90) {
        flock.position.set(-90, rand(12, 20), rand(-35, 35));
      }
      for (const bird of flock.children) {
        const f = Math.sin(time * 9 + bird.userData.ph) * 0.5;
        bird.userData.l.rotation.z = f;
        bird.userData.r.rotation.z = -f;
      }
    }
  }

  return { setDay, update, dayFactor: () => state.dayFactor };
}
