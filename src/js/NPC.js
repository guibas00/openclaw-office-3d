import * as THREE from 'three';

export class NPC {
    constructor(scene, skin, name) {
        this.group = new THREE.Group();
        this.scene = scene;
        this.skin = skin || { shirt: '#0077be', pants: '#111111', skin: '#ffdbac' };
        this.name = name || 'Assistant';
        
        this._build();
        this.scene.add(this.group);
        
        this.walkTime = 0;
        this.box = new THREE.Box3();
        this.velocityY = 0;
        this.isGrounded = true;
        this.jumpForce = 12;
        this.gravity = -30;
        this.group.position.set(5, 0, -5);
    }

    _build() {
        const matSkin = new THREE.MeshStandardMaterial({ color: this.skin.skin });
        const matShirt = new THREE.MeshStandardMaterial({ color: this.skin.shirt });
        const matPants = new THREE.MeshStandardMaterial({ color: this.skin.pants });
        const matHair = new THREE.MeshStandardMaterial({ color: 0x6a3f2d });

        this.head = new THREE.Group();
        this.head.position.y = 1.65;
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), matSkin);
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.45), matHair);
        hair.position.y = 0.2;
        this.head.add(face, hair);
        this.group.add(this.head);

        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), matShirt);
        this.torso.position.y = 1.1;
        this.group.add(this.torso);

        this.legL = this._createLimb(0.2, 0.7, 0.2, -0.15, 0.8, matPants);
        this.legR = this._createLimb(0.2, 0.7, 0.2, 0.15, 0.8, matPants);
        this.armL = this._createLimb(0.15, 0.6, 0.15, -0.35, 1.4, matSkin);
        this.armR = this._createLimb(0.15, 0.6, 0.15, 0.35, 1.4, matSkin);

        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 128, 45);
        const tex = new THREE.CanvasTexture(canvas);
        const tag = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.25), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        tag.position.y = 2.0;
        this.group.add(tag);
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

    update(delta, cmd, obstacles) {
        const speed = 7 * delta; 
        const rotateSpeed = 4 * delta;
        const oldPos = this.group.position.clone();
        let isMoving = false;

        if (cmd.forward) { this.group.translateZ(speed); isMoving = true; }
        if (cmd.backward) { this.group.translateZ(-speed); isMoving = true; }
        if (cmd.left) this.group.rotation.y += rotateSpeed;
        if (cmd.right) this.group.rotation.y -= rotateSpeed;

        if (cmd.jump && this.isGrounded) { this.velocityY = this.jumpForce; this.isGrounded = false; }
        this.velocityY += this.gravity * delta;
        this.group.position.y += this.velocityY * delta;
        if (this.group.position.y <= 0) { this.group.position.y = 0; this.velocityY = 0; this.isGrounded = true; }

        this.box.setFromObject(this.group);
        for (let obs of obstacles) {
            if (this.box.intersectsBox(obs)) {
                this.group.position.x = oldPos.x;
                this.group.position.z = oldPos.z;
                break;
            }
        }

        if (isMoving && this.isGrounded) {
            this.walkTime += delta * 14;
            const s = Math.sin(this.walkTime) * 0.6;
            this.legL.rotation.x = s; this.legR.rotation.x = -s;
            this.armL.rotation.x = -s; this.armR.rotation.x = s;
        }
    }
}