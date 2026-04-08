import * as THREE from 'three';

interface AmmoBox {
  id: string;
  pos: [number, number, number];
  mesh: THREE.Group;
  active: boolean;
  bobPhase: number;
}

const BOX_MAT = new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.5, metalness: 0.4 });
const STRAP_MAT = new THREE.MeshStandardMaterial({ color: 0x1a5c30, roughness: 0.6, metalness: 0.3 });
const GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.25 });
const PICKUP_RANGE = 2.5;
const AMMO_PER_BOX = 30;

export class AmmoPickupManager {
  group: THREE.Group;
  private boxes = new Map<string, AmmoBox>();
  private pickupCooldown = 0;

  constructor(private scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'ammoBoxes';
    this.scene.add(this.group);
  }

  initBoxes(boxData: { id: string; pos: number[] }[], getHeight: (x: number, z: number) => number) {
    for (const b of boxData) {
      const y = getHeight(b.pos[0], b.pos[2]) + 0.5;
      this.addBox(b.id, [b.pos[0], y, b.pos[2]]);
    }
  }

  addBox(id: string, pos: [number, number, number]) {
    if (this.boxes.has(id)) return;
    const mesh = this.buildMesh();
    mesh.position.set(pos[0], pos[1], pos[2]);
    this.group.add(mesh);
    this.boxes.set(id, { id, pos, mesh, active: true, bobPhase: Math.random() * Math.PI * 2 });
  }

  removeBox(id: string) {
    const box = this.boxes.get(id);
    if (!box) return;
    box.active = false;
    box.mesh.visible = false;
  }

  respawnBox(id: string) {
    const box = this.boxes.get(id);
    if (!box) return;
    box.active = true;
    box.mesh.visible = true;
  }

  update(dt: number, playerPos: THREE.Vector3): string | null {
    this.pickupCooldown = Math.max(0, this.pickupCooldown - dt);

    let pickedId: string | null = null;

    for (const box of this.boxes.values()) {
      if (!box.active) continue;

      box.bobPhase += dt * 2;
      box.mesh.position.y = box.pos[1] + Math.sin(box.bobPhase) * 0.15;
      box.mesh.rotation.y += dt * 1.2;

      if (this.pickupCooldown <= 0) {
        const dx = playerPos.x - box.pos[0];
        const dz = playerPos.z - box.pos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < PICKUP_RANGE) {
          pickedId = box.id;
          this.pickupCooldown = 0.5;
          break;
        }
      }
    }

    return pickedId;
  }

  get ammoAmount(): number {
    return AMMO_PER_BOX;
  }

  private buildMesh(): THREE.Group {
    const g = new THREE.Group();

    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), BOX_MAT);
    crate.castShadow = true;
    g.add(crate);

    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.42), STRAP_MAT);
    strap1.position.y = 0.08;
    g.add(strap1);

    const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.42), STRAP_MAT);
    strap2.position.y = -0.08;
    g.add(strap2);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), GLOW_MAT);
    glow.raycast = () => {};
    g.add(glow);

    return g;
  }
}
