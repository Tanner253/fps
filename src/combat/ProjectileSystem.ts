import * as THREE from 'three';
import { WeaponConfig } from '../weapons/Weapon';

export interface BulletHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  damage: number;
  enemyId: string | null;
  playerId: string | null;
}

interface Bullet {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  prevPosition: THREE.Vector3;
  life: number;
  maxLife: number;
  damage: number;
  gravity: number;
  mesh: THREE.Mesh;
}

const BULLET_GEO = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
BULLET_GEO.rotateX(Math.PI / 2);

const BULLET_MAT = new THREE.MeshBasicMaterial({
  color: 0xffdd44,
  transparent: true,
  opacity: 0.8,
});

export class ProjectileSystem {
  private bullets: Bullet[] = [];
  private raycaster = new THREE.Raycaster();
  private tracers: { mesh: THREE.Mesh; life: number }[] = [];

  private tracerMat = new THREE.MeshBasicMaterial({
    color: 0xffcc33,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
  });

  constructor(private scene: THREE.Scene) {}

  fire(origin: THREE.Vector3, direction: THREE.Vector3, config: WeaponConfig) {
    const mesh = new THREE.Mesh(BULLET_GEO, BULLET_MAT.clone());
    mesh.position.copy(origin);
    this.scene.add(mesh);

    const velocity = direction.clone().multiplyScalar(config.bulletSpeed);

    this.bullets.push({
      position: origin.clone(),
      velocity,
      prevPosition: origin.clone(),
      life: config.range / config.bulletSpeed,
      maxLife: config.range / config.bulletSpeed,
      damage: config.damage,
      gravity: config.bulletGravity,
      mesh,
    });
  }

  update(
    dt: number,
    colliderGroup: THREE.Group,
    enemyGroup: THREE.Group | null,
    remotePlayerGroup: THREE.Group | null = null,
  ): BulletHit[] {
    const hits: BulletHit[] = [];

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      bullet.prevPosition.copy(bullet.position);
      bullet.velocity.y -= bullet.gravity * dt;
      bullet.position.addScaledVector(bullet.velocity, dt);
      bullet.life -= dt;

      const travelDir = bullet.position.clone().sub(bullet.prevPosition);
      const travelDist = travelDir.length();

      if (travelDist > 0.01) {
        travelDir.normalize();
        this.raycaster.set(bullet.prevPosition, travelDir);
        this.raycaster.far = travelDist + 0.2;

        if (remotePlayerGroup && remotePlayerGroup.children.length > 0) {
          const playerHits = this.raycaster.intersectObjects(remotePlayerGroup.children, true);
          if (playerHits.length > 0 && playerHits[0].distance <= travelDist + 0.2) {
            const hitObj = playerHits[0];
            hits.push({
              point: hitObj.point.clone(),
              normal: hitObj.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0),
              damage: bullet.damage,
              enemyId: null,
              playerId: this.findPlayerId(hitObj.object),
            });
            this.spawnTracer(bullet.prevPosition, hitObj.point);
            this.removeBullet(i);
            continue;
          }
        }

        if (enemyGroup && enemyGroup.children.length > 0) {
          const enemyHits = this.raycaster.intersectObjects(enemyGroup.children, true);
          if (enemyHits.length > 0 && enemyHits[0].distance <= travelDist + 0.2) {
            const hitObj = enemyHits[0];
            hits.push({
              point: hitObj.point.clone(),
              normal: hitObj.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0),
              damage: bullet.damage,
              enemyId: this.findEnemyId(hitObj.object),
              playerId: null,
            });
            this.spawnTracer(bullet.prevPosition, hitObj.point);
            this.removeBullet(i);
            continue;
          }
        }

        const envHits = this.raycaster.intersectObjects(colliderGroup.children, true);
        if (envHits.length > 0 && envHits[0].distance <= travelDist + 0.2) {
          const hitObj = envHits[0];
          hits.push({
            point: hitObj.point.clone(),
            normal: hitObj.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0),
            damage: bullet.damage,
            enemyId: null,
            playerId: null,
          });
          this.spawnTracer(bullet.prevPosition, hitObj.point);
          this.removeBullet(i);
          continue;
        }
      }

      if (bullet.life <= 0) {
        this.removeBullet(i);
        continue;
      }

      bullet.mesh.position.copy(bullet.position);
      bullet.mesh.lookAt(bullet.position.clone().add(bullet.velocity));
      const mat = bullet.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.8, bullet.life / bullet.maxLife + 0.3);
    }

    this.updateTracers(dt);
    return hits;
  }

  private findEnemyId(obj: THREE.Object3D): string | null {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData?.enemyId) return current.userData.enemyId;
      current = current.parent;
    }
    return null;
  }

  private findPlayerId(obj: THREE.Object3D): string | null {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData?.playerId) return current.userData.playerId;
      current = current.parent;
    }
    return null;
  }

  private spawnTracer(from: THREE.Vector3, to: THREE.Vector3) {
    const dir = to.clone().sub(from);
    const len = dir.length();
    if (len < 0.1) return;

    const geo = new THREE.CylinderGeometry(0.005, 0.005, len, 3);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, -len / 2);

    const mesh = new THREE.Mesh(geo, this.tracerMat.clone());
    mesh.position.copy(from);
    mesh.lookAt(to);
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: 0.08 });
  }

  private removeBullet(index: number) {
    const bullet = this.bullets[index];
    this.scene.remove(bullet.mesh);
    (bullet.mesh.material as THREE.Material).dispose();
    this.bullets.splice(index, 1);
  }

  private updateTracers(dt: number) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= dt;
      const mat = this.tracers[i].mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (this.tracers[i].life / 0.08) * 0.5);
      if (this.tracers[i].life <= 0) {
        this.scene.remove(this.tracers[i].mesh);
        this.tracers[i].mesh.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }
}
