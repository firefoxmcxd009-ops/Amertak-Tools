/**
 * tool-auth.js (Updated)
 * ------------------------------------------------------------------
 * This script no longer blocks tool pages for unauthenticated users.
 * Tools are now accessible to everyone without login/signup.
 * Authentication is optional — users may log in if they want to 
 * use features like saving likes or personalization.
 * ------------------------------------------------------------------
 */

// The page is visible to everyone — no auth redirect
document.documentElement.style.visibility = '';

const DEFAULT_API_BASE = 'https://amertak-tools-f3zb.onrender.com';

function getApiBase() {
  const configuredBase = window.__AUTH_API_BASE__ || '';
  if (configuredBase) {
    return configuredBase.replace(/\/$/, '');
  }

  return DEFAULT_API_BASE;
}

const API_BASE = getApiBase();

function getStoredAuthToken() {
  return localStorage.getItem('authToken') || '';
}

function buildAuthHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getStoredAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// Silent auth check (non-blocking) — just updates localStorage if valid
(async function silentAuthCheck() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
      headers: buildAuthHeaders({ Accept: 'application/json' })
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      if (data?.token || data?.accessToken || data?.authToken) {
        localStorage.setItem('authToken', data.token || data.accessToken || data.authToken);
      }
    }
  } catch {
    // Not authenticated — no problem, tools are still accessible
  }
}());