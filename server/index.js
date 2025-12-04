// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();

// ===== CORRECT CORS (NO TRAILING SLASH!) =====
// Put ONLY your Netlify URL
app.use(cors({
  origin: 'https://idyllic-taffy-1ef859.netlify.app',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(bodyParser.json());

// ===== File upload =====
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// ===== CSV =====
function parseCsv(filePath) {
  const csvString = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });

  return parsed.data.map(r => ({
    name: (r.name || r.Name || '').trim(),
    email: (r.email || r.Email || '').trim(),
    notes: (r.notes || r.Notes || '').trim()
  })).filter(p => p.name);
}

// ===== XLSX =====
function parseXlsx(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return json.map(r => ({
    name: (r.name || r.Name || '').trim(),
    email: (r.email || r.Email || '').trim(),
    notes: (r.notes || r.Notes || '').trim()
  })).filter(p => p.name);
}

// ===== Unified parse =====
function parseUploadedFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.csv') return parseCsv(filePath);
  if (ext === '.xlsx') return parseXlsx(filePath);
  throw new Error('Unsupported format — upload CSV/XLSX');
}

// ===== Upload API =====
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const participants = parseUploadedFile(req.file.path, req.file.originalname);

    fs.unlink(req.file.path, () => {});

    res.json(participants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Parsing failed', error: err.message });
  }
});

// ===== Helper =====
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ===== Pairing =====
app.post('/api/pair', (req, res) => {
  try {
    const participants = (req.body.participants || []).filter(p => p.name);

    if (participants.length < 2) {
      return res.status(400).json({ message: 'Need at least 2 participants' });
    }

    let receivers = [...participants];
    let attempts = 0;

    while (attempts < 2000) {
      shuffle(receivers);
      const valid = receivers.every((r, i) => r.name !== participants[i].name);
      if (valid) break;
      attempts++;
    }

    if (attempts >= 2000)
      return res.status(500).json({ message: 'Unable to generate pairs' });

    const pairs = participants.map((g, i) => ({
      giver: g,
      receiver: receivers[i]
    }));

    res.json(pairs);
  } catch (err) {
    res.status(500).json({ message: 'Pairing failed', error: err.message });
  }
});

// ===== Send Email =====
app.post('/api/send-emails', async (req, res) => {
  const pairs = req.body.pairs || [];

  if (!pairs.length) return res.status(400).json({ message: 'No pairs' });

  try {
    let transporter;

    if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    }

    const results = [];
    for (const pair of pairs) {
      if (!pair.giver.email) {
        results.push({ giver: pair.giver.name, status: 'no-email' });
        continue;
      }

      const info = await transporter.sendMail({
        from: 'Secret Santa <noreply@santa.com>',
        to: pair.giver.email,
        subject: 'Your Secret Santa Match!',
        html: `
          <h2>Your Secret Santa is: ${pair.receiver.name}</h2>
          <p>Have fun! 🎁🎅</p>
        `
      });

      results.push({ giver: pair.giver.name, info });
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: 'Email error', error: err.message });
  }
});

// ===== Default route (Fix for "Cannot GET /") =====
app.get('/', (req, res) => {
  res.send('Backend running ✔');
});

// ===== Start =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
