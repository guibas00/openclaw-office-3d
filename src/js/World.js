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

    _createWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#b88a57'; // Base oak floor
        ctx.fillRect(0, 0, 1024, 1024);
        
        ctx.lineWidth = 4;
        for (let i = 0; i < 1024; i += 64) {
            // Draw plank lines
            ctx.strokeStyle = '#8a6034';
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 1024);
            ctx.stroke();
            
            // Random horizontal cuts for planks
            for(let j = 0; j < 6; j++) {
                const y = Math.random() * 1024;
                ctx.beginPath();
                ctx.moveTo(i, y);
                ctx.lineTo(i+64, y);
                ctx.stroke();
            }

            // Draw slight grain variation
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
            ctx.fillRect(i, 0, 64, 1024);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3, 3); // Scale planks over floor
        return tex;
    }

    _createPosterTexture(title, bgColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 768;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0,0,512,768);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 55px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, 256, 120);
        
        // draw a fake graphic logo in the middle
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath(); ctx.arc(256, 400, 160, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffaa33';
        ctx.beginPath(); ctx.arc(256, 400, 120, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(256, 400, 60, 0, Math.PI * 2); ctx.fill();

        return new THREE.CanvasTexture(canvas);
    }

    _build() {
        // --- PC BUILDER PALETTE ---
        const matWall = new THREE.MeshStandardMaterial({ color: 0x8ca3b5, roughness: 0.95 }); // Slate Blue
        const woodTex = this._createWoodTexture();
        const matFloor = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }); 
        const matBaseboard = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
        const matBeam = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 }); // Dark ceiling beam
        
        const matWorkbench = new THREE.MeshStandardMaterial({ color: 0xdab386, roughness: 0.7 }); // Light Oak Top
        const matMetalLeg = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 }); // Grey metal legs
        const matWardrobe = new THREE.MeshStandardMaterial({ color: 0xe0bf96, roughness: 0.8 }); // Light wood wardrobe
        const matPCBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
        const matPCWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2, metalness: 0.5 });
        const matGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, opacity: 0.3, transparent: true, roughness: 0.1 });
        const matGlowRed = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.0 });
        const matGlowBlue = new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0088ff, emissiveIntensity: 2.0 });
        const matScreen1 = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x224466, emissiveIntensity: 0.8 }); 
        const matScreen2 = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x446644, emissiveIntensity: 0.6 }); 
        const matPlant = new THREE.MeshStandardMaterial({ color: 0x3b6e3b, roughness: 0.8 });
        const matPotCT = new THREE.MeshStandardMaterial({ color: 0x964b32 }); // Terracotta
        const matBlinds = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }); 
        
        const poster1Tex = this._createPosterTexture('THE MOD ZOO', '#333344');
        const matPoster1 = new THREE.MeshStandardMaterial({ map: poster1Tex, roughness: 0.5 });
        const poster2Tex = this._createPosterTexture('FUEL IS LAW', '#1a3322');
        const matPoster2 = new THREE.MeshStandardMaterial({ map: poster2Tex, roughness: 0.5 });

        // Room Dimensions: Expanded to 14x14
        this._addBox(14, 0.1, 14, 0, 0, 0, matFloor, false);
        
        // Walls
        this._addBox(14, 5, 0.2, 0, 2.5, -7, matWall);
        this._addBox(0.2, 5, 14, -7, 2.5, 0, matWall);
        this._addBox(14, 5, 0.2, 0, 2.5, 7, null, true, true); // Invisible boundary
        this._addBox(0.2, 5, 14, 7, 2.5, 0, null, true, true); // Invisible boundary

        // Baseboards
        this._addBox(13.8, 0.2, 0.1, 0.1, 0.1, -6.85, matBaseboard, false);
        this._addBox(0.1, 0.2, 13.8, -6.85, 0.1, 0.1, matBaseboard, false);

        // Ceiling Beams
        this._addBox(14, 0.4, 0.4, 0, 5.0, -4, matBeam, false);
        this._addBox(14, 0.4, 0.4, 0, 5.0, 0, matBeam, false);
        this._addBox(14, 0.4, 0.4, 0, 5.0, 4, matBeam, false);

        // Ceiling Lights (Flush mounts between beams)
        const matCeilLight = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for(let z of [-2, 2]) {
            for(let x of [-4, 0, 4]) {
                const ceilLight = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), matCeilLight);
                ceilLight.position.set(x, 4.95, z);
                this.scene.add(ceilLight);
            }
        }

        // --- FURNITURE ---
        
        // Wardrobe
        this._addBox(2.0, 4.0, 1.2, 1.8, 2.0, -6.3, matWardrobe); // Body
        this._addBox(0.04, 4.0, 0.05, 1.8, 2.0, -5.68, new THREE.MeshStandardMaterial({color:0x222222}), false); // Door split
        this._addBox(0.05, 0.4, 0.1, 1.7, 2.0, -5.65, matPCWhite, false); // Handle L
        this._addBox(0.05, 0.4, 0.1, 1.9, 2.0, -5.65, matPCWhite, false); // Handle R

        // Workbench 1 (Left Wall)
        this._addWorkbench(-6.0, 1.0, -1.0, 1.2, 4.0, true, matWorkbench, matMetalLeg);
        // Workbench 2 (Back Wall)
        this._addWorkbench(4.5, 1.0, -6.0, 4.0, 1.2, false, matWorkbench, matMetalLeg);

        // Workstation 1 (Left desk) Setup
        this._addPCTower(-6.2, 1.3, 0.0, matPCBlack, matGlass, matGlowRed, true);
        this._addMonitor(-6.3, 1.3, -2.0, matPCBlack, matScreen1, true);
        this._addKeyboardMouse(-5.8, 1.02, -2.0, matPCBlack, true);
        this._addBarStool(-4.8, 0.6, -2.0, matWorkbench, matMetalLeg);

        // Workstation 2 (Back desk) Setup
        this._addPCTower(5.5, 1.3, -6.2, matPCWhite, matGlass, matGlowBlue, false);
        this._addMonitor(3.5, 1.3, -6.3, matPCBlack, matScreen2, false);
        this._addKeyboardMouse(3.5, 1.02, -5.8, matPCBlack, false);
        this._addBarStool(3.5, 0.6, -4.5, matWorkbench, matMetalLeg);

        // --- DECORATIONS ---
        
        // Poster 1
        const poster1 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.8), matPoster1);
        poster1.position.set(-6.88, 2.5, 3.5);
        poster1.rotation.y = Math.PI / 2;
        this.scene.add(poster1);

        // Poster 2
        const poster2 = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.2), matPoster2);
        poster2.position.set(-1.5, 2.6, -6.88);
        this.scene.add(poster2);

        // Window & Blinds
        const winW = 3.0; const winH = 2.0;
        this._addBox(winW, winH, 0.1, 4.5, 2.5, -7.0, new THREE.MeshBasicMaterial({color:0xddf0ff}), false); // Window glass light
        this._addBox(winW+0.2, 0.1, 0.2, 4.5, 3.55, -6.9, matWorkbench, false); // top frame
        this._addBox(winW+0.2, 0.1, 0.2, 4.5, 1.45, -6.9, matWorkbench, false); // bottom frame
        this._addBox(0.1, winH, 0.2, 3.0, 2.5, -6.9, matWorkbench, false); // L frame
        this._addBox(0.1, winH, 0.2, 6.0, 2.5, -6.9, matWorkbench, false); // R frame
        for(let y=1.6; y<3.4; y+=0.15) {
            const blind = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.05, 0.15), matBlinds);
            blind.position.set(4.5, y, -6.95);
            blind.rotation.x = 0.2; // Slightly open
            this.scene.add(blind);
        }

        // Tall Floor Plant (Dracaena)
        this._addFloorPlant(6.0, 0.0, -4.5, matPotCT, matPlant);
    }

    _addWorkbench(x, y, z, w, d, isVertical, matTop, matLeg) {
        this._addBox(w, 0.1, d, x, y, z, matTop);
        const lg = new THREE.BoxGeometry(0.1, y, 0.1);
        const l1 = new THREE.Mesh(lg, matLeg);
        const l2 = new THREE.Mesh(lg, matLeg);
        const l3 = new THREE.Mesh(lg, matLeg);
        const l4 = new THREE.Mesh(lg, matLeg);
        
        l1.position.set(x - w/2 + 0.1, y/2, z - d/2 + 0.1);
        l2.position.set(x + w/2 - 0.1, y/2, z - d/2 + 0.1);
        l3.position.set(x - w/2 + 0.1, y/2, z + d/2 - 0.1);
        l4.position.set(x + w/2 - 0.1, y/2, z + d/2 - 0.1);
        
        l1.castShadow=true; l2.castShadow=true; l3.castShadow=true; l4.castShadow=true;
        this.scene.add(l1,l2,l3,l4);
    }

    _addBarStool(x, y, z, matSeat, matLeg) {
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), matSeat);
        seat.position.set(x, y, z);
        seat.castShadow = true;
        this.scene.add(seat);
        this.obstacles.push(new THREE.Box3().setFromObject(seat));
        
        for(let i=0; i<4; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, y, 8), matLeg);
            const angle = (i * Math.PI / 2) + Math.PI/4;
            leg.position.set(x + Math.cos(angle)*0.2, y/2, z + Math.sin(angle)*0.2);
            // Angled slightly out
            leg.rotation.z = Math.cos(angle) * -0.1;
            leg.rotation.x = Math.sin(angle) * 0.1;
            leg.castShadow = true;
            this.scene.add(leg);
        }
    }

    _addPCTower(x, y, z, matCase, matGlass, matGlow, isVertical) {
        const tw = 0.4; const th = 0.8; const td = 0.8; 
        const body = this._addBox(isVertical?tw:td, th, isVertical?td:tw, x, y + th/2, z, matCase);
        
        // Add Glass and Internals if aligned
        const glass = new THREE.Mesh(new THREE.BoxGeometry(isVertical?0.02:td-0.1, th-0.1, isVertical?td-0.1:0.02), matGlass);
        glass.position.set(x + (isVertical?tw/2:0), y + th/2, z + (isVertical?0:tw/2)); // Place on front side
        this.scene.add(glass);

        // Internal Glow (Cooler/GPU)
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), matGlow);
        glow.position.set(x, y + th/2, z);
        this.scene.add(glow);

        // Simple PointLight inside the PC case!
        const pl = new THREE.PointLight(matGlow.color, 0.8, 1.5);
        pl.position.set(x, y + th/2, z);
        this.scene.add(pl);
    }

    _addMonitor(x, y, z, matCase, matScreen, isVertical) {
        const mw = 1.0; const mh = 0.6; const md = 0.05;
        this._addBox(isVertical?md:mw, mh, isVertical?mw:md, x, y+0.4, z, matCase); // Bezel
        this._addBox(isVertical?md+0.01:mw-0.05, mh-0.05, isVertical?mw-0.05:md+0.01, x, y+0.4, z, matScreen, false); // Display
        this._addBox(0.1, 0.3, 0.1, x + (isVertical?0.1:0), y+0.15, z + (isVertical?0:0.1), matCase, false); // Stand
        this._addBox(0.3, 0.05, 0.3, x + (isVertical?0.1:0), y+0.02, z + (isVertical?0:0.1), matCase, false); // Base
    }

    _addKeyboardMouse(x, y, z, matCase, isVertical) {
        this._addBox(isVertical?0.15:0.5, 0.02, isVertical?0.5:0.15, x, y, z, matCase, false); // KB
        this._addBox(0.08, 0.03, 0.12, x + (isVertical?0:0.4), y, z + (isVertical?0.4:0), matCase, false); // Mouse
    }

    _addFloorPlant(x, y, z, matPot, matPlant) {
        // Terracotta Pot
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 16), matPot);
        pot.position.set(x, y + 0.4, z);
        pot.castShadow = true;
        this.scene.add(pot);
        this.obstacles.push(new THREE.Box3().setFromObject(pot));

        // Stem
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.8), matPlant);
        stem.position.set(x, y + 1.2, z);
        stem.castShadow = true;
        this.scene.add(stem);

        // Leaves (Dracaena style, long flat sweeping leaves)
        for(let i=0; i<12; i++) {
            const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.25, 1.2, 4), matPlant);
            // squash cylinder to make flat leaf
            leaf.scale.z = 0.1;
            leaf.position.set(x, y + 1.6 + (Math.random()*0.6), z);
            leaf.rotation.x = Math.random() * Math.PI;
            leaf.rotation.z = Math.PI/4 + (Math.random() * Math.PI/2);
            leaf.castShadow = true;
            this.scene.add(leaf);
        }
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