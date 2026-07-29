
// Backend base URL — points at your local FastAPI server.
// Change this if your backend runs on a different host/port.
export const API_BASE = 'https://construction-ai-backend-doxn.onrender.com';
export async function login(username, password) {
  const body = new URLSearchParams();
  body.set('grant_type', 'password');
  body.set('username', username);
  body.set('password', password);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    let detail = 'Login failed. Check your username and password.';
    try {
      const data = await res.json();
      if (data?.detail) detail = String(data.detail);
    } catch (_) {
      /* ignore parse errors, use default message */
    }
    throw new Error(detail);
  }

  return res.json(); // { access_token, token_type, user }
}

export async function getHistory(token) {
  const res = await fetch(`${API_BASE}/chat/history`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    let detail = `Could not load history (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.detail) detail = String(data.detail);
    } catch (_) {
      /* ignore parse errors, use default message */
    }
    throw new Error(detail);
  }

  return res.json();
}

export async function askQuestion(token, question) {
  const res = await fetch(`${API_BASE}/chat/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ question })
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data?.detail) detail = String(data.detail);
    } catch (_) {
      /* ignore parse errors, use default message */
    }
    throw new Error(detail);
  }

  return res.json(); // { answer, sheets_used }
}
