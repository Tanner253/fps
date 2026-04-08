import * as THREE from 'three';
import { Weapon, WeaponConfig } from './Weapon';
import { InputManager } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { createAssaultRifleModel, createPistolModel } from './WeaponModels';

const AR_CONFIG: WeaponConfig = {
  name: 'AK-74',
  damage: 28,
  fireRate: 10,
  range: 500,
  ammo: 30,
  maxAmmo: 30,
  reserveAmmo: 120,
  recoilAmount: 1.2,
  recoilRecovery: 6,
  spread: 0.012,
  adsZoom: 1.2,
  automatic: true,
  reloadTime: 2.2,
  bulletSpeed: 600,
  bulletGravity: 3,
  muzzleOffset: new THREE.Vector3(0, 0.01, -0.64),
};

const PISTOL_CONFIG: WeaponConfig = {
  name: 'M1911',
  damage: 45,
  fireRate: 4,
  range: 200,
  ammo: 8,
  maxAmmo: 8,
  reserveAmmo: 40,
  recoilAmount: 2.5,
  recoilRecovery: 8,
  spread: 0.008,
  adsZoom: 1.1,
  automatic: false,
  reloadTime: 1.5,
  bulletSpeed: 380,
  bulletGravity: 5,
  muzzleOffset: new THREE.Vector3(0, 0.015, -0.18),
};

export class WeaponManager {
  weapons: Weapon[] = [];
  private activeIndex = 0;
  private hasFired = false;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private input: InputManager,
    private audio: AudioManager
  ) {
    this.createWeapons();
  }

  get activeWeapon(): Weapon {
    return this.weapons[this.activeIndex];
  }

  canFire(): boolean {
    if (!this.activeWeapon.config.automatic && this.hasFired) return false;
    return this.activeWeapon.canFire();
  }

  fire() {
    if (this.activeWeapon.fire()) {
      this.hasFired = true;
      this.audio.playGunshot(this.activeWeapon.config.name);
    }
  }

  reload() {
    this.activeWeapon.reload();
  }

  switchTo(index: number) {
    if (index === this.activeIndex || index >= this.weapons.length) return;
    this.activeWeapon.model.visible = false;
    this.activeWeapon.startSwitch();
    this.activeIndex = index;
    this.activeWeapon.model.visible = true;
    this.activeWeapon.startSwitch();
  }

  update(dt: number, velocity: THREE.Vector3, grounded: boolean, sprinting: boolean) {
    if (!this.input.mouseDown) this.hasFired = false;
    this.activeWeapon.update(dt, velocity, grounded, sprinting, this.input.rightMouseDown);
  }

  resetAmmo() {
    for (const w of this.weapons) {
      w.ammo = w.config.ammo;
      w.reserveAmmo = w.config.reserveAmmo;
    }
  }

  private createWeapons() {
    const arModel = createAssaultRifleModel();
    const ar = new Weapon(AR_CONFIG, arModel, new THREE.Vector3(0.25, -0.22, -0.5), new THREE.Vector3(0.0, -0.16, -0.4));
    this.scene.add(arModel);
    this.weapons.push(ar);

    const pistolModel = createPistolModel();
    const pistol = new Weapon(PISTOL_CONFIG, pistolModel, new THREE.Vector3(0.22, -0.25, -0.45), new THREE.Vector3(0.0, -0.18, -0.35));
    pistolModel.visible = false;
    this.scene.add(pistolModel);
    this.weapons.push(pistol);
  }
}
