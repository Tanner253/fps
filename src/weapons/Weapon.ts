import * as THREE from 'three';

export interface WeaponConfig {
  name: string;
  damage: number;
  fireRate: number;
  range: number;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  recoilAmount: number;
  recoilRecovery: number;
  spread: number;
  adsZoom: number;
  automatic: boolean;
  reloadTime: number;
  bulletSpeed: number;
  bulletGravity: number;
  muzzleOffset: THREE.Vector3;
}

export type WeaponState = 'idle' | 'firing' | 'reloading' | 'switching';

export class Weapon {
  config: WeaponConfig;
  model: THREE.Group;
  state: WeaponState = 'idle';
  flash: THREE.Group;

  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  damage: number;

  private fireCooldown = 0;
  private recoilCurrent = 0;
  private reloadTimer = 0;
  private switchTimer = 0;
  private bobTimer = 0;
  private swayX = 0;
  private swayY = 0;
  private basePosition: THREE.Vector3;
  private adsPosition: THREE.Vector3;
  isADS = false;
  private adsLerp = 0;
  private fireKick = 0;

  constructor(config: WeaponConfig, model: THREE.Group, basePos: THREE.Vector3, adsPos: THREE.Vector3) {
    this.config = config;
    this.model = model;
    this.ammo = config.ammo;
    this.maxAmmo = config.maxAmmo;
    this.reserveAmmo = config.reserveAmmo;
    this.damage = config.damage;
    this.basePosition = basePos.clone();
    this.adsPosition = adsPos.clone();
    this.flash = this.createMuzzleFlash();
    this.model.add(this.flash);
    this.flash.visible = false;
  }

  private createMuzzleFlash(): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(this.config.muzzleOffset);

    const flashMat = new THREE.SpriteMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Sprite(flashMat);
    core.scale.set(0.12, 0.12, 1);
    group.add(core);

    const outerMat = new THREE.SpriteMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const outer = new THREE.Sprite(outerMat);
    outer.scale.set(0.2, 0.2, 1);
    group.add(outer);

    const streakGeo = new THREE.PlaneGeometry(0.03, 0.18);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 4; i++) {
      const streak = new THREE.Mesh(streakGeo, streakMat);
      streak.rotation.z = (i / 4) * Math.PI;
      streak.position.z = -0.06;
      group.add(streak);
    }

    const flashLight = new THREE.PointLight(0xffaa33, 4, 3, 2);
    flashLight.position.set(0, 0, -0.05);
    group.add(flashLight);

    return group;
  }

  update(dt: number, velocity: THREE.Vector3, grounded: boolean, sprinting: boolean, rightMouse: boolean) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.isADS = rightMouse && this.state !== 'reloading' && this.state !== 'switching';
    this.fireKick = Math.max(0, this.fireKick - dt * 20);

    this.updateRecoil(dt);
    this.updateBob(dt, velocity, grounded, sprinting);
    this.updateSway(dt);
    this.updateADS(dt);
    this.updateReload(dt);
    this.updateSwitch(dt);
    this.applyTransforms();
  }

  canFire(): boolean {
    return this.state === 'idle' && this.fireCooldown <= 0 && this.ammo > 0;
  }

  fire(): boolean {
    if (!this.canFire()) return false;
    this.ammo--;
    this.fireCooldown = 1 / this.config.fireRate;
    this.recoilCurrent += this.config.recoilAmount;
    this.fireKick = 1;
    this.state = 'firing';

    this.flash.visible = true;
    this.flash.rotation.z = Math.random() * Math.PI * 2;
    this.flash.scale.setScalar(0.7 + Math.random() * 0.6);
    setTimeout(() => { this.flash.visible = false; }, 40);
    setTimeout(() => { if (this.state === 'firing') this.state = 'idle'; }, 60);

    return true;
  }

  reload() {
    if (this.state !== 'idle' || this.ammo === this.maxAmmo || this.reserveAmmo <= 0) return;
    this.state = 'reloading';
    this.reloadTimer = this.config.reloadTime;
  }

  startSwitch() {
    this.state = 'switching';
    this.switchTimer = 0.3;
  }

  getSpread(): number {
    return this.config.spread * (this.isADS ? 0.25 : 1.0);
  }

  private updateRecoil(dt: number) {
    this.recoilCurrent = Math.max(0, this.recoilCurrent - this.config.recoilRecovery * dt);
  }

  private updateBob(dt: number, velocity: THREE.Vector3, grounded: boolean, sprinting: boolean) {
    const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    if (speed > 1 && grounded) {
      this.bobTimer += dt * (sprinting ? 14 : 10);
    } else {
      this.bobTimer *= 0.93;
    }
  }

  private updateSway(_dt: number) {
    this.swayX *= 0.9;
    this.swayY *= 0.9;
  }

  private updateADS(dt: number) {
    const target = this.isADS ? 1 : 0;
    this.adsLerp += (target - this.adsLerp) * Math.min(1, dt * 12);
  }

  private updateReload(dt: number) {
    if (this.state !== 'reloading') return;
    this.reloadTimer -= dt;
    if (this.reloadTimer <= 0) {
      const needed = this.maxAmmo - this.ammo;
      const available = Math.min(needed, this.reserveAmmo);
      this.ammo += available;
      this.reserveAmmo -= available;
      this.state = 'idle';
    }
  }

  private updateSwitch(dt: number) {
    if (this.state !== 'switching') return;
    this.switchTimer -= dt;
    if (this.switchTimer <= 0) this.state = 'idle';
  }

  private applyTransforms() {
    const basePos = this.basePosition.clone().lerp(this.adsPosition, this.adsLerp);
    const adsFactor = 1 - this.adsLerp;

    const bobX = Math.sin(this.bobTimer) * 0.012 * adsFactor;
    const bobY = Math.abs(Math.cos(this.bobTimer)) * 0.008 * adsFactor;

    const recoilKick = -this.recoilCurrent * 0.04;
    const recoilPitch = this.recoilCurrent * 0.025;
    const fireJolt = -this.fireKick * 0.03;

    let switchOffset = 0;
    if (this.state === 'switching') {
      const t = this.switchTimer / 0.3;
      switchOffset = -0.35 * Math.sin(t * Math.PI);
    }

    let reloadOffset = 0;
    let reloadRot = 0;
    if (this.state === 'reloading') {
      const t = 1 - this.reloadTimer / this.config.reloadTime;
      reloadOffset = Math.sin(t * Math.PI) * -0.15;
      reloadRot = Math.sin(t * Math.PI) * 0.35;
    }

    this.model.position.set(
      basePos.x + bobX + this.swayX,
      basePos.y + bobY + reloadOffset + switchOffset,
      basePos.z + recoilKick + fireJolt
    );
    this.model.rotation.set(recoilPitch + reloadRot, 0, 0);
  }
}
