export class InputManager {
  keys = new Map<string, boolean>();
  private justPressedKeys = new Set<string>();
  private justPressedConsumed = new Set<string>();

  mouseX = 0;
  mouseY = 0;
  mouseDeltaX = 0;
  mouseDeltaY = 0;
  mouseDown = false;
  rightMouseDown = false;
  private locked = false;

  virtualMoveX = 0;
  virtualMoveZ = 0;
  isMobile = 'ontouchstart' in window && navigator.maxTouchPoints > 0;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.get(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.keys.set(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
      this.justPressedKeys.delete(e.code);
      this.justPressedConsumed.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement !== null;
      if (!this.locked) {
        this.mouseDown = false;
        this.rightMouseDown = false;
      }
    });
  }

  lock() {
    if (this.isMobile) {
      this.locked = true;
    } else {
      document.body.requestPointerLock();
    }
  }

  isPressed(code: string): boolean {
    return this.keys.get(code) ?? false;
  }

  justPressed(code: string): boolean {
    if (this.justPressedKeys.has(code) && !this.justPressedConsumed.has(code)) {
      this.justPressedConsumed.add(code);
      return true;
    }
    return false;
  }

  getMovement(): { x: number; z: number } {
    let x = 0, z = 0;
    if (this.isPressed('KeyW') || this.isPressed('ArrowUp')) z -= 1;
    if (this.isPressed('KeyS') || this.isPressed('ArrowDown')) z += 1;
    if (this.isPressed('KeyA') || this.isPressed('ArrowLeft')) x -= 1;
    if (this.isPressed('KeyD') || this.isPressed('ArrowRight')) x += 1;
    x += this.virtualMoveX;
    z += this.virtualMoveZ;
    const len = Math.sqrt(x * x + z * z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z };
  }

  consumeMouse(): { dx: number; dy: number } {
    const dx = this.mouseDeltaX;
    const dy = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { dx, dy };
  }

  endFrame() {
    this.justPressedKeys.clear();
    this.justPressedConsumed.clear();
  }
}
