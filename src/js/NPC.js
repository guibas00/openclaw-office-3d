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
        this.targetPos = null;
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

    walkTo(x, z) {
        this.targetPos = new THREE.Vector3(x, this.group.position.y, z);
    }

    update(delta, cmd = {}, obstacles) {
        const speed = 4 * delta; 
        const rotateSpeed = 4 * delta;
        const oldPos = this.group.position.clone();
        let isMoving = false;

        // Controle Autônomo para o PC
        if (this.targetPos) {
            const tempTarget = new THREE.Vector3(this.targetPos.x, this.group.position.y, this.targetPos.z);
            const dist = this.group.position.distanceTo(tempTarget);
            
            if (dist > 0.1) {
                // Rotaciona suavemente para o alvo
                const targetRotation = Math.atan2(tempTarget.x - this.group.position.x, tempTarget.z - this.group.position.z);
                this.group.rotation.y = targetRotation;
                this.group.translateZ(speed);
                isMoving = true;
            } else {
                this.group.position.set(tempTarget.x, this.group.position.y, tempTarget.z);
                this.group.rotation.y = Math.PI / 2; // Vira para o Monitor
                this.targetPos = null;
            }
        } else {
            // Controle Manual/Servidor via Comandos
            if (cmd.forward) { this.group.translateZ(speed); isMoving = true; }
            if (cmd.backward) { this.group.translateZ(-speed); isMoving = true; }
            if (cmd.left) this.group.rotation.y += rotateSpeed;
            if (cmd.right) this.group.rotation.y -= rotateSpeed;
        }

        if (cmd.jump && this.isGrounded) { this.velocityY = this.jumpForce; this.isGrounded = false; }
        this.velocityY += this.gravity * delta;
        this.group.position.y += this.velocityY * delta;
        if (this.group.position.y <= 0) { this.group.position.y = 0; this.velocityY = 0; this.isGrounded = true; }

        const hitCenter = new THREE.Vector3(this.group.position.x, this.group.position.y + 0.9, this.group.position.z);
        const hitSize = new THREE.Vector3(0.6, 1.8, 0.6);
        this.box.setFromCenterAndSize(hitCenter, hitSize);
        
        for (let obs of obstacles) {
            if (this.box.intersectsBox(obs)) {
                this.group.position.x = oldPos.x;
                this.group.position.z = oldPos.z;
                
                // Sistema Anti-Agarramento: Se o NPC bater a cara numa mesa ou PC durante roteamento autônomo,
                // ele empacará. Contamos 30 frames (meio segundo) tentando; se falhar, efetuamos um teletransporte forçado.
                if (this.targetPos) {
                    this.stuckFrames = (this.stuckFrames || 0) + 1;
                    if (this.stuckFrames > 30) {
                        this.group.position.set(this.targetPos.x, this.group.position.y, this.targetPos.z);
                        this.group.rotation.y = Math.PI / 2; // Virado para a Direita/Hardware
                        this.targetPos = null;
                        this.stuckFrames = 0;
                    }
                }
                break;
            }
        }
        
        if (!this.targetPos) this.stuckFrames = 0;

        if (isMoving && this.isGrounded) {
            this.walkTime += delta * 14;
            const s = Math.sin(this.walkTime) * 0.6;
            this.legL.rotation.x = s; this.legR.rotation.x = -s;
            this.armL.rotation.x = -s; this.armR.rotation.x = s;
        }
    }
}