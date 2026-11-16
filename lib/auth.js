import crypto from 'crypto';

export function token() {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  return crypto.createHash('sha256').update('aufbau:' + pw).digest('hex');
}

// Ohne APP_PASSWORD ist die App offen (lokaler Modus).
export function authed(req) {
  const t = token();
  if (!t) return true;
  return req.cookies.get('aufbau_auth')?.value === t;
}
