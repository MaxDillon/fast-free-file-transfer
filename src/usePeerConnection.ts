import { createSignal, createEffect } from "solid-js";
import Peer from "peerjs";
import type { Step } from "./types";
import { v4 as uuidv4 } from "uuid";

type DataConnection = import("peerjs").DataConnection;

export function usePeerConnection() {
  const [_peer, setPeer] = createSignal<Peer | null>(null);
  const [peerId, setPeerId] = createSignal("");
  const [conn, setConn] = createSignal<DataConnection | null>(null);
  const [step, setStep] = createSignal<Step>("init");
  const [error, setError] = createSignal("");
  const [copySuccess, setCopySuccess] = createSignal("");
  const [isSender, setIsSender] = createSignal(false);
  const [sessionReady, setSessionReady] = createSignal(false);

  // On mount, check for peer id in URL (query param)
  createEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("peer");
    if (id) {
      setPeerId(id);
      setIsSender(false);
      setStep("receiver-generate");
    }
  });

  // Sender: Start session, create PeerJS peer, show link
  const startSession = async () => {
    setIsSender(true);
    setSessionReady(false);
    setStep("share-offer");
    setError("");
    const p = new Peer(uuidv4()); // Use UUID for unique peer ID
    setPeerId(p.id);

    setPeer(p);
    p.on("open", (id) => {
      setPeerId(id);
      setSessionReady(true);
      setStep("share-offer");
    });
    p.on("connection", (connection) => {
      setConn(connection);
      setStep("connected");
    });
    p.on("error", (err) => setError("Peer error: " + err));
  };

  // Receiver: Connect to sender's peer
  const handleConnectToPeer = async () => {
    try {
      const p = new Peer();
      setPeer(p);
      p.on("open", () => {
        const connection = p.connect(peerId());
        setConn(connection);
        connection.on("open", () => {
          setStep("connected");
        });
      });
      p.on("error", (err) => setError("Peer error: " + err));
    } catch (err) {
      setError(
        "Failed to connect: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };


  const sessionUrl = () => {
    const id = peerId()
    return `${window.location.origin}${window.location.pathname}?peer=${id}`;  
  }

  return {
    peerId,
    sessionUrl,
    step,
    error,
    copySuccess,
    conn,
    setConn,
    setStep,
    setError,
    setCopySuccess,
    startSession,
    handleConnectToPeer,
    isSender,
    sessionReady,
  };
}
