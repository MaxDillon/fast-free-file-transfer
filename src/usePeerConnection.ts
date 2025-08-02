import { useState, useEffect, useCallback } from "react";
import Peer from "peerjs";
import type { Step } from "./types";
import { v4 as uuidv4 } from "uuid";

type DataConnection = import("peerjs").DataConnection;

const STORAGE_PEER_ID = "myPeerId";
const STORAGE_CONNECTED_PEERS = "connectedPeerIds";

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
  peerInstance: Peer | null; // <-- add this
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

  // --- Peer ID persistence ---
  // On mount, check for stored peerId or generate and persist one
  useEffect(() => {
    let storedPeerId = sessionStorage.getItem(STORAGE_PEER_ID);
    if (!storedPeerId) {
      storedPeerId = uuidv4();
      sessionStorage.setItem(STORAGE_PEER_ID, storedPeerId);
    }
    setPeerId(storedPeerId);
  }, []);

  // Store our peerId in sessionStorage when set (redundant but safe)
  useEffect(() => {
    if (peerId) {
      sessionStorage.setItem(STORAGE_PEER_ID, peerId);
    }
  }, [peerId]);

  // --- Connected peers persistence ---
  // Store all connected peer IDs in sessionStorage
  useEffect(() => {
    const ids = Object.keys(connections);
    if (ids.length > 0) {
      console.log(
        "[usePeerConnection] Saving connected peer IDs to sessionStorage:",
        ids
      );
      sessionStorage.setItem(STORAGE_CONNECTED_PEERS, JSON.stringify(ids));
    } else {
      console.log(
        "[usePeerConnection] Not saving to sessionStorage: no connections."
      );
    }
  }, [connections]);

  // On mount, restore and reconnect to all stored peer IDs
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_CONNECTED_PEERS);
    console.log("[usePeerConnection] Loaded from sessionStorage:", stored);
    if (stored && peer) {
      try {
        const ids: string[] = JSON.parse(stored);
        console.log(
          "[usePeerConnection] Attempting to reconnect to peer IDs:",
          ids
        );
        ids.forEach((id) => {
          if (!connections[id]) {
            console.log(
              `[usePeerConnection] Attempting to reconnect to peer: ${id}`
            );
            try {
              const connection = peer.connect(id);
              setConnections((prev) => ({ ...prev, [id]: connection }));
              connection.on("open", () => {
                console.log(`[usePeerConnection] Reconnected to peer: ${id}`);
                setStep("connected");
              });
              connection.on("close", () =>
                console.warn(`[usePeerConnection] Connection closed: ${id}`)
              );
              connection.on("error", (err) =>
                console.error(
                  `[usePeerConnection] Connection error for ${id}:`,
                  err
                )
              );
              connection.on("data", () =>
                console.log(`[usePeerConnection] Data received from ${id}`)
              );
            } catch (err) {
              console.error(
                `[usePeerConnection] Failed to reconnect to peer: ${id}`,
                err
              );
            }
          }
        });
      } catch (err) {
        console.error(
          "[usePeerConnection] Failed to parse stored peer IDs:",
          err
        );
      }
    } else if (!peer) {
      console.log(
        "[usePeerConnection] Peer instance not ready, skipping reconnection."
      );
    }
    // eslint-disable-next-line
  }, [peer, connections]);

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

  // Always create a PeerJS peer for the receiver (random id or from storage)
  useEffect(() => {
    if (
      (step === "receiver-generate" ||
        step === "share-offer" ||
        step === "init") &&
      !peer &&
      peerId
    ) {
      const p = new Peer(peerId);
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
  }, [step, peerId]);

  // Sender: Start session, create PeerJS peer, show link
  const startSession = useCallback(async () => {
    setIsSender(true);
    setSessionReady(false);
    setStep("share-offer");
    setError("");
    // Peer will be created by useEffect above
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
    peerInstance: peer, // <-- expose the PeerJS instance
  };
}
