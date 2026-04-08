import * as THREE from 'three';

interface RemotePlayer {
  id: string;
  name: string;
  mesh: THREE.Group;
  targetPos: THREE.Vector3;
  targetYaw: number;
  health: number;
  alive: boolean;
}

const PLAYER_COLORS = [
  0xc94040, 0x4080c9, 0x40c940, 0xc9c040, 0xc940c0, 0x40c9c0, 0xc98040, 0x8040c9,
];

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

    const mesh = this.buildMesh(id);
    mesh.position.set(pos[0], pos[1] - 0.4, pos[2]);
    this.group.add(mesh);

    const infoTag = this.buildInfoTag(name, 100);
    infoTag.name = 'infoTag';
    infoTag.raycast = () => {};
    mesh.add(infoTag);

    this.players.set(id, {
      id,
      name,
      mesh,
      targetPos: new THREE.Vector3(pos[0], pos[1], pos[2]),
      targetYaw: 0,
      health: 100,
      alive: true,
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
    }
  }

  get playerCount(): number {
    return this.players.size;
  }

  private buildMesh(id: string): THREE.Group {
    const group = new THREE.Group();
    group.userData.playerId = id;

    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: PLAYER_COLORS[hash % PLAYER_COLORS.length],
      roughness: 0.7,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89b7b, roughness: 0.75 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.8 });

    const parts: [THREE.BufferGeometry, THREE.Material, number, number, number][] = [
      [new THREE.BoxGeometry(0.55, 0.75, 0.35), bodyMat, 0, 1.15, 0],
      [new THREE.SphereGeometry(0.18, 10, 10), skinMat, 0, 1.72, 0],
      [new THREE.BoxGeometry(0.14, 0.55, 0.14), bodyMat, -0.4, 1.15, 0],
      [new THREE.BoxGeometry(0.14, 0.55, 0.14), bodyMat, 0.4, 1.15, 0],
      [new THREE.BoxGeometry(0.16, 0.65, 0.16), pantsMat, -0.14, 0.35, 0],
      [new THREE.BoxGeometry(0.16, 0.65, 0.16), pantsMat, 0.14, 0.35, 0],
    ];

    for (const [geo, mat, x, y, z] of parts) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.userData.playerId = id;
      group.add(mesh);
    }

    return group;
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

    const barX = 40;
    const barY = 42;
    const barW = 176;
    const barH = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();

    const pct = Math.max(0, hp / 100);
    const hue = pct * 120;
    ctx.fillStyle = `hsl(${hue}, 80%, 45%)`;
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
