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

// ===== CORS: allow only your Netlify frontend =====
app.use(cors({
  origin: 'https://idyllic-taffy-1ef859.netlify.app/', 
  methods: ['GET','POST','OPTIONS'],
  credentials: true
}));

app.use(bodyParser.json());

// ===== File upload setup =====
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// ===== CSV parser =====
function parseCsv(filePath) {
  const csvString = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });

  if (parsed.errors && parsed.errors.length) throw parsed.errors[0];

  return parsed.data.map(r => ({
    name: (r.name || r.Name || r.fullname || r.full_name || '').trim(),
    email: (r.email || r.Email || '').trim(),
    notes: (r.notes || r.Notes || '').trim()
  })).filter(p => p.name);
}

// ===== XLSX parser =====
function parseXlsx(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]]; 
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return json.map(r => ({
    name: (r.name || r.Name || r.fullname || r.full_name || '').trim(),
    email: (r.email || r.Email || '').trim(),
    notes: (r.notes || r.Notes || '').trim()
  })).filter(p => p.name);
}

// ===== Unified parser =====
function parseUploadedFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.csv') return parseCsv(filePath);
  if (ext === '.xlsx') return parseXlsx(filePath);
  throw new Error('Unsupported file format. Upload CSV or XLSX.');
}

// ===== Upload endpoint =====
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const participants = parseUploadedFile(req.file.path, req.file.originalname);
    fs.unlink(req.file.path, () => {}); // cleanup
    res.json(participants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'File parse failed', error: err.message });
  }
});

// ===== Pairing helper =====
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ===== Pairing endpoint =====
app.post('/api/pair', (req, res) => {
  try {
    const participants = (req.body.participants || [])
      .filter(p => p && p.name)
      .map(p => ({ name: p.name, email: p.email, notes: p.notes }));

    if (participants.length < 2)
      return res.status(400).json({ message: 'Need at least 2 participants' });

    let receivers = participants.map(p => ({ ...p }));
    let attempts = 0;
    let pairs = [];

    while (attempts < 2000) {
      shuffle(receivers);
      let valid = true;

      pairs = participants.map((giver, i) => ({ giver, receiver: receivers[i] }));
      if (pairs.some(p => p.giver.name === p.receiver.name)) valid = false;

      if (valid) break;
      attempts++;
    }

    if (attempts >= 2000)
      return res.status(500).json({ message: 'Could not create valid pairs' });

    res.json(pairs);
  } catch (err) {
    res.status(500).json({ message: 'Pairing failed', error: err.message });
  }
});

// ===== Send emails endpoint =====
app.post('/api/send-emails', async (req, res) => {
  const pairs = req.body.pairs || [];
  if (!pairs.length) return res.status(400).json({ message: 'No pairs to email' });

  try {
    let transporter;

    // Use real SMTP if provided in .env
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    } else {
      // Fallback: Ethereal test account
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

      const mail = {
        from: process.env.EMAIL_FROM || 'Secret Santa Organizer <noreply@santa.com>',
        to: pair.giver.email,
        subject: "🎅 Your Secret Santa Match!",
        text: `Your Secret Santa assignment is ready!`,
        html: `
          <div style="font-family: Arial; padding:20px;">
            <h2 style="color:#d62828;">🎄 Secret Santa Assignment 🎁</h2>
            <p>Hello <strong>${pair.giver.name}</strong>,</p>
            <p>You have been assigned to give a gift to:</p>
            <h3 style="color:#2a9d8f;">${pair.receiver.name}</h3>
            <img src="https://media4.giphy.com/media/K90ckojkohXfW/giphy.gif" style="width:200px; margin-top:20px;" />
            <p style="margin-top:20px;">Happy Secret Santa! 🎅🎁</p>
          </div>
        `
      };

      const info = await transporter.sendMail(mail);
      results.push({
        giver: pair.giver.name,
        status: 'sent',
        info: info.messageId,
        preview: nodemailer.getTestMessageUrl(info)
      });
    }

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Email sending failed', error: err.message });
  }
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
