type Handler = (data: any) => void;

export class NetworkManager {
  ws: WebSocket | null = null;
  id = '';
  connected = false;
  private handlers = new Map<string, Handler[]>();

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.get(event)?.forEach((h) => h(data));
  }

  connect(name: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const wsHost =
        (import.meta as any).env?.VITE_WS_URL ||
        `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`;
      this.ws = new WebSocket(`${wsHost}/ws`);

      this.ws.onopen = () => {
        this.connected = true;
        this.send({ type: 'join', name });
      };

      this.ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'welcome') {
          this.id = msg.id;
          resolve(msg);
        }
        this.emit(msg.type, msg);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.emit('disconnected', {});
      };

      this.ws.onerror = () => reject(new Error('Connection failed'));
      setTimeout(() => {
        if (!this.connected) reject(new Error('Connection timeout'));
      }, 5000);
    });
  }

  sendState(pos: number[], rot: number[]) {
    this.send({ type: 'state', pos, rot });
  }

  sendHit(targetId: string, damage: number) {
    this.send({ type: 'hit', targetId, damage });
  }

  sendShot() {
    this.send({ type: 'shot' });
  }

  sendPickup(boxId: string) {
    this.send({ type: 'pickup', boxId });
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
