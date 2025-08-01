type SignalingMessage = { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit; };

interface SignalingCallbacks {
  onOpen: () => void;
  onMessage: (message: SignalingMessage) => void;
  onClose: () => void;
  onError: (event: Event) => void;
}

export class SignalingChannel {
  private ws: WebSocket | null = null;
  private callbacks: SignalingCallbacks;
  private signalingServerUrl: string;

  constructor(signalingServerUrl: string, callbacks: SignalingCallbacks) {
    this.signalingServerUrl = signalingServerUrl;
    this.callbacks = callbacks;
  }

  connect() {
    this.ws = new WebSocket(this.signalingServerUrl);

    this.ws.onopen = () => {
      this.callbacks.onOpen();
    };

    this.ws.onmessage = (event) => {
      try {
        const signal = JSON.parse(event.data);
        this.callbacks.onMessage(signal);
      } catch (error) {
        console.error("Failed to parse signaling message:", error);
      }
    };

    this.ws.onclose = () => {
      this.callbacks.onClose();
    };

    this.ws.onerror = (event) => {
      this.callbacks.onError(event);
    };
  }

  send(message: SignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open. Cannot send signaling message.");
    }
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
} 