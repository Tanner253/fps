import { InputManager } from './InputManager';

const JOYSTICK_SIZE = 130;
const KNOB_SIZE = 56;
const BTN_SIZE = 64;
const LOOK_SENSITIVITY = 0.4;

export class TouchControls {
  private container!: HTMLDivElement;
  private joystickBase!: HTMLDivElement;
  private joystickKnob!: HTMLDivElement;

  private joystickTouchId: number | null = null;
  private lookTouchId: number | null = null;
  private joystickOrigin = { x: 0, y: 0 };
  private lastLookPos = { x: 0, y: 0 };
  private sprintActive = false;

  readonly active: boolean;
  private enabled = false;

  constructor(private input: InputManager) {
    this.active = input.isMobile;
    if (!this.active) return;
    this.buildUI();
    this.bindEvents();
  }

  enable() {
    this.enabled = true;
    if (this.container) this.container.style.display = '';
  }

  private buildUI() {
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    Object.assign(this.container.style, {
      position: 'fixed', inset: '0', zIndex: '90',
      pointerEvents: 'none', touchAction: 'none',
      display: 'none',
    });

    this.joystickBase = this.circle(JOYSTICK_SIZE, 'rgba(255,255,255,0.1)', '2px solid rgba(255,255,255,0.2)');
    Object.assign(this.joystickBase.style, {
      position: 'absolute', bottom: '80px', left: '30px',
    });

    this.joystickKnob = this.circle(KNOB_SIZE, 'rgba(255,255,255,0.35)');
    Object.assign(this.joystickKnob.style, {
      position: 'absolute',
      top: `${(JOYSTICK_SIZE - KNOB_SIZE) / 2}px`,
      left: `${(JOYSTICK_SIZE - KNOB_SIZE) / 2}px`,
      transition: 'none',
    });
    this.joystickBase.appendChild(this.joystickKnob);
    this.container.appendChild(this.joystickBase);

    const fireBtn = this.makeButton('FIRE', '#ef4444', 74);
    Object.assign(fireBtn.style, { bottom: '100px', right: '25px' });
    this.addButtonListeners(fireBtn, () => { this.input.mouseDown = true; }, () => { this.input.mouseDown = false; });

    const jumpBtn = this.makeButton('JUMP', '#3b82f6', BTN_SIZE);
    Object.assign(jumpBtn.style, { bottom: '100px', right: '115px' });
    this.addButtonListeners(jumpBtn, () => { this.input.keys.set('Space', true); }, () => { this.input.keys.set('Space', false); });

    const reloadBtn = this.makeButton('R', '#f59e0b', 50);
    Object.assign(reloadBtn.style, { bottom: '190px', right: '30px' });
    this.addButtonListeners(reloadBtn, () => {
      this.input.keys.set('KeyR', true);
      setTimeout(() => this.input.keys.set('KeyR', false), 100);
    });

    const sprintBtn = this.makeButton('RUN', '#22c55e', 50);
    Object.assign(sprintBtn.style, { bottom: '190px', left: '55px' });
    this.addButtonListeners(sprintBtn, () => {
      this.sprintActive = !this.sprintActive;
      this.input.keys.set('ShiftLeft', this.sprintActive);
      sprintBtn.style.background = this.sprintActive ? '#22c55e' : 'rgba(34,197,94,0.3)';
    });

    const swapBtn = this.makeButton('1/2', '#8b5cf6', 50);
    Object.assign(swapBtn.style, { bottom: '255px', right: '30px' });
    let weapIdx = 0;
    this.addButtonListeners(swapBtn, () => {
      weapIdx = weapIdx === 0 ? 1 : 0;
      const key = weapIdx === 0 ? 'Digit1' : 'Digit2';
      this.input.keys.set(key, true);
      setTimeout(() => this.input.keys.set(key, false), 100);
    });

    const adsBtn = this.makeButton('ADS', '#6366f1', 50);
    Object.assign(adsBtn.style, { bottom: '30px', right: '130px' });
    this.addButtonListeners(adsBtn, () => { this.input.rightMouseDown = true; }, () => { this.input.rightMouseDown = false; });

    document.body.appendChild(this.container);
  }

  private bindEvents() {
    const leftZone = 0.35;

    window.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const xRatio = t.clientX / window.innerWidth;

        if (xRatio < leftZone && this.joystickTouchId === null) {
          this.joystickTouchId = t.identifier;
          const rect = this.joystickBase.getBoundingClientRect();
          this.joystickOrigin.x = rect.left + rect.width / 2;
          this.joystickOrigin.y = rect.top + rect.height / 2;
          e.preventDefault();
        } else if (xRatio >= leftZone && this.lookTouchId === null) {
          const target = t.target as HTMLElement;
          if (target.dataset.touchBtn) continue;
          this.lookTouchId = t.identifier;
          this.lastLookPos.x = t.clientX;
          this.lastLookPos.y = t.clientY;
          e.preventDefault();
        }
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!this.enabled) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];

        if (t.identifier === this.joystickTouchId) {
          const dx = t.clientX - this.joystickOrigin.x;
          const dy = t.clientY - this.joystickOrigin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = JOYSTICK_SIZE / 2;
          const clamped = Math.min(dist, maxDist);
          const angle = Math.atan2(dy, dx);

          const knobX = Math.cos(angle) * clamped;
          const knobY = Math.sin(angle) * clamped;
          this.joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

          const norm = clamped / maxDist;
          this.input.virtualMoveX = Math.cos(angle) * norm;
          this.input.virtualMoveZ = Math.sin(angle) * norm;
          e.preventDefault();
        }

        if (t.identifier === this.lookTouchId) {
          const dx = t.clientX - this.lastLookPos.x;
          const dy = t.clientY - this.lastLookPos.y;
          this.input.mouseDeltaX += dx * LOOK_SENSITIVITY;
          this.input.mouseDeltaY += dy * LOOK_SENSITIVITY;
          this.lastLookPos.x = t.clientX;
          this.lastLookPos.y = t.clientY;
          e.preventDefault();
        }
      }
    }, { passive: false });

    const endTouch = (e: TouchEvent) => {
      if (!this.enabled) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.joystickKnob.style.transform = 'translate(0, 0)';
          this.input.virtualMoveX = 0;
          this.input.virtualMoveZ = 0;
        }
        if (t.identifier === this.lookTouchId) {
          this.lookTouchId = null;
        }
      }
    };

    window.addEventListener('touchend', endTouch, { passive: false });
    window.addEventListener('touchcancel', endTouch, { passive: false });
  }

  private circle(size: number, bg: string, border?: string): HTMLDivElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: bg, border: border || 'none',
    });
    return el;
  }

  private makeButton(label: string, color: string, size: number): HTMLDivElement {
    const btn = document.createElement('div');
    btn.dataset.touchBtn = '1';
    Object.assign(btn.style, {
      position: 'absolute',
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: `${color}44`,
      border: `2px solid ${color}88`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size > 60 ? '14px' : '11px',
      fontWeight: '700', letterSpacing: '0.05em',
      pointerEvents: 'auto', touchAction: 'none',
      userSelect: 'none', webkitUserSelect: 'none',
    });
    btn.textContent = label;
    this.container.appendChild(btn);
    return btn;
  }

  private addButtonListeners(btn: HTMLDivElement, onDown: () => void, onUp?: () => void) {
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); onDown(); }, { passive: false });
    if (onUp) {
      btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); onUp(); }, { passive: false });
      btn.addEventListener('touchcancel', (e) => { e.preventDefault(); e.stopPropagation(); onUp(); }, { passive: false });
    }
  }
}
