import * as THREE from 'three';
import { InputManager } from '../input/InputManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import * as CANNON from 'cannon-es';

const MOVE_SPEED = 9;
const SPRINT_SPEED = 15;
const JUMP_IMPULSE = 6;
const MOUSE_SENSITIVITY = 0.002;
const EYE_HEIGHT = 1.65;
const HEAD_BOB_SPEED = 12;
const HEAD_BOB_AMOUNT = 0.035;

export class PlayerController {
  body!: CANNON.Body;
  health = 100;
  maxHealth = 100;
  velocity = new THREE.Vector3();
  isGrounded = false;
  isSprinting = false;

  pitch = 0;
  yaw = 0;
  private headBobTimer = 0;
  private bobOffset = 0;
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private groundedFrames = 0;
  private jumpCooldown = 0;
  private groundNormal = new CANNON.Vec3(0, 1, 0);

  constructor(
    private camera: THREE.PerspectiveCamera,
    private input: InputManager,
    private physics: PhysicsWorld
  ) {
    this.body = this.physics.createPlayerBody();
  }

  get position(): THREE.Vector3 {
    const p = this.body.position;
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  spawn(pos: THREE.Vector3) {
    this.body.position.set(pos.x, pos.y, pos.z);
    this.body.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
  }

  update(dt: number) {
    this.handleLook();
    this.checkGrounded();
    this.handleMovement(dt);
    this.handleHeadBob(dt);
    this.syncCamera();
  }

  private handleLook() {
    const { dx, dy } = this.input.consumeMouse();
    this.yaw -= dx * MOUSE_SENSITIVITY;
    this.pitch -= dy * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
  }

  private checkGrounded() {
    const from = new CANNON.Vec3(
      this.body.position.x,
      this.body.position.y + 0.15,
      this.body.position.z
    );
    const to = new CANNON.Vec3(from.x, from.y - 0.55, from.z);
    const result = new CANNON.RaycastResult();
    this.physics.world.raycastClosest(from, to, { skipBackfaces: true }, result);

    if (result.hasHit) {
      this.groundedFrames = Math.min(this.groundedFrames + 1, 10);
      this.groundNormal.copy(result.hitNormalWorld);
    } else {
      this.groundedFrames = 0;
      this.groundNormal.set(0, 1, 0);
    }

    this.isGrounded = this.groundedFrames >= 1;
  }

  private handleMovement(_dt: number) {
    const move = this.input.getMovement();
    this.isSprinting = this.input.isPressed('ShiftLeft') && move.z < 0;
    const speed = this.isSprinting ? SPRINT_SPEED : MOVE_SPEED;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, -move.z);
    moveDir.addScaledVector(right, move.x);
    moveDir.y = 0;
    if (moveDir.length() > 0) moveDir.normalize();

    if (this.isGrounded && this.groundNormal.y < 0.99 && this.groundNormal.y > 0.3) {
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3(this.groundNormal.x, this.groundNormal.y, this.groundNormal.z);
      const slopeRight = new THREE.Vector3().crossVectors(moveDir, up).normalize();
      const slopeDir = new THREE.Vector3().crossVectors(normal, slopeRight).normalize();

      if (slopeDir.dot(moveDir) < 0) slopeDir.negate();
      moveDir.copy(slopeDir);
    }

    this.body.velocity.x = moveDir.x * speed;
    this.body.velocity.z = moveDir.z * speed;

    if (this.isGrounded && moveDir.length() > 0) {
      this.body.velocity.y = Math.max(this.body.velocity.y, moveDir.y * speed);
    }

    this.jumpCooldown = Math.max(0, this.jumpCooldown - _dt);

    if (this.input.isPressed('Space') && this.isGrounded && this.jumpCooldown <= 0) {
      this.body.velocity.y = JUMP_IMPULSE;
      this.jumpCooldown = 0.25;
      this.groundedFrames = 0;
    }

    if (this.isGrounded && this.body.velocity.y < -1.5) {
      this.body.velocity.y = -1.5;
    }

    this.velocity.set(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
  }

  private handleHeadBob(dt: number) {
    const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.z ** 2);
    if (speed > 1.5 && this.isGrounded) {
      const bobSpeed = this.isSprinting ? HEAD_BOB_SPEED * 1.4 : HEAD_BOB_SPEED;
      this.headBobTimer += dt * bobSpeed;
      this.bobOffset += (Math.sin(this.headBobTimer) * HEAD_BOB_AMOUNT - this.bobOffset) * 0.15;
    } else {
      this.headBobTimer *= 0.9;
      this.bobOffset *= 0.88;
    }
  }

  private syncCamera() {
    const p = this.body.position;
    this.camera.position.set(p.x, p.y + EYE_HEIGHT + this.bobOffset, p.z);
    this.euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this.euler);
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
  }
}
