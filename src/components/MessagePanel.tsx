interface MessagePanelProps {
  message: string;
  setMessage: (v: string) => void;
  sendMessage: () => void;
  receivedMessages: string[];
}

export default function MessagePanel(props: MessagePanelProps) {
  return (
    <>
      <h2 class="text-lg font-semibold">Data Channel Communication</h2>
      <div class="flex gap-2 items-center">
        <input
          type="text"
          class="flex-1 border rounded p-2"
          value={props.message}
          onInput={(e) => props.setMessage(e.currentTarget.value)}
          placeholder="Type a message"
        />
        <button
          class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition"
          onClick={props.sendMessage}
        >
          Send Message
        </button>
      </div>
      <div>
        <h3 class="font-semibold mt-4 mb-2">Received Messages:</h3>
        <ul class="bg-gray-100 rounded p-2 min-h-[40px]">
          {props.receivedMessages.map((msg) => (
            <li class="text-xs font-mono py-0.5">{msg}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
