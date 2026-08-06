const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

const STUDENTS_LOCAL = path.join(__dirname, 'students-local.json');

// Sensible Schülerdaten: NUR lokal servieren, wenn die Datei existiert.
// Auf Railway/Public-Deploys existiert sie nicht (.railwayignore + .gitignore).
app.get('/students.json', (req, res) => {
  if (fs.existsSync(STUDENTS_LOCAL)) {
    res.type('application/json').sendFile(STUDENTS_LOCAL);
  } else {
    res.status(404).json({ error: 'not deployed', reason: 'Sensible Daten werden bewusst nicht mitdeployt.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`FASKA Invaria 2 running on port ${PORT}`));
