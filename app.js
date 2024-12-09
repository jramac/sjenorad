import * as THREE from 'three';
import garfild from './garfild.jpg'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const textureLoader = new THREE.TextureLoader();
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.PlaneGeometry( 2, 2 );
const emissiveTexture = textureLoader.load(garfild)
const emissiveMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: {value: null},
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
const plane = new THREE.Mesh( geometry, emissiveMaterial );
plane.scale.set(1.6,0.9)
scene.add( plane );

camera.position.z = 1.2;

function animate(time) {

	renderer.render( scene, camera );
    emissiveMaterial.uniforms.time.value = time/10
}