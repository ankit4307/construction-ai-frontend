import { useEffect, useState } from 'react';
import { getHistory } from '../api';

// Backend history entries may use slightly different field names
// depending on how the endpoint serializes them — normalize defensively
// so the panel still renders even if the exact schema differs.
function normalize(raw) {
  const list = Array.isArray(raw) ? raw : raw?.history || raw?.items || [];
  return list.map((item, i) => ({
    id: item.id ?? i,
    question: item.question ?? item.query ?? item.prompt ?? '',
    answer: item.answer ?? item.response ?? '',
    time: item.created_at ?? item.timestamp ?? item.time ?? null,
    sheetsUsed: item.sheets_used ?? item.sheetsUsed ?? []
  }));
}

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function HistoryPanel({ token, onReplay }) {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | done | error
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getHistory(token)
      .then((raw) => {
        if (cancelled) return;
        setEntries(normalize(raw));
        setStatus('done');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Could not load history.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      <div className="sidebar-section-label">Site log — past entries</div>
      <div className="sidebar-history">
        {status === 'loading' && (
          <div className="sidebar-empty">Loading past entries…</div>
        )}
        {status === 'error' && (
          <div className="sidebar-empty sidebar-error">{error}</div>
        )}
        {status === 'done' && entries.length === 0 && (
          <div className="sidebar-empty">No past entries yet. Ask a question to start the log.</div>
        )}
        {entries.map((e) => (
          <button
            key={e.id}
            className="history-item"
            onClick={() => onReplay(e.question)}
          >
            <div className="history-item-top">
              <span className="history-q">{e.question}</span>
              {e.time && <span className="history-time">{formatTime(e.time)}</span>}
            </div>
            {e.answer && <div className="history-a">{e.answer}</div>}
          </button>
        ))}
      </div>
    </>
  );
}
