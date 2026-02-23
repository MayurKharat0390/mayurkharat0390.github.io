
import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

class SpatialScene {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });

        this.targetX = window.innerWidth / 2;
        this.targetY = window.innerHeight / 2;
        this.mouseX = 0;
        this.mouseY = 0;
        this.time = 0;
        this.nodes = [];
        this.connections = null;

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.camera.position.z = 20;

        this.createNeuralNetwork();
        this.setupInteractions();
        this.setupRevealObserver();

        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));

        this.animate();
    }

    createNeuralNetwork() {
        // Create 100 interactive nodes
        const count = 120;
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        this.nodeGroup = new THREE.Group();

        for (let i = 0; i < count; i++) {
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ffcc,
                transparent: true,
                opacity: 0.5
            });
            const node = new THREE.Mesh(geometry, material);

            node.position.set(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 40
            );

            node.userData = {
                originalPos: node.position.clone(),
                velocity: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02),
                size: Math.random() * 0.1 + 0.05
            };

            this.nodeGroup.add(node);
            this.nodes.push(node);
        }

        this.scene.add(this.nodeGroup);

        // Lines connection logic
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.1
        });
        this.lineGeometry = new THREE.BufferGeometry();
        this.connections = new THREE.LineSegments(this.lineGeometry, lineMaterial);
        this.scene.add(this.connections);
    }


    setupRevealObserver() {
        const options = { threshold: 0.1 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, options);

        document.querySelectorAll('section, .project-v2, .exp-item').forEach(el => {
            el.classList.add('reveal-on-scroll');
            observer.observe(el);
        });
    }

    setupInteractions() {
        // Experience Tabs
        const roles = document.querySelectorAll('.exp-role');
        const contents = document.querySelectorAll('.exp-content');

        roles.forEach(role => {
            role.addEventListener('click', () => {
                const target = role.getAttribute('data-role');

                // Toggle Roles
                roles.forEach(r => r.classList.remove('active'));
                role.classList.add('active');

                // Toggle Contents
                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === target) {
                        content.classList.add('active');
                    }
                });
            });
        });

        // Theme Toggle
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                document.body.classList.toggle('light-mode');
                const isLight = document.body.classList.contains('light-mode');

                const color = isLight ? 0x6366f1 : 0x00ffcc;
                this.nodes.forEach(node => node.material.color.set(color));
                this.connections.material.color.set(color);
            });
        }

    }

    onMouseMove(e) {
        this.targetX = e.clientX;
        this.targetY = e.clientY;
        this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.time += 0.002;

        const positions = [];
        const isLight = document.body.classList.contains('light-mode');

        this.nodes.forEach((node, i) => {
            // Floating movement
            node.position.add(node.userData.velocity);

            // Boundary check
            if (Math.abs(node.position.x) > 35) node.userData.velocity.x *= -1;
            if (Math.abs(node.position.y) > 35) node.userData.velocity.y *= -1;
            if (Math.abs(node.position.z) > 25) node.userData.velocity.z *= -1;

            // Mouse reaction
            const mouseVec = new THREE.Vector3(this.mouseX * 20, this.mouseY * 20, 0);
            const dist = node.position.distanceTo(mouseVec);
            if (dist < 10) {
                const dir = node.position.clone().sub(mouseVec).normalize();
                node.position.add(dir.multiplyScalar(0.1));
            }

            // Connection logic
            for (let j = i + 1; j < this.nodes.length; j++) {
                const other = this.nodes[j];
                const d = node.position.distanceTo(other.position);
                if (d < 8) {
                    positions.push(node.position.x, node.position.y, node.position.z);
                    positions.push(other.position.x, other.position.y, other.position.z);
                }
            }
        });

        this.lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.lineGeometry.attributes.position.needsUpdate = true;

        // Dynamic group rotation
        this.nodeGroup.rotation.y += 0.001;
        this.connections.rotation.y += 0.001;

        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SpatialScene();
});
