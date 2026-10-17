import { useRef, useState, useEffect } from 'react';
import Chat from './components/Chat';
import HistoryPanel from './components/HistoryPanel';
import { useVoice } from './useVoice';
import { connect, wakeServer } from './api';
import logo from './assets/oasis-logo.png';
import './theme-polish.css';

const COMPANY_NAME = 'Oasis Projects Limited';

function todayStamp() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | ready | error
  const [connectError, setConnectError] = useState('');
  const [slowConnect, setSlowConnect] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceLang, setVoiceLang] = useState('hi-IN');
  const chatRef = useRef(null);

  const voice = useVoice(voiceLang);

  // Sign in automatically — there is no login screen.
  async function connectNow() {
    setStatus('connecting');
    setConnectError('');
    setSlowConnect(false);
    const slowTimer = setTimeout(() => setSlowConnect(true), 8000);
    try {
      const data = await connect();
      setToken(data.access_token);
      setUser(data.user || null);
      setStatus('ready');
    } catch (err) {
      setConnectError(err.message);
      setStatus('error');
    } finally {
      clearTimeout(slowTimer);
    }
  }

  useEffect(() => {
    wakeServer(); // start waking the free server immediately
    connectNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // As soon as speech ends, send the question straight to Chat.
  useEffect(() => {
    if (!voice.listening && voice.transcript.trim()) {
      const spoken = voice.transcript.trim();
      voice.setTranscript('');
      setSidebarOpen(false);
      chatRef.current?.ask(spoken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.listening]);

  function handleReplay(question) {
    setSidebarOpen(false);
    chatRef.current?.ask(question);
  }

  // ---- Connecting / error screen ----
  if (status !== 'ready') {
    return (
      <div className="app-shell">
        <div
          className="main-col"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            padding: 24
          }}
        >
          <div className="pol-card" style={{ maxWidth: 420 }}>
            <img
              src={logo}
              alt="Oasis"
              style={{ display: 'block', width: 220, maxWidth: '70%', height: 'auto', margin: '0 auto 10px' }}
            />
            <div
              style={{
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                opacity: 0.6,
                marginBottom: 24
              }}
            >
              {COMPANY_NAME}
            </div>

            {status === 'connecting' && (
              <>
                <div style={{ fontSize: 15 }}>Connecting…</div>
                {slowConnect && (
                  <div style={{ fontSize: 13, opacity: 0.7, marginTop: 10 }}>
                    The server is waking up. This can take up to a minute.
                  </div>
                )}
              </>
            )}

            {status === 'error' && (
              <>
                <div style={{ fontSize: 15, color: '#e0645a' }}>
                  Could not connect
                </div>
                <div style={{ fontSize: 13, opacity: 0.8, margin: '10px 0 16px' }}>
                  {connectError}
                </div>
                <button
                  type="button"
                  onClick={connectNow}
                  className="pol-btn"
                >
                  Try again
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Main app ----
  return (
    <div className="app-shell">
      <div
        className={`sidebar-scrim${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-top">
          <img
            src={logo}
            alt="Oasis"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: 170,
              height: 'auto',
              marginBottom: 8
            }}
          />
          <span className="brand-sub">{COMPANY_NAME}</span>
        </div>

        <HistoryPanel token={token} onReplay={handleReplay} />

        <div className="title-block">
          <div className="title-block-row">
            <div className="title-block-cell">
              DRAWING NO<b>SITE-AI-01</b>
            </div>
            <div className="title-block-cell">
              REV<b>A</b>
            </div>
          </div>
          <div className="title-block-row">
            <div className="title-block-cell">
              DATE<b>{todayStamp()}</b>
            </div>
            <div className="title-block-cell">
              ACCESS<b>{user?.role ? user.role.toUpperCase() : 'OPEN'}</b>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-col">
        <div className="topbar">
          <button
            className="history-toggle-btn"
            onClick={() => setSidebarOpen(true)}
          >
            Log
          </button>
          <span className="topbar-title">Site chat</span>
          <div className="header-right">
            {voice.supported && (
              <>
                <select
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value)}
                  title="Voice language"
                  className="pol-select"
                >
                  <option value="hi-IN">Hindi</option>
                  <option value="en-IN">English</option>
                </select>

                <button
                  type="button"
                  onClick={
                    voice.listening ? voice.stopListening : voice.startListening
                  }
                  title={voice.listening ? 'Stop listening' : 'Ask by voice'}
                  className={`pol-btn${voice.listening ? ' is-listening' : ''}`}
                >
                  {voice.listening ? '■ Listening…' : '🎤 Speak'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live transcript while speaking, plus any microphone error */}
        {(voice.listening || voice.error) && (
          <div className={`pol-status${voice.error ? ' is-error' : ''}`}>
            {voice.error
              ? voice.error
              : voice.transcript ||
                'Listening… your question will be sent automatically.'}
          </div>
        )}

        <Chat token={token} ref={chatRef} voice={voice} />
      </div>
    </div>
  );
}
