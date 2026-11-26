import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App.jsx';
import './global.css';

const theme = createTheme({
  palette: { primary: { main: '#4b5563', 50: '#f3f4f6', contrastText: '#fff' }, secondary: { main: '#7c3aed' }, background: { default: '#f6f7fb' } },
  shape: { borderRadius: 12 },
  typography: { fontFamily: '"Segoe UI", Roboto, Arial, sans-serif', button: { textTransform: 'none', fontWeight: 700 } },
  components: {
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #eceef3' } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 14 } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiButton: { styleOverrides: { root: { borderRadius: 10 } } }
  }
});
createRoot(document.getElementById('root')).render(<ThemeProvider theme={theme}><CssBaseline /><App /></ThemeProvider>);
import { go as __go } from './lib/nav.js'; window.ccGo = __go;

// Auto-update: when a newer build is published, reload by itself (checked on open, on return to the app, and every 3 min)
(function () {
  let busy = false;
  async function chk() {
    if (busy || typeof __BUILD__ === 'undefined') return; busy = true;
    try {
      const v = (await fetch('./version.txt?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '')).trim();
      if (/^\d{10,}$/.test(v) && v !== __BUILD__ && !document.querySelector('[role=dialog]')) location.reload();
    } catch (e) { }
    busy = false;
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) chk(); });
  setInterval(chk, 180000); setTimeout(chk, 4000);
})();
