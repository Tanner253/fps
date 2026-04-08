import * as THREE from 'three';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import * as CANNON from 'cannon-es';

interface Enemy {
  id: string;
  mesh: THREE.Group;
  body: CANNON.Body;
  health: number;
  maxHealth: number;
  speed: number;
  state: 'patrol' | 'chase' | 'attack' | 'dead';
  patrolTarget: THREE.Vector3;
  attackCooldown: number;
  deathTimer: number;
  hitFlash: number;
}

const DETECT_RANGE = 45;
const ATTACK_RANGE = 18;
const PATROL_RANGE = 25;

let enemyIdCounter = 0;

export class EnemyManager {
  enemyGroup: THREE.Group;
  private enemies: Enemy[] = [];
  private enemyMap = new Map<string, Enemy>();
  private getHeight: ((x: number, z: number) => number) | null = null;
  private waterLevel = 0.8;
  killCount = 0;

  constructor(
    private scene: THREE.Scene,
    private physics: PhysicsWorld
  ) {
    this.enemyGroup = new THREE.Group();
    this.enemyGroup.name = 'enemies';
    this.scene.add(this.enemyGroup);
  }

  setTerrainInfo(getHeight: (x: number, z: number) => number, waterLevel: number) {
    this.getHeight = getHeight;
    this.waterLevel = waterLevel;
  }

  spawnWave(playerPos: THREE.Vector3) {
    const count = 8 + Math.floor(this.killCount / 5);
    let spawned = 0;
    for (let attempt = 0; attempt < count * 4 && spawned < Math.min(count, 16); attempt++) {
      const angle = (attempt / count) * Math.PI * 2 + Math.random() * 0.8;
      const dist = 35 + Math.random() * 45;
      const x = playerPos.x + Math.cos(angle) * dist;
      const z = playerPos.z + Math.sin(angle) * dist;

      const y = this.getHeight ? this.getHeight(x, z) : 5;
      if (y < this.waterLevel + 1.5) continue;

      this.spawnEnemy(new THREE.Vector3(x, y + 2, z));
      spawned++;
    }
  }

  private spawnEnemy(position: THREE.Vector3) {
    const id = `enemy_${++enemyIdCounter}`;
    const group = new THREE.Group();
    group.userData.enemyId = id;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6b2020, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89b7b, roughness: 0.75 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.35), bodyMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    torso.userData.enemyId = id;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
    head.position.y = 1.72;
    head.castShadow = true;
    head.userData.enemyId = id;
    group.add(head);

