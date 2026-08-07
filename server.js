const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

const STUDENTS_LOCAL = path.join(__dirname, 'students-local.json');

app.use(express.json({ limit: '1mb' }));

// Sensible Schülerdaten: NUR lokal servieren, wenn die Datei existiert.
// Auf Railway/Public-Deploys existiert sie nicht (.railwayignore + .gitignore).
app.get('/students.json', (req, res) => {
  if (fs.existsSync(STUDENTS_LOCAL)) {
    res.type('application/json').sendFile(STUDENTS_LOCAL);
  } else {
    res.status(404).json({ error: 'not deployed', reason: 'Sensible Daten werden bewusst nicht mitdeployt.' });
  }
});

// Optionaler KI-Proxy (OpenAI-kompatibel). Konfiguration ausschließlich per Env:
// FASKA_AI_BASE_URL z. B. http://localhost:11434/v1 oder https://api.moonshot.ai/v1
// FASKA_AI_API_KEY nur für entfernte Endpunkte; lokale Endpunkte dürfen keylos bleiben.
// FASKA_AI_MODEL z. B. kimi-k2.6 / qwen2.5 / llama3.1
app.post('/api/ai/chat', async (req, res) => {
  try {
    const base = (process.env.FASKA_AI_BASE_URL || process.env.OPENAI_BASE_URL || '').trim();
    const key = (process.env.FASKA_AI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
    const model = (process.env.FASKA_AI_MODEL || process.env.OPENAI_MODEL || 'kimi-k2.6').trim();
    const local = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(base);
    if (!base || typeof fetch !== 'function' || (!key && !local)) {
      return res.status(501).json({ error: 'KI nicht konfiguriert', fallback: true });
    }
    const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
    if (!messages.length) return res.status(400).json({ error: 'messages fehlen' });
    const safeMessages = messages.slice(-8).map(m => ({
      role: m.role === 'assistant' || m.role === 'system' ? m.role : 'user',
      content: String(m.content || '').slice(0, 5000)
    }));
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = 'Bearer ' + key;
    const r = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages: safeMessages, temperature: 0.35, max_tokens: 1100 })
    });
    const txt = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'KI-Endpunkt antwortete mit Fehler', status: r.status, detail: txt.slice(0, 400) });
    const j = JSON.parse(txt);
    res.json({ content: (((j.choices || [])[0] || {}).message || {}).content || '', model });
  } catch (e) {
    res.status(500).json({ error: 'KI-Proxy Fehler', detail: String(e && e.message || e).slice(0, 300), fallback: true });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`FASKA Invaria 2 running on port ${PORT}`));
