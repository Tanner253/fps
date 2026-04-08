import * as THREE from 'three';
import { InputManager } from '../input/InputManager';
import { PlayerController } from '../player/PlayerController';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { World, WATER_LEVEL } from './World';
import { WeaponManager } from '../weapons/WeaponManager';
import { HUD } from '../ui/HUD';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { FXSystem } from '../combat/FXSystem';
import { EnemyManager } from '../enemies/EnemyManager';
import { AudioManager } from '../audio/AudioManager';
import { Sky } from './Sky';
import { NetworkManager } from '../network/NetworkManager';
import { RemotePlayerManager } from '../multiplayer/RemotePlayerManager';
import { withSeededRandom, WORLD_SEED } from '../utils/random';

export class Game {
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  weaponCamera!: THREE.PerspectiveCamera;
  weaponScene!: THREE.Scene;
  clock = new THREE.Clock();

  input!: InputManager;
  physics!: PhysicsWorld;
  player!: PlayerController;
  world!: World;
  sky!: Sky;
  weapons!: WeaponManager;
  hud!: HUD;
  projectiles!: ProjectileSystem;
  fx!: FXSystem;
  enemies!: EnemyManager;
  audio!: AudioManager;
  network!: NetworkManager;
  remotePlayers!: RemotePlayerManager;

  private running = false;
  private aiEnabled = true;
  private isDead = false;
  private networkTimer = 0;

