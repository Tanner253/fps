import * as THREE from 'three';

interface RemotePlayer {
  id: string;
  name: string;
  mesh: THREE.Group;
  targetPos: THREE.Vector3;
  targetYaw: number;
  health: number;
  alive: boolean;
  prevPos: THREE.Vector3;
  speed: number;
  walkPhase: number;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  muzzleFlash: THREE.Sprite;
  muzzleTimer: number;
}

const PLAYER_COLORS = [
  0xc94040, 0x4080c9, 0x40c940, 0xc9c040, 0xc940c0, 0x40c9c0, 0xc98040, 0x8040c9,
];

const GUN_METAL = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.8 });
const DARK_METAL = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.9 });

export class RemotePlayerManager {
  group: THREE.Group;
  private players = new Map<string, RemotePlayer>();

  constructor(private scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'remotePlayers';
    this.scene.add(this.group);
  }

  addPlayer(id: string, name: string, pos: number[]) {
    if (this.players.has(id)) return;

    const { root, leftLeg, rightLeg, leftArm, rightArm, muzzleFlash } = this.buildMesh(id);
    root.position.set(pos[0], pos[1] - 0.4, pos[2]);
    this.group.add(root);

    const infoTag = this.buildInfoTag(name, 100);
    infoTag.name = 'infoTag';
    infoTag.raycast = () => {};
    root.add(infoTag);

    this.players.set(id, {
      id, name, mesh: root,
      targetPos: new THREE.Vector3(pos[0], pos[1], pos[2]),
      targetYaw: 0, health: 100, alive: true,
      prevPos: new THREE.Vector3(pos[0], pos[1], pos[2]),
      speed: 0, walkPhase: 0,
      leftLeg, rightLeg, leftArm, rightArm,
      muzzleFlash, muzzleTimer: 0,
    });
  }

  removePlayer(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    this.group.remove(p.mesh);
    p.mesh.traverse((c: THREE.Object3D) => {
      if (c instanceof THREE.Mesh) {
        c.geometry?.dispose();
        if (Array.isArray(c.material)) c.material.forEach((m: THREE.Material) => m.dispose());
        else c.material?.dispose();
      }
      if (c instanceof THREE.Sprite) {
        (c.material as THREE.SpriteMaterial).map?.dispose();
        c.material.dispose();
      }
    });
    this.players.delete(id);
  }

  updateFromServer(serverPlayers: Record<string, any>, myId: string) {
    for (const [id, data] of Object.entries(serverPlayers)) {
      if (id === myId) continue;

      let p = this.players.get(id);
      if (!p) {
        this.addPlayer(id, data.name || 'Player', data.pos);
        p = this.players.get(id)!;
      }

      p.targetPos.set(data.pos[0], data.pos[1], data.pos[2]);
      p.targetYaw = data.rot?.[1] ?? 0;
      p.alive = data.alive;
      p.mesh.visible = data.alive;

      if (data.hp !== p.health) {
        p.health = data.hp;
        this.updateInfoTag(p);
      }
    }
  }

  update(dt: number) {
    for (const p of this.players.values()) {
      const target = new THREE.Vector3(p.targetPos.x, p.targetPos.y - 0.4, p.targetPos.z);
      p.mesh.position.lerp(target, Math.min(1, dt * 12));
      p.mesh.rotation.y = p.targetYaw + Math.PI;

      const dx = p.mesh.position.x - p.prevPos.x;
      const dz = p.mesh.position.z - p.prevPos.z;
      const moveDist = Math.sqrt(dx * dx + dz * dz);
      p.speed += (moveDist / Math.max(dt, 0.001) - p.speed) * 0.2;
      p.prevPos.copy(p.mesh.position);

      this.animateLimbs(p, dt);

      if (p.muzzleTimer > 0) {
        p.muzzleTimer -= dt;
        p.muzzleFlash.visible = p.muzzleTimer > 0;
        if (p.muzzleFlash.visible) {
          p.muzzleFlash.material.opacity = p.muzzleTimer / 0.08;
        }
      }
    }
  }

  showMuzzleFlash(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    p.muzzleTimer = 0.08;
    p.muzzleFlash.visible = true;
    (p.muzzleFlash.material as THREE.SpriteMaterial).opacity = 1;
  }

  get playerCount(): number {
    return this.players.size;
  }

