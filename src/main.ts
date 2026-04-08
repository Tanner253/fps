import { Game } from './game/Game';

const loadingBar = document.getElementById('loading-bar') as HTMLElement;
const loadingText = document.getElementById('loading-text') as HTMLElement;
const loadingScreen = document.getElementById('loading-screen') as HTMLElement;
const startScreen = document.getElementById('start-screen') as HTMLElement;
const nameInput = document.getElementById('player-name') as HTMLInputElement;
const deployBtn = document.getElementById('deploy-btn') as HTMLButtonElement;
const statusText = document.getElementById('status-text') as HTMLElement;

function updateLoading(progress: number, text: string) {
  loadingBar.style.width = `${progress}%`;
  loadingText.textContent = text;
}

const RANDOM_NAMES = [
  'Ghost', 'Viper', 'Reaper', 'Shadow', 'Falcon', 'Wolf', 'Phoenix', 'Raven',
  'Storm', 'Blaze', 'Hawk', 'Cobra', 'Nomad', 'Ronin', 'Spectre', 'Titan',
];

function randomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] +
    Math.floor(Math.random() * 999);
}

async function boot() {
  updateLoading(10, 'LOADING ENGINE...');

  const game = new Game();

  updateLoading(30, 'BUILDING WORLD...');
  await game.init();

  updateLoading(70, 'LOADING WEAPONS...');
  await new Promise((r) => setTimeout(r, 300));

  updateLoading(100, 'READY');
  await new Promise((r) => setTimeout(r, 400));

  loadingScreen.classList.add('hidden');
  startScreen.style.display = 'flex';
  nameInput.value = localStorage.getItem('dogtag_callsign') || randomName();
  nameInput.focus();
  nameInput.select();

  async function launch() {
    const name = nameInput.value.trim() || randomName();
    localStorage.setItem('dogtag_callsign', name);
    deployBtn.disabled = true;
    statusText.textContent = 'CONNECTING...';

    const connected = await game.connectMultiplayer(name);

    if (connected) {
      statusText.textContent = 'CONNECTED — DEPLOYING';
    } else {
      statusText.textContent = 'OFFLINE MODE — SOLO';
    }

    await new Promise((r) => setTimeout(r, 400));
    startScreen.style.display = 'none';
    game.start();
  }

  deployBtn.addEventListener('click', launch);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') launch();
  });
}

boot().catch(console.error);
