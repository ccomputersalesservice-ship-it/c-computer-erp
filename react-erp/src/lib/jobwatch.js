/* New service entry alert: checks every 30 s while the ERP is open. Sound + screen popup + system notification. */
import { api, S, toast } from './core.js';
let started = false, last = null;
function beep() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const c = new A();
    [0, 0.25, 0.5].forEach((t, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = i === 2 ? 1175 : 880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(0.0001, c.currentTime + t); g.gain.exponentialRampToValueAtTime(0.35, c.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.22); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.24); });
  } catch (e) { }
}
async function check() {
  if (!S.user) return;
  try {
    const r = await api('crm.jobs', { q: '', status: '', page: 1, size: 1 }, { loader: false, fresh: true });
    if (!r || r.error || typeof r.all !== 'number') return;
    if (last !== null && r.all > last) {
      const j = (r.rows && r.rows[0]) || {}, n = r.all - last, msg = '🔔 Navi service entry' + (n > 1 ? 's (' + n + ')' : '') + (j.name ? ': ' + j.name : '') + (j.device ? ' - ' + (j.brand || '') + ' ' + j.device : '');
      beep(); toast(msg, 'ok');
      try { if (window.Notification && Notification.permission === 'granted') new Notification('C COMPUTER - Navi service entry', { body: msg.replace('🔔 ', ''), tag: 'ccjob', requireInteraction: false }); } catch (e) { }
      try { window.dispatchEvent(new Event('cc-newjob')); } catch (e) { }
    }
    last = r.all;
  } catch (e) { }
}
export function startJobWatch() {
  if (started) return; started = true;
  const ask = () => { try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { } document.removeEventListener('click', ask); };
  document.addEventListener('click', ask);
  setTimeout(check, 4000); setInterval(check, 20000); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}
