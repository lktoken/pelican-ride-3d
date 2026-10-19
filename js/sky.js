import * as THREE from 'three';
import { clamp, lerp, radialTexture } from './util.js';

export function buildSky(scene, renderer) {
  const dayTop = new THREE.Color(0x2a63c9);
  const dayHori = new THREE.Color(0xffcd92);
  const nightTop = new THREE.Color(0x050a1c);
  const nightHori = new THREE.Color(0x16223d);
  const daySunCol = new THREE.Color(0xffb45e);
  const nightSunCol = new THREE.Color(0x4c66b8);
  const daySunset = new THREE.Color(0xff8f3d);
  const dayFog = new THREE.Color(0xf0cd9c);
  const nightFog = new THREE.Color(0x0b1322);

  const sunPos = new THREE.Vector3(36, 9.5, -20);
  const moonPos = new THREE.Vector3(-34, 22, -14);
  const sunDir = sunPos.clone().normalize();
  const moonDir = moonPos.clone().normalize();

  const skyUniforms = {
    topColor: { value: dayTop.clone() },
    horizonColor: { value: dayHori.clone() },
    sunColor: { value: daySunCol.clone() },
    sunsetColor: { value: daySunset.clone() },
    sunsetStrength: { value: 1.0 },
    sunDir: { value: sunDir.clone() },
    sunIntensity: { value: 1.2 }
  };
  const skyShader = {
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
      uniform vec3 sunsetColor;
      uniform vec3 sunDir;
      uniform float sunIntensity;
      uniform float sunsetStrength;
      void main(){
        vec3 dir = normalize(vWorld - cameraPosition);
        float h = clamp(dir.y * 1.35 + 0.06, 0.0, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(h, 0.72));
        vec3 sdir = normalize(sunDir);
        float azimuth = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(sdir.x, 0.0, sdir.z))), 0.0);
        float band = exp(-abs(dir.y) * 5.5);
        col += sunsetColor * band * (0.25 + 0.75 * pow(azimuth, 2.0)) * sunsetStrength * 0.55;
        float sd = max(dot(dir, sdir), 0.0);
        col += sunColor * (pow(sd, 240.0) * 1.5 + pow(sd, 10.0) * 0.18) * sunIntensity;
        gl_FragColor = vec4(col, 1.0);
      }`
  };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: skyUniforms, ...skyShader
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(340, 40, 24), skyMat));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSkyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: skyUniforms, ...skyShader });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), envSkyMat));
  const envGround = new THREE.Mesh(
    new THREE.CircleGeometry(49, 24),
    new THREE.MeshBasicMaterial({ color: 0x67794b })
  );
  envGround.rotation.x = -Math.PI / 2;
  envGround.position.y = -1;
  envScene.add(envGround);
  const envRT = pmrem.fromScene(envScene, 0.03);
  scene.environment = envRT.texture;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xd8e4ff, 0x7f9a5e, 0.55);
  scene.add(hemi);
  const hemiDaySky = new THREE.Color(0xd8e4ff);
  const hemiNightSky = new THREE.Color(0x26365a);
  const hemiDayGround = new THREE.Color(0x7f9a5e);
  const hemiNightGround = new THREE.Color(0x141d33);

  const sunLight = new THREE.DirectionalLight(0xffa964, 2.75);
  sunLight.position.copy(sunPos);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunLight.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 2, far: 90 });
  sunLight.shadow.camera.updateProjectionMatrix();
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.02;
  sunLight.target.position.set(0, 0.8, 0);
  scene.add(sunLight, sunLight.target);

  const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.35);
  fillLight.position.set(-20, 9, 18);
  scene.add(fillLight);

  const moonLight = new THREE.DirectionalLight(0x8fa8ff, 0);
  moonLight.position.copy(moonPos);
  scene.add(moonLight);

  const sunTex = radialTexture(128, [
    [0, 'rgba(255,252,240,1)'],
    [0.18, 'rgba(255,236,190,0.95)'],
    [0.45, 'rgba(255,196,110,0.5)'],
    [1, 'rgba(255,170,80,0)']
  ]);
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true
  }));
  sunSprite.position.copy(sunPos);
  sunSprite.scale.set(34, 34, 1);
  scene.add(sunSprite);

  const moonTex = radialTexture(128, [
    [0, 'rgba(240,246,255,1)'],
    [0.22, 'rgba(214,228,255,0.9)'],
    [0.5, 'rgba(170,190,240,0.35)'],
    [1, 'rgba(150,170,230,0)']
  ]);
  const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: moonTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0
  }));
  moonSprite.position.copy(moonPos);
  moonSprite.scale.set(16, 16, 1);
  scene.add(moonSprite);

  const starMats = [0.55, 1.25].map(size => new THREE.PointsMaterial({
    color: 0xd8e6ff, size, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false
  }));
  const stars = new THREE.Group();
  {
    const positions = [];
    for (let i = 0; i < 1500; i++) {
      const y = 250 * (0.03 + 0.97 * Math.random());
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

  const envMats = [];
  function collectEnvMaterials(root) {
    const seen = new Set();
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (seen.has(m) || !('envMapIntensity' in m)) continue;
        seen.add(m);
        const metal = (m.metalness || 0) > 0.4;
        m.userData.envBase = metal ? 0.95 : 0.2;
        envMats.push(m);
      }
    });
    for (const m of envMats) m.envMapIntensity = m.userData.envBase;
  }

  const state = { dayFactor: 1 };

  function setDay(target01, dt) {
    state.dayFactor += (target01 - state.dayFactor) * Math.min(1, dt * 1.6);
    const f = state.dayFactor;

    skyUniforms.topColor.value.lerpColors(nightTop, dayTop, f);
    skyUniforms.horizonColor.value.lerpColors(nightHori, dayHori, f);
    skyUniforms.sunColor.value.lerpColors(nightSunCol, daySunCol, f);
    skyUniforms.sunsetStrength.value = lerp(0.12, 1.0, f);
    skyUniforms.sunIntensity.value = lerp(0.32, 1.2, f);
    skyUniforms.sunDir.value.copy(moonDir).lerp(sunDir, f).normalize();

    scene.fog.color.lerpColors(nightFog, dayFog, f);
    scene.fog.density = lerp(0.0135, 0.0068, f);

    hemi.intensity = THREE.MathUtils.lerp(0.16, 0.55, f);
    hemi.color.lerpColors(hemiNightSky, hemiDaySky, f);
    hemi.groundColor.lerpColors(hemiNightGround, hemiDayGround, f);
    sunLight.intensity = 2.75 * f;
    fillLight.intensity = lerp(0.05, 0.35, f);
    moonLight.intensity = 0.5 * (1 - f);

    sunSprite.material.opacity = clamp(f * 1.4 - 0.25, 0, 1);
    moonSprite.material.opacity = clamp((1 - f) * 1.4 - 0.25, 0, 1);
    stars.visible = f < 0.98;
    starMats[0].opacity = (1 - f) * 0.85;
    starMats[1].opacity = (1 - f) * 1.0;

    for (const m of envMats) m.envMapIntensity = m.userData.envBase * (0.28 + 0.72 * f);

    return f;
  }

  return { setDay, collectEnvMaterials, dayFactor: () => state.dayFactor };
}
