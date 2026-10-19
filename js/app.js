import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildSky } from './sky.js';
import { buildScenery } from './scenery.js';
import { createGradePass } from './grade.js';
import { buildBike, pedalPos, DIM } from './bike.js';
import { buildPelican, setLeg, updateScarf } from './pelican.js';
import { createFeathers, createRings, createDust, createSpeedLines } from './particles.js';
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
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xeed8b6, 0.0112);

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(4.6, 2.2, 4.2);
  scene.add(camera);

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
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.6, 0.9));
  composer.addPass(new OutputPass());
  const grade = createGradePass();
  composer.addPass(grade);

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const sky = buildSky(scene, renderer);
  const scenery = buildScenery(scene, anisotropy);
  const bike = buildBike(anisotropy);
  const pelican = buildPelican();

  const rig = new THREE.Group();
  rig.add(bike.group, pelican.group, pelican.legs);
  scene.add(rig);
  sky.collectEnvMaterials(scene);

  const feathers = createFeathers(scene);
  const rings = createRings(scene);
  const dust = createDust(scene);
  const speedLines = createSpeedLines(camera);

  const btnNight = document.getElementById('btnNight');
  const btnDing = document.getElementById('btnDing');
  const btnCam = document.getElementById('btnCam');
  const speedInput = document.getElementById('speed');
  const speedVal = document.getElementById('speedVal');
  const needle = document.getElementById('needle');
  const hud = document.getElementById('hud');

  let speedTarget = 3.2;
  let speed = 3.2;
  let crankAngle = 0;
  let time = 0;
  let bellPulse = 1;
  let eyeScale = 1;
  let nextBlink = 2.5;
  let blinkEnd = 0;
  let dayTarget = 1;
  let idleTimer = 0;
  let idleDingDone = false;
  let footLerp = 0;

  const MODES = [
    { id: 'ORBIT', label: '环绕' },
    { id: 'CINEMA', label: '电影' },
    { id: 'BEAK', label: '鸟嘴' }
  ];
  let modeIdx = 0;
  const defaultTarget = new THREE.Vector3(0.1, 1.45, 0);
  const beakPos = new THREE.Vector3(2.3, 2.7, 1.8);
  const beakTarget = new THREE.Vector3(0.85, 2.22, 0);

  const introFrom = new THREE.Vector3(15, 12.5, 16.5);
  const introMid = new THREE.Vector3(9.5, 4.2, 10.5);
  const introTo = new THREE.Vector3(4.6, 2.2, 4.2);
  const introCurve = new THREE.QuadraticBezierCurve3(introFrom, introMid, introTo);
  const introLookFrom = new THREE.Vector3(0.4, 2.6, 0);
  const INTRO_DUR = 3.8;
  let introT = 0;
  let introActive = true;
  const introLook = new THREE.Vector3();

  function finishIntro() {
    if (!introActive) return;
    introActive = false;
    camera.position.copy(introTo);
    controls.target.copy(defaultTarget);
    controls.enabled = MODES[modeIdx].id !== 'BEAK';
  }

  function applyMode() {
    const m = MODES[modeIdx];
    btnCam.textContent = '视角：' + m.label;
    controls.autoRotate = m.id === 'CINEMA';
    controls.enabled = !introActive && m.id !== 'BEAK';
  }
  applyMode();

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

  function setSpeed(v) {
    speedTarget = THREE.MathUtils.clamp(v, 0, 8);
    speedInput.value = speedTarget;
  }

  btnNight.addEventListener('click', toggleNight);
  btnDing.addEventListener('click', doDing);
  btnCam.addEventListener('click', () => { modeIdx = (modeIdx + 1) % MODES.length; applyMode(); });
  speedInput.addEventListener('input', () => { speedTarget = parseFloat(speedInput.value); });

  window.addEventListener('keydown', (e) => {
    finishIntro();
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setSpeed(speedTarget + 0.6); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setSpeed(speedTarget - 0.6); e.preventDefault(); }
    else if (e.key === 'b' || e.key === 'B') doDing();
    else if (e.key === 'n' || e.key === 'N') toggleNight();
    else if (e.key === 'c' || e.key === 'C') { modeIdx = (modeIdx + 1) % MODES.length; applyMode(); }
    else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('photo');
  });

  let downX = 0, downY = 0, downT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    finishIntro();
    downX = e.clientX; downY = e.clientY; downT = performance.now();
  });
  canvas.addEventListener('wheel', finishIntro, { passive: true });
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

  const HIP_OFF = new THREE.Vector3(0.02, -0.44, 0.16);
  const FOOT_OFF = new THREE.Vector3(0.05, 0.06, 0);
  const GROUND_FOOT_L = new THREE.Vector3(-0.16, 0.055, 0.16);
  const GROUND_FOOT_R = new THREE.Vector3(-0.16, 0.055, -0.16);
  const ZAXIS = new THREE.Vector3(0, 0, 1);
  const L1 = 0.62;
  const L2 = 0.56;
  const Q_FLAP = new THREE.Quaternion();
  const tmpDir = new THREE.Vector3();
  const tmpPerp = new THREE.Vector3();
  const tmpKnee = new THREE.Vector3();
  const clock = new THREE.Clock();
  let firstFrame = true;

  function ikLeg(thigh, shin, knee, hip, foot) {
    tmpDir.subVectors(foot, hip);
    const dist = THREE.MathUtils.clamp(tmpDir.length(), 0.26, 1.17);
    tmpDir.normalize();
    const cosA = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    const a = Math.acos(THREE.MathUtils.clamp(cosA, -1, 1));
    tmpPerp.crossVectors(ZAXIS, tmpDir);
    if (tmpPerp.lengthSq() < 1e-6) tmpPerp.set(1, 0, 0);
    else tmpPerp.normalize();
    tmpKnee.copy(hip).addScaledVector(tmpDir, Math.cos(a) * L1).addScaledVector(tmpPerp, Math.sin(a) * L1);
    setLeg(thigh, hip, tmpKnee);
    setLeg(shin, tmpKnee, foot);
    knee.position.copy(tmpKnee);
  }

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;

    speed += (speedTarget - speed) * Math.min(1, dt * 2.5);
    crankAngle -= speed * 2.0 * dt;

    bike.wheelF.rotation.z -= (speed / DIM.wheelR) * dt;
    bike.wheelB.rotation.z = bike.wheelF.rotation.z;
    bike.crank.rotation.z = crankAngle;
    bike.fish.rotation.y = 0.5 + 0.38 * Math.sin(time * 4.6);
    bike.fish.rotation.z = 0.1 * Math.sin(time * 4.6 + 1.2);

    const pL = pedalPos(crankAngle, 1);
    const pR = pedalPos(crankAngle + Math.PI, -1);
    bike.pedalL.position.copy(pL);
    bike.pedalR.position.copy(pR);

    const idle = speed < 0.3;
    if (idle) {
      idleTimer += dt;
      if (idleTimer > 4.2 && !idleDingDone) { idleDingDone = true; doDing(); }
    } else {
      idleTimer = 0;
      idleDingDone = false;
    }
    footLerp += ((idle ? 1 : 0) - footLerp) * Math.min(1, dt * 2.4);

    const footL = pL.clone().add(FOOT_OFF).lerp(GROUND_FOOT_L, footLerp);
    const footR = pR.clone().add(FOOT_OFF).lerp(GROUND_FOOT_R, footLerp);
    pelican.footL.position.copy(footL);
    pelican.footR.position.copy(footR);

    const bobY = 0.022 * Math.sin(crankAngle * 2);
    const bobX = 0.012 * Math.sin(crankAngle + 0.5);
    const basePos = new THREE.Vector3(-0.2 + bobX, 1.70 + bobY, 0);
    pelican.group.position.copy(basePos);
    pelican.group.rotation.z = 0.025 * Math.sin(crankAngle);
    pelican.group.rotation.x = 0.02 * Math.sin(crankAngle * 2 + 1.0);

    const hipL = basePos.clone().add(HIP_OFF);
    const hipR = basePos.clone().add(new THREE.Vector3(HIP_OFF.x, HIP_OFF.y, -HIP_OFF.z));
    ikLeg(pelican.legL, pelican.shinL, pelican.kneeL, hipL, footL.clone().add(new THREE.Vector3(0, 0.03, 0)));
    ikLeg(pelican.legR, pelican.shinR, pelican.kneeR, hipR, footR.clone().add(new THREE.Vector3(0, 0.03, 0)));

    const flapFreq = 1.8 + speed * 0.25;
    const flapAmp = 0.03 + speed * 0.004;
    Q_FLAP.setFromAxisAngle(ZAXIS, flapAmp * Math.sin(time * flapFreq));
    pelican.wingL.quaternion.copy(pelican.wingL.userData.baseQuat).multiply(Q_FLAP);
    Q_FLAP.setFromAxisAngle(ZAXIS, flapAmp * Math.sin(time * flapFreq + 0.6));
    pelican.wingR.quaternion.copy(pelican.wingR.userData.baseQuat).multiply(Q_FLAP);

    pelican.headGroup.rotation.z = 0.045 * Math.sin(crankAngle * 2 + 0.8) - footLerp * 0.05;
    pelican.headGroup.rotation.y = 0.10 * Math.sin(time * 0.6) + footLerp * 0.5 * Math.sin(time * 0.85);
    pelican.tail.rotation.y = 0.10 * Math.sin(time * 1.4 + footLerp * 0.5);

    const wob = Math.sin(crankAngle * 2 + 0.6);
    pelican.pouch.scale.set(0.66 * (1 - 0.04 * wob), 0.27 * (1 + 0.09 * wob), 0.25 * (1 - 0.04 * wob));

    if (time > nextBlink) {
      blinkEnd = time + 0.13;
      nextBlink = time + 2.2 + Math.random() * 2.8;
    }
    eyeScale += ((time < blinkEnd ? 0.12 : 1) - eyeScale) * Math.min(1, dt * 28);
    pelican.eyeL.scale.y = eyeScale;
    pelican.eyeR.scale.y = eyeScale;
    const lidK = 1 + (1 - eyeScale) * 1.15;
    pelican.lidL.scale.setScalar(lidK);
    pelican.lidR.scale.setScalar(lidK);

    bellPulse += (1 - bellPulse) * Math.min(1, dt * 9);
    bike.bellDome.scale.set(bellPulse, bellPulse * 0.82, bellPulse);

    rig.rotation.z = 0.008 * Math.sin(crankAngle);

    updateScarf(pelican.scarf, time, speed);

    const f = sky.setDay(dayTarget, dt);
    scenery.update(dt, time, speed, f);
    bike.lampMat.emissiveIntensity = THREE.MathUtils.lerp(0.06, 3.4, 1 - f);
    bike.headlight.intensity = (1 - f) * 42;
    bike.shadow.material.opacity = 0.5 + 0.42 * f;
    dust.update(dt, speed, f);
    speedLines.update(dt, speed, time);

    feathers.update(dt);
    rings.update(dt, camera);

    if (introActive) {
      introT += dt;
      const k = Math.min(1, introT / INTRO_DUR);
      const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.copy(introCurve.getPoint(ease));
      introLook.lerpVectors(introLookFrom, defaultTarget, ease);
      camera.lookAt(introLook);
      if (k >= 1) finishIntro();
    } else {
      const mode = MODES[modeIdx].id;
      if (mode === 'BEAK') {
        const k = Math.min(1, dt * 2.2);
        camera.position.lerp(beakPos, k);
        controls.target.lerp(beakTarget, k);
      } else if (mode === 'CINEMA') {
        controls.target.lerp(defaultTarget, Math.min(1, dt * 1.0));
      }
      controls.update();
    }

    speedVal.textContent = speed.toFixed(1);
    if (needle) needle.style.transform = `rotate(${(-120 + (speed / 8) * 240).toFixed(1)}deg)`;

    composer.render();

    if (firstFrame) {
      firstFrame = false;
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 1100);
    }
  }

  tick();
}
