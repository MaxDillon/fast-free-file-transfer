import { useState, useEffect, useCallback } from "react";
import { usePeerConnection } from "./usePeerConnection";
import SessionManager from "./components/SessionManager";
import FileTransfer from "./components/FileTransfer";
import MessagePanel from "./components/MessagePanel";
import type { ReceivedFile } from "./types";
import { FiCopy, FiTrash2, FiRefreshCw, FiSun, FiMoon } from "react-icons/fi";

export default function App() {
  // Theme state
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const [theme, setTheme] = useState<string>(() => {
    const stored = localStorage.getItem("theme");
    return stored || getSystemTheme();
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Peer connection/session state
  const peer = usePeerConnection();

  // Tab state for active connection
  const [activeConnId, setActiveConnId] = useState<string | null>(null);
  // Per-connection state
  const [connStates, setConnStates] = useState<
    Record<
      string,
      {
        selectedFile: File | null;
        fileSendProgress: number;
        fileReceiveProgress: number;
        receivedFile: ReceivedFile | null;
        isSendingFile: boolean;
        isReceivingFile: boolean;
        expectedFileSize: number | null;
        expectedFileName: string;
        expectedFileType: string;
        receivedBytes: number;
        message: string;
        receivedMessages: string[];
      }
    >
  >({});

  // Error state
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Tab bar UI
  const tabIds = Object.keys(peer.connections);

  // When a new connection is added, initialize its state and select it if it's the first
  useEffect(() => {
    if (tabIds.length > 0) {
      // Only add state for new connections
      const missingIds = tabIds.filter((id) => !(id in connStates));
      if (missingIds.length > 0) {
        setConnStates((prev) => {
          const next = { ...prev };
          missingIds.forEach((id) => {
            next[id] = {
              selectedFile: null,
              fileSendProgress: 0,
              fileReceiveProgress: 0,
              receivedFile: null,
              isSendingFile: false,
              isReceivingFile: false,
              expectedFileSize: null,
              expectedFileName: "",
              expectedFileType: "",
              receivedBytes: 0,
              message: "",
              receivedMessages: [],
            };
          });
          return next;
        });
      }
      if (!activeConnId) setActiveConnId(tabIds[0]);
    }
  }, [tabIds]);

  // Data connection setup for file and message transfer (per connection)
  useEffect(() => {
    tabIds.forEach((id) => {
      const connection = peer.connections[id];
      if (!connection) return;
      if ((connection as any)._handlersSet) return;
      (connection as any)._handlersSet = true;
      connection.on("data", async (data: any) => {
        // Handle file transfer (single message, not chunked)
        if (data && data.file && data.filename && data.filetype) {
          // If file is sent as ArrayBuffer, reconstruct Blob
          const blob = new Blob([data.file], { type: data.filetype });
          setConnStates((prev) => ({
            ...prev,
            [id]: {
              ...prev[id],
              receivedFile: {
                name: data.filename,
                type: data.filetype,
                blob,
              },
              isReceivingFile: false,
              fileReceiveProgress: 100,
            },
          }));
          return;
        }
        // Handle file metadata (legacy chunked logic, can be removed if not needed)
        if (typeof data === "string") {
          try {
            const obj = JSON.parse(data);
            if (obj.type === "reject" && obj.reason) {
              peer.setError(obj.reason);
              connection.close();
              return;
            }
          } catch {}
          setConnStates((prev) => ({
            ...prev,
            [id]: {
              ...prev[id],
              receivedMessages: [...prev[id].receivedMessages, data],
            },
          }));
        }
      });
      connection.on("error", (err: any) => {
        console.error(`[App] Connection error for ${id}:`, err);
        peer.setError("Connection error: " + err);
      });
      connection.on("close", () => {
        console.log(`[App] Connection closed: ${id}`);
      });
      connection.on("open", () => {
        console.log(`[App] Connection open: ${id}`);
      });
    });
    // eslint-disable-next-line
  }, [tabIds, peer.connections]);

  // File sending logic (per connection, single message)
  const sendFile = useCallback(
    async (connId: string) => {
      const file = connStates[connId]?.selectedFile;
      const connection = peer.connections[connId];
      if (!file || !connection || connection.open !== true) {
        peer.setError("No file selected or connection not open.");
        return;
      }
      setConnStates((prev) => ({
        ...prev,
        [connId]: { ...prev[connId], isSendingFile: true, fileSendProgress: 0 },
      }));
      // Read file as ArrayBuffer and send as a single message
      const arrayBuffer = await file.arrayBuffer();
      connection.send({
        file: arrayBuffer,
        filename: file.name,
        filetype: file.type,
      });
      setConnStates((prev) => ({
        ...prev,
        [connId]: {
          ...prev[connId],
          isSendingFile: false,
          fileSendProgress: 100,
        },
      }));
    },
    [connStates, peer.connections]
  );

  // Message sending logic (per connection)
  const sendMessage = useCallback(
    (connId: string) => {
      const connection = peer.connections[connId];
      if (connection && connection.open === true) {
        setConnStates((prev) => ({
          ...prev,
          [connId]: {
            ...prev[connId],
            receivedMessages: [
              ...prev[connId].receivedMessages,
              `Sent: ${prev[connId].message}`,
            ],
            message: "",
          },
        }));
        connection.send(connStates[connId].message);
      } else {
        peer.setError("Connection is not open.");
      }
    },
    [connStates, peer.connections]
  );

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        peer.setCopySuccess("Copied!");
        setTimeout(() => peer.setCopySuccess(""), 1500);
      } catch {
        peer.setCopySuccess("Failed to copy");
      }
    },
    [peer]
  );

  useEffect(() => {
    if (peer.error) setErrorDismissed(false);
  }, [peer.error]);

  const [refreshingConnId, setRefreshingConnId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex flex-col items-center py-8 transition-colors">
      <header className="w-full max-w-2xl bg-white dark:bg-zinc-800 rounded-lg shadow p-8 flex flex-col gap-6 transition-colors">
        <div className="relative flex items-center mb-2 min-h-[2.5rem]">
          <h1 className="absolute left-1/2 -translate-x-1/2 text-3xl font-bold text-blue-600 dark:text-blue-400 text-center w-max pointer-events-none select-none">
            Fast Free File Transfer
          </h1>
          <button
            className="ml-auto px-3 py-1 rounded bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors z-10"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? <FiMoon size={20} /> : <FiSun size={20} />}
          </button>
        </div>
        <SessionManager
          step={peer.step}
          sessionUrl={peer.sessionUrl}
          copySuccess={peer.copySuccess}
          error={!errorDismissed ? peer.error : ""}
          onStartSession={peer.startSession}
          onCopy={handleCopy}
          onCopyUuid={async (uuid) => {
            try {
              await navigator.clipboard.writeText(uuid);
              peer.setCopySuccess("Copied!");
              setTimeout(() => peer.setCopySuccess(""), 1500);
            } catch {
              peer.setCopySuccess("Failed to copy");
            }
          }}
          onConnect={peer.handleConnectToPeer}
          targetPeerId={peer.targetPeerId}
          setTargetPeerId={peer.setTargetPeerId}
          onDismissError={() => setErrorDismissed(true)}
          peerId={peer.peerId}
        />
        {tabIds.length > 0 && (
          <div className="flex flex-col w-full">
            <div className="flex border-b mb-4">
              {tabIds.map((id) => {
                const connection = peer.connections[id];
                const isOpen = connection && connection.open === true;
                return (
                  <button
                    key={id}
                    title={id}
                    className={`px-4 py-2 -mb-px border-b-2 truncate max-w-[10rem] transition-colors ${
                      activeConnId === id
                        ? "border-blue-600 text-blue-600 bg-white dark:bg-zinc-800 dark:text-blue-400"
                        : isOpen
                        ? "border-transparent text-gray-500 bg-gray-100 dark:bg-zinc-900 dark:text-gray-300"
                        : "border-transparent text-gray-400 bg-gray-50 dark:bg-zinc-900 opacity-60 dark:text-gray-500"
                    }`}
                    onClick={() => setActiveConnId(id)}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {id.slice(0, 8)}...
                  </button>
                );
              })}
            </div>
            {/* Tab action buttons inside active tab window */}
            {activeConnId && connStates[activeConnId] && (
              <div className="flex flex-row gap-2 mb-4 items-center self-end">
                <button
                  className="p-2 rounded bg-white dark:bg-zinc-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
                  title="Copy ID"
                  onClick={() => handleCopy(activeConnId)}
                >
                  <FiCopy size={18} />
                </button>
                <button
                  // Previous: bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700
                  className="p-2 rounded bg-white dark:bg-zinc-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
                  title="Delete Tab"
                  onClick={() => {
                    const connection = peer.connections[activeConnId];
                    if (connection && connection.open) connection.close();
                    setConnStates((prev) => {
                      const next = { ...prev };
                      delete next[activeConnId];
                      return next;
                    });
                    // Remove from peer.connections
                    delete peer.connections[activeConnId];
                    // Remove from sessionStorage
                    const stored = sessionStorage.getItem("connectedPeerIds");
                    if (stored) {
                      try {
                        const arr = JSON.parse(stored).filter(
                          (pid: string) => pid !== activeConnId
                        );
                        sessionStorage.setItem(
                          "connectedPeerIds",
                          JSON.stringify(arr)
                        );
                      } catch {}
                    }
                    // Switch to another tab if needed
                    const others = tabIds.filter((tid) => tid !== activeConnId);
                    setActiveConnId(others[0] || null);
                  }}
                >
                  <FiTrash2 size={18} />
                </button>
                {peer.peerInstance &&
                  peer.connections[activeConnId] &&
                  peer.connections[activeConnId].open !== true && (
                    <button
                      // Previous: bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700
                      className="p-2 rounded bg-white dark:bg-zinc-700 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors relative"
                      title="Reload Connection"
                      onClick={async () => {
                        setRefreshingConnId(activeConnId);
                        const newConn =
                          peer.peerInstance!.connect(activeConnId);
                        peer.connections[activeConnId] = newConn;
                        setConnStates((prev) => ({ ...prev })); // force rerender
                        await new Promise<void>((resolve) => {
                          newConn.on("open", () => {
                            setConnStates((prev) => ({ ...prev }));
                            setRefreshingConnId(null);
                            resolve();
                          });
                          newConn.on("error", () => {
                            setRefreshingConnId(null);
                            resolve();
                          });
                        });
                      }}
                      disabled={refreshingConnId === activeConnId}
                    >
                      <FiRefreshCw
                        size={18}
                        className={
                          refreshingConnId === activeConnId
                            ? "animate-spin"
                            : ""
                        }
                      />
                    </button>
                  )}
              </div>
            )}
            {activeConnId && connStates[activeConnId] && (
              <div className="flex flex-col gap-6">
                <FileTransfer
                  selectedFile={connStates[activeConnId].selectedFile}
                  isSendingFile={connStates[activeConnId].isSendingFile}
                  isReceivingFile={connStates[activeConnId].isReceivingFile}
                  fileSendProgress={connStates[activeConnId].fileSendProgress}
                  fileReceiveProgress={
                    connStates[activeConnId].fileReceiveProgress
                  }
                  receivedFile={connStates[activeConnId].receivedFile}
                  expectedFileName={connStates[activeConnId].expectedFileName}
                  expectedFileSize={connStates[activeConnId].expectedFileSize}
                  handleFileChange={(e) => {
                    const files = e.target.files;
                    setConnStates((prev) => ({
                      ...prev,
                      [activeConnId]: {
                        ...prev[activeConnId],
                        selectedFile: files && files[0] ? files[0] : null,
                      },
                    }));
                  }}
                  handleDrop={(e) => {
                    e.preventDefault();
                    if (
                      e.dataTransfer &&
                      e.dataTransfer.files &&
                      e.dataTransfer.files[0]
                    ) {
                      setConnStates((prev) => ({
                        ...prev,
                        [activeConnId]: {
                          ...prev[activeConnId],
                          selectedFile: e.dataTransfer.files[0],
                        },
                      }));
                    }
                  }}
                  handleDragOver={(e) => e.preventDefault()}
                  sendFile={() => sendFile(activeConnId)}
                />
                <MessagePanel
                  message={connStates[activeConnId].message}
                  setMessage={(msg: string) =>
                    setConnStates((prev) => ({
                      ...prev,
                      [activeConnId]: { ...prev[activeConnId], message: msg },
                    }))
                  }
                  sendMessage={() => sendMessage(activeConnId)}
                  receivedMessages={connStates[activeConnId].receivedMessages}
                />
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}
