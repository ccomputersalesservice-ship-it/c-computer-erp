import { useEffect, useRef, useState } from 'react';
import { api, toast, swrListeners, debounce, isAdmin } from './core.js';
import { supaOn, prodListDb, purListDb } from './supa.js';
/* load a list from the server for the given filter; reloads when the filter changes or a fresher saved copy arrives */
export function useList(action, filter, opt) {
  const [r, setR] = useState(null), [n, setN] = useState(0);
  const key = JSON.stringify(filter);
  useEffect(() => { let on = true; setR(null); (action === 'stock.list' && supaOn() ? prodListDb(JSON.parse(key)).catch(() => api(action, JSON.parse(key), opt)) : action === 'pur.list' && supaOn() && isAdmin() && localStorage.getItem('ccDbPur') === '1' ? purListDb(JSON.parse(key)).catch(() => api(action, JSON.parse(key), opt)) : api(action, JSON.parse(key), opt)).then(x => { if (on) setR(x); }).catch(e => { if (on) { setR({ rows: [], total: 0, page: 1, size: 1, error: e.message }); toast(e.message, 'bad'); } }); return () => { on = false; }; }, [key, n]);
  useEffect(() => { const l = () => setN(x => x + 1); swrListeners.add(l); return () => swrListeners.delete(l); }, []);
  return [r, () => setN(x => x + 1)];
}
/* a filter object kept in a module (so it survives page changes, like the live ERP) */
export function useFilter(mod) {
  const [f, setF] = useState({ ...mod });
  const set = (k, v, keepPage) => setF(old => { const x = { ...old, [k]: v }; if (!keepPage && k !== 'page' && 'page' in x) x.page = 1; Object.assign(mod, x); return x; });
  const setMany = o => setF(old => { const x = { ...old, ...o }; Object.assign(mod, x); return x; });
  return [f, set, setMany];
}
export function useDebounced(fn, ms) { const r = useRef(null); r.current = fn; return useRef(debounce((...a) => r.current(...a), ms || 250)).current; }
