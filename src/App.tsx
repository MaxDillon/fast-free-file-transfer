import { useState, useEffect, useCallback } from "react";
import { usePeerConnection } from "./usePeerConnection";
import SessionManager from "./components/SessionManager";
import FileTransfer from "./components/FileTransfer";
import MessagePanel from "./components/MessagePanel";
import type { ReceivedFile } from "./types";
import { FiCopy, FiTrash2, FiRefreshCw } from "react-icons/fi";

export default function App() {
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

  // Tab bar UI
  const tabIds = Object.keys(peer.connections);
  console.log("[App] peer.connections:", peer.connections);
  console.log("[App] tabIds:", tabIds);
  console.log("[App] connStates:", connStates);
  console.log("[App] activeConnId:", activeConnId);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <header className="w-full max-w-2xl bg-white rounded-lg shadow p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">
          Fast Free File Transfer
        </h1>
        <SessionManager
          step={peer.step}
          sessionUrl={peer.sessionUrl}
          copySuccess={peer.copySuccess}
          error={peer.error}
          onStartSession={peer.startSession}
          onCopy={handleCopy}
          onConnect={peer.handleConnectToPeer}
          targetPeerId={peer.targetPeerId}
          setTargetPeerId={peer.setTargetPeerId}
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
                    className={`px-4 py-2 -mb-px border-b-2 truncate max-w-[10rem] ${
                      activeConnId === id
                        ? "border-blue-600 text-blue-600 bg-white"
                        : isOpen
                        ? "border-transparent text-gray-500 bg-gray-100"
                        : "border-transparent text-gray-400 bg-gray-50 opacity-60"
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
                  className="p-2 rounded hover:bg-gray-200"
                  title="Copy ID"
                  onClick={() => handleCopy(activeConnId)}
                >
                  <FiCopy size={18} />
                </button>
                <button
                  className="p-2 rounded hover:bg-red-100 text-red-600"
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
                      className="p-2 rounded hover:bg-green-100 text-green-600"
                      title="Reload Connection"
                      onClick={() => {
                        const newConn =
                          peer.peerInstance!.connect(activeConnId);
                        peer.connections[activeConnId] = newConn;
                        setConnStates((prev) => ({ ...prev })); // force rerender
                        newConn.on("open", () => {
                          setConnStates((prev) => ({ ...prev }));
                        });
                      }}
                    >
                      <FiRefreshCw size={18} />
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
