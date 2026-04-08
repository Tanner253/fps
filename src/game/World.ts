import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import * as CANNON from 'cannon-es';
import { createPineTree, createBroadleafTree, createBush, createRock, createGrass } from './Vegetation';

export const TERRAIN_SIZE = 400;
const TERRAIN_SEGMENTS = 200;
const STEP = TERRAIN_SIZE / TERRAIN_SEGMENTS;
export const WATER_LEVEL = 0.8;

export class World {
  colliderGroup: THREE.Group;
  decorGroup: THREE.Group;

  private noise = createNoise2D();
  private warpNoise = createNoise2D();

  constructor(
    private scene: THREE.Scene,
    private physics: PhysicsWorld
  ) {
    this.colliderGroup = new THREE.Group();
    this.colliderGroup.name = 'colliders';
    this.scene.add(this.colliderGroup);

    this.decorGroup = new THREE.Group();
    this.decorGroup.name = 'decorations';
    this.scene.add(this.decorGroup);
  }

  generate() {
    this.createLighting();
    this.createTerrain();
    this.createWater();
    this.placePineTrees();
    this.placeBroadleafTrees();
    this.placeBushes();
    this.placeRocks();
    createGrass(this.decorGroup, (x, z) => this.getHeight(x, z), TERRAIN_SIZE, WATER_LEVEL);
  }

  getHeight(x: number, z: number): number {
    const warpStrength = 0.15;
    const wx = x / TERRAIN_SIZE + this.warpNoise(x * 0.003, z * 0.003) * warpStrength;
    const wz = z / TERRAIN_SIZE + this.warpNoise(x * 0.003 + 100, z * 0.003 + 100) * warpStrength;

    let h = 0;
    h += this.noise(wx * 1.5, wz * 1.5) * 1.0;
    h += this.noise(wx * 3, wz * 3) * 0.5;
    h += this.noise(wx * 6, wz * 6) * 0.2;
    h += this.noise(wx * 12, wz * 12) * 0.08;
    h /= 1.78;

    const ridge = 1 - Math.abs(this.noise(wx * 2.5, wz * 2.5));
    h += ridge * ridge * 0.3;

    const dist = Math.sqrt(x * x + z * z) / (TERRAIN_SIZE * 0.5);
    const falloff = Math.max(0, 1 - dist * dist);
    h *= falloff;

    const spawnDist = Math.sqrt(x * x + z * z);
    if (spawnDist < 20) {
      const flat = Math.max(0, 1 - spawnDist / 20);
      h *= (1 - flat * 0.7);
    }

    return h * 22;
  }

