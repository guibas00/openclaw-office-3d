import * as THREE from 'three';

export class Player {
    constructor(scene, world, name, skin) {
        this.group = new THREE.Group();
        this.scene = scene;
        this.world = world;
        this.name = name || 'Anon';
        this.skin = skin || { shirt: '#2e5a88', pants: '#111111', skin: '#ffdbac' };
        
        this._build();
        this.scene.add(this.group);

        this.walkTime = 0;
        this.box = new THREE.Box3();
        this.velocityY = 0;
        this.isGrounded = true;
        this.jumpForce = 12;
        this.gravity = -30;
        this.touchStart = null;
        this.touchDir = { x: 0, y: 0 };
    }

    _build() {
        const matSkin = new THREE.MeshStandardMaterial({ color: this.skin.skin });
        const matShirt = new THREE.MeshStandardMaterial({ color: this.skin.shirt });
        const matPants = new THREE.MeshStandardMaterial({ color: this.skin.pants });

        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), matShirt);
        this.torso.position.y = 1.1;
        this.group.add(this.torso);

        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), matSkin);
        this.head.position.y = 1.65;
        this.group.add(this.head);

        this.legL = this._createLimb(0.2, 0.7, 0.2, -0.15, 0.8, matPants);
        this.legR = this._createLimb(0.2, 0.7, 0.2, 0.15, 0.8, matPants);
        this.armL = this._createLimb(0.15, 0.6, 0.15, -0.35, 1.4, matSkin);
        this.armR = this._createLimb(0.15, 0.6, 0.15, 0.35, 1.4, matSkin);

        // Eyes (Face) facing +Z
        const matEye = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), matEye);
        this.eyeL.position.set(-0.1, 1.7, 0.18);
        this.eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), matEye);
        this.eyeR.position.set(0.1, 1.7, 0.18);
        this.group.add(this.eyeL, this.eyeR);

        // Name Tag Dinâmico (Sprite)
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        if (ctx.roundRect) {
            ctx.roundRect(0, 0, 512, 128, 20);
            ctx.fill();
        } else {
            ctx.fillRect(0,0,512,128);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 256, 80);
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const tag = new THREE.Sprite(spriteMat);
        tag.scale.set(1.5, 0.375, 1);
        tag.position.y = 2.2;
        this.group.add(tag);
        this.tag = tag;

        // Chat Bubble
        this.chatBubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture(), transparent: true }));
        this.chatBubble.scale.set(3, 1.5, 1);
        this.chatBubble.position.y = 2.8;
        this.chatBubble.visible = false;
        this.group.add(this.chatBubble);
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

    update(delta, keys, obstacles, remoteIsMoving = false) {
        const moveSpeed = 5 * delta;
        const rotateSpeed = 3 * delta;
        const oldPos = this.group.position.clone();
        let isMoving = remoteIsMoving;

        if (keys['w']) { this.group.translateZ(moveSpeed); isMoving = true; }
        if (keys['s']) { this.group.translateZ(-moveSpeed); isMoving = true; }
        if (keys['a']) this.group.rotation.y += rotateSpeed;
        if (keys['d']) this.group.rotation.y -= rotateSpeed;
        if (keys[' '] && this.isGrounded) { this.velocityY = this.jumpForce; this.isGrounded = false; }

        this.velocityY += this.gravity * delta;
        this.group.position.y += this.velocityY * delta;

        if (this.group.position.y <= 0) { this.group.position.y = 0; this.velocityY = 0; this.isGrounded = true; }

        // Escaneia exclusivamente a matriz da torço do jogador (largura 0.6, altura 1.8), ignorando nomes flutuantes ou balões giga!
        const hitCenter = new THREE.Vector3(this.group.position.x, this.group.position.y + 0.9, this.group.position.z);
        const hitSize = new THREE.Vector3(0.6, 1.8, 0.6);
        this.box.setFromCenterAndSize(hitCenter, hitSize);
        
        for (let obs of obstacles) {
            if (this.box.intersectsBox(obs)) {
                this.group.position.x = oldPos.x;
                this.group.position.z = oldPos.z;
                break;
            }
        }

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

    setFirstPerson(isFP) {
        if (this.head) this.head.visible = !isFP;
        if (this.tag) this.tag.visible = !isFP;
        if (this.eyeL) this.eyeL.visible = !isFP;
        if (this.eyeR) this.eyeR.visible = !isFP;
        // Optionally hide torso/arms if they clip with near plane
        // if (this.torso) this.torso.visible = !isFP;
    }

    showChatBubble(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        if (ctx.roundRect) {
            ctx.roundRect(0, 0, 512, 256, 30);
            ctx.fill();
        } else {
            ctx.fillRect(0, 0, 512, 256);
        }
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const words = text.split(' ');
        let line = '';
        let y = 60;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 460 && n > 0) {
                ctx.fillText(line.trim(), 256, y);
                line = words[n] + ' ';
                y += 40;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), 256, y);

        const tex = new THREE.CanvasTexture(canvas);
        this.chatBubble.material.map = tex;
        this.chatBubble.visible = true;

        if (this.chatTimeout) clearTimeout(this.chatTimeout);
        
        let seconds = 3;
        if (text.length > 25) seconds = 6;
        if (text.length > 50) seconds = 9;
        if (text.length > 75) seconds = 12;

        this.chatTimeout = setTimeout(() => {
            this.chatBubble.visible = false;
        }, seconds * 1000);
    }
}