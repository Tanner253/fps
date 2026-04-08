import * as CANNON from 'cannon-es';

const FIXED_STEP = 1 / 60;
const MAX_SUB_STEPS = 3;

export class PhysicsWorld {
  world: CANNON.World;
  playerMaterial: CANNON.Material;
  groundMaterial: CANNON.Material;
  private bodies: CANNON.Body[] = [];

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -12, 0),
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    this.playerMaterial = new CANNON.Material('player');
    this.groundMaterial = new CANNON.Material('ground');

    const playerGroundContact = new CANNON.ContactMaterial(
      this.playerMaterial,
      this.groundMaterial,
      { friction: 0.0, restitution: 0.0 }
    );
    this.world.addContactMaterial(playerGroundContact);

    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.0;
  }

  createPlayerBody(): CANNON.Body {
    const body = new CANNON.Body({
      mass: 70,
      fixedRotation: true,
      linearDamping: 0.01,
      material: this.playerMaterial,
    });

    body.addShape(new CANNON.Sphere(0.35), new CANNON.Vec3(0, 0.35, 0));
    body.addShape(new CANNON.Sphere(0.35), new CANNON.Vec3(0, 1.0, 0));
    body.addShape(new CANNON.Sphere(0.3), new CANNON.Vec3(0, 1.5, 0));

    this.world.addBody(body);
    this.bodies.push(body);
    return body;
  }

  addHeightfield(heightData: number[][], elementSize: number, position: CANNON.Vec3): CANNON.Body {
    const shape = new CANNON.Heightfield(heightData, { elementSize });
    const body = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    body.addShape(shape);
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    body.position.copy(position);
    this.world.addBody(body);
    this.bodies.push(body);
    return body;
  }

  addStaticBox(size: CANNON.Vec3, position: CANNON.Vec3): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(size),
      position,
      material: this.groundMaterial,
    });
    this.world.addBody(body);
    this.bodies.push(body);
    return body;
  }

  addDynamicSphere(radius: number, mass: number, position: CANNON.Vec3): CANNON.Body {
    const body = new CANNON.Body({
      mass,
      shape: new CANNON.Sphere(radius),
      position,
    });
    this.world.addBody(body);
    this.bodies.push(body);
    return body;
  }

  removeBody(body: CANNON.Body) {
    this.world.removeBody(body);
    const idx = this.bodies.indexOf(body);
    if (idx >= 0) this.bodies.splice(idx, 1);
  }

  step(dt: number) {
    this.world.step(FIXED_STEP, dt, MAX_SUB_STEPS);
  }
}