  private createLighting() {
    const sun = new THREE.DirectionalLight(0xffeedd, 2.8);
    sun.position.set(80, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 400;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    this.scene.add(new THREE.HemisphereLight(0x88bbee, 0x445522, 0.7));
    const fillLight = new THREE.DirectionalLight(0x8899bb, 0.4);
    fillLight.position.set(-50, 30, -60);
    this.scene.add(fillLight);
  }

  private createTerrain() {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.getHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    this.applyTerrainColors(geo);

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.colliderGroup.add(mesh);

    this.buildHeightfield();
  }

  private buildHeightfield() {
    const segments = TERRAIN_SEGMENTS;
    const data: number[][] = [];

    for (let ix = 0; ix <= segments; ix++) {
      data[ix] = [];
      for (let iy = 0; iy <= segments; iy++) {
        const worldX = ix * STEP - TERRAIN_SIZE / 2;
        const worldZ = TERRAIN_SIZE / 2 - iy * STEP;
        data[ix][iy] = this.getHeight(worldX, worldZ);
      }
    }

    this.physics.addHeightfield(data, STEP, new CANNON.Vec3(-TERRAIN_SIZE / 2, 0, TERRAIN_SIZE / 2));
  }

  private applyTerrainColors(geo: THREE.PlaneGeometry) {
    const pos = geo.attributes.position;
    const normals = geo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const ny = normals.getY(i);
      const slope = 1 - ny;
      let r: number, g: number, b: number;

      if (y < WATER_LEVEL + 0.3) {
        r = 0.72; g = 0.68; b = 0.52;
      } else if (slope > 0.4) {
        r = 0.45; g = 0.40; b = 0.35;
      } else if (y < 5) {
        const t = (y - WATER_LEVEL) / 4.5;
        r = 0.30 - t * 0.05; g = 0.52 + t * 0.08; b = 0.18 - t * 0.03;
      } else if (y < 12) {
        r = 0.22; g = 0.42; b = 0.15;
      } else if (y < 17) {
        const t = (y - 12) / 5;
        r = 0.22 + t * 0.2; g = 0.42 - t * 0.12; b = 0.15 + t * 0.1;
      } else {
        r = 0.55; g = 0.53; b = 0.50;
      }

      const micro = this.noise(pos.getX(i) * 0.08, pos.getZ(i) * 0.08) * 0.035;
      colors[i * 3] = Math.max(0, Math.min(1, r + micro));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, g + micro));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, b + micro));
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  private createWater() {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE * 3, TERRAIN_SIZE * 3, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a6fa0, transparent: true, opacity: 0.55,
      roughness: 0.05, metalness: 0.4,
    });
    const water = new THREE.Mesh(geo, mat);
    water.position.y = WATER_LEVEL;
    this.decorGroup.add(water);
  }

  private placePineTrees() {
    for (let i = 0; i < 180; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.75;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.75;
      const y = this.getHeight(x, z);
      if (y < WATER_LEVEL + 1.5 || y > 16) continue;

      const scale = 0.7 + Math.random() * 0.9;
      const { trunk, foliage } = createPineTree(scale);

      const trunkGroup = new THREE.Group();
      trunkGroup.position.set(x, y, z);
      trunk.position.y = 2 * scale;
      trunkGroup.add(trunk);
      this.colliderGroup.add(trunkGroup);

      for (const f of foliage) {
        f.position.x += x;
        f.position.z += z;
        f.position.y += y;
        this.decorGroup.add(f);
      }

      this.physics.addStaticBox(
        new CANNON.Vec3(0.2 * scale, 2.5 * scale, 0.2 * scale),
        new CANNON.Vec3(x, y + 2.5 * scale, z)
      );
    }
  }

  private placeBroadleafTrees() {
    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.7;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.7;
      const y = this.getHeight(x, z);
      if (y < WATER_LEVEL + 2 || y > 10) continue;

      const scale = 0.8 + Math.random() * 0.5;
      const { trunk, canopy } = createBroadleafTree(scale);

      const trunkGroup = new THREE.Group();
      trunkGroup.position.set(x, y, z);
      trunk.position.y = 1.75 * scale;
      trunkGroup.add(trunk);
      this.colliderGroup.add(trunkGroup);

      for (const c of canopy) {
        c.position.x += x;
        c.position.z += z;
        c.position.y += y;
        this.decorGroup.add(c);
      }

      this.physics.addStaticBox(
        new CANNON.Vec3(0.25 * scale, 2 * scale, 0.25 * scale),
        new CANNON.Vec3(x, y + 2 * scale, z)
      );
    }
  }

  private placeBushes() {
    for (let i = 0; i < 200; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.7;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.7;
      const y = this.getHeight(x, z);
      if (y < WATER_LEVEL + 0.5 || y > 14) continue;

      const scale = 0.6 + Math.random() * 0.8;
      const bush = createBush(scale);
      bush.position.set(x, y, z);
      this.colliderGroup.add(bush);

      this.physics.addStaticBox(
        new CANNON.Vec3(0.4 * scale, 0.35 * scale, 0.4 * scale),
        new CANNON.Vec3(x, y + 0.3 * scale, z)
      );
    }
  }

  private placeRocks() {
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      const y = this.getHeight(x, z);
      if (y < WATER_LEVEL - 0.5) continue;

      const scale = 0.4 + Math.random() * 1.6;
      const rock = createRock(scale, i * 7.3);
      rock.position.set(x, y - 0.1 * scale, z);
      rock.rotation.set(Math.random() * 0.3, Math.random() * Math.PI * 2, Math.random() * 0.3);
      this.colliderGroup.add(rock);

      this.physics.addStaticBox(
        new CANNON.Vec3(scale * 0.45, scale * 0.3, scale * 0.45),
        new CANNON.Vec3(x, y + scale * 0.2, z)
      );
    }
  }
}
