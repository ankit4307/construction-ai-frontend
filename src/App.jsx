import { useRef, useState } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import HistoryPanel from './components/HistoryPanel';

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
  const chatRef = useRef(null);

  function handleLogin(accessToken, userData) {
    setToken(accessToken);
    setUser(userData);
  }

  function handleLogout() {
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

        {!token ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Chat token={token} ref={chatRef} />
        )}
      </div>
    </div>
  );
}
