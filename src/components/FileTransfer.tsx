import React from "react";
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
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  sendFile: () => void;
}

const FileTransfer: React.FC<FileTransferProps> = ({
  selectedFile,
  isSendingFile,
  isReceivingFile,
  fileSendProgress,
  fileReceiveProgress,
  receivedFile,
  expectedFileName,
  expectedFileSize,
  handleFileChange,
  handleDrop,
  handleDragOver,
  sendFile,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="border-2 border-dashed rounded p-4 text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          className="hidden"
          id="file-input"
          onChange={handleFileChange}
        />
        <label htmlFor="file-input" className="cursor-pointer block">
          {selectedFile ? (
            <span className="font-medium">Selected: {selectedFile.name}</span>
          ) : (
            <span className="text-gray-500">
              Drag & drop or click to select a file
            </span>
          )}
        </label>
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={sendFile}
        disabled={!selectedFile || isSendingFile || isReceivingFile}
      >
        {isSendingFile ? "Sending..." : "Send File"}
      </button>
      {isSendingFile && (
        <div className="w-full bg-gray-200 rounded h-3">
          <div
            className="bg-blue-500 h-3 rounded"
            style={{ width: `${fileSendProgress}%` }}
          ></div>
        </div>
      )}
      {isReceivingFile && expectedFileName && expectedFileSize && (
        <div className="w-full bg-gray-200 rounded h-3">
          <div
            className="bg-green-500 h-3 rounded"
            style={{ width: `${fileReceiveProgress}%` }}
          ></div>
        </div>
      )}
      {receivedFile && (
        <div className="flex flex-col items-center gap-2">
          <span className="font-medium">Received: {receivedFile.name}</span>
          <a
            href={URL.createObjectURL(receivedFile.blob)}
            download={receivedFile.name}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
};

export default FileTransfer;
