import { Show } from "solid-js";
import type { Step } from "../types";

interface SessionManagerProps {
  step: Step;
  sessionUrl: string;
  copySuccess: string;
  error: string;
  onStartSession: () => void;
  onCopy: (text: string) => void;
  onConnect: () => void;
}

export default function SessionManager(props: SessionManagerProps) {
  return (
    <>
      {props.step === "init" && (
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
          onClick={props.onStartSession}
        >
          Start Session
        </button>
      )}
      {props.step === "share-offer" && (
        <div class="flex flex-col gap-2 items-center">
          <div class="text-center text-blue-700 font-semibold">
            Step 1: Share this link with your recipient
          </div>
          <input
            class="w-full border rounded p-2 font-mono text-xs"
            value={props.sessionUrl}
            readOnly
          />
          <button
            class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
            onClick={() => props.onCopy(props.sessionUrl)}
          >
            Copy Link
          </button>
          <Show when={props.copySuccess}>
            <span class="text-green-600 text-sm">{props.copySuccess}</span>
          </Show>
          <span class="text-xs text-gray-500">
            Recipient should open this link on their device.
          </span>
          <div class="text-center text-blue-700 font-semibold mt-4">
            Step 2: Recipient opens the link to connect
          </div>
        </div>
      )}
      {props.step === "receiver-generate" && (
        <div class="flex flex-col gap-2 items-center">
          <div class="text-center text-blue-700 font-semibold">
            Step 1: Connect to sender
          </div>
          <button
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
            onClick={props.onConnect}
          >
            Connect
          </button>
        </div>
      )}
      {props.step === "connecting" && (
        <div class="flex flex-col gap-2 items-center">
          <div class="text-center text-blue-700 font-semibold">
            Step 1: Connect to sender
          </div>
          <button
            class="bg-blue-600 text-white font-semibold py-2 px-4 rounded transition flex items-center gap-2 opacity-60 cursor-not-allowed"
            disabled
          >
            <svg
              class="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            Connecting...
          </button>
        </div>
      )}
      <Show when={props.error}>
        <div class="bg-red-100 text-red-700 p-2 rounded text-center font-semibold">
          {props.error}
        </div>
      </Show>
    </>
  );
}
