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
  onDismissError?: () => void;
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
  onDismissError,
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
        <div className="relative bg-red-100 text-red-700 p-2 rounded text-center flex items-center justify-center">
          <span className="flex-1">{error}</span>
          {onDismissError && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-700 hover:text-red-900 focus:outline-none"
              onClick={onDismissError}
              title="Dismiss error"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
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
            disabled={step === "connecting"}
          />
          <button
            className={
              "relative bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center justify-center min-w-[90px] min-h-[36px]" +
              (step === "connecting" ? " opacity-60 cursor-not-allowed" : "")
            }
            onClick={() => onConnect(targetPeerId)}
            disabled={!targetPeerId || !!inputError || step === "connecting"}
          >
            {step === "connecting" ? (
              <span className="flex items-center justify-center w-full h-[22px]">
                <span className="inline-block w-5 h-5 border-2 border-white border-t-blue-400 dark:border-t-blue-300 border-t-2 rounded-full animate-spin"></span>
              </span>
            ) : (
              <span className="inline-block h-[22px] leading-[22px]">
                Connect
              </span>
            )}
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
