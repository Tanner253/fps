import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { mulberry32, WORLD_SEED } from '../utils/random';

const vegNoise = createNoise2D(mulberry32(WORLD_SEED + 100));

const SHARED_TRUNK_MAT = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.95 });
const SHARED_BROAD_TRUNK_MAT = new THREE.MeshStandardMaterial({ color: 0x5a3828, roughness: 0.92 });
const SHARED_BUSH_GEO = new THREE.SphereGeometry(1, 14, 12);
const SHARED_ROCK_GEO = new THREE.IcosahedronGeometry(1, 3);

export function createPineTree(scale: number): { trunk: THREE.Mesh; foliage: THREE.Mesh[] } {
  const trunkGeo = new THREE.CylinderGeometry(0.06 * scale, 0.18 * scale, 4 * scale, 12);
  addBarkDetail(trunkGeo, 0.015 * scale);
  const trunk = new THREE.Mesh(trunkGeo, SHARED_TRUNK_MAT);
  trunk.castShadow = true;

  const foliage: THREE.Mesh[] = [];
  const layers = 4 + Math.floor(Math.random() * 2);

  for (let l = 0; l < layers; l++) {
    const t = l / layers;
    const radius = (2.0 - t * 1.1) * scale;
    const height = (2.0 - t * 0.3) * scale;
    const segments = 16;

    const geo = new THREE.ConeGeometry(radius, height, segments);
    softDisplace(geo, 0.12 * scale * (1 - t * 0.5));

    const darkness = 0.7 + t * 0.3;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(
        0.08 * darkness,
        (0.22 + Math.random() * 0.08) * darkness,
        0.05 * darkness
      ),
      roughness: 0.88,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = (2.8 + l * 1.4) * scale;
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.castShadow = true;
    foliage.push(mesh);
  }

  return { trunk, foliage };
}

export function createBroadleafTree(scale: number): { trunk: THREE.Mesh; canopy: THREE.Mesh[] } {
  const trunkGeo = new THREE.CylinderGeometry(0.1 * scale, 0.24 * scale, 3.5 * scale, 12);
  addBarkDetail(trunkGeo, 0.02 * scale);
  const trunk = new THREE.Mesh(trunkGeo, SHARED_BROAD_TRUNK_MAT);
  trunk.castShadow = true;

  const canopy: THREE.Mesh[] = [];
  const clusterCount = 4 + Math.floor(Math.random() * 3);

  for (let c = 0; c < clusterCount; c++) {
    const r = (0.9 + Math.random() * 0.6) * scale;
    const geo = new THREE.SphereGeometry(r, 20, 16);
    softDisplace(geo, 0.08 * r);

    const hue = 0.28 + Math.random() * 0.06;
    const sat = 0.55 + Math.random() * 0.2;
    const light = 0.22 + Math.random() * 0.1;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, sat, light),
      roughness: 0.82,
    });

    const angle = (c / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 0.5 * scale + Math.random() * 0.4 * scale;

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      Math.cos(angle) * dist,
      (4.2 + Math.random() * 0.8) * scale,
      Math.sin(angle) * dist
    );
    mesh.castShadow = true;
    canopy.push(mesh);
  }

  const topGeo = new THREE.SphereGeometry(0.7 * scale, 18, 14);
  softDisplace(topGeo, 0.05 * scale);
  const topMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.30, 0.6, 0.28),
    roughness: 0.8,
  });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.y = 5.5 * scale;
  topMesh.castShadow = true;
  canopy.push(topMesh);

  return { trunk, canopy };
}

export function createBush(scale: number): THREE.Group {
  const group = new THREE.Group();
  const sphereCount = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < sphereCount; i++) {
    const r = (0.25 + Math.random() * 0.25) * scale;
    const geo = SHARED_BUSH_GEO.clone();
    geo.scale(r, r, r);
    softDisplace(geo, 0.03 * r);

    const hue = 0.26 + Math.random() * 0.08;
    const sat = 0.5 + Math.random() * 0.25;
    const light = 0.2 + Math.random() * 0.12;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, sat, light),
      roughness: 0.85,
    });

    const mesh = new THREE.Mesh(geo, mat);
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 0.35 * scale;
    mesh.position.set(
      Math.cos(angle) * dist,
      r * 0.6 + Math.random() * 0.1 * scale,
      Math.sin(angle) * dist
    );
    mesh.castShadow = true;
    group.add(mesh);
  }

  return group;
}

