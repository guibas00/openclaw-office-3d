import * as THREE from 'three';

export class Player {
    constructor(scene, world) {
        this.group = new THREE.Group();
        this.scene = scene;
        this.world = world; // Precisamos do world para acessar o PC
        this._build();
        this.scene.add(this.group);

        this.walkTime = 0;
        this.box = new THREE.Box3();

        // Física
        this.velocityY = 0;
        this.isGrounded = true;
        this.jumpForce = 12;
        this.gravity = -30;

        // Controle mobile
        this.touchStart = null;
        this.touchDir = { x: 0, y: 0 };

        this._initMobileControls();
    }

    _build() {
        const matSkin = new THREE.MeshStandardMaterial({ color: 0xffdbac });
        const matShirt = new THREE.MeshStandardMaterial({ color: 0x2e5a88 });

        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), matShirt);
        this.torso.position.y = 1.1;
        this.group.add(this.torso);

        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), matSkin);
        this.head.position.y = 1.65;
        this.group.add(this.head);

        this.legL = this._createLimb(0.2, 0.7, 0.2, -0.15, 0.8, matSkin);
        this.legR = this._createLimb(0.2, 0.7, 0.2, 0.15, 0.8, matSkin);
        this.armL = this._createLimb(0.15, 0.6, 0.15, -0.35, 1.4, matSkin);
        this.armR = this._createLimb(0.15, 0.6, 0.15, 0.35, 1.4, matSkin);
    }

    _createLimb(w, h, d, x, y, mat) {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.y = -h/2;
        group.add(mesh);
        group.position.set(x, y, 0);
        this.group.add(group);
        return group;
    }

    _initMobileControls() {
        window.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            this.touchStart = { x: t.clientX, y: t.clientY };
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.touchStart) return;
            const t = e.touches[0];
            this.touchDir.x = (t.clientX - this.touchStart.x) / window.innerWidth;
            this.touchDir.y = (t.clientY - this.touchStart.y) / window.innerHeight;
        });

        window.addEventListener('touchend', (e) => {
            // Reset direção
            this.touchStart = null;
            this.touchDir.x = 0;
            this.touchDir.y = 0;

            // Detectar toque no PC
            const touch = e.changedTouches[0];
            const mouse = new THREE.Vector2();
            mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.world.camera); // precisa da câmera do world

            const intersects = raycaster.intersectObject(this.world.interactiveObjects.pc, true);
            if (intersects.length > 0) {
                const dist = this.group.position.distanceTo(this.world.interactiveObjects.pc.position);
                if (dist < 2.5 && typeof this.world.toggleChat === "function") {
                    this.world.toggleChat(true);
                }
            }
        });
    }

    update(delta, keys, obstacles) {
        const moveSpeed = 5 * delta;
        const rotateSpeed = 3 * delta;
        const oldPos = this.group.position.clone();
        let isMoving = false;

        // Teclado
        if (keys['w']) { this.group.translateZ(moveSpeed); isMoving = true; }
        if (keys['s']) { this.group.translateZ(-moveSpeed); isMoving = true; }
        if (keys['a']) this.group.rotation.y += rotateSpeed;
        if (keys['d']) this.group.rotation.y -= rotateSpeed;
        if (keys[' '] && this.isGrounded) { this.velocityY = this.jumpForce; this.isGrounded = false; }

        // Mobile
        if (Math.abs(this.touchDir.x) > 0.01) this.group.rotation.y -= this.touchDir.x * 3 * delta * 5;
        if (Math.abs(this.touchDir.y) > 0.01) { this.group.translateZ(moveSpeed * this.touchDir.y * 5); isMoving = true; }

        // Gravidade
        this.velocityY += this.gravity * delta;
        this.group.position.y += this.velocityY * delta;

        // Colisão com o chão
        if (this.group.position.y <= 0) { this.group.position.y = 0; this.velocityY = 0; this.isGrounded = true; }

        // Colisão com obstáculos
        this.box.setFromObject(this.group);
        for (let obs of obstacles) {
            if (this.box.intersectsBox(obs)) {
                this.group.position.x = oldPos.x;
                this.group.position.z = oldPos.z;
                break;
            }
        }

        // Animação de caminhada
        if (isMoving && this.isGrounded) {
            this.walkTime += delta * 14;
            this.legL.rotation.x = Math.sin(this.walkTime) * 0.6;
            this.legR.rotation.x = Math.sin(this.walkTime + Math.PI) * 0.6;
            this.armL.rotation.x = Math.sin(this.walkTime + Math.PI) * 0.6;
            this.armR.rotation.x = Math.sin(this.walkTime) * 0.6;
        } else if (this.isGrounded) {
            const lerpVal = 0.1;
            this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, lerpVal);
            this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, lerpVal);
            this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, 0, lerpVal);
            this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, 0, lerpVal);
        }
    }
}