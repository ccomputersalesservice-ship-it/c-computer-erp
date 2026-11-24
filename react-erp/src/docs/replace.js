/* Replacement receipt (A4) - same HTML as the live ERP (JS_Replace.html) */
import { LOGO } from '../lib/core.js';
export const REP_GU = { 'Received': '🏪 Haju shop ma chhe', 'Sent to Company': '🏭 Service center / company ne aapyu', 'Replacement Received': '📦 Navu aavi gayu (shop ma)', 'Given to Customer': '✅ Customer ne aapi didhu', 'Rejected': '❌ Reject' };
export function rpTime(x) { const t = String(((x.log || [])[0] || {}).t || ''); const m = t.match(/(\d{2}):(\d{2})/); if (!m) return ''; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m[2] + ' ' + ap; }
export function rpHtml(x) {
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dt = String(x.date || '').split('-').reverse().join('-');
  const R = (k, v) => `<tr><td>${k}</td><td>${e(v) || '&nbsp;'}</td></tr>`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Replacement ${e(x.id)}</title><style>
@page{size:A4;margin:8mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0b1f4b;background:#e5e7eb}
.pg{width:194mm;min-height:281mm;margin:10px auto;background:#fff;border:2px solid #0b1f4b;display:flex;flex-direction:column}
.hd{display:flex;background:#0b1f4b;color:#fff}.hd .lg{background:#fff;padding:8px 14px;display:flex;align-items:center;border-bottom-right-radius:40px}.hd .lg img{height:54px}
.hd .ct{flex:1;padding:10px 16px;text-align:right;font-size:12.5px;line-height:1.6}.hd .ct b{color:#f5b800;font-size:17px}.bar{height:6px;background:#f5b800}
.ban{display:flex;align-items:center;justify-content:space-between;padding:10px 14px}.ban h1{margin:0;background:#0b1f4b;color:#f5b800;padding:6px 22px;letter-spacing:3px;font-size:21px;border-radius:4px}
.ban .no{font-size:13px;text-align:right;line-height:1.6}.box2{display:flex;gap:10px;margin:6px 14px}.bx{flex:1;border:1.5px solid #0b1f4b;border-radius:4px;overflow:hidden}
.bx h3{margin:0;background:#0b1f4b;color:#fff;font-size:12px;padding:5px 8px;letter-spacing:1px}.bx table{width:100%;font-size:13px;border-collapse:collapse}.bx td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}.bx td:first-child{width:130px;font-weight:700}
.st{margin:10px 14px;padding:10px;border:2px dashed #f5b800;border-radius:6px;font-size:14px;text-align:center;font-weight:700}
.tc{margin:10px 14px 0;border:1.5px solid #0b1f4b;border-radius:4px;font-size:11.5px}.tc h3{margin:0;background:#0b1f4b;color:#f5b800;font-size:11.5px;padding:4px 8px;letter-spacing:1px}.tc ol{margin:6px 0;padding-left:22px;line-height:1.6}
.sg{display:flex;justify-content:space-between;margin:auto 14px 0;padding:30px 0 8px;font-size:12px}.sg div{width:44%;text-align:center;border-top:1.5px solid #0b1f4b;padding-top:5px;font-weight:700}
.ft{background:#0b1f4b;color:#fff;text-align:center;padding:8px;font-size:13px}.ft b{color:#f5b800}
.tb{position:sticky;top:0;background:#0b1f4b;padding:8px;text-align:center}.tb button{font-size:16px;padding:10px 22px;border:0;border-radius:6px;background:#f5b800;color:#0b1f4b;font-weight:800;margin:0 4px}
@media print{body{background:#fff}.tb{display:none}.pg{margin:0;min-height:279mm}}@media screen and (max-width:760px){body{zoom:.5}}
</style></head><body><div class="tb"><button onclick="window.print()">🖨 Print / Save PDF (A4)</button><button onclick="window.close()">✖ Close</button></div>
<div class="pg"><div class="hd"><div class="lg"><img src="${LOGO}" alt="C COMPUTER"></div><div class="ct"><b>C COMPUTER</b> – THE COMPUTER HOUSE<br>📞 +91 81600 88439<br>📍 C-5, Near Business Fair, Laxmi Nagar Society,<br>Katargam Road, Surat – 395004</div></div><div class="bar"></div>
<div class="ban"><h1>REPLACEMENT RECEIPT</h1><div class="no"><b>Receipt No.:</b> ${e(x.id)}<br><b>Date:</b> ${e(dt)} ${e(rpTime(x))}</div></div>
<div class="box2"><div class="bx"><h3>CUSTOMER DETAILS</h3><table>${R('Name', x.name)}${R('Mobile', x.mobile)}${R('Purchase Bill No.', x.billNo)}</table></div>
<div class="bx"><h3>PRODUCT DETAILS</h3><table>${R('Product', x.product)}${R('Capacity', x.size)}${R('Brand / Model', x.brand)}${R('Old Serial No.', x.oldSerial)}${x.newSerial ? R('New Serial No.', x.newSerial) : ''}</table></div></div>
<div class="box2"><div class="bx"><h3>SERVICE DETAILS</h3><table>${R('Problem', x.note)}${R('Sent to', x.company)}${R('Received by (Staff)', x.by)}</table></div></div>
<div class="st">Current Status: ${e(({ 'Received': 'Product received at shop', 'Sent to Company': 'Sent to company / service center', 'Replacement Received': 'Replacement received – ready to collect', 'Given to Customer': 'Delivered to customer', 'Rejected': 'Rejected by company' })[x.status] || x.status)}</div>
<div class="tc"><h3>TERMS &amp; CONDITIONS</h3><ol>
<li>Replacement / repair is as per company warranty policy. Final decision is of the company.</li>
<li>Replacement usually takes 15 to 30 working days. Time depends on the company.</li>
<li>No warranty for physical damage, burn, water damage, or broken / tampered seal.</li>
<li>C COMPUTER is not responsible for data inside the product. Please keep your own data backup.</li>
<li>Please bring this receipt when collecting the product.</li>
<li>Product not collected within 60 days of intimation, shop is not responsible.</li></ol></div>
<div class="sg"><div>Customer Signature</div><div>For C COMPUTER<br><br>Authorized Signature</div></div>
<div class="ft">Thank you for choosing <b>C COMPUTER!</b> &nbsp;•&nbsp; Technology You Can Trust.</div></div></body></html>`;
  return html;
}
