import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export function createGradePass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uSat: { value: 1.16 },
      uCon: { value: 1.06 },
      uVig: { value: 0.38 },
      uWarm: { value: new THREE.Color(0.075, 0.034, -0.028) },
      uCool: { value: new THREE.Color(-0.028, 0.004, 0.075) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uSat;
      uniform float uCon;
      uniform float uVig;
      uniform vec3 uWarm;
      uniform vec3 uCool;
      varying vec2 vUv;
      void main(){
        vec3 col = texture2D(tDiffuse, vUv).rgb;
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, uSat);
        col = (col - 0.5) * uCon + 0.5;
        col += uWarm * smoothstep(0.55, 1.0, l);
        col += uCool * (1.0 - smoothstep(0.0, 0.45, l));
        vec2 q = vUv - 0.5;
        float v = smoothstep(0.42, 0.88, length(q));
        col *= 1.0 - v * uVig;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
}
