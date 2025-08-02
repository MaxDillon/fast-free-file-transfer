import { useState, useEffect, useCallback } from "react";
import Peer from "peerjs";
import type { Step } from "./types";
import { v4 as uuidv4 } from "uuid";

type DataConnection = import("peerjs").DataConnection;

type UsePeerConnection = {
  peerId: string;
  sessionUrl: string;
  step: Step;
  error: string;
  copySuccess: string;
  connections: Record<string, DataConnection>;
  setError: (e: string) => void;
  setCopySuccess: (s: string) => void;
  startSession: () => Promise<void>;
  handleConnectToPeer: (targetPeerId: string) => Promise<void>;
  isSender: boolean;
  sessionReady: boolean;
  targetPeerId: string;
  setTargetPeerId: (id: string) => void;
};

export function usePeerConnection(): UsePeerConnection {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState("");
  const [connections, setConnections] = useState<
    Record<string, DataConnection>
  >({});
  const [step, setStep] = useState<Step>("init");
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [isSender, setIsSender] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [targetPeerId, setTargetPeerId] = useState("");

  // On mount, check for peer id in URL (query param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("peer");
    if (id) {
      setTargetPeerId(id); // Only set as target, not as our own id
      setIsSender(false);
      setStep("receiver-generate");
    }
    // eslint-disable-next-line
  }, []);

  // Always create a PeerJS peer for the receiver (random id)
  useEffect(() => {
    if (step === "receiver-generate" && !peer) {
      const p = new Peer();
      setPeer(p);
      p.on("open", (id) => {
        setPeerId(id);
      });
      p.on("error", (err) => setError("Peer error: " + err));
      p.on("connection", (connection) => {
        setConnections((prev) => ({ ...prev, [connection.peer]: connection }));
        setStep("connected");
      });
    }
    // eslint-disable-next-line
  }, [step]);

  // Sender: Start session, create PeerJS peer, show link
  const startSession = useCallback(async () => {
    setIsSender(true);
    setSessionReady(false);
    setStep("share-offer");
    setError("");

    const uuid = uuidv4();
    setPeerId(uuid);
    const p = new Peer(uuid);
    setPeer(p);

    p.on("open", (id) => {
      setPeerId(id);
      setSessionReady(true);
      setStep("share-offer");
    });
    p.on("connection", async (connection) => {
      setConnections((prev) => ({ ...prev, [connection.peer]: connection }));
      setStep("connected");
    });
    p.on("error", (err) => setError("Peer error: " + err));
  }, []);

  // Receiver: Connect to sender's peer
  const handleConnectToPeer = useCallback(
    async (targetPeerId: string) => {
      setStep("connecting");
      try {
        if (!peer) return;
        const connection = peer.connect(targetPeerId);
        setConnections((prev) => ({ ...prev, [targetPeerId]: connection }));
        connection.on("open", () => {
          setStep("connected");
        });
        connection.on("close", () => console.error("Connection closed"));
        connection.on("error", () => console.error("Connection error"));
        connection.on("data", () => console.log("Data received"));
      } catch (err) {
        setError(
          "Failed to connect: " +
            (err instanceof Error ? err.message : String(err))
        );
        setStep("receiver-generate");
      }
    },
    [peer]
  );

  const sessionUrl = `${window.location.origin}${window.location.pathname}?peer=${peerId}`;

  return {
    peerId,
    sessionUrl,
    step,
    error,
    copySuccess,
    connections,
    setError,
    setCopySuccess,
    startSession,
    handleConnectToPeer,
    isSender,
    sessionReady,
    targetPeerId,
    setTargetPeerId,
  };
}
