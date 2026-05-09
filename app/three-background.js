import * as THREE from
'https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.js';

const canvas = document.getElementById('bg');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

// ======================================
// PARTICLES
// ======================================

const particlesGeometry =
    new THREE.BufferGeometry();

const particlesCount = 1200;

const positions =
    new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++){

    positions[i] =
        (Math.random() - 0.5) * 12;

}

particlesGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
        positions,
        3
    )
);

// ======================================
// MATERIAL
// ======================================

const particlesMaterial =
    new THREE.PointsMaterial({

        size: 0.015,

        color: '#38bdf8',

        transparent: true,

        opacity: 0.75
    });

// ======================================
// PARTICLE MESH
// ======================================

const particlesMesh =
    new THREE.Points(
        particlesGeometry,
        particlesMaterial
    );

scene.add(particlesMesh);

// ======================================
// FLOATING GLOW ORB
// ======================================

const orbGeometry =
    new THREE.SphereGeometry(
        0.8,
        32,
        32
    );

const orbMaterial =
    new THREE.MeshBasicMaterial({

        color: '#8b5cf6',

        transparent: true,

        opacity: 0.15
    });

const orb =
    new THREE.Mesh(
        orbGeometry,
        orbMaterial
    );

orb.position.set(2,1,-2);

scene.add(orb);

// ======================================
// MOUSE PARALLAX
// ======================================

let mouseX = 0;
let mouseY = 0;

document.addEventListener(
    'mousemove',
    (event)=>{

        mouseX =
            (event.clientX /
            window.innerWidth - 0.5);

        mouseY =
            (event.clientY /
            window.innerHeight - 0.5);

    }
);

// ======================================
// ANIMATION
// ======================================

function animate(){

    requestAnimationFrame(animate);

    particlesMesh.rotation.y += 0.0004;

    particlesMesh.rotation.x += 0.00015;

    orb.rotation.y += 0.002;

    orb.position.y =
        Math.sin(Date.now() * 0.001) * 0.3;

    camera.position.x +=
        (mouseX * 0.3 - camera.position.x)
        * 0.02;

    camera.position.y +=
        (-mouseY * 0.3 - camera.position.y)
        * 0.02;

    renderer.render(scene, camera);
}

animate();

// ======================================
// RESPONSIVE
// ======================================

window.addEventListener(
    'resize',
    ()=>{

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
);