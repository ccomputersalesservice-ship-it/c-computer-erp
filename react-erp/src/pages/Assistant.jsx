/* ===== C COMPUTER AI Assistant (free: rules on your own ERP data + Chrome voice). Read-only. Same rules as JS_Assistant.html ===== */
import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, MenuItem, Select, Stack, TextField, Alert } from '@mui/material';
import { api, S, inr, esc, isAdmin, toast } from '../lib/core.js';
import { openDialog } from '../lib/ui.jsx';
import { go, navItems } from '../lib/nav.js';
import { newJob } from './Service.jsx';
import { photoQuick } from './Products.jsx';
import { mailBills, openImport } from './PurImport.jsx';
const AI = { close: null };
const AI_ACT = { svnew: newJob, phquick: photoQuick, pimail: mailBills, piopen: openImport };
const AI_W = {
  sales: /\b(sale|sales|sell|sold|vechan|vechaan|vechyu|vechu|vechi|bikri|bechan|becha|bikra|bill)\b|વેચ|વેંચ|बिक्री|बेच|सेल/i,
  profit: /\b(profit|nafo|nafa|naffo|munafa|munafo|kamai|kamani|margin)\b|નફો|નફા|મુનાફ|કમાણી|मुनाफ|नफा|फायदा|कमाई/i,
  purchase: /\b(purchase|kharidi|kharid|kharidyu|buy|bought|inward)\b|ખરીદ|खरीद/i,
  udhar: /\b(udhar|udhaar|udhari|baki|baaki|bakaya|pending payment|outstanding|receivable|due|dues|lena)\b|ઉધાર|બાકી|लेना|उधार|बकाया|बाकी/i,
  vendor: /\b(vendor|vendors|supplier|dealer|party|dena|aapvana|apvana|payable)\b|વેન્ડર|સપ્લાયર|આપવાના|देना|सप्लायर|वेंडर/i,
  low: /\b(low|ochho|ocho|ochha|kam|khatam|khalas|reorder|out of stock)\b|ઓછો|ઓછા|ખતમ|खत्म|कम/i,
  stock: /\b(stock|maal|mal|inventory|ketla|ketlu|kitna|kitne|how many|available|che|chhe)\b|સ્ટોક|માલ|કેટલ|स्टॉक|माल|कितन/i,
  today: /\b(today|aaj|aje|aaje|aj)\b|આજ|आज/i,
  yest: /\b(yesterday|kale|gaikale|gai kale|kal)\b|ગઈકાલ|કાલે|कल/i,
  month: /\b(month|mahino|mahina|mahine|mahinanu|monthly|is mahine)\b|મહિન|महीन|महिन/i,
  lastm: /\b(last month|gaya mahine|gaya mahina|pichhla mahina|pichle mahine|previous month)\b|ગયા મહિ|पिछले महीने|पिछला महीना/i,
  help: /\b(help|madad|shu puchhu|what can)\b|મદદ|मदद/i
};
const AI_CAT = { laptop: /laptop|લેપટોપ|लैपटॉप|लेपटॉप/i, desktop: /desktop|ડેસ્કટોપ|डेस्कटॉप/i, printer: /printer|પ્રિન્ટર|प्रिंटर/i, monitor: /monitor|મોનિટર|मॉनिटर/i, ssd: /\bssd\b/i, ram: /\bram\b|રેમ|रैम/i, mouse: /mouse|માઉસ|माउस/i, keyboard: /keyboard|કીબોર્ડ|कीबोर्ड/i };
const AI_STOPW = new Set('ketla ketlu ketli kitna kitne kitni how many much che chhe hai he stock ma maa mein available baki total kul badho badha nu no ni na to kaho kahe batao batav show what is the in aapna mara maro mari apna mera amare amari shop dukan nang piece pcs units કેટલા કેટલું કેટલી કેટલો છે માં નું નો ની ના સ્ટોક બાકી કુલ બધા બધો આપણા મારા દુકાન कितने कितना कितनी है हैं में का की के स्टॉक कुल बचा बाकी दुकान'.split(' '));
const aiClean = t => String(t).replace(/[?.,!।]/g, ' ').split(/\s+/).filter(w => w && !AI_STOPW.has(w.toLowerCase())).join(' ');
const aiCatFor = t => { const cats = (S.boot && S.boot.categories) || []; for (const k in AI_CAT) if (AI_CAT[k].test(t)) { const c = cats.find(x => x.toLowerCase().includes(k)); if (c) return c; } return cats.find(c => c.length > 2 && new RegExp('\\b' + c.replace(/[^\w]/g, '') + '\\b', 'i').test(t)) || ''; };


