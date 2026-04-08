import * as THREE from 'three';

interface Particle {
  mesh: THREE.Points;
  velocities: THREE.Vector3[];
  life: number;
  maxLife: number;
  gravity: number;
}

interface DecalEffect {
  mesh: THREE.Mesh;
  life: number;
}

export class FXSystem {
  private particles: Particle[] = [];
  private decals: DecalEffect[] = [];
  private screenShake = 0;

  constructor(private scene: THREE.Scene) {}

  spawnImpact(point: THREE.Vector3, normal: THREE.Vector3) {
    const count = 12;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const vel = normal.clone().multiplyScalar(1.5 + Math.random() * 3);
      vel.x += (Math.random() - 0.5) * 4;
      vel.y += (Math.random() - 0.5) * 4 + 1;
      vel.z += (Math.random() - 0.5) * 4;
      velocities.push(vel);

      const shade = 0.4 + Math.random() * 0.3;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade * 0.9;
      colors[i * 3 + 2] = shade * 0.7;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      depthWrite: false,
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);
    this.particles.push({ mesh: particles, velocities, life: 0.6, maxLife: 0.6, gravity: 12 });

    this.spawnDustPuff(point, normal);
  }

  spawnBloodSplat(point: THREE.Vector3, normal: THREE.Vector3) {
    const count = 16;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      const vel = normal.clone().multiplyScalar(-1 + Math.random() * 4);
      vel.x += (Math.random() - 0.5) * 5;
      vel.y += Math.random() * 3;
      vel.z += (Math.random() - 0.5) * 5;
      velocities.push(vel);

      colors[i * 3] = 0.5 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      depthWrite: false,
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);
    this.particles.push({ mesh: particles, velocities, life: 0.4, maxLife: 0.4, gravity: 15 });
  }

  addScreenShake(amount: number) {
    this.screenShake = Math.min(this.screenShake + amount, 1);
  }

  getScreenShake(): { x: number; y: number } {
    if (this.screenShake < 0.01) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.screenShake * 0.008,
      y: (Math.random() - 0.5) * this.screenShake * 0.006,
    };
  }

  update(dt: number) {
    this.screenShake = Math.max(0, this.screenShake - dt * 12);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      const posAttr = p.mesh.geometry.attributes.position;
      for (let j = 0; j < posAttr.count; j++) {
        p.velocities[j].y -= p.gravity * dt;
        posAttr.setX(j, posAttr.getX(j) + p.velocities[j].x * dt);
        posAttr.setY(j, posAttr.getY(j) + p.velocities[j].y * dt);
        posAttr.setZ(j, posAttr.getZ(j) + p.velocities[j].z * dt);
      }
      posAttr.needsUpdate = true;
      (p.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.decals.length - 1; i >= 0; i--) {
      this.decals[i].life -= dt;
      if (this.decals[i].life <= 0) {
        this.scene.remove(this.decals[i].mesh);
        this.decals[i].mesh.geometry.dispose();
        this.decals.splice(i, 1);
      }
    }
  }

  private spawnDustPuff(point: THREE.Vector3, normal: THREE.Vector3) {
    const puffMat = new THREE.SpriteMaterial({
      color: 0xbbaa88,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const puff = new THREE.Sprite(puffMat);
    puff.position.copy(point).addScaledVector(normal, 0.05);
    puff.scale.setScalar(0.3);
    this.scene.add(puff);

    const startTime = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 0.5) {
        this.scene.remove(puff);
        (puff.material as THREE.SpriteMaterial).dispose();
        return;
      }
      puff.scale.setScalar(0.3 + elapsed * 0.8);
      (puff.material as THREE.SpriteMaterial).opacity = 0.4 * (1 - elapsed / 0.5);
      puff.position.y += 0.5 * (1 / 60);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}