  private animateLimbs(p: RemotePlayer, dt: number) {
    if (p.speed > 1.5) {
      p.walkPhase += dt * 10;
      const swing = Math.sin(p.walkPhase) * 0.6;
      p.leftLeg.rotation.x = swing;
      p.rightLeg.rotation.x = -swing;
      p.leftArm.rotation.x = -swing * 0.5;
      p.rightArm.rotation.x = swing * 0.3;
    } else {
      p.walkPhase = 0;
      p.leftLeg.rotation.x *= 0.85;
      p.rightLeg.rotation.x *= 0.85;
      p.leftArm.rotation.x *= 0.85;
      p.rightArm.rotation.x *= 0.85;
    }
  }

  private buildMesh(id: string) {
    const root = new THREE.Group();
    root.userData.playerId = id;

    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: PLAYER_COLORS[hash % PLAYER_COLORS.length], roughness: 0.7,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89b7b, roughness: 0.75 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.35), bodyMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    torso.userData.playerId = id;
    root.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
    head.position.y = 1.72;
    head.castShadow = true;
    head.userData.playerId = id;
    root.add(head);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.4, 1.42, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), bodyMat);
    leftArmMesh.position.y = -0.27;
    leftArmMesh.castShadow = true;
    leftArmMesh.userData.playerId = id;
    leftArm.add(leftArmMesh);
    root.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.4, 1.42, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), bodyMat);
    rightArmMesh.position.y = -0.27;
    rightArmMesh.castShadow = true;
    rightArmMesh.userData.playerId = id;
    rightArm.add(rightArmMesh);
    root.add(rightArm);

    const weapon = this.buildWeaponModel();
    weapon.position.set(0, -0.4, -0.2);
    weapon.rotation.x = -0.1;
    rightArm.add(weapon);

    const muzzleFlash = new THREE.Sprite(
      new THREE.SpriteMaterial({ color: 0xffaa33, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }),
    );
    muzzleFlash.position.set(0, -0.35, -0.65);
    muzzleFlash.scale.setScalar(0.3);
    muzzleFlash.visible = false;
    muzzleFlash.raycast = () => {};
    rightArm.add(muzzleFlash);

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.14, 0.67, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), pantsMat);
    leftLegMesh.position.y = -0.32;
    leftLegMesh.castShadow = true;
    leftLegMesh.userData.playerId = id;
    leftLeg.add(leftLegMesh);
    root.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.14, 0.67, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.16), pantsMat);
    rightLegMesh.position.y = -0.32;
    rightLegMesh.castShadow = true;
    rightLegMesh.userData.playerId = id;
    rightLeg.add(rightLegMesh);
    root.add(rightLeg);

    return { root, leftLeg, rightLeg, leftArm, rightArm, muzzleFlash };
  }

  private buildWeaponModel(): THREE.Group {
    const g = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), GUN_METAL);
    g.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.2, 6), DARK_METAL);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, -0.28);
    g.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.12), GUN_METAL);
    stock.position.set(0, -0.005, 0.24);
    g.add(stock);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.05), GUN_METAL);
    mag.position.set(0, -0.05, 0.02);
    mag.rotation.x = -0.15;
    g.add(mag);

    return g;
  }

  private buildInfoTag(name: string, hp: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    this.drawInfoTag(canvas, name, hp);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.y = 2.25;
    sprite.scale.set(2, 0.625, 1);
    sprite.renderOrder = 999;
    sprite.userData.canvas = canvas;
    sprite.userData.texture = tex;
    return sprite;
  }

  private drawInfoTag(canvas: HTMLCanvasElement, name: string, hp: number) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText(name, 128, 28);
    ctx.fillStyle = '#fff';
    ctx.fillText(name, 128, 28);

    const barX = 40, barY = 42, barW = 176, barH = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();

    const pct = Math.max(0, hp / 100);
    ctx.fillStyle = `hsl(${pct * 120}, 80%, 45%)`;
    ctx.beginPath();
    ctx.roundRect(barX + 1, barY + 1, (barW - 2) * pct, barH - 2, 2);
    ctx.fill();
  }

  private updateInfoTag(player: RemotePlayer) {
    const tag = player.mesh.getObjectByName('infoTag') as THREE.Sprite | undefined;
    if (!tag?.userData.canvas) return;
    this.drawInfoTag(tag.userData.canvas, player.name, player.health);
    (tag.userData.texture as THREE.CanvasTexture).needsUpdate = true;
  }
}