/* ---------- open pages / do actions by voice or text ---------- */
const AI_OPEN = /\b(open|kholo|kholvu|khol|kholi|khulo|chalu|batav|batavo|bataav|dekhad|dekhadi|jao|jav|le\s*jao|go to|show)\b|ખોલ|ખુલ|બતાવ|દેખાડ|ચાલુ|खोल|दिखा|दिखाओ|चालू|ले\s*चलो/i;
const AI_NAV = [
  ['service', /service|sarvis|sarvice|repair|ripair|job\b|jobs|સર્વિસ|સર્વીસ|રિપેર|सर्विस|रिपेयर/i, 'Service Records'],
  ['pos', /\bpos\b|quick order|counter|billing|બિલિંગ|પોસ|बिलिंग/i, 'POS / Quick Order'],
  ['quotes', /quotation|quote|kotation|kotesan|estimate|ક્વોટ|કોટેશન|कोटेशन|क्वोट/i, 'Quotations'],
  ['brec', /build record|build rekord|બિલ્ડ રેકોર્ડ/i, 'Build Record'],
  ['build', /build pc|pc build|બિલ્ડ/i, 'Build PC'],
  ['purchase', /purchase|kharidi|ખરીદી|खरीद/i, 'Purchase'],
  ['sales', /\bsales\b|order list|vechan list|વેચાણ|बिक्री/i, 'Sales'],
  ['stock', /\bstock\b|maal|સ્ટોક|स्टॉक/i, 'Stock'],
  ['serial', /serial|સિરિયલ|सीरियल/i, 'Serial No.'],
  ['customers', /customer|grahak|ગ્રાહક|ग्राहक/i, 'Customer'],
  ['cash', /cash ?book|rokad|રોકડ|कैश/i, 'Cash Book'],
  ['reports', /report|રિપોર્ટ|रिपोर्ट/i, 'Reports'],
  ['print', /sticker|print|સ્ટીકર|स्टिकर/i, 'Print Stickers'],
  ['products', /product|item|પ્રોડક્ટ|प्रोडक्ट/i, 'Products'],
  ['dash', /dashboard|home|ડેશબોર્ડ|होम|डैशबोर्ड/i, 'Dashboard']
];
const AI_DO = [
  [/(navo|new|navu|add|નવો|નવું|नया).{0,12}(job|service|સર્વિસ|सर्विस|જોબ|जॉब|जोब)/i, 'service', 'svnew', 'Navo service job'],
  [/photo|ફોટો|फोटो/i, 'products', 'phquick', 'Photo vagar na product'],
  [/mail.{0,10}bill|bill.{0,10}mail|gmail|મેલ/i, 'purchase', 'pimail', 'Mail bills'],
  [/pdf.{0,10}bill|bill.{0,10}import/i, 'purchase', 'piopen', 'PDF bill import']
];
function aiNav(t) {
  const allowed = navItems(), qa = /ketl|kitn|\bkul\b|total|ochho|\blow\b|aaj|aje|kale|mahin|how many|કેટલ|કુલ|આજ|કાલ|कितन|आज|कुल/i.test(t), short = !qa && t.trim().split(/\s+/).length <= 3, open = AI_OPEN.test(t);
  for (const [re, route, act, lbl] of AI_DO) if (re.test(t) && (open || short || /navo|new|નવો|नया/i.test(t)) && allowed.includes(route)) return { route, act, lbl };
  if (!open && !short) return null;
  for (const [route, re, lbl] of AI_NAV) if (re.test(t)) return allowed.includes(route) ? { route, lbl } : { no: lbl };
  return null;
}
async function aiAnswer(qq) {
  const t = String(qq || '').trim(), a = isAdmin(), W = k => AI_W[k].test(t);
  if (!t) return 'Kai puchho. Jem ke: "aaj nu vechan?"';
  if (W('help')) return aiHelp();
  const nv = aiNav(t);
  if (nv && nv.no) return '🔒 ' + esc(nv.no) + ' tamara mate chalu nathi.';
  if (nv) { setTimeout(() => { if (AI.close) AI.close(); go(nv.route); if (nv.act) setTimeout(() => AI_ACT[nv.act] && AI_ACT[nv.act](), 700); }, 600); return '✅ ' + esc(nv.lbl) + ' kholu chhu...'; }
  const needAdmin = () => '🔒 Aa vigat fakat Owner (Admin) joi shake.';
  const cat0 = aiCatFor(t), money = W('sales') || W('profit') || W('purchase') || W('vendor') || /udhar|ઉધાર|उधार/i.test(t);
  // money owed to you / by you  (from your CRM accounts: Dues + Bills)
  if (W('udhar') && !W('vendor') && !(cat0 && !money)) {
    if (!a) return needAdmin();
    const o = await api('dash.ops', { full: 1 }, { loader: false }).catch(() => null), r = o && o.receivables;
    if (!r) return 'Udhar ni vigat CRM mathi mali nahi.';
    return `💰 Customer udhar baki: <b>${inr(r.total)}</b> (${r.count} customer)` + (r.rows.length ? '<br>' + r.rows.slice(0, 8).map(x => `• ${esc(x.name)} – ${inr(x.left)}`).join('<br>') : '');
  }
  if (W('vendor') && (W('udhar') || /dena|aapva|apva|payable|બાકી|देना|baki|outstanding/i.test(t))) {
    if (!a) return needAdmin();
    const o = await api('dash.ops', { full: 1 }, { loader: false }).catch(() => null), p = o && o.payables;
    if (!p) return 'Vendor bill ni vigat CRM mathi mali nahi.';
    return `🏭 Vendor ne aapvana baki: <b>${inr(p.total)}</b> (${p.count} bill)` + (p.overdueCount ? `<br>⚠ Mudat vitavi gai: ${p.overdueCount} bill, ${inr(p.overdueAmount)}` : '') + (p.rows.length ? '<br>' + p.rows.slice(0, 8).map(x => `• ${esc(x.vendor)} – ${inr(x.left)}`).join('<br>') : '');
  }
  // sales / profit / purchase by period
  if ((W('sales') || W('profit') || W('purchase')) && !(cat0 && !W('profit') && !/vechan|sales|વેચાણ|बिक्री/i.test(t))) {
    if (!a) return needAdmin();
    if (W('lastm') || (W('month') && !W('today'))) {
      const lm = W('lastm'), d = await api('dash', { period: lm ? 'lastmonth' : 'month' }, { loader: false });
      const dl = lm ? null : await api('rep.daily', {}, { loader: false }).catch(() => null);
      let s = `📅 ${lm ? 'Gaya mahine' : 'Aa mahine'}: Vechan <b>${inr(d.cards.totalSales)}</b> · Kharidi <b>${inr(d.cards.totalPurchase)}</b>`;
      if (dl && dl.month) s += `<br>Nafo: <b>${inr(dl.month.profit)}</b>` + (dl.month.target ? `<br>Target ${inr(dl.month.target)} – ${dl.month.pct}% puru, ${inr(dl.month.remaining)} baki (${dl.month.daysLeft} divas)` : '');
      return s;
    }
    const d = await api('dash', { period: 'month' }, { loader: false }), day = W('yest') ? d.today.yesterday : d.today.today, lbl = W('yest') ? 'Gaikale' : 'Aaje';
    const parts = [];
    if (W('sales') || (!W('profit') && !W('purchase'))) parts.push(`Vechan <b>${inr(day.sales)}</b> (${day.orders} order)`);
    if (W('profit')) parts.push(`Nafo <b>${inr(day.profit)}</b>`);
    if (W('purchase')) parts.push(`Kharidi <b>${inr(day.purchase)}</b>`);
    return `📊 ${lbl}: ` + parts.join(' · ');
  }
  if (W('low')) {
    const r = await api('stock.list', { low: 1, size: 30 }, { loader: false });
    return r.rows.length ? `⚠ Ochho stock (${r.total}):<br>` + r.rows.slice(0, 15).map(x => `• ${esc(x.Name)} – ${x.stock.available} baki`).join('<br>') : '✅ Koi item ochho nathi.';
  }
  // category or product stock
  const cat = aiCatFor(t), q = aiClean(t);
  if (cat || W('stock')) {
    const rest = cat ? aiClean(q.replace(new RegExp(Object.values(AI_CAT).map(r => r.source).join('|'), 'ig'), ' ').replace(new RegExp(cat, 'ig'), ' ')) : q;
    const r = await api('stock.list', Object.assign({ size: 100 }, cat ? { category: cat } : {}, rest && rest.length > 1 ? { q: rest } : {}), { loader: false });
    const avail = r.rows.filter(x => x.stock.available > 0);
    if (!cat && !rest) return `📦 Kul stock: <b>${r.totals.physical}</b> nang (${r.totals.available} vechva mate taiyar, ${r.total} product)`;
    if (!r.rows.length) return `"${esc(rest || cat)}" nu koi product stock ma nathi.`;
    const n = avail.reduce((s, x) => s + x.stock.available, 0);
    return `📦 ${esc(cat || rest)}: <b>${n}</b> nang available` + (avail.length ? '<br>' + avail.slice(0, 15).map(x => `• ${esc(x.Name)} – ${x.stock.available}`).join('<br>') : '') + (r.total > 100 ? '<br><small>(pehla 100 product joya)</small>' : '');
  }
  if (q.length > 2) {   // last try: treat as a product name
    const r = await api('stock.list', { q, size: 20 }, { loader: false });
    if (r.rows.length) return `📦 "${esc(q)}":<br>` + r.rows.slice(0, 10).map(x => `• ${esc(x.Name)} – ${x.stock.available} available`).join('<br>');
  }
  return 'Mane samjanyu nahi 🙏 ' + aiHelp();
}
const aiHelp = () => 'Aavu kaho:<br>• <b>Service kholo</b> · POS kholo · Quotation kholo · <b>Navo job</b> · Photo vagar na · Mail bills<br>• Aaj nu vechan? · Aaj no nafo? · Gaikale nu vechan?<br>• Aa mahine nu vechan / nafo? · Gaya mahine?<br>• Ketla laptop chhe? · Dell 5420 ketla chhe? · Kul stock?<br>• Ochho stock? · Udhar ketlu baki? · Vendor ne ketla aapvana?';
const AI_CHIPS = [['🛠 Service kholo', 'service kholo'], ['➕ Navo job', 'navo job'], ['🧾 POS kholo', 'pos kholo'], ['Aaj nu vechan', 'aaj nu vechan'], ['Aaj no nafo', 'aaj no nafo'], ['Aa mahino', 'aa mahine nu vechan ane nafo'], ['Laptop ketla?', 'ketla laptop che'], ['Kul stock', 'kul stock'], ['Ochho stock', 'ochho stock'], ['Udhar baki', 'udhar ketlu baki'], ['Vendor baki', 'vendor ne ketla aapvana baki']];
function Chat() {
  const sr = window.SpeechRecognition || window.webkitSpeechRecognition;
  const [log, setLog] = useState([]), [q, setQ] = useState(''), [lang, setLang] = useState(() => { try { return localStorage.getItem('ccAiLang') || 'gu-IN'; } catch (e) { return 'gu-IN'; } }), [mic, setMic] = useState(false);
  const box = useRef(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [log]);
  const ask = async v => {
    if (!String(v || '').trim()) return;
    const id = Date.now() + Math.random();
    setLog(l => l.concat([{ me: true, h: esc(v) }, { id, h: '…' }]));
    let h; try { h = await aiAnswer(v); } catch (e) { h = '⚠ ' + esc(e.message); }
    setLog(l => l.map(x => x.id === id ? { ...x, h } : x));
  };
  const listen = () => {
    const rec = new sr(); rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 1;
    try { localStorage.setItem('ccAiLang', lang); } catch (e) { }
    setMic(true); rec.onresult = e => ask(e.results[0][0].transcript);
    rec.onerror = e => toast(e.error === 'not-allowed' ? 'Mic ni permission aapo (Allow)' : 'Avaj na sambhlayo, farithi bolo', 'bad');
    rec.onend = () => setMic(false); rec.start();
  };
  return <Box>
    <Box ref={box} sx={{ maxHeight: '50vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Alert severity="info">Namaste! Gujarati, Hindi ke English ma puchho – lakhi ne ke 🎤 boli ne.</Alert>
      {log.map((x, i) => <Box key={i} sx={{ alignSelf: x.me ? 'flex-end' : 'flex-start', bgcolor: x.me ? '#0b1f4b' : '#f1f5f9', color: x.me ? '#fff' : '#0f172a', px: 1.5, py: 1, borderRadius: 3, maxWidth: '90%', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: x.h }} />)}
    </Box>
    <Stack direction="row" flexWrap="wrap" gap={.8} sx={{ my: 1.5 }}>{AI_CHIPS.filter(c => isAdmin() || !/vechan|nafo|mahino|baki/.test(c[1])).map(c => <Button key={c[1]} size="small" variant="outlined" onClick={() => ask(c[1])}>{c[0]}</Button>)}</Stack>
    <TextField fullWidth autoFocus placeholder="Lakho: service kholo / aaj nu vechan" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { ask(q); setQ(''); } }} sx={{ mb: 1 }} />
    <Stack direction="row" gap={1} alignItems="center">
      {sr && <><Select size="small" value={lang} onChange={e => setLang(e.target.value)}><MenuItem value="gu-IN">ગુજ</MenuItem><MenuItem value="hi-IN">हिं</MenuItem><MenuItem value="en-IN">Eng</MenuItem></Select><Button fullWidth variant="outlined" onClick={listen}>{mic ? '🔴' : '🎤 Bolo'}</Button></>}
      <Button variant="contained" onClick={() => { ask(q); setQ(''); }}>➤ Moklo</Button>
    </Stack>
  </Box>;
}
export function openAssistant() { const d = openDialog('🤖 C COMPUTER Assistant', () => <Chat />, { maxWidth: 'sm', onClose: () => { AI.close = null; } }); AI.close = d.close; }
