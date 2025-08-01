import { createSignal, createEffect } from 'solid-js';
import { WebRTCConnection } from './webrtc';

function base64urlEncode(str: string) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(str: string) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

const CHUNK_SIZE = 16 * 1024; // 16KB per chunk

function App() {
  const [peerConnection, setPeerConnection] = createSignal<WebRTCConnection | null>(null);
  const [dataChannel, setDataChannel] = createSignal<RTCDataChannel | null>(null);
  const [message, setMessage] = createSignal('');
  const [receivedMessages, setReceivedMessages] = createSignal<string[]>([]);
  const [sessionUrl, setSessionUrl] = createSignal('');
  const [_isSender, setIsSender] = createSignal(false);
  const [_sessionReady, setSessionReady] = createSignal(false);
  const [sessionId, setSessionId] = createSignal('');
  const [offerObj, setOfferObj] = createSignal<any>(null);
  const [iceCandidates, setIceCandidates] = createSignal<any[]>([]);
  const [copySuccess, setCopySuccess] = createSignal('');
  const [answerCode, setAnswerCode] = createSignal('');
  const [answerInput, setAnswerInput] = createSignal('');
  const [step, setStep] = createSignal<'init'|'share-offer'|'wait-answer'|'paste-answer'|'receiver-generate'|'receiver-share'|'connected'>('init');
  const [error, setError] = createSignal('');

  // File transfer state
  const [selectedFile, setSelectedFile] = createSignal<File|null>(null);
  const [fileSendProgress, setFileSendProgress] = createSignal<number>(0);
  const [fileReceiveProgress, setFileReceiveProgress] = createSignal<number>(0);
  const [receivedFile, setReceivedFile] = createSignal<{name: string, type: string, blob: Blob}|null>(null);
  const [isSendingFile, setIsSendingFile] = createSignal(false);
  const [isReceivingFile, setIsReceivingFile] = createSignal(false);
  const [_receiveBuffer, setReceiveBuffer] = createSignal<Uint8Array[]>([]);
  const [expectedFileSize, setExpectedFileSize] = createSignal<number|null>(null);
  const [expectedFileName, setExpectedFileName] = createSignal<string>('');
  const [expectedFileType, setExpectedFileType] = createSignal<string>('');
  const [receivedBytes, setReceivedBytes] = createSignal(0);

  let iceGatheringTimeout: any = null;

  function encodeSession(offer: RTCSessionDescriptionInit, candidates: RTCIceCandidateInit[]) {
    return base64urlEncode(
      JSON.stringify({ sdp: offer, candidates })
    );
  }
  function decodeSession(session: string) {
    return JSON.parse(base64urlDecode(session));
  }

  // On mount, check for session id in URL
  createEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/session=([A-Za-z0-9_-]+)/);
    if (match) {
      setSessionId(match[1]);
      setIsSender(false);
      setStep('receiver-generate');
    }
  });

  // Sender: Start session, gather offer and ICE, encode session id
  const startSession = async () => {
    setIsSender(true);
    setSessionReady(false);
    setIceCandidates([]);
    setStep('share-offer');
    setError('');
    const pc = new WebRTCConnection({
      onIceCandidate: (candidate) => {
        setIceCandidates((prev) => [...prev, candidate]);
        if (iceGatheringTimeout) clearTimeout(iceGatheringTimeout);
        iceGatheringTimeout = setTimeout(() => {
          finalizeSession(pc);
        }, 1000);
      },
      onIceConnectionStateChange: (_state) => {},
      onDataChannel: (dc) => {
        setDataChannel(dc);
        setStep('connected');
        setupDataChannel(dc);
      },
    });
    setPeerConnection(pc);
    const dc = pc.createDataChannel('fileTransfer');
    setDataChannel(dc);
    setupDataChannel(dc);
    const offer = await pc.createOffer();
    setOfferObj(offer);
  };

  // Finalize session: encode offer and ICE, generate URL
  const finalizeSession = (_pc: WebRTCConnection) => {
    const offer = offerObj();
    const candidates = iceCandidates();
    const session = encodeSession(offer, candidates);
    const url = `${window.location.origin}${window.location.pathname}#session=${session}`;
    setSessionUrl(url);
    setSessionReady(true);
    setStep('share-offer');
  };

  // Sender: Paste answer code to complete handshake
  const handlePasteAnswer = async () => {
    try {
      const { sdp, candidates } = decodeSession(answerInput());
      const pc = peerConnection();
      if (!pc) throw new Error('Peer connection not found');
      await pc.setRemoteDescription(sdp);
      for (const cand of candidates) {
        await pc.addIceCandidate(cand);
      }
      setStep('connected');
    } catch (err) {
      setError('Failed to process answer: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Receiver: Generate answer code
  const handleGenerateAnswer = async () => {
    try {
      const { sdp, candidates } = decodeSession(sessionId());
      const pc = new WebRTCConnection({
        onIceCandidate: (_candidate) => {},
        onIceConnectionStateChange: (_state) => {},
        onDataChannel: (dc) => {
          setDataChannel(dc);
          setStep('connected');
          setupDataChannel(dc);
        },
      });
      setPeerConnection(pc);
      await pc.setRemoteDescription(sdp);
      for (const cand of candidates) {
        await pc.addIceCandidate(cand);
      }
      const answer = await pc.createAnswer(sdp);
      // Gather ICE for answer
      let answerCandidates: RTCIceCandidateInit[] = [];
      await new Promise<void>((resolve) => {
        pc.getPeerConnection().onicecandidate = (event) => {
          if (event.candidate) {
            answerCandidates.push(event.candidate);
          } else {
            resolve();
          }
        };
        setTimeout(resolve, 1000);
      });
      const answerSession = encodeSession(answer, answerCandidates);
      setAnswerCode(answerSession);
      setStep('receiver-share');
    } catch (err) {
      setError('Failed to generate answer: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Data channel setup for file and message transfer
  function setupDataChannel(dc: RTCDataChannel) {
    dc.onmessage = (e) => {
      // File transfer protocol: JSON header for file, then binary chunks
      if (typeof e.data === 'string') {
        try {
          const obj = JSON.parse(e.data);
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
        setReceivedMessages((prev) => [...prev, e.data]);
      } else if (e.data instanceof ArrayBuffer) {
        // Receiving file chunk
        setReceiveBuffer((prev) => {
          const arr = new Uint8Array(e.data);
          setReceivedBytes((bytes) => bytes + arr.length);
          const total = expectedFileSize();
          if (total) setFileReceiveProgress((_bytes) => Math.min(100, Math.round(((receivedBytes() + arr.length) / total) * 100)));
          // If file complete
          if (total && receivedBytes() + arr.length >= total) {
            const all = [...prev, arr];
            const blob = new Blob(all, { type: expectedFileType() });
            setReceivedFile({ name: expectedFileName(), type: expectedFileType(), blob });
            setIsReceivingFile(false);
            setFileReceiveProgress(100);
            setReceiveBuffer([]);
            setExpectedFileSize(null);
            setExpectedFileName('');
            setExpectedFileType('');
            setReceivedBytes(0);
            return [];
          }
          return [...prev, arr];
        });
      }
    };
  }

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
    const dc = dataChannel();
    if (!file || !dc || dc.readyState !== 'open') {
      setError('No file selected or data channel not open.');
      return;
    }
    setIsSendingFile(true);
    setFileSendProgress(0);
    // Send file meta first
    dc.send(JSON.stringify({ __fileMeta: true, name: file.name, size: file.size, type: file.type }));
    // Send file in chunks
    let offset = 0;
    while (offset < file.size) {
      const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      dc.send(chunk);
      offset += CHUNK_SIZE;
      setFileSendProgress(Math.min(100, Math.round((offset / file.size) * 100)));
      await new Promise((r) => setTimeout(r, 0)); // Yield to UI
    }
    setIsSendingFile(false);
    setFileSendProgress(100);
  };

  const sendMessage = () => {
    const dc = dataChannel();
    if (dc && dc.readyState === 'open') {
      dc.send(message());
      setReceivedMessages((prev) => [...prev, `Sent: ${message()}`]);
      setMessage('');
    } else {
      setError('Data channel is not open.');
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 1500);
    } catch {
      setCopySuccess('Failed to copy');
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <header class="w-full max-w-2xl bg-white rounded-lg shadow p-8 flex flex-col gap-6">
        <h1 class="text-3xl font-bold text-center text-blue-600 mb-2">Fast Free File Transfer</h1>
        {error() && <div class="bg-red-100 text-red-700 p-2 rounded text-center font-semibold">{error()}</div>}
        {step() === 'init' && (
          <button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition" onClick={startSession}>
            Start Session
          </button>
        )}
        {step() === 'share-offer' && (
          <div class="flex flex-col gap-2 items-center">
            <div class="text-center text-blue-700 font-semibold">Step 1: Share this link with your recipient</div>
            <input class="w-full border rounded p-2 font-mono text-xs" value={sessionUrl()} readOnly />
            <button class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition" onClick={() => handleCopy(sessionUrl())}>
              Copy Link
            </button>
            {copySuccess() && <span class="text-green-600 text-sm">{copySuccess()}</span>}
            <span class="text-xs text-gray-500">Recipient should open this link on their device.</span>
            <div class="text-center text-blue-700 font-semibold mt-4">Step 2: Wait for recipient to send you their code</div>
            <textarea class="w-full border rounded p-2 font-mono text-xs" value={answerInput()} onInput={e => setAnswerInput(e.currentTarget.value)} rows={4} placeholder="Paste recipient's code here" />
            <button class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition" onClick={handlePasteAnswer}>
              Complete Connection
            </button>
          </div>
        )}
        {step() === 'receiver-generate' && (
          <div class="flex flex-col gap-2 items-center">
            <div class="text-center text-blue-700 font-semibold">Step 1: Generate your response code</div>
            <button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition" onClick={handleGenerateAnswer}>
              Generate Code
            </button>
          </div>
        )}
        {step() === 'receiver-share' && (
          <div class="flex flex-col gap-2 items-center">
            <div class="text-center text-blue-700 font-semibold">Step 2: Copy this code and send it back to the sender</div>
            <textarea class="w-full border rounded p-2 font-mono text-xs" value={answerCode()} readOnly rows={4} />
            <button class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition" onClick={() => handleCopy(answerCode())}>
              Copy Code
            </button>
            {copySuccess() && <span class="text-green-600 text-sm">{copySuccess()}</span>}
            <span class="text-xs text-gray-500">Sender should paste this code into their app to complete the connection.</span>
          </div>
        )}
        {step() === 'connected' && (
          <div class="flex flex-col gap-2 items-center">
            <div class="text-center text-green-700 font-semibold">Connected! You can now send messages or files.</div>
            {/* File transfer UI */}
            <div
              class="w-full border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                class="hidden"
                id="fileInput"
                onChange={handleFileChange}
              />
              <label for="fileInput" class="cursor-pointer text-blue-600 font-semibold">Click or drag and drop a file to send</label>
              {selectedFile() && (
                <div class="mt-2 text-xs text-gray-700">Selected: {selectedFile() ? selectedFile()!.name : ''} ({selectedFile() ? Math.round(selectedFile()!.size/1024) : 0} KB)</div>
              )}
            </div>
            <button
              class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50"
              onClick={sendFile}
              disabled={!selectedFile() || isSendingFile()}
            >
              {isSendingFile() ? `Sending... (${fileSendProgress()}%)` : 'Upload & Send File'}
            </button>
            {isSendingFile() && (
              <div class="w-full bg-gray-200 rounded h-2 mt-2">
                <div class="bg-blue-500 h-2 rounded" style={{ width: `${fileSendProgress()}%` }}></div>
              </div>
            )}
            {isReceivingFile() && (
              <div class="w-full mt-2">
                <div class="text-xs text-gray-700">Receiving: {expectedFileName()} ({Math.round((expectedFileSize()||0)/1024)} KB)</div>
                <div class="w-full bg-gray-200 rounded h-2 mt-1">
                  <div class="bg-green-500 h-2 rounded" style={{ width: `${fileReceiveProgress()}%` }}></div>
                </div>
              </div>
            )}
            {receivedFile() && (
              <div class="w-full mt-4 flex flex-col items-center">
                <div class="text-xs text-gray-700 mb-1">Received file: {receivedFile() ? receivedFile()!.name : ''}</div>
                <a
                  href={receivedFile() ? URL.createObjectURL(receivedFile()!.blob) : '#'}
                  download={receivedFile() ? receivedFile()!.name : ''}
                  class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        )}
        <hr class="my-4" />
        <h2 class="text-lg font-semibold">Data Channel Communication</h2>
        <div class="flex gap-2 items-center">
          <input
            type="text"
            class="flex-1 border rounded p-2"
            value={message()}
            onInput={(e) => setMessage(e.currentTarget.value)}
            placeholder="Type a message"
          />
          <button class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition" onClick={sendMessage}>Send Message</button>
        </div>
        <div>
          <h3 class="font-semibold mt-4 mb-2">Received Messages:</h3>
          <ul class="bg-gray-100 rounded p-2 min-h-[40px]">
            {receivedMessages().map((msg) => (
              <li class="text-xs font-mono py-0.5">{msg}</li>
            ))}
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;
