import { useRef, useState, useEffect } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import HistoryPanel from './components/HistoryPanel';
import { useVoice } from './useVoice';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceLang, setVoiceLang] = useState('hi-IN');
  const chatRef = useRef(null);

  const voice = useVoice(voiceLang);

  // Bolna khatam hote hi sawaal seedha Chat ko bhej do.
  // Chat pehle se `ask()` expose karta hai (HistoryPanel replay isi ka use karta hai).
  useEffect(() => {
    if (!voice.listening && voice.transcript.trim()) {
      const spoken = voice.transcript.trim();
      voice.setTranscript('');
      setSidebarOpen(false);
      chatRef.current?.ask(spoken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.listening]);

  function handleLogin(accessToken, userData) {
    setToken(accessToken);
    setUser(userData);
  }

  function handleLogout() {
    voice.stopListening();
    voice.stopSpeaking();
    setToken(null);
    setUser(null);
    setSidebarOpen(false);
  }

  function handleReplay(question) {
    setSidebarOpen(false);
    chatRef.current?.ask(question);
  }

  return (
    <div className="app-shell">
      {token && (
        <>
          <div
            className={`sidebar-scrim${sidebarOpen ? ' open' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
          <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
            <div className="sidebar-top">
              <span className="brand-mark">SITE DESK</span>
              <span className="brand-sub">Construction AI Assistant</span>
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
                  USER<b>{user?.username}</b>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      <div className="main-col">
        {token && (
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
                    title="Bolne ki bhasha"
                    style={{
                      background: 'transparent',
                      color: 'inherit',
                      border: '1px solid currentColor',
                      borderRadius: 4,
                      fontSize: 12,
                      padding: '3px 6px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="hi-IN">हिंदी</option>
                    <option value="en-IN">English</option>
                  </select>

                  <button
                    type="button"
                    onClick={
                      voice.listening ? voice.stopListening : voice.startListening
                    }
                    title={
                      voice.listening
                        ? 'Sunna band karein'
                        : 'Bol kar sawaal poochein'
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: 'none',
                      background: voice.listening ? '#c0392b' : '#d99a1f',
                      color: voice.listening ? '#ffffff' : '#101820'
                    }}
                  >
                    {voice.listening ? '■ Sun raha hoon' : '🎤 Bolein'}
                  </button>
                </>
              )}

              <div className="user-chip">
                <span className="dot" />
                {user.username} · {user.role}
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Bolte waqt live text, aur mic ki koi problem ho to message */}
        {token && (voice.listening || voice.error) && (
          <div
            style={{
              padding: '6px 14px',
              fontSize: 13,
              color: voice.error ? '#c0392b' : 'inherit',
              opacity: voice.error ? 1 : 0.75
            }}
          >
            {voice.error
              ? voice.error
              : voice.transcript || 'Boliye… (bolna rukte hi bhej diya jayega)'}
          </div>
        )}

        {!token ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Chat token={token} ref={chatRef} />
        )}
      </div>
    </div>
  );
}
