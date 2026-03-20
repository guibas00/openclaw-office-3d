import * as THREE from 'three';

export class World {
    constructor(scene, camera, toggleChatCallback) {
        this.scene = scene;
        this.obstacles = [];
        this.interactiveObjects = {};
        this.camera = camera;
        this.toggleChat = toggleChatCallback;
        this._build();
    }

    _build() {
        // Materiais
        const matFloor = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const matWall = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const matWood = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
        const matPC = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x111111 });
        const matBed = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const matSheets = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
        const matPlant = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
        const matPot = new THREE.MeshStandardMaterial({ color: 0x6d4c41 });

        // Chão (Grid/Checkerboard feeling)
        this._addBox(12, 0.1, 12, 0, 0, 0, matFloor, false);
        
        // Paredes (L em vez de caixa fechada para visão isométrica)
        this._addBox(12, 5, 0.2, 0, 2.5, -6, matWall);
        this._addBox(0.2, 5, 12, -6, 2.5, 0, matWall);
        
        // Limites Invisíveis (Para não cair do mapa)
        this._addBox(12, 5, 0.2, 0, 2.5, 6, null, true, true);
        this._addBox(0.2, 5, 12, 6, 2.5, 0, null, true, true);

        // --- MÓVEIS ---
        
        // Mesa (Escrivaninha)
        this._addBox(2.5, 0.1, 1.2, -4, 0.9, -4.5, matWood);
        this._addBox(0.1, 0.9, 1.2, -5.2, 0.45, -4.5, matWood);
        this._addBox(0.1, 0.9, 1.2, -2.8, 0.45, -4.5, matWood);

        // PC Interativo
        this.interactiveObjects.pc = this._addBox(0.8, 0.5, 0.05, -4, 1.3, -4.8, matPC);

        // Cama
        this._addBox(2.5, 0.4, 4, 4.5, 0.2, 3.5, matBed); // Base
        this._addBox(2.4, 0.2, 3.8, 4.5, 0.5, 3.5, matSheets); // Colchão
        this._addBox(2.2, 0.15, 0.8, 4.5, 0.65, 5, matSheets); // Travesseiro

        // Estante de Livros
        this._addBox(1.5, 3.5, 0.6, -5.5, 1.75, 1, matWood);
        for(let i=0; i<4; i++) {
             this._addBox(1.3, 0.05, 0.5, -5.4, 0.3 + (i * 0.9), 1, matWood, false);
        }

        // Janela (Efeito de Luz)
        const windowG = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), new THREE.MeshBasicMaterial({ color: 0xddaa55 }));
        windowG.position.set(2, 2.8, -5.85);
        this.scene.add(windowG);

        // Relógio Digital
        const clockBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        clockBody.position.set(-3, 2.5, -5.9);
        const clockText = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.25), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
        clockText.position.set(-3, 2.5, -5.84);
        this.scene.add(clockBody, clockText);

        // --- ILUMINAÇÃO (MESHES) ---
        const matLight = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        
        // (Luzes de Teto agora são apenas pontos de luz no index.html, sem mesh visível)

        // Abajur Mesa
        this._addBox(0.2, 0.05, 0.2, -5, 0.95, -4.8, matWood); // base
        const lampM = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.3, 12), matLight);
        lampM.position.set(-5, 1.15, -4.8);
        this.scene.add(lampM);

        // Abajur Cama (Mesa de cabeceira improvisada)
        this._addBox(0.6, 0.6, 0.6, 2.5, 0.3, 5, matWood); // mesa cabeceira
        const lampC = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.3, 12), matLight);
        lampC.position.set(2.5, 0.75, 5);
        this.scene.add(lampC);

        // Plantas (Vasos simples)
        this._addPot(-5, 0, 5, matPot, matPlant);
        this._addPot(5, 0, -5, matPot, matPlant);
        this._addPot(-3.5, 0.9, -4.2, matPot, matPlant); // Na mesa
    }

    _addPot(x, y, z, matPot, matPlant) {
        const pot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), matPot);
        pot.position.set(x, y + 0.15, z);
        const plant = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.2), matPlant);
        plant.position.set(x, y + 0.5, z);
        this.scene.add(pot, plant);
        this.obstacles.push(new THREE.Box3().setFromObject(pot));
    }

    _addBox(w, h, d, x, y, z, mat, isObstacle = true, invisible = false) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
        mesh.position.set(x, y, z);
        if (invisible) mesh.visible = false;
        mesh.castShadow = !invisible;
        mesh.receiveShadow = !invisible;
        this.scene.add(mesh);
        if (isObstacle) this.obstacles.push(new THREE.Box3().setFromObject(mesh));
        return mesh;
    }
}