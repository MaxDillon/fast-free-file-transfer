import React from "react";

interface SessionManagerProps {
  step: string;
  sessionUrl: string;
  copySuccess: string;
  error: string;
  onStartSession: () => void;
  onCopy: (text: string) => void;
  onConnect: (peerId: string) => void;
  targetPeerId: string;
  setTargetPeerId: (id: string) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  step,
  sessionUrl,
  copySuccess,
  error,
  onStartSession,
  onCopy,
  onConnect,
  targetPeerId,
  setTargetPeerId,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded text-center">
          {error}
        </div>
      )}
      {step === "init" && (
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={onStartSession}
        >
          Start New Session
        </button>
      )}
      {(step === "waiting" ||
        step === "share-offer" ||
        step === "receiver-generate") && (
        <div className="flex flex-col gap-2 items-center">
          <div className="text-gray-700">Share this link to connect:</div>
          <div className="flex gap-2 items-center">
            <input
              className="border px-2 py-1 rounded w-full"
              value={sessionUrl}
              readOnly
            />
            <button
              className="bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              onClick={() => onCopy(sessionUrl)}
            >
              Copy
            </button>
          </div>
          {copySuccess && <span className="text-green-600">{copySuccess}</span>}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-500">or</span>
            <input
              className="border px-2 py-1 rounded"
              placeholder="Enter peer ID"
              value={targetPeerId}
              onChange={(e) => setTargetPeerId(e.target.value)}
            />
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              onClick={() => onConnect(targetPeerId)}
              disabled={!targetPeerId}
            >
              Connect
            </button>
          </div>
        </div>
      )}
      {step === "connected" && (
        <div className="text-green-700 text-center font-semibold">
          Connected!
        </div>
      )}
    </div>
  );
};

export default SessionManager;
