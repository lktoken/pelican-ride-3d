import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld } from './world.js';
import { buildBike, pedalPos, DIM } from './bike.js';
import { buildPelican, setLeg } from './pelican.js';
import { createFeathers, createRings } from './particles.js';
import { playDing, ensureAudio } from './audio.js';

const fatal = document.getElementById('fatal');
try { main(); } catch (err) {
  fatal.hidden = false;
  fatal.textContent = '页面初始化失败：' + err.message;
  throw err;
}

function main() {
  const loader = document.getElementById('loader');
  const canvas = document.getElementById('gl');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xcfe9ff, 0.0115);

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(5.4, 2.5, 4.9);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.1, 1.45, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 16;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = 1.52;
  controls.autoRotateSpeed = 0.9;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.65, 0.85));
  composer.addPass(new OutputPass());

  const world = buildWorld(scene, renderer);
  const bike = buildBike();
  const pelican = buildPelican();

  const rig = new THREE.Group();
  rig.add(bike.group, pelican.group, pelican.legs);
  scene.add(rig);

  const feathers = createFeathers(scene);
  const rings = createRings(scene);

  const btnNight = document.getElementById('btnNight');
  const btnDing = document.getElementById('btnDing');
  const btnCam = document.getElementById('btnCam');
  const speedInput = document.getElementById('speed');
  const speedVal = document.getElementById('speedVal');

  let speedTarget = 3.2;
  let speed = 3.2;
  let crankAngle = 0;
  let time = 0;
  let bellPulse = 1;
  let eyeScale = 1;
  let nextBlink = 2.5;
  let blinkEnd = 0;
  let dayTarget = 1;

  function toggleNight() {
    dayTarget = 1 - dayTarget;
    btnNight.textContent = dayTarget ? '夜晚' : '白天';
    ensureAudio();
  }

  function doDing() {
    playDing();
    bellPulse = 1.55;
    rings.spawn(new THREE.Vector3(0.47, 1.31, 0.13));
  }

  const MODES = [
    { id: 'ORBIT', label: '环绕' },
    { id: 'CINEMA', label: '电影' },
    { id: 'BEAK', label: '鸟嘴' }
  ];
  let modeIdx = 0;
  const defaultTarget = new THREE.Vector3(0.1, 1.45, 0);
  const beakPos = new THREE.Vector3(2.3, 2.7, 1.8);
  const beakTarget = new THREE.Vector3(0.85, 2.22, 0);

  function applyMode() {
    const m = MODES[modeIdx];
    btnCam.textContent = '视角：' + m.label;
    controls.autoRotate = m.id === 'CINEMA';
    controls.enabled = m.id !== 'BEAK';
  }
  applyMode();

  function setSpeed(v) {
    speedTarget = THREE.MathUtils.clamp(v, 0, 8);
    speedInput.value = speedTarget;
  }

  btnNight.addEventListener('click', toggleNight);
  btnDing.addEventListener('click', doDing);
  btnCam.addEventListener('click', () => { modeIdx = (modeIdx + 1) % MODES.length; applyMode(); });
  speedInput.addEventListener('input', () => { speedTarget = parseFloat(speedInput.value); });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setSpeed(speedTarget + 0.6); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setSpeed(speedTarget - 0.6); e.preventDefault(); }
    else if (e.key === 'b' || e.key === 'B') doDing();
    else if (e.key === 'n' || e.key === 'N') toggleNight();
    else if (e.key === 'c' || e.key === 'C') { modeIdx = (modeIdx + 1) % MODES.length; applyMode(); }
  });

  let downX = 0, downY = 0, downT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    downX = e.clientX; downY = e.clientY; downT = performance.now();
  });
  canvas.addEventListener('pointerup', (e) => {
    const dx = e.clientX - downX, dy = e.clientY - downY;
    if (dx * dx + dy * dy < 49 && performance.now() - downT < 450) {
      feathers.burst(new THREE.Vector3(-0.2, 1.7, 0), 16);
      ensureAudio();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  const HIP = new THREE.Vector3(0.02, -0.44, 0.16);
  const FOOT_OFF = new THREE.Vector3(0.05, 0.06, 0);
  const ZAXIS = new THREE.Vector3(0, 0, 1);
  const Q_FLAP = new THREE.Quaternion();
  const clock = new THREE.Clock();
  let firstFrame = true;

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;

    speed += (speedTarget - speed) * Math.min(1, dt * 2.5);
    crankAngle -= speed * 2.0 * dt;

    bike.wheelF.rotation.z -= (speed / DIM.wheelR) * dt;
    bike.wheelB.rotation.z = bike.wheelF.rotation.z;
    bike.crank.rotation.z = crankAngle;

    const pL = pedalPos(crankAngle, 1);
    const pR = pedalPos(crankAngle + Math.PI, -1);
    bike.pedalL.position.copy(pL);
    bike.pedalR.position.copy(pR);

    const footL = pL.clone().add(FOOT_OFF);
    const footR = pR.clone().add(FOOT_OFF);
    pelican.footL.position.copy(footL);
    pelican.footR.position.copy(footR);

    const bobY = 0.022 * Math.sin(crankAngle * 2);
    const bobX = 0.012 * Math.sin(crankAngle + 0.5);
    const basePos = new THREE.Vector3(-0.2 + bobX, 1.70 + bobY, 0);
    pelican.group.position.copy(basePos);
    pelican.group.rotation.z = 0.025 * Math.sin(crankAngle);
    pelican.group.rotation.x = 0.02 * Math.sin(crankAngle * 2 + 1.0);

    const hipL = basePos.clone().add(HIP);
    const hipR = basePos.clone().add(new THREE.Vector3(HIP.x, HIP.y, -HIP.z));
    setLeg(pelican.legL, hipL, footL.clone().add(new THREE.Vector3(-0.01, 0.03, 0)));
    setLeg(pelican.legR, hipR, footR.clone().add(new THREE.Vector3(-0.01, 0.03, 0)));

    const flapFreq = 1.8 + speed * 0.25;
    Q_FLAP.setFromAxisAngle(ZAXIS, 0.055 * Math.sin(time * flapFreq));
    pelican.wingL.quaternion.copy(pelican.wingL.userData.baseQuat).multiply(Q_FLAP);
    Q_FLAP.setFromAxisAngle(ZAXIS, 0.055 * Math.sin(time * flapFreq + 0.6));
    pelican.wingR.quaternion.copy(pelican.wingR.userData.baseQuat).multiply(Q_FLAP);

    pelican.headGroup.rotation.z = 0.045 * Math.sin(crankAngle * 2 + 0.8);
    pelican.headGroup.rotation.y = 0.10 * Math.sin(time * 0.6);
    pelican.tail.rotation.y = 0.10 * Math.sin(time * 1.4);

    const wob = Math.sin(crankAngle * 2 + 0.6);
    pelican.pouch.scale.set(0.62 * (1 - 0.04 * wob), 0.26 * (1 + 0.09 * wob), 0.24 * (1 - 0.04 * wob));

    if (time > nextBlink) {
      blinkEnd = time + 0.13;
      nextBlink = time + 2.2 + Math.random() * 2.8;
    }
    eyeScale += ((time < blinkEnd ? 0.12 : 1) - eyeScale) * Math.min(1, dt * 28);
    pelican.eyeL.scale.y = eyeScale;
    pelican.eyeR.scale.y = eyeScale;

    bellPulse += (1 - bellPulse) * Math.min(1, dt * 9);
    bike.bellDome.scale.set(bellPulse, bellPulse * 0.82, bellPulse);

    rig.rotation.z = 0.008 * Math.sin(crankAngle);

    const f = world.setDay(dayTarget, dt);
    bike.lampMat.emissiveIntensity = THREE.MathUtils.lerp(0.05, 3.2, 1 - f);
    world.update(dt, time, speed);

    feathers.update(dt);
    rings.update(dt, camera);

    const mode = MODES[modeIdx].id;
    if (mode === 'BEAK') {
      const k = Math.min(1, dt * 2.2);
      camera.position.lerp(beakPos, k);
      controls.target.lerp(beakTarget, k);
    } else if (mode === 'CINEMA') {
      controls.target.lerp(defaultTarget, Math.min(1, dt * 1.0));
    }
    controls.update();

    speedVal.textContent = speed.toFixed(1);
    composer.render();

    if (firstFrame) {
      firstFrame = false;
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 1100);
    }
  }

  tick();
}
