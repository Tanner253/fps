export class HUD {
  private container: HTMLDivElement;
  private healthBar: HTMLDivElement;
  private healthText: HTMLSpanElement;
  private ammoText: HTMLSpanElement;
  private reserveText: HTMLSpanElement;
  private crosshair: HTMLDivElement;
  private hitMarker: HTMLDivElement;
  private damageOverlay: HTMLDivElement;
  private leaderboardBody: HTMLDivElement;
  private deathOverlay: HTMLDivElement;
  private deathKiller: HTMLDivElement;
  private deathCountdown: HTMLDivElement;
  private killNotification: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    Object.assign(this.container.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '100',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    });

    this.crosshair = this.createCrosshair();
    this.hitMarker = this.createHitMarker();
    this.damageOverlay = this.createDamageOverlay();

    const bottomBar = this.createBottomBar();
    const { healthBar, healthText } = this.createHealthSection(bottomBar);
    this.healthBar = healthBar;
    this.healthText = healthText;

    const { ammoText, reserveText } = this.createAmmoSection(bottomBar);
    this.ammoText = ammoText;
    this.reserveText = reserveText;

    this.leaderboardBody = this.createLeaderboard();
    const { overlay, killer, countdown } = this.createDeathOverlay();
    this.deathOverlay = overlay;
    this.deathKiller = killer;
    this.deathCountdown = countdown;
    this.killNotification = this.createKillNotification();

    document.body.appendChild(this.container);
  }

  update(health: number, maxHealth: number, ammo: number, maxAmmo: number, reserve: number) {
    const pct = (health / maxHealth) * 100;
    this.healthBar.style.width = `${pct}%`;
    this.healthBar.style.background =
      pct > 60
        ? 'linear-gradient(90deg, #4ade80, #22c55e)'
        : pct > 30
          ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
          : 'linear-gradient(90deg, #ef4444, #dc2626)';
    this.healthText.textContent = `${Math.ceil(health)}`;
    this.ammoText.textContent = `${ammo}`;
    this.reserveText.textContent = `/ ${reserve}`;

    if (ammo === 0) {
      this.ammoText.style.color = '#ef4444';
    } else if (ammo <= maxAmmo * 0.3) {
      this.ammoText.style.color = '#fbbf24';
    } else {
      this.ammoText.style.color = '#ffffff';
    }
  }

  updateLeaderboard(
    entries: { id: string; name: string; kills: number; deaths: number }[],
    myId: string,
  ) {
    this.leaderboardBody.innerHTML = '';
    for (const e of entries) {
      const row = document.createElement('div');
      const isMe = e.id === myId;
      Object.assign(row.style, {
        display: 'flex',
        gap: '6px',
        padding: '3px 0',
        fontSize: '12px',
        color: isMe ? '#f7c948' : '#ccc',
        fontWeight: isMe ? '700' : '400',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      });

      const name = document.createElement('span');
      name.textContent = e.name;
      Object.assign(name.style, {
        flex: '1',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });

      const kills = document.createElement('span');
      kills.textContent = `${e.kills}`;
      Object.assign(kills.style, {
        width: '28px',
        textAlign: 'center',
        color: isMe ? '#f7c948' : '#4ade80',
      });

      const deaths = document.createElement('span');
      deaths.textContent = `${e.deaths}`;
      Object.assign(deaths.style, {
        width: '28px',
        textAlign: 'center',
        color: isMe ? '#f7c948' : '#ef4444',
      });

      row.append(name, kills, deaths);
      this.leaderboardBody.appendChild(row);
    }
  }

  showHitMarker() {
    this.hitMarker.style.opacity = '1';
    setTimeout(() => {
      this.hitMarker.style.opacity = '0';
    }, 150);
  }

  showDamage() {
    this.damageOverlay.style.opacity = '0.3';
    setTimeout(() => {
      this.damageOverlay.style.opacity = '0';
    }, 300);
  }

  showDeath(killerName: string) {
    this.deathKiller.textContent = `KILLED BY ${killerName}`;
    this.deathOverlay.style.opacity = '1';

    let seconds = 3;
    this.deathCountdown.textContent = `RESPAWNING IN ${seconds}...`;
    const iv = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(iv);
        this.deathCountdown.textContent = 'RESPAWNING...';
      } else {
        this.deathCountdown.textContent = `RESPAWNING IN ${seconds}...`;
      }
    }, 1000);
  }

  hideDeath() {
    this.deathOverlay.style.opacity = '0';
  }

  showKillConfirm() {
    this.killNotification.style.opacity = '1';
    this.killNotification.style.transform = 'translate(-50%, 0) scale(1)';
    setTimeout(() => {
      this.killNotification.style.opacity = '0';
      this.killNotification.style.transform = 'translate(-50%, 0) scale(0.8)';
    }, 1500);
  }

  private createCrosshair(): HTMLDivElement {
    const ch = document.createElement('div');
    Object.assign(ch.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    });

    const lines = [
      { w: '2px', h: '12px', t: '-14px', l: '-1px' },
      { w: '2px', h: '12px', t: '4px', l: '-1px' },
      { w: '12px', h: '2px', t: '-1px', l: '-14px' },
      { w: '12px', h: '2px', t: '-1px', l: '4px' },
    ];

    for (const line of lines) {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'absolute',
        width: line.w,
        height: line.h,
        top: line.t,
        left: line.l,
        background: 'rgba(255,255,255,0.85)',
        boxShadow: '0 0 2px rgba(0,0,0,0.5)',
      });
      ch.appendChild(el);
    }

    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'absolute',
      width: '2px',
      height: '2px',
      top: '-1px',
      left: '-1px',
      background: 'rgba(255,50,50,0.9)',
      borderRadius: '50%',
    });
    ch.appendChild(dot);

    this.container.appendChild(ch);
    return ch;
  }

  private createHitMarker(): HTMLDivElement {
    const hm = document.createElement('div');
    Object.assign(hm.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '20px',
      height: '20px',
      opacity: '0',
      transition: 'opacity 0.1s',
    });

    for (let i = 0; i < 4; i++) {
      const line = document.createElement('div');
      const angle = i * 90 + 45;
      Object.assign(line.style, {
        position: 'absolute',
        width: '8px',
        height: '2px',
        background: '#ff3333',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(4px)`,
      });
      hm.appendChild(line);
    }

    this.container.appendChild(hm);
    return hm;
  }

  private createDamageOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute',
      inset: '0',
      background: 'radial-gradient(ellipse, transparent 50%, rgba(255,0,0,0.4))',
      opacity: '0',
      transition: 'opacity 0.2s',
      pointerEvents: 'none',
    });
    this.container.appendChild(overlay);
    return overlay;
  }

  private createBottomBar(): HTMLDivElement {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      right: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    });
    this.container.appendChild(bar);
    return bar;
  }

  private createHealthSection(parent: HTMLDivElement) {
    const section = document.createElement('div');

    const label = document.createElement('div');
    label.textContent = 'HEALTH';
    Object.assign(label.style, {
      fontSize: '10px',
      color: '#888',
      letterSpacing: '0.15em',
      marginBottom: '4px',
    });
    section.appendChild(label);

    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '10px' });

    const healthText = document.createElement('span');
    Object.assign(healthText.style, {
      fontSize: '28px',
      fontWeight: '700',
      color: '#fff',
      minWidth: '40px',
    });
    row.appendChild(healthText);

    const barBg = document.createElement('div');
    Object.assign(barBg.style, {
      width: '180px',
      height: '6px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '3px',
      overflow: 'hidden',
    });
    const healthBar = document.createElement('div');
    Object.assign(healthBar.style, {
      width: '100%',
      height: '100%',
      borderRadius: '3px',
      transition: 'width 0.3s, background 0.3s',
    });
    barBg.appendChild(healthBar);
    row.appendChild(barBg);

    section.appendChild(row);
    parent.appendChild(section);
    return { healthBar, healthText };
  }

  private createAmmoSection(parent: HTMLDivElement) {
    const section = document.createElement('div');
    Object.assign(section.style, { textAlign: 'right' });

    const label = document.createElement('div');
    label.textContent = 'AMMO';
    Object.assign(label.style, {
      fontSize: '10px',
      color: '#888',
      letterSpacing: '0.15em',
      marginBottom: '4px',
    });
    section.appendChild(label);

    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'baseline',
      gap: '6px',
      justifyContent: 'flex-end',
    });

    const ammoText = document.createElement('span');
    Object.assign(ammoText.style, { fontSize: '36px', fontWeight: '700', color: '#fff' });
    row.appendChild(ammoText);

    const reserveText = document.createElement('span');
    Object.assign(reserveText.style, { fontSize: '16px', color: '#888' });
    row.appendChild(reserveText);

    section.appendChild(row);
    parent.appendChild(section);
    return { ammoText, reserveText };
  }

  private createLeaderboard(): HTMLDivElement {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(0,0,0,0.55)',
      borderRadius: '8px',
      padding: '10px 14px',
      minWidth: '180px',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255,255,255,0.08)',
    });

    const title = document.createElement('div');
    title.textContent = 'LEADERBOARD';
    Object.assign(title.style, {
      fontSize: '10px',
      color: '#888',
      letterSpacing: '0.2em',
      marginBottom: '6px',
      textAlign: 'center',
    });
    container.appendChild(title);

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      gap: '6px',
      padding: '2px 0 4px',
      fontSize: '10px',
      color: '#666',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '4px',
    });

    const nameH = document.createElement('span');
    nameH.textContent = 'NAME';
    nameH.style.flex = '1';
    const killsH = document.createElement('span');
    killsH.textContent = 'K';
    Object.assign(killsH.style, { width: '28px', textAlign: 'center' });
    const deathsH = document.createElement('span');
    deathsH.textContent = 'D';
    Object.assign(deathsH.style, { width: '28px', textAlign: 'center' });

    header.append(nameH, killsH, deathsH);
    container.appendChild(header);

    const body = document.createElement('div');
    container.appendChild(body);

    this.container.appendChild(container);
    return body;
  }

  private createDeathOverlay() {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute',
      inset: '0',
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: '0',
      transition: 'opacity 0.4s',
      pointerEvents: 'none',
    });

    const killer = document.createElement('div');
    Object.assign(killer.style, {
      fontSize: '28px',
      fontWeight: '700',
      color: '#ef4444',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
    });
    overlay.appendChild(killer);

    const countdown = document.createElement('div');
    Object.assign(countdown.style, {
      fontSize: '14px',
      color: '#888',
      letterSpacing: '0.1em',
      marginTop: '16px',
    });
    overlay.appendChild(countdown);

    this.container.appendChild(overlay);
    return { overlay, killer, countdown };
  }

  private createKillNotification(): HTMLDivElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute',
      top: '35%',
      left: '50%',
      transform: 'translate(-50%, 0) scale(0.8)',
      fontSize: '18px',
      fontWeight: '700',
      color: '#f7c948',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      opacity: '0',
      transition: 'opacity 0.3s, transform 0.3s',
      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    });
    el.textContent = 'ENEMY ELIMINATED';
    this.container.appendChild(el);
    return el;
  }
}
