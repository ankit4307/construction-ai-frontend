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

const EXAMPLES = [
  'Total breakdown kitni hai?',
  'Salary approval pending kitni hai?',
  'Vehicle PB65AH3159 ka status?',
  'Sahapur site me kitni machines hain?'
];

function timeNow() {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

const Chat = forwardRef(function Chat({ token }, ref) {
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

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
    } catch (err) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, status: 'error', answer: err.message }
            : e
        )
      );
    } finally {
      setBusy(false);
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
              </div>
            )}
            {e.status === 'done' && (
              <div className="bubble-a">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.answer}</ReactMarkdown>
                {e.sheetsUsed && e.sheetsUsed.length > 0 && (
                  <div className="sheets-used">
                    {e.sheetsUsed.map((s) => (
                      <span className="chip" key={s}>{s}</span>
                    ))}
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
          placeholder="Total breakdown kitni hai?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="send-btn" type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
});

export default Chat;
