import React, { useEffect } from "react";

interface MessagePanelProps {
  message: string;
  setMessage: (msg: string) => void;
  sendMessage: () => void;
  receivedMessages: string[];
}

const MessagePanel: React.FC<MessagePanelProps> = ({
  message,
  setMessage,
  sendMessage,
  receivedMessages,
}) => {
  useEffect(() => {
    // Auto-start session logic here
  }, []);

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
          className="border px-2 py-1 rounded w-full bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors"
          type="text"
          placeholder="Type a message"
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className="bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
          onClick={sendMessage}
          disabled={!message}
        >
          Send
        </button>
      </div>
      <div className="bg-gray-100 dark:bg-zinc-800 rounded p-2 h-32 overflow-y-auto text-sm transition-colors">
        {receivedMessages.length === 0 ? (
          <span className="text-gray-400 dark:text-gray-500">
            No messages yet.
          </span>
        ) : (
          receivedMessages.map((msg, i) => (
            <div key={i} className="text-gray-900 dark:text-gray-100">
              {msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessagePanel;
