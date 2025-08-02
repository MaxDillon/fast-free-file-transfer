// Shared types for file transfer and peer connection

export type FileMeta = {
  name: string;
  type: string;
  size: number;
};

export type ReceivedFile = {
  name: string;
  type: string;
  blob: Blob;
};

export type Step =
  | "init"
  | "share-offer"
  | "wait-answer"
  | "paste-answer"
  | "receiver-generate"
  | "receiver-share"
  | "connected"
  | "connecting";

export type PeerConnectionState = {
  peerId: string;
  sessionUrl: string;
  error: string;
  step: Step;
  copySuccess: string;
};
