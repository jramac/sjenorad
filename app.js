import * as THREE from 'three';
import garfild from './garfild.jpg'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import * as dat from 'dat.gui';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const textureLoader = new THREE.TextureLoader();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(2, 2);
const emissiveTexture = textureLoader.load(garfild)
const emissiveMaterial = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },
        image: { value: emissiveTexture },
        time: { value: null },
        uScale: { value: 1.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
        uniform sampler2D image;    // Original image texture
        uniform float time;           // Time for animation
        varying vec2 vUv;              // UV coordinates
        uniform float uScale; // Uniform for scaling the texture

        void main() {
            vec2 p = vUv;

            // Apply scaling centered around (0.5, 0.5)
            vec2 centeredUv = p - 0.5; // Shift UV to center
            centeredUv *= uScale;       // Apply scale factor
            p = centeredUv + 0.5;      // Shift back

            // Sample the original texture color
            vec4 color = texture2D(image, p);
            
            // Generate a brightness pattern (old TV style)
            float brightness =  0.5 + 0.5 * sin(vUv.y * 2000.0 + time*10.); // Sine waves for scanlines

                    
            vec4 cr = texture2D(image, p + vec2(0.004,0.));
            vec4 cg = texture2D(image, p);
            vec4 cb = texture2D(image, p - vec2(0.004,0.));

            vec3 preFinish = vec3(cr.r,cg.g,cb.b);
            vec3 finalColor = mix(preFinish.rgb, vec3(brightness), 0.3);

            // Output the final color
            gl_FragColor = vec4(finalColor, color.a);
        }
    `,
    side: THREE.DoubleSide, // Optional, if you want both sides to emit light
});
const plane = new THREE.Mesh(geometry, emissiveMaterial);
plane.scale.set(1.6, 0.9)
scene.add(plane);

camera.position.z = 1.2;

const HSLShader = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: null },
        uHue: { value: 0.0 }, // Adjust between -1.0 and 1.0
        uSaturation: { value: 1.0 }, // Adjust from 0.0 to 2.0
        uLightness: { value: 0.0 }, // Adjust from -1.0 to 1.0
    },
    vertexShader: `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader: `
    uniform float uHue; // Hue adjustment
    uniform float uSaturation; // Saturation adjustment
    uniform float uLightness; // Lightness adjustment
    uniform sampler2D tDiffuse; // The rendered scene
    varying vec2 vUv;

    // Function to convert RGB to HSL
    vec3 rgbToHsl(vec3 color) {
        float maxC = max(color.r, max(color.g, color.b));
        float minC = min(color.r, min(color.g, color.b));
        float delta = maxC - minC;

        float hue = 0.0;
        if (delta > 0.0) {
            if (maxC == color.r) {
                hue = mod((color.g - color.b) / delta, 6.0);
            } else if (maxC == color.g) {
                hue = (color.b - color.r) / delta + 2.0;
            } else {
                hue = (color.r - color.g) / delta + 4.0;
            }
        }
        hue = hue / 6.0;

        float lightness = (maxC + minC) / 2.0;
        float saturation = delta == 0.0 ? 0.0 : delta / (1.0 - abs(2.0 * lightness - 1.0));

        return vec3(hue, saturation, lightness);
    }

    // Function to convert HSL to RGB
    vec3 hslToRgb(vec3 hsl) {
        float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;
        float x = c * (1.0 - abs(mod(hsl.x * 6.0, 2.0) - 1.0));
        float m = hsl.z - c / 2.0;

        vec3 rgb = vec3(0.0);
        if (hsl.x < 1.0 / 6.0) {
            rgb = vec3(c, x, 0.0);
        } else if (hsl.x < 2.0 / 6.0) {
            rgb = vec3(x, c, 0.0);
        } else if (hsl.x < 3.0 / 6.0) {
            rgb = vec3(0.0, c, x);
        } else if (hsl.x < 4.0 / 6.0) {
            rgb = vec3(0.0, x, c);
        } else if (hsl.x < 5.0 / 6.0) {
            rgb = vec3(x, 0.0, c);
        } else {
            rgb = vec3(c, 0.0, x);
        }
        return rgb + m;
    }

    void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        vec3 hsl = rgbToHsl(color.rgb);

        hsl.x += uHue; // Adjust hue
        hsl.y *= uSaturation; // Adjust saturation
        hsl.z += uLightness; // Adjust lightness

        hsl.x = mod(hsl.x, 1.0); // Wrap hue
        hsl.y = clamp(hsl.y, 0.0, 1.0); // Clamp saturation
        hsl.z = clamp(hsl.z, 0.0, 1.0); // Clamp lightness

        vec3 rgb = hslToRgb(hsl);
        gl_FragColor = vec4(rgb, color.a);
    }`
});

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const hslPass = new ShaderPass(HSLShader);
composer.addPass(hslPass);

function settings(){	
	const values = {
		hue: 0.0,
		saturation: 1.0,
		lightness: 0.0,
	};
	const gui = new dat.GUI();
	gui.add(values, "hue", -1.0, 1.0, 0.05);
	gui.add(values, "saturation", 0.0, 2.0, 0.05);
	gui.add(values, "lightness", -1.0, 1.0, 0.05);
	return values;
}
const values = settings();

function animate(time) {

    emissiveMaterial.uniforms.time.value = time / 10
    //uHue: { value: 0.0 }, // Adjust between -1.0 and 1.0
     //   uSaturation: { value: 1.0 }, // Adjust from 0.0 to 2.0
       // uLightness: { value: 0.0 }, // Adjust from -1.0 to 1.0

    HSLShader.uniforms.uHue.value = values.hue;
    HSLShader.uniforms.uSaturation.value = values.saturation;
    HSLShader.uniforms.uLightness.value = values.lightness;
    composer.render();
}