export function createGrass(
  decorGroup: THREE.Group,
  getHeight: (x: number, z: number) => number,
  terrainSize: number,
  waterLevel: number
) {
  const tuftGeo = buildGrassTuftGeometry();
  const mat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  });

  const count = 6000;
  const inst = new THREE.InstancedMesh(tuftGeo, mat, count);
  inst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  let placed = 0;
  for (let i = 0; i < count * 2 && placed < count; i++) {
    const x = (Math.random() - 0.5) * terrainSize * 0.65;
    const z = (Math.random() - 0.5) * terrainSize * 0.65;
    const y = getHeight(x, z);
    if (y < waterLevel + 0.3 || y > 14) continue;

    const s = 0.7 + Math.random() * 0.8;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(s, s * (0.7 + Math.random() * 0.6), s);
    dummy.updateMatrix();
    inst.setMatrixAt(placed, dummy.matrix);

    const g = 0.35 + Math.random() * 0.2;
    color.setRGB(g * 0.6, g, g * 0.3);
    inst.setColorAt(placed, color);

    placed++;
  }

  inst.count = placed;
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;

  decorGroup.add(inst);
}

function buildGrassTuftGeometry(): THREE.BufferGeometry {
  const bladeCount = 7;
  const positions: number[] = [];

  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;
    const height = 0.2 + Math.random() * 0.25;
    const halfW = 0.02 + Math.random() * 0.02;
    const spread = 0.02 + Math.random() * 0.04;

    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const px = -sa;
    const pz = ca;

    const cx = ca * spread;
    const cz = sa * spread;
    const tipX = cx + ca * 0.05;
    const tipZ = cz + sa * 0.05;

    positions.push(
      cx - px * halfW, 0, cz - pz * halfW,
      cx + px * halfW, 0, cz + pz * halfW,
      tipX, height, tipZ
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createRock(scale: number, seed: number): THREE.Mesh {
  const geo = SHARED_ROCK_GEO.clone();

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len === 0) continue;

    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    const noise1 = vegNoise((nx + seed) * 2.5, (ny + seed) * 2.5) * 0.12;
    const noise2 = vegNoise((nz + seed) * 5, (nx + seed) * 5) * 0.05;
    const flattenY = 1 - Math.abs(ny) * 0.15;
    const displacement = (noise1 + noise2) * flattenY;

    pos.setX(i, x + nx * displacement);
    pos.setY(i, y + ny * displacement * 0.6);
    pos.setZ(i, z + nz * displacement);
  }
  geo.computeVertexNormals();

  addRockVertexColors(geo, seed);

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(scale, scale * (0.5 + Math.random() * 0.4), scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}


function softDisplace(geo: THREE.BufferGeometry, amount: number) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len === 0) continue;

    const offset = vegNoise(x * 3.0, z * 3.0 + y * 2.0) * amount;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;
    pos.setX(i, x + nx * offset);
    pos.setY(i, y + ny * offset);
    pos.setZ(i, z + nz * offset);
  }
  geo.computeVertexNormals();
}

function addBarkDetail(geo: THREE.CylinderGeometry, amount: number) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const offset = vegNoise(x * 8 + y * 3, z * 8) * amount;
    pos.setX(i, x + offset * 0.5);
    pos.setZ(i, z + offset * 0.5);
  }
  geo.computeVertexNormals();
}

function addRockVertexColors(geo: THREE.BufferGeometry, seed: number) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const baseGray = 0.38 + vegNoise((x + seed) * 4, (z + seed) * 4) * 0.08;

    const mossAmount = Math.max(0, y * 0.3 + vegNoise(x * 3, z * 3) * 0.15);
    const r = baseGray * (1 - mossAmount) + 0.15 * mossAmount;
    const g = baseGray * (1 - mossAmount) + 0.30 * mossAmount;
    const b = baseGray * (1 - mossAmount) + 0.08 * mossAmount;

    colors[i * 3] = Math.max(0, Math.min(1, r));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, g));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, b));
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
