
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

        this.targetColorHex = 0x00ffcc;
        this.currentColor = new THREE.Color(0x00ffcc);
        this.targetColor = new THREE.Color(0x00ffcc);

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
        window.addEventListener('scroll', () => this.onScroll());

        this.onScroll(); // initial set
        this.animate();
    }

    onScroll() {
        const scrollY = window.scrollY;
        const vh = window.innerHeight;

        // Define color changes based on scroll position
        let targetHex = 0x00ffcc; // Default (Cyan)

        if (scrollY > vh * 0.7 && scrollY < vh * 1.8) {
            targetHex = 0xa855f7; // Experience (Purple)
        } else if (scrollY >= vh * 1.8 && scrollY < vh * 2.8) {
            targetHex = 0xf43f5e; // Projects (Rose)
        } else if (scrollY >= vh * 2.8) {
            targetHex = 0xfab005; // About (Yellow)
        }

        // Adjust for light mode
        const isLight = document.body.classList.contains('light-mode');
        if (isLight) {
            if (targetHex === 0x00ffcc) targetHex = 0x6366f1;
            else if (targetHex === 0xa855f7) targetHex = 0xec4899;
            else if (targetHex === 0xfab005) targetHex = 0xf59e0b;
        }

        if (this.targetColorHex !== targetHex) {
            this.targetColorHex = targetHex;
            this.targetColor.setHex(targetHex);

            // Sync CSS accent root variable with Three.js smooth transition (optional but nice)
            // But we will just update immediately for CSS borders since CSS transitions handle smoothness
            document.documentElement.style.setProperty('--accent', '#' + this.targetColor.getHexString());
        }
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
                this.onScroll(); // Force color recalculation
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

        // Smooth Color interpolation
        this.currentColor.lerp(this.targetColor, 0.05);
        this.nodes.forEach(node => {
            node.material.color.copy(this.currentColor);
        });
        this.connections.material.color.copy(this.currentColor);

        // Dynamic group rotation
        this.nodeGroup.rotation.y += 0.001;
        this.connections.rotation.y += 0.001;

        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SpatialScene();
    initTypingEffect();
    initCustomCursor();
    initProjectTilt();
});

function initCustomCursor() {
    const dot = document.getElementById('cursor-dot');
    const outline = document.getElementById('cursor-outline');
    if (!dot || !outline) return;

    let mouseX = 0, mouseY = 0;
    let outlineX = 0, outlineY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    function animateCursor() {
        let dx = mouseX - outlineX;
        let dy = mouseY - outlineY;
        outlineX += dx * 0.15; // Smooth trailing
        outlineY += dy * 0.15;
        outline.style.transform = `translate(${outlineX}px, ${outlineY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover effect
    const hoverElements = document.querySelectorAll('a, button, .theme-toggle, .exp-role, .project-mockup, .btn-primary, .btn-outline, .btn-icon, .btn-project');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => outline.classList.add('hover'));
        el.addEventListener('mouseleave', () => outline.classList.remove('hover'));
    });
}

function initProjectTilt() {
    const mockups = document.querySelectorAll('.project-mockup');

    mockups.forEach(mockup => {
        const img = mockup.querySelector('img');
        if (!img) return;

        mockup.addEventListener('mousemove', (e) => {
            const rect = mockup.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Calculate rotation (inverted for realistic 3D feel based on cursor)
            const rotateX = ((y - centerY) / centerY) * -12;
            const rotateY = ((x - centerX) / centerX) * 12;

            img.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        mockup.addEventListener('mouseleave', () => {
            img.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
        });
    });
}

function initTypingEffect() {
    const textElement = document.getElementById('typing-text');
    if (!textElement) return;

    const words = [
        "Software Developer",
        "Full-Stack Architect",
        "Creative Technologist",
        "3D Web Enthusiast"
    ];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function type() {
        const currentWord = words[wordIndex];

        if (isDeleting) {
            textElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 50; // Faster when deleting
        } else {
            textElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 100;
        }

        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            typeSpeed = 2000; // Pause at end of word
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 500; // Pause before new word
        }

        setTimeout(type, typeSpeed);
    }

    setTimeout(type, 1000);
}
