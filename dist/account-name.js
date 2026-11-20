/* Display-only account nickname shared by the portal shell (joyflock.com)
   and the embedded games (flight.joyflock.com). The backend session cookie is
   host-only, so the iframe cannot rely on /api/me for the signed-in nickname.
   This module reads the server-confirmed display name that site-account.js
   mirrors into a parent-domain cookie, and accepts the parent's postMessage
   updates after a sign-in or sign-out. It never grants an account session. */
const CACHE_KEY = 'joyflock.accountName';
const DISPLAY_COOKIE = 'joyflock.displayName';
const LEGACY_COOKIE = 'joyflock_account';
/* Connection placeholders and sign-in labels are NOT nicknames. */
const NOT_A_NAME = /^(?:0|你|You|Restoring…|Restoring\.\.\.|恢复登录中…|Reconnect|重新连接|Connecting…|连接中…|登录|登录 \/ 注册|账号|Account|Sign in|Sign in \/ Register|游客|Guest|游客玩家)$/;

export function normalizeDisplayName(value) {
  const name = String(value ?? '').trim().slice(0, 64);
  return name && !NOT_A_NAME.test(name) ? name : '';
}

function cookieValue(key) {
  try {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + key.replace('.', '\\.') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

/* Prefer the same-document cache; then the parent-domain display cookie; then
   the legacy host-only cookie used on first paint before this release. */
export function cachedDisplayName() {
  let name = '';
  try { name = normalizeDisplayName(globalThis.localStorage?.getItem(CACHE_KEY)); } catch {}
  if (name) return name;
  name = normalizeDisplayName(cookieValue(DISPLAY_COOKIE));
  if (name) return name;
  return normalizeDisplayName(cookieValue(LEGACY_COOKIE));
}

/* Only the real parent shell may supply a nickname. Same-origin pages and
   joyflock.com / *.joyflock.com are trusted; localhost keeps local previews
   working. Never accept a lookalike host such as eviljoyflock.com. */
export function trustedParentOrigin(origin, currentOrigin = globalThis.location?.origin) {
  let host;
  try { host = new URL(origin).hostname; } catch { return false; }
  if (origin === currentOrigin) return true;
  if (['localhost', '127.0.0.1'].includes(host)) return true;
  return host === 'joyflock.com' || host.endsWith('.joyflock.com');
}
