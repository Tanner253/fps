import * as THREE from 'three';

export function createAssaultRifleModel(): THREE.Group {
  const group = new THREE.Group();
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.8 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6B3A2A, roughness: 0.7, metalness: 0.1 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.9 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.35), gunMetal);
  receiver.position.set(0, 0, -0.05);
  group.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.4, 8), darkMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.42);
  group.add(barrel);

  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.22), wood);
  handguard.position.set(0, -0.005, -0.28);
  group.add(handguard);

  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.08), gunMetal);
  magazine.position.set(0, -0.09, 0.0);
  magazine.rotation.x = -0.15;
  group.add(magazine);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.2), wood);
  stock.position.set(0, 0.0, 0.2);
  group.add(stock);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.035), wood);
  grip.position.set(0, -0.06, 0.08);
  grip.rotation.x = -0.3;
  group.add(grip);

  const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.03), gunMetal);
  gasBlock.position.set(0, 0.04, -0.18);
  group.add(gasBlock);

  const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), gunMetal);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.045, -0.08);
  group.add(gasTube);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.06, 8), darkMetal);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.01, -0.64);
  group.add(muzzle);

  const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.05), gunMetal);
  sightBase.position.set(0, 0.05, -0.04);
  group.add(sightBase);

  const sightPost = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.02, 0.003), gunMetal);
  sightPost.position.set(0, 0.065, -0.06);
  group.add(sightPost);

  return group;
}

export function createPistolModel(): THREE.Group {
  const group = new THREE.Group();
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.35, metalness: 0.85 });
  const darkGrip = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.1 });

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.18), gunMetal);
  slide.position.set(0, 0.02, -0.02);
  group.add(slide);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), gunMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -0.14);
  group.add(barrel);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.025, 0.12), gunMetal);
  frame.position.set(0, -0.005, 0.01);
  group.add(frame);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.04), darkGrip);
  grip.position.set(0, -0.05, 0.05);
  grip.rotation.x = -0.2;
  group.add(grip);

  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 0.015), gunMetal);
  trigger.position.set(0, -0.02, 0.01);
  group.add(trigger);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 6, 8, Math.PI), gunMetal);
  triggerGuard.position.set(0, -0.025, 0.015);
  triggerGuard.rotation.x = Math.PI;
  group.add(triggerGuard);

  const sightFront = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.008, 0.005), gunMetal);
  sightFront.position.set(0, 0.045, -0.1);
  group.add(sightFront);

  const sightRear = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.005), gunMetal);
  sightRear.position.set(0, 0.045, 0.04);
  group.add(sightRear);

  return group;
}
