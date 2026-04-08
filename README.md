# DOGTAG — Open World FPS

A browser-based open-world FPS shooter built with Three.js, inspired by Arc Raiders and Rust.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and click to start.

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| SHIFT | Sprint |
| SPACE | Jump |
| Mouse | Aim |
| LMB | Fire |
| RMB | ADS (Aim Down Sights) |
| R | Reload |
| 1 | Assault Rifle (AK-74) |
| 2 | Pistol (M1911) |

## Tech Stack

- **Three.js** — 3D rendering, dual-scene weapon overlay
- **cannon-es** — Physics (terrain collision, player body, enemy bodies)
- **simplex-noise** — Procedural terrain generation
- **TypeScript** + **Vite** — Build tooling

## Architecture

```
src/
├── main.ts                 Entry point, loading screen
├── game/
│   ├── Game.ts             Main loop, renderer, system orchestration
│   ├── World.ts            Procedural terrain, trees, rocks, water
│   └── Sky.ts              Skybox
├── player/
│   └── PlayerController.ts FPS movement, look, head bob, physics
├── weapons/
│   ├── Weapon.ts           Base weapon class (recoil, ADS, bob, reload)
│   ├── WeaponManager.ts    Weapon inventory, switching
│   └── WeaponModels.ts     Procedural 3D gun models
├── combat/
│   └── CombatSystem.ts     Raycasting, muzzle flash, bullet trails, impacts
├── enemies/
│   └── EnemyManager.ts     AI enemies (patrol/chase/attack), wave spawning
├── physics/
│   └── PhysicsWorld.ts     cannon-es wrapper
├── input/
│   └── InputManager.ts     Keyboard/mouse, pointer lock
├── ui/
│   └── HUD.ts              Health, ammo, crosshair, kill counter
└── audio/
    └── AudioManager.ts     Synthesized gunshot/impact sounds
```

## Features

- Procedural open world with terrain, trees, rocks, grass, and water
- Two weapons with distinct handling (AK-74 automatic rifle, M1911 pistol)
- Weapon animations: recoil, head bob, reload, ADS, weapon sway
- Hitscan combat with muzzle flash, bullet trails, and impact particles
- AI enemies with patrol/chase/attack behavior and health bars
- Wave-based spawning system
- Full HUD: crosshair, health bar, ammo counter, kill counter
- Synthesized audio (no asset files needed)
- Physics-based movement with jumping and sprinting
