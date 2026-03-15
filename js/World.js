import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.interactiveObjects = {};
        this._build();
    }

    _build() {
        const matFloor = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const matWall = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
        const matWood = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
        const matPC = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x000000 });

        this._addBox(20, 0.1, 20, 0, 0, 0, matFloor, false);
        this._addBox(20, 4, 0.2, 0, 2, -10, matWall);
        this._addBox(0.2, 4, 20, -10, 2, 0, matWall);
        this._addBox(0.2, 4, 20, 10, 2, 0, matWall);

        this._addBox(3, 0.1, 1.5, 0, 0.9, -4, matWood);
        this.interactiveObjects.pc = this._addBox(1.2, 0.7, 0.05, 0, 1.35, -4.2, matPC);
    }

    _addBox(w, h, d, x, y, z, mat, isObstacle = true) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        if (isObstacle) this.obstacles.push(new THREE.Box3().setFromObject(mesh));
        return mesh;
    }
}