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

  // File transfer state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSendProgress, setFileSendProgress] = useState<number>(0);
  const [fileReceiveProgress, setFileReceiveProgress] = useState<number>(0);
  const [receivedFile, setReceivedFile] = useState<ReceivedFile | null>(null);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [isReceivingFile, setIsReceivingFile] = useState(false);
  const [expectedFileSize, setExpectedFileSize] = useState<number | null>(null);
  const [expectedFileName, setExpectedFileName] = useState<string>("");
  const [expectedFileType, setExpectedFileType] = useState<string>("");
  const [receivedBytes, setReceivedBytes] = useState(0);

  // Message state
  const [message, setMessage] = useState("");
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);

  // File sending logic
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        setSelectedFile(files[0]);
      }
    },
    []
  );
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const sendFile = useCallback(async () => {
    const file = selectedFile;
    const connection = peer.conn;
    if (!file || !connection || connection.open !== true) {
      peer.setError("No file selected or connection not open.");
      return;
    }
    setIsSendingFile(true);
    setFileSendProgress(0);
    // Send file meta first
    connection.send(
      JSON.stringify({
        __fileMeta: true,
        name: file.name,
        size: file.size,
        type: file.type,
      })
    );
    // Send file in chunks
    let offset = 0;
    while (offset < file.size) {
      const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      connection.send(chunk);
      offset += CHUNK_SIZE;
      setFileSendProgress(
        Math.min(100, Math.round((offset / file.size) * 100))
      );
      await new Promise((r) => setTimeout(r, 0)); // Yield to UI
    }
    setIsSendingFile(false);
    setFileSendProgress(100);
  }, [selectedFile, peer]);

  // Data connection setup for file and message transfer
  const setupDataConnection = useCallback(
    (connection: any) => {
      connection.on("data", (data: any) => {
        console.log("Received data:", data);
        // Handle rejection message
        if (typeof data === "string") {
          try {
            const obj = JSON.parse(data);
            if (obj.type === "reject" && obj.reason) {
              peer.setError(obj.reason);
              connection.close();
              return;
            }
            if (obj.__fileMeta) {
              setIsReceivingFile(true);
              setExpectedFileSize(obj.size);
              setExpectedFileName(obj.name);
              setExpectedFileType(obj.type);
              setReceivedBytes(0);
              setFileReceiveProgress(0);
              return;
            }
          } catch {}
          setReceivedMessages((prev) => [...prev, data]);
        } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
          // Receiving file chunk
          setReceivedBytes((prev) => {
            const arr =
              data instanceof Uint8Array ? data : new Uint8Array(data);
            const newReceivedBytes = receivedBytes + arr.length;
            const total = expectedFileSize;
            if (total)
              setFileReceiveProgress(
                Math.min(100, Math.round((newReceivedBytes / total) * 100))
              );
            // If file complete
            if (total && newReceivedBytes >= total) {
              const blob = new Blob([arr], { type: expectedFileType });
              setReceivedFile({
                name: expectedFileName,
                type: expectedFileType,
                blob,
              });
              setIsReceivingFile(false);
              setFileReceiveProgress(100);
              setReceivedBytes(0);
              setExpectedFileSize(null);
              setExpectedFileName("");
              setExpectedFileType("");
              return 0;
            }
            return newReceivedBytes;
          });
        }
      });
      connection.on("error", (err: any) =>
        peer.setError("Connection error: " + err)
      );
    },
    [peer, expectedFileSize, expectedFileName, expectedFileType, receivedBytes]
  );

  // Attach data connection setup when connection is established
  useEffect(() => {
    const connection = peer.conn;
    if (connection) {
      setupDataConnection(connection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer.conn]);

  // Message sending logic
  const sendMessage = useCallback(() => {
    const connection = peer.conn;
    if (connection && connection.open === true) {
      connection.send(message);
      setReceivedMessages((prev) => [...prev, `Sent: ${message}`]);
      setMessage("");
    } else {
      peer.setError("Connection is not open.");
    }
  }, [message, peer]);

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
        {peer.step === "connected" && (
          <FileTransfer
            selectedFile={selectedFile}
            isSendingFile={isSendingFile}
            isReceivingFile={isReceivingFile}
            fileSendProgress={fileSendProgress}
            fileReceiveProgress={fileReceiveProgress}
            receivedFile={receivedFile}
            expectedFileName={expectedFileName}
            expectedFileSize={expectedFileSize}
            handleFileChange={handleFileChange}
            handleDrop={handleDrop}
            handleDragOver={handleDragOver}
            sendFile={sendFile}
          />
        )}
        <hr className="my-4" />
        <MessagePanel
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage}
          receivedMessages={receivedMessages}
        />
      </header>
    </div>
  );
}
