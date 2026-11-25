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
