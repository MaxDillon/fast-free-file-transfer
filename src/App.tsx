import React, { useState, useEffect, useCallback } from "react";
import { usePeerConnection } from "./usePeerConnection";
import SessionManager from "./components/SessionManager";
import FileTransfer from "./components/FileTransfer";
import MessagePanel from "./components/MessagePanel";
import type { ReceivedFile } from "./types";

const CHUNK_SIZE = 16 * 1024;

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

  // When a new connection is added, initialize its state and select it if it's the first
  useEffect(() => {
    if (tabIds.length > 0) {
      setConnStates((prev) => {
        const next = { ...prev };
        tabIds.forEach((id) => {
          if (!next[id]) {
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
          }
        });
        return next;
      });
      if (!activeConnId) setActiveConnId(tabIds[0]);
    }
  }, [tabIds]);

  // Data connection setup for file and message transfer (per connection)
  useEffect(() => {
    tabIds.forEach((id) => {
      const connection = peer.connections[id];
      if (!connection) return;
      // Only set up once per connection
      if ((connection as any)._handlersSet) return;
      (connection as any)._handlersSet = true;
      connection.on("data", (data: any) => {
        if (typeof data === "string") {
          try {
            const obj = JSON.parse(data);
            if (obj.type === "reject" && obj.reason) {
              peer.setError(obj.reason);
              connection.close();
              return;
            }
            if (obj.__fileMeta) {
              setConnStates((prev) => ({
                ...prev,
                [id]: {
                  ...prev[id],
                  isReceivingFile: true,
                  expectedFileSize: obj.size,
                  expectedFileName: obj.name,
                  expectedFileType: obj.type,
                  receivedBytes: 0,
                  fileReceiveProgress: 0,
                },
              }));
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
        } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          setConnStates((prev) => {
            const arr =
              data instanceof Uint8Array ? data : new Uint8Array(data);
            const newReceivedBytes = prev[id].receivedBytes + arr.length;
            const total = prev[id].expectedFileSize;
            let fileReceiveProgress = prev[id].fileReceiveProgress;
            let isReceivingFile = prev[id].isReceivingFile;
            let receivedFile = prev[id].receivedFile;
            let expectedFileSize = prev[id].expectedFileSize;
            let expectedFileName = prev[id].expectedFileName;
            let expectedFileType = prev[id].expectedFileType;
            if (total)
              fileReceiveProgress = Math.min(
                100,
                Math.round((newReceivedBytes / total) * 100)
              );
            // If file complete
            if (total && newReceivedBytes >= total) {
              const blob = new Blob([arr], { type: expectedFileType });
              receivedFile = {
                name: expectedFileName,
                type: expectedFileType,
                blob,
              };
              isReceivingFile = false;
              fileReceiveProgress = 100;
              expectedFileSize = null;
              expectedFileName = "";
              expectedFileType = "";
              return {
                ...prev,
                [id]: {
                  ...prev[id],
                  receivedBytes: 0,
                  fileReceiveProgress,
                  isReceivingFile,
                  receivedFile,
                  expectedFileSize,
                  expectedFileName,
                  expectedFileType,
                },
              };
            }
            return {
              ...prev,
              [id]: {
                ...prev[id],
                receivedBytes: newReceivedBytes,
                fileReceiveProgress,
              },
            };
          });
        }
      });
      connection.on("error", (err: any) =>
        peer.setError("Connection error: " + err)
      );
    });
    // eslint-disable-next-line
  }, [tabIds, peer.connections]);

  // File sending logic (per connection)
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
      connection.send(
        JSON.stringify({
          __fileMeta: true,
          name: file.name,
          size: file.size,
          type: file.type,
        })
      );
      let offset = 0;
      while (offset < file.size) {
        const chunk = await file
          .slice(offset, offset + CHUNK_SIZE)
          .arrayBuffer();
        connection.send(chunk);
        offset += CHUNK_SIZE;
        setConnStates((prev) => ({
          ...prev,
          [connId]: {
            ...prev[connId],
            fileSendProgress: Math.min(
              100,
              Math.round((offset / file.size) * 100)
            ),
          },
        }));
        await new Promise((r) => setTimeout(r, 0));
      }
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
              {tabIds.map((id) => (
                <button
                  key={id}
                  title={id}
                  className={`px-4 py-2 -mb-px border-b-2 truncate max-w-[10rem] ${
                    activeConnId === id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500"
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
              ))}
            </div>
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
