import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { askQuestion } from '../api';
import '../chat-fixes.css';

const EXAMPLES = [
  'How many breakdowns in total?',
  'How many salary approvals are pending?',
  'What is the status of vehicle PB65AH3159?',
  'How many machines are at Sahapur site?'
];

// After this long we tell the user the server is probably still waking up,
// instead of leaving them staring at a spinner with no explanation.
const SLOW_NOTICE_MS = 15000;

// Wide tables scroll inside the reply box instead of overflowing it.
const markdownComponents = {
  table: ({ node, ...props }) => (
    <div className="table-scroll">
      <table {...props} />
    </div>
  )
};

function timeNow() {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

const Chat = forwardRef(function Chat({ token, voice }, ref) {
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [slowIds, setSlowIds] = useState([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Clear the highlight when speech finishes on its own.
  useEffect(() => {
    if (voice && !voice.speaking) setSpeakingId(null);
  }, [voice?.speaking]);

  async function send(question) {
    const q = (question ?? input).trim();
    if (!q || busy) return;

    const id = Date.now();
    setEntries((prev) => [
      ...prev,
      { id, question: q, time: timeNow(), status: 'pending' }
    ]);
    setInput('');
    setBusy(true);

    const slowTimer = setTimeout(
      () => setSlowIds((prev) => [...prev, id]),
      SLOW_NOTICE_MS
    );

    try {
      const data = await askQuestion(token, q);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status: 'done',
                answer: data.answer,
                sheetsUsed: data.sheets_used || []
              }
            : e
        )
      );
      if (autoSpeak && voice?.canSpeak) {
        setSpeakingId(id);
        voice.speak(data.answer);
      }
    } catch (err) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: 'error', answer: err.message } : e
        )
      );
    } finally {
      clearTimeout(slowTimer);
      setSlowIds((prev) => prev.filter((x) => x !== id));
      setBusy(false);
    }
  }

  function handleListen(entry) {
    if (!voice?.canSpeak) return;
    if (speakingId === entry.id && voice.speaking) {
      voice.stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(entry.id);
      voice.speak(entry.answer);
    }
  }

  useImperativeHandle(ref, () => ({
    ask: (question) => send(question)
  }));

  function handleSubmit(e) {
    e.preventDefault();
    send();
  }



  return (
    <div className="chat-wrap">
      <div className="log-scroll" ref={scrollRef}>
        {entries.length === 0 && (
          <div className="empty-state">
            <div className="big">Ask the site desk anything</div>
            <div>Try one of these to get started:</div>
            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => send(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map((e) => (
          <div className="entry entry-in" key={e.id}>
            <div className="entry-meta">
              <span className="tag">Q</span>
              <span>{e.time}</span>
            </div>
            <div className="bubble-q">{e.question}</div>

            <div className="entry-meta">
              <span className="tag">A</span>
            </div>

            {e.status === 'pending' && (
              <div className="bubble-a pending">
                Checking the sheets
                <span className="typing-dots" style={{ marginLeft: 8 }}>
                  <span></span><span></span><span></span>
                </span>
                {slowIds.includes(e.id) && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                    Still working on it. Large sheets can take 20 to 40 seconds.
                  </div>
                )}
              </div>
            )}

            {e.status === 'done' && (
              <div className="bubble-a">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {e.answer}
                </ReactMarkdown>

                {e.sheetsUsed && e.sheetsUsed.length > 0 && (
                  <div className="sheets-used">
                    {e.sheetsUsed.map((s) => (
                      <span className="chip" key={s}>{s}</span>
                    ))}
                  </div>
                )}

                {voice?.canSpeak && (
                  <div>
                    <button
                      type="button"
                      onClick={() => handleListen(e)}
                      className="listen-btn"
                    >
                      {speakingId === e.id && voice.speaking
                        ? '\u25a0 Stop'
                        : '\uD83D\uDD0A Listen'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {e.status === 'error' && (
              <div className="bubble-a error">
                Couldn't get an answer: {e.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask about breakdowns, machines or approvals"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="send-btn"
          type="submit"
          disabled={busy || !input.trim()}
        >
          Send
        </button>
      </form>

      {voice?.canSpeak && (
        <div
          style={{
            padding: '0 14px 10px',
            fontSize: 12,
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <input
            id="autospeak"
            type="checkbox"
            checked={autoSpeak}
            onChange={(ev) => {
              setAutoSpeak(ev.target.checked);
              if (!ev.target.checked) voice.stopSpeaking();
            }}
          />
          <label htmlFor="autospeak" style={{ cursor: 'pointer' }}>
            Read answers aloud
          </label>
        </div>
      )}
    </div>
  );
});

export default Chat;
