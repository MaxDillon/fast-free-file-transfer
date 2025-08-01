import { Show } from "solid-js";
import type { ReceivedFile } from "../types";

interface FileTransferProps {
  selectedFile: File | null;
  isSendingFile: boolean;
  isReceivingFile: boolean;
  fileSendProgress: number;
  fileReceiveProgress: number;
  receivedFile: ReceivedFile | null;
  expectedFileName: string;
  expectedFileSize: number | null;
  handleFileChange: (e: Event) => void;
  handleDrop: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  sendFile: () => void;
}

export default function FileTransfer(props: FileTransferProps) {
  return (
    <div class="flex flex-col gap-2 items-center">
      <div
        class="w-full border-2 border-dashed border-gray-300 rounded p-4 flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
        onDrop={props.handleDrop}
        onDragOver={props.handleDragOver}
      >
        <input
          type="file"
          class="hidden"
          id="fileInput"
          onChange={props.handleFileChange}
        />
        <label
          for="fileInput"
          class="cursor-pointer text-blue-600 font-semibold"
        >
          Click or drag and drop a file to send
        </label>
        <Show when={props.selectedFile}>
          <div class="mt-2 text-xs text-gray-700">
            Selected: {props.selectedFile ? props.selectedFile.name : ""} (
            {props.selectedFile
              ? Math.round(props.selectedFile.size / 1024)
              : 0}{" "}
            KB)
          </div>
        </Show>
      </div>
      <button
        class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-50"
        onClick={props.sendFile}
        disabled={!props.selectedFile || props.isSendingFile}
      >
        {props.isSendingFile
          ? `Sending... (${props.fileSendProgress}%)`
          : "Upload & Send File"}
      </button>
      <Show when={props.isSendingFile}>
        <div class="w-full bg-gray-200 rounded h-2 mt-2">
          <div
            class="bg-blue-500 h-2 rounded"
            style={{ width: `${props.fileSendProgress}%` }}
          ></div>
        </div>
      </Show>
      <Show when={props.isReceivingFile}>
        <div class="w-full mt-2">
          <div class="text-xs text-gray-700">
            Receiving: {props.expectedFileName} (
            {Math.round((props.expectedFileSize || 0) / 1024)} KB)
          </div>
          <div class="w-full bg-gray-200 rounded h-2 mt-1">
            <div
              class="bg-green-500 h-2 rounded"
              style={{ width: `${props.fileReceiveProgress}%` }}
            ></div>
          </div>
        </div>
      </Show>
      <Show when={props.receivedFile}>
        <div class="w-full mt-4 flex flex-col items-center">
          <div class="text-xs text-gray-700 mb-1">
            Received file: {props.receivedFile ? props.receivedFile.name : ""}
          </div>
          <a
            href={
              props.receivedFile
                ? URL.createObjectURL(props.receivedFile.blob)
                : "#"
            }
            download={props.receivedFile ? props.receivedFile.name : ""}
            class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
          >
            Download File
          </a>
        </div>
      </Show>
    </div>
  );
}
