interface WebRTCCallbacks {
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
  onDataChannel: (channel: RTCDataChannel) => void;
}

export class WebRTCConnection {
  private pc: RTCPeerConnection;
  private callbacks: WebRTCCallbacks;

  constructor(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks;
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: 'turn:relay.metered.ca:80',
          username: 'openai',
          credential: 'openai',
        },
      ],
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate(event.candidate);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      this.callbacks.onIceConnectionStateChange(this.pc.iceConnectionState);
      if (this.pc.iceConnectionState === 'failed') {
        console.error('ICE connection failed. This usually means no route could be found.');
      }
    };

    this.pc.ondatachannel = (event) => {
      this.callbacks.onDataChannel(event.channel);
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(description));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding received ICE candidate:', e);
    }
  }

  createDataChannel(label: string): RTCDataChannel {
    return this.pc.createDataChannel(label);
  }

  getPeerConnection(): RTCPeerConnection {
    return this.pc;
  }

  close() {
    this.pc.close();
  }
} 