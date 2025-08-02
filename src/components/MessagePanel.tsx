import React from "react";

interface MessagePanelProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => void;
  receivedMessages: string[];
}

const MessagePanel: React.FC<MessagePanelProps> = ({
  message,
  setMessage,
  sendMessage,
  receivedMessages,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className="border px-2 py-1 rounded w-full"
          type="text"
          placeholder="Type a message"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={sendMessage}
          disabled={!message}
        >
          Send
        </button>
      </div>
      <div className="bg-gray-100 rounded p-2 h-32 overflow-y-auto text-sm">
        {receivedMessages.length === 0 ? (
          <span className="text-gray-400">No messages yet.</span>
        ) : (
          receivedMessages.map((msg, i) => <div key={i}>{msg}</div>)
        )}
      </div>
    </div>
  );
};

export default MessagePanel;
