import { createSignal, createEffect } from "solid-js";
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
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [fileSendProgress, setFileSendProgress] = createSignal<number>(0);
  const [fileReceiveProgress, setFileReceiveProgress] = createSignal<number>(0);
  const [receivedFile, setReceivedFile] = createSignal<ReceivedFile | null>(
    null
  );
  const [isSendingFile, setIsSendingFile] = createSignal(false);
  const [isReceivingFile, setIsReceivingFile] = createSignal(false);
  const [_receiveBuffer, setReceiveBuffer] = createSignal<Uint8Array[]>([]);
  const [expectedFileSize, setExpectedFileSize] = createSignal<number | null>(
    null
  );
  const [expectedFileName, setExpectedFileName] = createSignal<string>("");
  const [expectedFileType, setExpectedFileType] = createSignal<string>("");
  const [receivedBytes, setReceivedBytes] = createSignal(0);

  // Message state
  const [message, setMessage] = createSignal("");
  const [receivedMessages, setReceivedMessages] = createSignal<string[]>([]);

  // File sending logic
  const handleFileChange = (e: Event) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const sendFile = async () => {
    const file = selectedFile();
    const connection = peer.conn();
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
  };

  // Data connection setup for file and message transfer
  function setupDataConnection(connection: any) {
    connection.on("data", (data: any) => {
      // File transfer protocol: JSON header for file, then binary chunks
      if (typeof data === "string") {
        try {
          const obj = JSON.parse(data);
          if (obj.__fileMeta) {
            setIsReceivingFile(true);
            setExpectedFileSize(obj.size);
            setExpectedFileName(obj.name);
            setExpectedFileType(obj.type);
            setReceiveBuffer([]);
            setReceivedBytes(0);
            setFileReceiveProgress(0);
            return;
          }
        } catch {}
        setReceivedMessages((prev) => [...prev, data]);
      } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        // Receiving file chunk
        setReceiveBuffer((prev) => {
          const arr = data instanceof Uint8Array ? data : new Uint8Array(data);
          setReceivedBytes((bytes) => bytes + arr.length);
          const total = expectedFileSize();
          if (total)
            setFileReceiveProgress((_bytes) =>
              Math.min(
                100,
                Math.round(((receivedBytes() + arr.length) / total) * 100)
              )
            );
          // If file complete
          if (total && receivedBytes() + arr.length >= total) {
            const all = [...prev, arr];
            const blob = new Blob(all, { type: expectedFileType() });
            setReceivedFile({
              name: expectedFileName(),
              type: expectedFileType(),
              blob,
            });
            setIsReceivingFile(false);
            setFileReceiveProgress(100);
            setReceiveBuffer([]);
            setExpectedFileSize(null);
            setExpectedFileName("");
            setExpectedFileType("");
            setReceivedBytes(0);
            return [];
          }
          return [...prev, arr];
        });
      }
    });
    connection.on("error", (err: any) =>
      peer.setError("Connection error: " + err)
    );
  }

  // Attach data connection setup when connection is established
  createEffect(() => {
    const connection = peer.conn();
    if (connection) {
      setupDataConnection(connection);
    }
  });

  // Message sending logic
  const sendMessage = () => {
    const connection = peer.conn();
    if (connection && connection.open === true) {
      connection.send(message());
      setReceivedMessages((prev) => [...prev, `Sent: ${message()}`]);
      setMessage("");
    } else {
      peer.setError("Connection is not open.");
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      peer.setCopySuccess("Copied!");
      setTimeout(() => peer.setCopySuccess(""), 1500);
    } catch {
      peer.setCopySuccess("Failed to copy");
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <header class="w-full max-w-2xl bg-white rounded-lg shadow p-8 flex flex-col gap-6">
        <h1 class="text-3xl font-bold text-center text-blue-600 mb-2">
          Fast Free File Transfer
        </h1>
        <SessionManager
          step={peer.step()}
          sessionUrl={peer.sessionUrl()}
          copySuccess={peer.copySuccess()}
          error={peer.error()}
          onStartSession={peer.startSession}
          onCopy={handleCopy}
          onConnect={peer.handleConnectToPeer}
        />
        {peer.step() === "connected" && (
          <FileTransfer
            selectedFile={selectedFile()}
            isSendingFile={isSendingFile()}
            isReceivingFile={isReceivingFile()}
            fileSendProgress={fileSendProgress()}
            fileReceiveProgress={fileReceiveProgress()}
            receivedFile={receivedFile()}
            expectedFileName={expectedFileName()}
            expectedFileSize={expectedFileSize()}
            handleFileChange={handleFileChange}
            handleDrop={handleDrop}
            handleDragOver={handleDragOver}
            sendFile={sendFile}
          />
        )}
        <hr class="my-4" />
        <MessagePanel
          message={message()}
          setMessage={setMessage}
          sendMessage={sendMessage}
          receivedMessages={receivedMessages()}
        />
      </header>
    </div>
  );
}