    const helmetGeo = new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const helmet = new THREE.Mesh(helmetGeo, new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.3 }));
    helmet.position.y = 1.78;
    helmet.userData.enemyId = id;
    group.add(helmet);

    const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.40, 1.15, 0);
    leftArm.userData.enemyId = id;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.40, 1.15, 0);
    rightArm.userData.enemyId = id;
    group.add(rightArm);

    const legGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.14, 0.35, 0);
    leftLeg.userData.enemyId = id;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.14, 0.35, 0);
    rightLeg.userData.enemyId = id;
    group.add(rightLeg);

    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.07),
      new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.8, depthTest: false })
    );
    hpBg.position.y = 2.15;
    hpBg.renderOrder = 999;
    group.add(hpBg);

    const hpBar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xcc2222, depthTest: false })
    );
    hpBar.position.y = 2.15;
    hpBar.position.z = 0.001;
    hpBar.name = 'healthBar';
    hpBar.renderOrder = 1000;
    group.add(hpBar);

    group.position.copy(position);
    this.enemyGroup.add(group);

    const body = this.physics.addDynamicSphere(0.4, 60, new CANNON.Vec3(position.x, position.y, position.z));
    body.fixedRotation = true;
    body.updateMassProperties();

    const enemy: Enemy = {
      id,
      mesh: group,
      body,
      health: 100,
      maxHealth: 100,
      speed: 3.5 + Math.random() * 2,
      state: 'patrol',
      patrolTarget: position.clone(),
      attackCooldown: 0,
      deathTimer: 0,
      hitFlash: 0,
    };

    this.enemies.push(enemy);
    this.enemyMap.set(id, enemy);
  }

  applyDamageById(id: string, damage: number) {
    const enemy = this.enemyMap.get(id);
    if (!enemy || enemy.state === 'dead') return;

    enemy.health -= damage;
    enemy.hitFlash = 0.12;

    if (enemy.health <= 0) {
      enemy.state = 'dead';
      enemy.deathTimer = 3;
      this.killCount++;
      enemy.body.velocity.set(0, 2, 0);
    }
  }

  update(dt: number, playerPos: THREE.Vector3) {
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') {
        enemy.deathTimer -= dt;
        enemy.mesh.rotation.x = Math.min(Math.PI / 2, enemy.mesh.rotation.x + dt * 3);
        enemy.mesh.position.y -= dt * 0.3;
        if (enemy.deathTimer <= 0) this.removeEnemy(enemy);
        continue;
      }

      const ePos = new THREE.Vector3(enemy.body.position.x, enemy.body.position.y, enemy.body.position.z);
      const dist = ePos.distanceTo(playerPos);

      if (dist < ATTACK_RANGE) enemy.state = 'attack';
      else if (dist < DETECT_RANGE) enemy.state = 'chase';
      else enemy.state = 'patrol';

      this.moveEnemy(enemy, playerPos, dt);
      this.syncVisual(enemy, playerPos, dt);
    }

    this.enemies = this.enemies.filter(e => e.deathTimer > -5);

    if (this.enemies.filter(e => e.state !== 'dead').length === 0) {
      this.spawnWave(playerPos);
    }
  }

  private moveEnemy(enemy: Enemy, playerPos: THREE.Vector3, dt: number) {
    const ePos = new THREE.Vector3(enemy.body.position.x, enemy.body.position.y, enemy.body.position.z);

    let target: THREE.Vector3;
    if (enemy.state === 'chase' || enemy.state === 'attack') {
      target = playerPos;
    } else {
      if (ePos.distanceTo(enemy.patrolTarget) < 2) {
        enemy.patrolTarget = ePos.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * PATROL_RANGE, 0, (Math.random() - 0.5) * PATROL_RANGE)
        );
      }
      target = enemy.patrolTarget;
    }

    const dir = target.clone().sub(ePos);
    dir.y = 0;
    if (dir.length() > (enemy.state === 'attack' ? 3 : 0.5)) {
      dir.normalize();
      const speed = enemy.state === 'chase' ? enemy.speed * 1.4 : enemy.speed;
      enemy.body.velocity.x = dir.x * speed;
      enemy.body.velocity.z = dir.z * speed;
    } else {
      enemy.body.velocity.x *= 0.8;
      enemy.body.velocity.z *= 0.8;
    }

    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  }

  private syncVisual(enemy: Enemy, playerPos: THREE.Vector3, dt: number) {
    enemy.mesh.position.set(enemy.body.position.x, enemy.body.position.y - 0.4, enemy.body.position.z);

    const look = playerPos.clone().sub(enemy.mesh.position);
    look.y = 0;
    if (look.length() > 0.1) {
      enemy.mesh.lookAt(enemy.mesh.position.clone().add(look));
    }

    if (enemy.hitFlash > 0) {
      enemy.hitFlash -= dt;
      enemy.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name !== 'healthBar') {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.emissive) mat.emissive.setHex(enemy.hitFlash > 0 ? 0xff3333 : 0x000000);
        }
      });
    }

    const hpBar = enemy.mesh.getObjectByName('healthBar') as THREE.Mesh;
    if (hpBar) {
      const pct = Math.max(0, enemy.health / enemy.maxHealth);
      hpBar.scale.x = pct;
      hpBar.position.x = -(1 - pct) * 0.33;
      (hpBar.material as THREE.MeshBasicMaterial).color.setHSL(pct * 0.33, 0.9, 0.45);
    }
  }

  clearAll() {
    for (const enemy of this.enemies) {
      this.enemyGroup.remove(enemy.mesh);
      this.physics.removeBody(enemy.body);
      this.enemyMap.delete(enemy.id);
    }
    this.enemies = [];
  }

  private removeEnemy(enemy: Enemy) {
    this.enemyGroup.remove(enemy.mesh);
    this.physics.removeBody(enemy.body);
    this.enemyMap.delete(enemy.id);
  }
}
