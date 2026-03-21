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
        const matFloor = new THREE.MeshStandardMaterial({ color: 0xb88a57, roughness: 0.8 }); // Clean Solid Oak
        const matBaseboard = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
        const matBeam = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 }); // Dark ceiling beam
        
        const matWorkbench = new THREE.MeshStandardMaterial({ color: 0xdab386, roughness: 0.7 }); // Light Oak Top
        const matMetalLeg = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.4 }); // Lighter grey metal legs
        const matWardrobe = new THREE.MeshStandardMaterial({ color: 0xe0bf96, roughness: 0.8 }); // Light wood wardrobe
        const matPCBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
        const matPCWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2, metalness: 0.5 });
        
        // Simulating glass with BasicMaterial since Physical transmission needs complex environment setup
        const matGlass = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.2, depthWrite: false });
        
        const matGlowRed = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Basic material glows perfectly without lights
        const matGlowBlue = new THREE.MeshBasicMaterial({ color: 0x0088ff });
        const matScreen1 = new THREE.MeshBasicMaterial({ color: 0x224466 }); 
        const matScreen2 = new THREE.MeshBasicMaterial({ color: 0x446644 }); 
        const matPlant = new THREE.MeshStandardMaterial({ color: 0x3b6e3b, roughness: 0.8 });
        const matPotCT = new THREE.MeshStandardMaterial({ color: 0x964b32 }); // Terracotta
        const matBlinds = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }); 
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
        const matFloor = new THREE.MeshStandardMaterial({ color: 0xb88a57, roughness: 0.8 }); // Clean Solid Oak
        const matBaseboard = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
        const matBeam = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 }); // Dark ceiling beam
        
        const matWorkbench = new THREE.MeshStandardMaterial({ color: 0xdab386, roughness: 0.7 }); // Light Oak Top
        const matMetalLeg = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 }); // Grey metal legs
        const matWardrobe = new THREE.MeshStandardMaterial({ color: 0xe0bf96, roughness: 0.8 }); // Light wood wardrobe
        const matPCBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
        const matPCWhite = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2, metalness: 0.5 });
        const matGlass = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, roughness: 0.1 });
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
        
        // Ceiling Roof (To close the room and bounce light)
        this.ceiling = this._addBox(14, 0.2, 14, 0, 5.1, 0, matWall, false);
        
        // Walls
        this._addBox(14, 5, 0.2, 0, 2.5, -7, matWall);
        this._addBox(0.2, 5, 14, -7, 2.5, 0, matWall);
        this.wallFront = this._addBox(14, 5, 0.2, 0, 2.5, 7, matWall, true, false); // Invisible boundary becomes visible wall
        this.wallRight = this._addBox(0.2, 5, 14, 7, 2.5, 0, matWall, true, false); // Invisible boundary becomes visible wall

        // Baseboards
        this._addBox(13.8, 0.2, 0.1, 0.1, 0.1, -6.85, matBaseboard, false);
        this._addBox(0.1, 0.2, 13.8, -6.85, 0.1, 0.1, matBaseboard, false);

        // Ceiling Beams
        this.beams = [];
        this.beams.push(this._addBox(14, 0.4, 0.4, 0, 5.0, -4, matBeam, false));
        this.beams.push(this._addBox(14, 0.4, 0.4, 0, 5.0, 0, matBeam, false));
        this.beams.push(this._addBox(14, 0.4, 0.4, 0, 5.0, 4, matBeam, false));

        // Ceiling Lights (Flush mounts between beams)
        const matCeilLight = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.ceilLights = [];
        for(let z of [-2, 2]) {
            for(let x of [-4, 0, 4]) {
                const ceilLight = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), matCeilLight);
                ceilLight.position.set(x, 4.95, z);
                this.scene.add(ceilLight);
                this.ceilLights.push(ceilLight);
            }
        }

        // --- FURNITURE ---
        
        // Wardrobe
        this._addBox(2.0, 4.0, 1.2, 1.0, 2.0, -6.3, matWardrobe); // Body
        this._addBox(0.04, 4.0, 0.05, 1.0, 2.0, -5.68, new THREE.MeshStandardMaterial({color:0x222222}), false); // Door split
        this._addBox(0.05, 0.4, 0.1, 0.9, 2.0, -5.65, matPCWhite, false); // Handle L
        this._addBox(0.05, 0.4, 0.1, 1.1, 2.0, -5.65, matPCWhite, false); // Handle R

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

        // --- TV SCREEN (YOUTUBE EMBED) ---
        const tvWidth = 3.6;
        const tvHeight = 2.0;
        // Black frame (Backboard)
        this._addBox(tvWidth + 0.2, tvHeight + 0.2, 0.1, -3.0, 3.2, -6.85, new THREE.MeshStandardMaterial({ color: 0x111111 }));

        // Hole-Punch Screen (Writes 0 alpha to the WebGL Canvas for the CSS3DRenderer underneath)
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000, blending: THREE.NoBlending, opacity: 0 });
        const holeGeom = new THREE.PlaneGeometry(tvWidth, tvHeight);
        this.tvScreenMesh = new THREE.Mesh(holeGeom, holeMat);
        this.tvScreenMesh.position.set(-3.0, 3.2, -6.79);
        this.scene.add(this.tvScreenMesh);

        // Default to isometric state (ceiling and front walls hidden)
        this.setFirstPersonMode(false);
    }

    setFirstPersonMode(isFP) {
        if(this.ceiling) this.ceiling.visible = isFP;
        if(this.wallFront) this.wallFront.visible = isFP;
        if(this.wallRight) this.wallRight.visible = isFP;
        if(this.beams) this.beams.forEach(b => b.visible = isFP);
        if(this.ceilLights) this.ceilLights.forEach(l => l.visible = isFP);
    }

    _addWorkbench(x, y, z, w, d, isVertical, matTop, matLeg) {
        this._addBox(w, 0.1, d, x, y, z, matTop);
        const lg = new THREE.BoxGeometry(0.15, y, 0.15); // Thicker metal legs
        const l1 = new THREE.Mesh(lg, matLeg);
        const l2 = new THREE.Mesh(lg, matLeg);
        const l3 = new THREE.Mesh(lg, matLeg);
        const l4 = new THREE.Mesh(lg, matLeg);
        
        l1.position.set(x - w/2 + 0.15, y/2, z - d/2 + 0.15);
        l2.position.set(x + w/2 - 0.15, y/2, z - d/2 + 0.15);
        l3.position.set(x - w/2 + 0.15, y/2, z + d/2 - 0.15);
        l4.position.set(x + w/2 - 0.15, y/2, z + d/2 - 0.15);
        
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
        
        // Glass Panel
        const glass = new THREE.Mesh(new THREE.BoxGeometry(isVertical?0.02:td-0.1, th-0.1, isVertical?td-0.1:0.02), matGlass);
        glass.position.set(x + (isVertical?tw/2:0), y + th/2, z + (isVertical?0:tw/2)); // Place on front side
        this.scene.add(glass);

        // Internal Glow Cube
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), matGlow);
        glow.position.set(x, y + th/2, z);
        this.scene.add(glow);

        // Add PointLight to tint the glass and area around the PC
        const pl = new THREE.PointLight(matGlow.color, 2.0, 3.0);
        pl.position.set(x + (isVertical?tw/2 + 0.2:0), y + th/2, z + (isVertical?0:tw/2 + 0.2));
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