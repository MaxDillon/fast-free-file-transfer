import { createSignal, createMemo, onCleanup } from "solid-js";
import Peer from "peerjs";

type DataConnection = import("peerjs").DataConnection;

export function usePeerJsInstance() {
  const [peer, setPeer] = createSignal<Peer>();
  const [connections, setConnections] = createSignal<{
    [key: string]: DataConnection;
  }>({});

  // Initialize peer
  const instance = new Peer();

  // Save the instance and set up incoming connection listener
  instance.on("open", () => {
    console.log("PeerJS ID:", instance.id);
    setPeer(instance);
  });

  instance.on("connection", (conn) => {
    console.log("Incoming connection from:", conn.peer);
    registerConnection(conn);
  });

  const registerConnection = (conn: DataConnection) => {
    // Add to connections list if not already present
    setConnections((prev) => {
      if (!prev[conn.peer]) {
        setupConnectionEvents(conn);
        return { ...prev, [conn.peer]: conn };
      }
      return prev;
    });
  };

  const setupConnectionEvents = (conn: DataConnection) => {
    conn.on("open", () => {
      console.log("Connection opened with", conn.peer);
    });

    conn.on("close", () => {
      console.log("Connection closed with", conn.peer);
      // Remove from connections list
      setConnections((prev) => {
        const newConnections = { ...prev };
        delete newConnections[conn.peer];
        return newConnections;
      });
    });

    conn.on("error", (err) => {
      console.error("Connection error with", conn.peer, err);
    });
  };

  // Function to establish a new connection
  const newConnection = (peerId: string) => {
    const p = peer();
    if (!p) throw new Error("PeerJS not initialized yet.");

    const conn = p.connect(peerId);
    conn.on("open", () => {
      registerConnection(conn);
    });
    conn.on("error", (err) => {
      console.error("Failed to connect to", peerId, err);
    });
  };

  const numConnections = createMemo(() => Object.keys(connections()).length);

  // Clean up on component unmount
  onCleanup(() => {
    peer()?.destroy();
  });

  return {
    peer,
    connections,
    numConnections,
    newConnection,
  };
}
