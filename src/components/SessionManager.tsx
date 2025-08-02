import React, { useEffect, useState } from "react";

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
  // Automatically start a session on mount if not already started
  useEffect(() => {
    if (step === "init") {
      onStartSession();
    }
    // eslint-disable-next-line
  }, [step]);

  // Store the last connected peer UUID in sessionStorage
  useEffect(() => {
    if (step === "connected" && targetPeerId) {
      sessionStorage.setItem("lastConnectedPeerId", targetPeerId);
    }
  }, [step, targetPeerId]);

  // On mount, if not already set, restore the peer id from sessionStorage
  useEffect(() => {
    if (!targetPeerId) {
      const last = sessionStorage.getItem("lastConnectedPeerId");
      if (last) setTargetPeerId(last);
    }
    // eslint-disable-next-line
  }, []);

  // UUID v4 regex
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const [inputError, setInputError] = useState("");

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded text-center">
          {error}
        </div>
      )}
      {/* Connection controls always visible */}
      <div className="flex flex-col gap-2 items-center">
        <div className="text-gray-700 dark:text-gray-200">
          Share this link to connect:
        </div>
        <div className="flex gap-2 items-center">
          <input
            className="border px-2 py-1 rounded w-full bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors"
            value={sessionUrl}
            readOnly
          />
          <button
            className="bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
            onClick={() => onCopy(sessionUrl)}
          >
            Copy
          </button>
        </div>
        {copySuccess && (
          <span className="text-green-600 dark:text-green-400">
            {copySuccess}
          </span>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-500 dark:text-gray-400">or</span>
          <input
            className={`border px-2 py-1 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors ${
              inputError ? "border-red-400" : ""
            }`}
            placeholder="Enter peer ID"
            value={targetPeerId}
            onChange={(e) => {
              const val = e.target.value;
              setTargetPeerId(val);
              if (val && !uuidV4Regex.test(val)) {
                setInputError("Invalid UUID format");
              } else {
                setInputError("");
              }
            }}
          />
          <button
            className="bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            onClick={() => onConnect(targetPeerId)}
            disabled={!targetPeerId || !!inputError}
          >
            Connect
          </button>
        </div>
        {inputError && (
          <div className="text-red-500 dark:text-red-400 text-xs mt-1">
            {inputError}
          </div>
        )}
      </div>
      {step === "connected" && (
        <div className="text-green-700 text-center font-semibold">
          Connected!
        </div>
      )}
    </div>
  );
};

export default SessionManager;