  async init() {
    this.initRenderer();
    this.initScenes();
    this.initSystems();
    await this.buildWorld();
  }

  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.autoClear = false;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this.onResize());
  }

  private initScenes() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x9ab8d4, 0.0012);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    this.weaponScene = new THREE.Scene();
    this.weaponCamera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.01,
      100,
    );

    const wLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    wLight.position.set(1, 2, 1);
    this.weaponScene.add(wLight);
    this.weaponScene.add(new THREE.AmbientLight(0xaabbcc, 0.5));
    this.weaponScene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.3));
  }

  private initSystems() {
    this.input = new InputManager();
    this.physics = new PhysicsWorld();
    this.audio = new AudioManager(this.camera);
    this.player = new PlayerController(this.camera, this.input, this.physics);
    this.weapons = new WeaponManager(this.weaponScene, this.weaponCamera, this.input, this.audio);
    this.projectiles = new ProjectileSystem(this.scene);
    this.fx = new FXSystem(this.scene);
    this.enemies = new EnemyManager(this.scene, this.physics);
    this.hud = new HUD();
    this.network = new NetworkManager();
    this.remotePlayers = new RemotePlayerManager(this.scene);
    this.setupNetworkHandlers();
  }

  private async buildWorld() {
    this.sky = new Sky(this.scene);
    this.world = new World(this.scene, this.physics);
    withSeededRandom(WORLD_SEED + 200, () => this.world.generate());

    this.enemies.setTerrainInfo((x, z) => this.world.getHeight(x, z), WATER_LEVEL);

    const spawnY = this.world.getHeight(0, 0) + 3;
    this.player.spawn(new THREE.Vector3(0, spawnY, 0));
  }

  private setupNetworkHandlers() {
    this.network.on('state', (msg: any) => {
      this.remotePlayers.updateFromServer(msg.players, this.network.id);
    });

    this.network.on('joined', (msg: any) => {
      this.remotePlayers.addPlayer(msg.id, msg.name, msg.pos);
    });

    this.network.on('left', (msg: any) => {
      this.remotePlayers.removePlayer(msg.id);
    });

    this.network.on('aiMode', (msg: any) => {
      const wasEnabled = this.aiEnabled;
      this.aiEnabled = msg.enabled;
      if (!this.aiEnabled && wasEnabled) {
        this.enemies.clearAll();
      } else if (this.aiEnabled && !wasEnabled && this.running) {
        this.enemies.spawnWave(this.player.position);
      }
    });

    this.network.on('hitConfirm', (msg: any) => {
      if (msg.killed) {
        this.audio.playKillPing();
        this.hud.showKillConfirm();
      }
    });

    this.network.on('damaged', (msg: any) => {
      this.player.health = msg.hp;
      this.hud.showDamage();
    });

    this.network.on('died', (msg: any) => {
      this.isDead = true;
      this.player.health = 0;
      this.hud.showDeath(msg.killerName);
    });

    this.network.on('respawn', (msg: any) => {
      this.isDead = false;
      const y = this.world.getHeight(msg.pos[0], msg.pos[2]) + 3;
      this.player.spawn(new THREE.Vector3(msg.pos[0], y, msg.pos[2]));
      this.player.health = 100;
      this.weapons.resetAmmo();
      this.hud.hideDeath();
    });

    this.network.on('leaderboard', (msg: any) => {
      this.hud.updateLeaderboard(msg.entries, this.network.id);
    });

    this.network.on('disconnected', () => {
      this.aiEnabled = true;
    });
  }

  async connectMultiplayer(name: string): Promise<boolean> {
    try {
      const welcome: any = await this.network.connect(name);
      this.aiEnabled = welcome.aiMode;

      const y = this.world.getHeight(welcome.pos[0], welcome.pos[2]) + 3;
      this.player.spawn(new THREE.Vector3(welcome.pos[0], y, welcome.pos[2]));

      for (const [id, data] of Object.entries(welcome.players as Record<string, any>)) {
        this.remotePlayers.addPlayer(id, data.name, data.pos);
      }

      this.hud.updateLeaderboard(welcome.leaderboard, this.network.id);
      return true;
    } catch {
      this.aiEnabled = true;
      return false;
    }
  }

  start() {
    this.running = true;
    this.input.lock();
    this.clock.start();

    if (this.aiEnabled) {
      this.enemies.spawnWave(this.player.position);
    }

    this.update();
  }

  private update = () => {
    if (!this.running) return;
    requestAnimationFrame(this.update);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.physics.step(dt);

    if (!this.isDead) {
      this.player.update(dt);
      this.weapons.update(dt, this.player.velocity, this.player.isGrounded, this.player.isSprinting);
    }

    this.networkTimer += dt;
    if (this.network.connected && this.networkTimer >= 0.05) {
      this.networkTimer = 0;
      const p = this.player.position;
      this.network.sendState([p.x, p.y, p.z], [this.player.pitch, this.player.yaw]);
    }

    this.remotePlayers.update(dt);

    if (this.aiEnabled) {
      this.enemies.update(dt, this.player.position);
    }

    if (!this.isDead && this.input.mouseDown && this.weapons.canFire()) {
      const weapon = this.weapons.activeWeapon;
      const spread = weapon.getSpread();

      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      dir.x += (Math.random() - 0.5) * spread;
      dir.y += (Math.random() - 0.5) * spread;
      dir.normalize();

      this.projectiles.fire(this.camera.position.clone(), dir, weapon.config);
      this.weapons.fire();
      this.fx.addScreenShake(0.15);
    }

    const hits = this.projectiles.update(
      dt,
      this.world.colliderGroup,
      this.aiEnabled ? this.enemies.enemyGroup : null,
      this.remotePlayers.group,
    );

    for (const hit of hits) {
      if (hit.playerId && this.network.connected) {
        this.network.sendHit(hit.playerId, hit.damage);
        this.fx.spawnBloodSplat(hit.point, hit.normal);
        this.hud.showHitMarker();
        this.audio.playHitmarker();
      } else if (hit.enemyId) {
        this.enemies.applyDamageById(hit.enemyId, hit.damage);
        this.fx.spawnBloodSplat(hit.point, hit.normal);
        this.hud.showHitMarker();
        this.audio.playHitmarker();
      } else {
        this.fx.spawnImpact(hit.point, hit.normal);
        this.audio.playImpact();
      }
    }

    if (this.input.justPressed('KeyR')) this.weapons.reload();
    if (this.input.justPressed('Digit1')) this.weapons.switchTo(0);
    if (this.input.justPressed('Digit2')) this.weapons.switchTo(1);

    const shake = this.fx.getScreenShake();
    this.camera.rotation.x += shake.x;
    this.camera.rotation.y += shake.y;

    this.hud.update(
      this.player.health,
      this.player.maxHealth,
      this.weapons.activeWeapon.ammo,
      this.weapons.activeWeapon.maxAmmo,
      this.weapons.activeWeapon.reserveAmmo,
    );

    this.fx.update(dt);
    this.sky.update(dt);

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.weaponScene, this.weaponCamera);

    this.input.endFrame();
  };

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.weaponCamera.aspect = w / h;
    this.weaponCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
