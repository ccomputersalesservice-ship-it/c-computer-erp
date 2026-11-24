/* navigation: same rules as go() in the live ERP */
import { S, store, isAdmin, isAcct, CRM_URL } from './core.js';

export const ADMIN_ONLY = ['users', 'settings', 'pcmp', 'fixed'];
export const ROUTE_KEYS = ['dash', 'products', 'purchase', 'sales', 'stock', 'serial', 'customers', 'reports', 'audit', 'build', 'brec', 'chal', 'replace', 'print', 'users', 'settings', 'scan', 'crm', 'service', 'quotes', 'quote', 'cash', 'pcmp', 'pos', 'fixed'];
/* Which menus each staff member sees (by name). Admin sees everything. */
export const STAFF_MENUS = { USTAV: ['quotes', 'service', 'replace', 'crm', 'sales', 'build', 'brec', 'serial', 'products'], NAKUL: ['quotes', 'service', 'replace', 'crm', 'cash', 'purchase', 'sales', 'stock'] };
export const ACCT_MENUS = ['products', 'purchase', 'pos', 'sales', 'quotes', 'stock', 'serial', 'build', 'brec', 'replace', 'service', 'cash', 'customers', 'crm'];
export function userMenus() {
  if (!S.user || isAdmin() || isAcct()) return null;
  const k = String(S.user.name || '').trim().split(/\s+/)[0].toUpperCase(), k2 = String(S.user.loginId || '').trim().toUpperCase();
  return STAFF_MENUS[k] || STAFF_MENUS[k2] || null;
}
export function navItems() {
  const a = isAdmin();
  if (isAcct()) return ACCT_MENUS;
  if (userMenus()) return userMenus();
  const l = ['dash', 'products', 'purchase', 'pcmp', 'pos', 'sales', 'chal', 'replace', 'quotes', 'stock', 'serial', 'customers', 'build', 'brec', 'audit', 'print', 'reports', 'service', 'cash', 'fixed', 'crm'];
  if (!a) l.splice(l.indexOf('chal'), 1);
  if (a) l.push('users', 'settings');
  return l;
}

const subs = new Set();
let snap = { route: S.route, params: S.params, n: 0 };
export const navStore = { sub: f => { subs.add(f); return () => subs.delete(f); }, get: () => snap };
function emit() { snap = { route: S.route, params: S.params, n: snap.n + 1 }; subs.forEach(f => f()); }
export let onCrmBlocked = () => { };
export function setCrmBlocked(f) { onCrmBlocked = f; }

export function go(route, params, noPush) {
  { const um = userMenus(); if (um && !um.includes(route) && !(route === 'quote' && um.includes('quotes'))) route = um[0]; }
  if (route === 'crm' && isAdmin()) { const w = window.open(CRM_URL, '_blank'); if (!w) onCrmBlocked(); return; }
  if (isAcct() && !ACCT_MENUS.includes(route) && route !== 'quote') route = 'sales';
  if (!ROUTE_KEYS.includes(route) || (ADMIN_ONLY.includes(route) && !isAdmin())) route = isAcct() ? 'sales' : 'dash';
  if ((!noPush && S.route !== route) || (!noPush && params && Object.keys(params).length)) S.stack.push({ route: S.route, params: S.params });
  if (S.stack.length > 30) S.stack.shift();
  S.route = route; S.params = Object.assign({}, params || {});
  store.set('route', route);
  window.scrollTo(0, 0);
  emit();
}
export function back() { const b = S.stack.pop(); if (b) go(b.route, b.params, true); else go('dash', {}, true); }
export function refresh() { emit(); }
