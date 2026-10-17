import { ACCESS_USER } from './accessConfig';

// Backend base URL — points at your FastAPI server on Render.
export const API_BASE = 'https://construction-ai-backend-doxn.onrender.com';

// The free Render instance sleeps after 15 minutes of inactivity and can take
// up to a minute to wake up, so timeouts are generous — but never infinite.
const ASK_TIMEOUT_MS = 120000; // 2 minutes
const DEFAULT_TIMEOUT_MS = 90000; // 90 seconds

// The most recent valid token. Kept at module level so an expired token can be
// replaced transparently without every component having to know about it.
let activeToken = null;
export function setActiveToken(token) {
  activeToken = token;
}

async function request(url, options, timeoutMs, fallbackMessage) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        'The server did not respond in time. It may still be waking up — please try again in a minute.'
      );
    }
    throw new Error('Could not reach the server. Check your internet connection.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = fallbackMessage.replace('{status}', res.status);
    try {
      const data = await res.json();
      if (data?.detail) detail = String(data.detail);
    } catch (_) {
      /* ignore parse errors, use default message */
    }
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export async function login(username, password) {
  const body = new URLSearchParams();
  body.set('grant_type', 'password');
  body.set('username', username);
  body.set('password', password);

  return request(
    `${API_BASE}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    },
    DEFAULT_TIMEOUT_MS,
    'Sign-in failed ({status}).'
  );
}

// Signs in with the built-in access account and remembers the token.
export async function connect() {
  if (!ACCESS_USER.username || ACCESS_USER.username.startsWith('REPLACE_')) {
    throw new Error(
      'The access account is not set up yet. Fill in src/accessConfig.js.'
    );
  }
  const data = await login(ACCESS_USER.username, ACCESS_USER.password);
  activeToken = data.access_token;
  return data;
}

// Fire-and-forget request that starts waking the sleeping server the moment the
// page opens, so it is ready by the time the first question is asked.
export function wakeServer() {
  fetch(`${API_BASE}/health`).catch(() => {});
}

// Runs an authenticated request; if the token has expired (401) it signs in
// again once and retries.
async function authed(buildOptions, url, timeoutMs, fallbackMessage, token) {
  const first = activeToken || token;
  try {
    return await request(url, buildOptions(first), timeoutMs, fallbackMessage);
  } catch (err) {
    if (err.status !== 401) throw err;
    const fresh = await connect();
    return request(
      url,
      buildOptions(fresh.access_token),
      timeoutMs,
      fallbackMessage
    );
  }
}

export async function getHistory(token) {
  return authed(
    (t) => ({ method: 'GET', headers: { Authorization: `Bearer ${t}` } }),
    `${API_BASE}/chat/history`,
    DEFAULT_TIMEOUT_MS,
    'Could not load history ({status}).',
    token
  );
}

export async function askQuestion(token, question) {
  return authed(
    (t) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`
      },
      body: JSON.stringify({ question })
    }),
    `${API_BASE}/chat/ask`,
    ASK_TIMEOUT_MS,
    'Request failed ({status}).',
    token
  );
}
