import * as THREE from 'three';

export class Sky {
  private skyMesh: THREE.Mesh;
  private sunMesh: THREE.Mesh;

  constructor(private scene: THREE.Scene) {
    this.skyMesh = this.createSkyDome();
    this.sunMesh = this.createSun();
  }

  private createSkyDome(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(0.15, '#1a3a6c');
    grad.addColorStop(0.35, '#4a88c8');
    grad.addColorStop(0.55, '#7ab8e8');
    grad.addColorStop(0.75, '#a8d4f0');
    grad.addColorStop(0.9, '#d4e8f5');
    grad.addColorStop(1.0, '#e8f0f8');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 1024;
      const y = 100 + Math.random() * 400;
      const w = 40 + Math.random() * 120;
      const h = 15 + Math.random() * 30;
      ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.SphereGeometry(950, 48, 48);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, fog: false });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
    return mesh;
  }

  private createSun(): THREE.Mesh {
    const sunMat = new THREE.SpriteMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const sun = new THREE.Sprite(sunMat);
    sun.position.set(80, 100, 40);
    sun.scale.setScalar(40);
    this.scene.add(sun);

    const glareMat = new THREE.SpriteMaterial({
      color: 0xffeebb,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const glare = new THREE.Sprite(glareMat);
    glare.position.set(80, 100, 40);
    glare.scale.setScalar(120);
    this.scene.add(glare);

    return sun as unknown as THREE.Mesh;
  }

  update(_dt: number) {
    // future: day/night cycle
  }
}
