# C COMPUTER ERP – React version (test)

Same ERP as `main` (same Google Apps Script backend, same data and rules), rebuilt with **React 18 + Vite + MUI (Material UI)**. JavaScript only, no TypeScript.

## Run on your computer
```
npm install
npm run dev      # opens http://localhost:5173
npm run build    # makes ONE file: dist/index.html
```
`dist/index.html` is a single self-contained file (same as the live `index.html`), so it can be hosted on GitHub Pages as is.

## Folders
- `src/lib` – core (api + cache, login, language, navigation, shared MUI pieces)
- `src/pages` – one file per screen (Dashboard, Products, Purchase, POS, Sales, Quotations, Price Compare, Stock, Serial, Customers, Build PC, Build Record, Audit, Stickers, Reports, Service/CRM, Cash Book, Fixed Kharcha, Replacement, AI Bill Scanner, Users, Settings)
- `src/docs` – invoice, quotation and replacement A4 documents (same design as live)

Test preview: https://ccomputersalesservice-ship-it.github.io/c-computer-erp-react/
