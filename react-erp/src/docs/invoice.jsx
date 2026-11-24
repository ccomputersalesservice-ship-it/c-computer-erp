/* A4 invoice + "WhatsApp PDF" helper - same code as the live ERP (JS_Invoice.html), as a module */
import { LOGO, qLoadJs, toast, esc } from '../lib/core.js';
import { openDialog } from '../lib/ui.jsx';
export const DOCS = { prods: [] };
/* A4 printable invoice (C COMPUTER design) — opens in a new tab, read-only from the order */
export function invWords(n) {
  n = Math.round(+n || 0); if (!n) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = x => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
  const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  const parts = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
  if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (n) parts.push(three(n));
  return parts.join(' ') + ' Rupees Only';
}
function invHsn(pid) {
  const p = (DOCS.prods || []).find(x => (x.productId || x.id || x.ProductID) === pid);
  const m = p && String(p.description || p.Description || '').match(/HSN\s*:?\s*(\d{4,8})/i); return m ? m[1] : '';
}
export function invoiceHtml(o) {
  const note = String(o.note || ''), e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = v => (Math.round((+v || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const payM = (note.match(/Pay:\s*([^·]+)/i) || [])[1] || '', pay = payM.trim().toLowerCase();
  const disc = +((note.match(/Disc\s+([\d.]+)/i) || [])[1] || 0), gst = /GST\s*18/i.test(note);
  const lines = (o.lines || []).map(l => ({ d: l.name + (l.model && !String(l.name).includes(l.model) ? ' ' + l.model : ''), sn: l.serial || '', hsn: invHsn(l.productId), q: +l.qty || 0, r: +l.unitPrice || 0 }));
  const rows = []; for (let i = 0; i < Math.max(10, lines.length); i++) rows.push(lines[i] || null);
  const cust = o.customer || {}, dt = String(o.date || '').slice(0, 10).split('-').reverse().join('-');
  const pays = [['Cash', /cash/], ['UPI', /upi/], ['Card', /card/], ['Bank Transfer', /bank/], ['Credit', /credit|udhar/]];
  const cats = [['💻', 'Laptops'], ['🖥️', 'Desktops'], ['🖨️', 'Printers'], ['🎧', 'Accessories'], ['📹', 'CCTV'], ['🛠️', 'Sales &amp; Service']];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${e(o.orderId)}</title><style>
@page{size:A4;margin:8mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0b1f4b;background:#e5e7eb}
.pg{width:194mm;min-height:281mm;margin:10px auto;background:#fff;border:2px solid #0b1f4b;display:flex;flex-direction:column}
.hd{display:flex;align-items:stretch;background:#0b1f4b;color:#fff}.hd .lg{background:#fff;padding:8px 14px;display:flex;align-items:center;border-bottom-right-radius:40px}
.hd .lg img{height:54px}.hd .ct{flex:1;padding:10px 16px;text-align:right;font-size:12.5px;line-height:1.6}.hd .ct b{color:#f5b800;font-size:17px}
.bar{height:6px;background:#f5b800}.ban{display:flex;align-items:center;justify-content:space-between;padding:8px 14px}
.ban h1{margin:0;background:#0b1f4b;color:#f5b800;padding:6px 26px;letter-spacing:4px;font-size:24px;border-radius:4px}
.ck{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:13px;margin-left:14px;cursor:pointer}.ck i{width:15px;height:15px;border:2px solid #0b1f4b;display:inline-block;text-align:center;font-style:normal;line-height:12px;font-size:12px}
.cats{display:flex;justify-content:space-around;margin:0 14px;padding:6px 0;border-top:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1}
.cats div{text-align:center;font-size:10.5px;font-weight:700}.cats span{display:block;width:28px;height:28px;margin:0 auto 2px;border-radius:50%;background:#f5b800;line-height:28px;font-size:15px}
.box2{display:flex;gap:10px;margin:10px 14px}.bx{flex:1;border:1.5px solid #0b1f4b;border-radius:4px;overflow:hidden}.bx h3{margin:0;background:#0b1f4b;color:#fff;font-size:12px;padding:5px 8px;letter-spacing:1px}
.bx table{width:100%;font-size:12px;border-collapse:collapse}.bx td{padding:4px 8px;vertical-align:top}.bx td:first-child{width:92px;font-weight:700}
table.it{width:calc(100% - 28px);margin:0 14px;border-collapse:collapse;font-size:12px}.it th{background:#0b1f4b;color:#fff;padding:6px 5px;border:1px solid #0b1f4b}
.it td{border:1px solid #94a3b8;padding:2px 5px;height:23px}.it td.n{text-align:right}.it td.c{text-align:center}.it small{color:#475569}
.bt{display:flex;gap:10px;margin:10px 14px}.bl{flex:1.2;font-size:12px}.bl .pm{border:1.5px solid #0b1f4b;border-radius:4px;padding:6px 8px;margin-bottom:8px}.bl .pm b{display:block;margin-bottom:5px}
.bl .pm .ck{margin:0 12px 4px 0;font-size:12px}.aw{border:1.5px solid #0b1f4b;border-radius:4px;padding:6px 8px;min-height:44px}
.tt{flex:1;border:1.5px solid #0b1f4b;border-radius:4px;overflow:hidden}.tt table{width:100%;border-collapse:collapse;font-size:12.5px}.tt td{padding:3px 8px;border-bottom:1px solid #cbd5e1}.tt td:last-child{text-align:right;font-weight:700}
.tt tr.g td{background:#f5b800;color:#0b1f4b;font-size:15px;font-weight:800;border:0}
.tc{margin:10px 14px 0;border:1.5px solid #0b1f4b;border-radius:4px;font-size:11px}.tc h3{margin:0;background:#0b1f4b;color:#f5b800;font-size:11.5px;padding:4px 8px;letter-spacing:1px}.tc ol{margin:5px 0 6px;padding-left:22px;line-height:1.5}
.sg{display:flex;justify-content:space-between;margin:auto 14px 0;padding:26px 0 6px;font-size:12px}.sg div{width:44%;text-align:center;border-top:1.5px solid #0b1f4b;padding-top:5px;font-weight:700}
.ft{background:#0b1f4b;color:#fff;text-align:center;padding:8px;font-size:13px}.ft b{color:#f5b800}
[contenteditable]:hover{outline:1px dashed #f5b800}
.tb{position:sticky;top:0;background:#0b1f4b;padding:8px;text-align:center;z-index:5}.tb button{font-size:16px;padding:10px 22px;border:0;border-radius:6px;background:#f5b800;color:#0b1f4b;font-weight:800;margin:0 4px}
.tb small{display:block;color:#cbd5e1;margin-top:4px}
@media print{body{background:#fff}.tb{display:none}.pg{margin:0;border-width:2px;min-height:279mm}[contenteditable]:hover{outline:0}}
@media screen and (max-width:760px){body{zoom:.5}}
</style></head><body>
<div class="tb"><button onclick="window.print()">🖨 Print / Save PDF (A4)</button><button onclick="window.close()">✖ Close</button><small>Box par click kari tick badli shako · lakhan par click kari sudharo</small></div>
<div class="pg">
 <div class="hd"><div class="lg"><img src="${LOGO}" alt="C COMPUTER"></div><div class="ct"><b>C COMPUTER</b> – THE COMPUTER HOUSE<br>📞 +91 81600 88439<br>📍 C-5, Near Business Fair, Laxmi Nagar Society,<br>Katargam Road, Surat – 395004</div></div>
 <div class="bar"></div>
 <div class="ban"><h1>INVOICE</h1><div><span class="ck" data-g="1"><i>${gst ? '✔' : ''}</i>GST Invoice</span><span class="ck" data-g="0"><i>${gst ? '' : '✔'}</i>Without GST</span></div></div>
 <div class="cats">${cats.map(c => `<div><span>${c[0]}</span>${c[1]}</div>`).join('')}</div>
 <div class="box2">
  <div class="bx"><h3>CUSTOMER DETAILS</h3><table><tr><td>Name</td><td contenteditable>${e(cust.name)}</td></tr><tr><td>Mobile</td><td contenteditable>${e(cust.mobile)}</td></tr><tr><td>Address</td><td contenteditable>${e(cust.address)}</td></tr></table></div>
  <div class="bx"><h3>INVOICE DETAILS</h3><table><tr><td>Invoice No.</td><td>${e(o.orderId)}</td></tr><tr><td>Date</td><td contenteditable>${e(dt)}</td></tr><tr><td>Ref. No.</td><td contenteditable></td></tr></table></div>
 </div>
 <table class="it"><thead><tr><th style="width:40px">Sr No</th><th>Item Description</th><th style="width:80px">HSN/SAC</th><th style="width:44px">Qty</th><th style="width:90px">Rate ₹</th><th style="width:100px">Amount ₹</th></tr></thead><tbody>
 ${rows.map((l, i) => l ? `<tr><td class="c">${i + 1}</td><td contenteditable><b>${e(l.d)}</b>${l.sn ? `<br><small>S/N: ${e(l.sn)}</small>` : ''}</td><td class="c" contenteditable>${e(l.hsn)}</td><td class="c">${l.q}</td><td class="n">${money(l.r)}</td><td class="n">${money(l.q * l.r)}</td></tr>` : `<tr><td class="c"></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
 </tbody></table>
 <div class="bt">
  <div class="bl"><div class="pm"><b>PAYMENT MODE</b>${pays.map(p => `<span class="ck"><i>${p[1].test(pay) ? '✔' : ''}</i>${p[0]}</span>`).join('')}${/hdfc|idbi/.test(pay) ? `<small> (${e(payM.trim())})</small>` : ''}</div>
   <div class="aw"><b>AMOUNT IN WORDS:</b><br><span id="aw"></span></div></div>
  <div class="tt"><table>
   <tr><td>Sub Total</td><td id="sub"></td></tr><tr><td>Discount</td><td id="dis"></td></tr><tr class="gr"><td>Taxable Amount</td><td id="tax"></td></tr>
   <tr class="gr"><td>CGST @ 9%</td><td id="cg"></td></tr><tr class="gr"><td>SGST @ 9%</td><td id="sg"></td></tr><tr class="g"><td>GRAND TOTAL ₹</td><td id="gt"></td></tr></table></div>
 </div>
 <div class="tc"><h3>TERMS &amp; CONDITIONS</h3><ol id="tcl" contenteditable></ol></div>
 <div class="sg"><div>Customer Signature</div><div>For C COMPUTER<br><br>Authorized Signature</div></div>
 <div class="ft">Thank you for choosing <b>C COMPUTER!</b> &nbsp;•&nbsp; Technology You Can Trust.</div>
</div>
<script>
var SUB=${lines.reduce((a, l) => a + l.q * l.r, 0)},DIS=${disc},GST=${gst ? 1 : 0};
function m(v){return (Math.round(v*100)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
var W=${invWords.toString()};
function calc(){var t=Math.max(0,SUB-DIS),g=GST?Math.round(t*0.09*100)/100:0,G=Math.round(t+2*g);
 document.getElementById('sub').textContent=m(SUB);document.getElementById('dis').textContent=DIS?'- '+m(DIS):m(0);document.getElementById('tax').textContent=m(t);
 document.getElementById('cg').textContent=m(g);document.getElementById('sg').textContent=m(g);document.getElementById('gt').textContent=m(G);document.getElementById('aw').textContent=W(G);document.querySelectorAll('tr.gr').forEach(function(r){r.style.display=GST?'':'none'});}
document.addEventListener('click',function(ev){var c=ev.target.closest('.ck');if(!c)return;
 if(c.dataset.g!=null){GST=+c.dataset.g;document.querySelectorAll('[data-g]').forEach(function(x){x.querySelector('i').textContent=(+x.dataset.g===GST)?'✔':''});calc();return;}
 var i=c.querySelector('i');i.textContent=i.textContent?'':'✔';});
var TCD=['Goods once sold will not be taken back or exchanged. (No Return)','Please check the product properly before leaving the shop.','Warranty / service as per company terms. For service, customer must bring the product to our shop or the company service centre.','No warranty for physical damage, burn, water damage, or broken / tampered seal.','Interest @18% p.a. will be charged if payment is not made on time.','Subject to Surat jurisdiction.'];
var TL=document.getElementById('tcl'),TS=null;try{TS=JSON.parse(localStorage.getItem('ccInvTerms')||'null')}catch(e){}
(TS||TCD).forEach(function(t){var li=document.createElement('li');li.textContent=t;TL.appendChild(li)});
TL.addEventListener('blur',function(){try{localStorage.setItem('ccInvTerms',JSON.stringify([].map.call(TL.querySelectorAll('li'),function(l){return l.textContent.trim()}).filter(Boolean)))}catch(e){}});
calc();
<\/script></body></html>`;
}
/* Make an A4 PDF from a printable page and send it on WhatsApp (phone: share sheet with PDF; laptop: download + open chat) */
export async function docPdfWa(html, fname, mobile, msg) {
  toast('⏳ PDF banave chhe…', '');
  if (!window.html2canvas) await qLoadJs(['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js']);
  if (!(window.jspdf && window.jspdf.jsPDF)) await qLoadJs(['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js']);
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0'; document.body.appendChild(f);
  let file;
  try {
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    await new Promise(r => setTimeout(r, 300));
    await Promise.race([Promise.all([...f.contentDocument.images].map(im => im.complete ? 1 : new Promise(r => { im.onload = im.onerror = r; }))), new Promise(r => setTimeout(r, 4000))]);
    const pg = f.contentDocument.querySelector('.pg'); pg.style.margin = '0';
    const cv = await window.html2canvas(pg, { scale: 1.6, backgroundColor: '#ffffff', windowWidth: 794 });
    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), h = cv.height * 210 / cv.width, fh = Math.min(h, 297), fw = 210 * fh / h;
    pdf.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', (210 - fw) / 2, 0, fw, fh);
    file = new File([pdf.output('blob')], fname.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf', { type: 'application/pdf' });
  } finally { f.remove(); }
  const d = String(mobile || '').replace(/\D/g, '').slice(-10);
  const phone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (phone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: msg }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    const mm = openDialog('📲 WhatsApp par mokalo', () => <p>PDF taiyar chhe. Niche button dabavo, pachhi <b>WhatsApp</b> ane customer pasand karo.</p>, { maxWidth: 'xs', actions: () => <button className="MuiButton-root" style={{ padding: '14px 20px', fontSize: 16, background: '#16a34a', color: '#fff', border: 0, borderRadius: 10, fontWeight: 700 }} onClick={async () => { try { await navigator.share({ files: [file], text: msg }); mm.close(); } catch (e) { if (e && e.name !== 'AbortError') toast('Share nathi thatu', 'bad'); } }}>📲 PDF mokalo</button> });
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  window.open(`https://wa.me/${d.length === 10 ? '91' + d : ''}?text=${encodeURIComponent(msg)}`, '_blank');
  openDialog('📲 WhatsApp', () => <><p><b>{file.name}</b> download thai gai chhe.</p><ol style={{ lineHeight: 1.8, paddingLeft: 20 }}><li>WhatsApp ma customer ni chat khuli gai chhe.</li><li>📎 (attach) dabavo → <b>Document</b>.</li><li>Downloads mathi aa PDF pasand kari ne mokalo.</li></ol></>, { maxWidth: 'xs' });
}
export function printInvoice(o) {
  const w = window.open('', '_blank');
  if (!w) return toast('Popup block thayu — browser ma popups allow karo', 'bad');
  w.document.open(); w.document.write(invoiceHtml(o)); w.document.close();
}
