import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(express.static(join(__dirname, '../dist')));
app.get('*', (_req, res) => res.sendFile(join(__dirname, '../dist/index.html')));

httpServer.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
  } else {
    socket.destroy();
  }
});

const players = new Map();
let nextId = 1;
const RESPAWN_DELAY = 3000;
const TICK_RATE = 50;

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function broadcast(data, exclude) {
  const msg = JSON.stringify(data);
  for (const [id, p] of players) {
    if (id !== exclude && p.ws.readyState === 1) p.ws.send(msg);
  }
}

function spawnPos() {
  const a = Math.random() * Math.PI * 2;
  const d = 20 + Math.random() * 40;
  return [Math.cos(a) * d, 25, Math.sin(a) * d];
}

function leaderboard() {
  return [...players.values()]
    .map((p) => ({ id: p.id, name: p.name, kills: p.kills, deaths: p.deaths }))
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
}

wss.on('connection', (ws) => {
  const id = `p${nextId++}`;
  let joined = false;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'join') {
      const pos = spawnPos();
      const player = {
        id,
        ws,
        name: (msg.name || `Player${nextId}`).slice(0, 16),
        pos,
        rot: [0, 0],
        hp: 100,
        kills: 0,
        deaths: 0,
        alive: true,
      };
      players.set(id, player);
      joined = true;

      const others = {};
      for (const [pid, p] of players) {
        if (pid !== id) {
          others[pid] = { name: p.name, pos: p.pos, rot: p.rot, hp: p.hp, alive: p.alive };
        }
      }

      send(ws, {
        type: 'welcome',
        id,
        pos,
        players: others,
        leaderboard: leaderboard(),
        aiMode: players.size <= 1,
      });

      broadcast({ type: 'joined', id, name: player.name, pos }, id);
      broadcast({ type: 'aiMode', enabled: players.size <= 1 });
      broadcast({ type: 'leaderboard', entries: leaderboard() });
      return;
    }

    if (!joined) return;
    const me = players.get(id);
    if (!me) return;

    if (msg.type === 'state') {
      me.pos = msg.pos;
      me.rot = msg.rot;
    }

    if (msg.type === 'hit') {
      const target = players.get(msg.targetId);
      if (!target || !target.alive) return;

      target.hp = Math.max(0, target.hp - msg.damage);
      const killed = target.hp <= 0;

      send(ws, { type: 'hitConfirm', targetId: msg.targetId, damage: msg.damage, killed });

      if (killed) {
        target.alive = false;
        me.kills++;
        target.deaths++;

        send(target.ws, { type: 'died', killerName: me.name });
        broadcast({ type: 'leaderboard', entries: leaderboard() });

        const targetId = msg.targetId;
        setTimeout(() => {
          const t = players.get(targetId);
          if (!t) return;
          t.pos = spawnPos();
          t.hp = 100;
          t.alive = true;
          send(t.ws, { type: 'respawn', pos: t.pos });
        }, RESPAWN_DELAY);
      } else {
        send(target.ws, { type: 'damaged', damage: msg.damage, hp: target.hp });
      }
    }
  });

  ws.on('close', () => {
    players.delete(id);
    broadcast({ type: 'left', id });
    if (players.size > 0) {
      broadcast({ type: 'aiMode', enabled: players.size <= 1 });
      broadcast({ type: 'leaderboard', entries: leaderboard() });
    }
  });
});

setInterval(() => {
  if (players.size === 0) return;
  const state = {};
  for (const [id, p] of players) {
    state[id] = { pos: p.pos, rot: p.rot, hp: p.hp, alive: p.alive, name: p.name };
  }
  broadcast({ type: 'state', players: state });
}, TICK_RATE);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`DOGTAG server running on :${PORT}`);
});
