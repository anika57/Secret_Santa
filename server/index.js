require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Papa = require("papaparse");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();

/* ------------------ CORS ------------------ */
app.use(
  cors({
    origin: [
      "http://localhost:4200",
      "https://idyllic-taffy-1ef859.netlify.app",
      "https://secret-santa-cwjo.onrender.com"
    ],
    methods: ["GET", "POST", "OPTIONS"],
  })
);

/* ------------------ JSON ------------------ */
app.use(bodyParser.json());

/* ------------------ Ensure uploads folder exists ------------------ */
const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

/* ------------------ Multer ------------------ */
const upload = multer({ dest: uploadPath });

/* ------------------ CSV Parser ------------------ */
function parseCsv(filePath) {
  const csvString = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true
  });

  return parsed.data
    .map((r) => ({
      name: (r.name || r.Name || "").trim(),
      email: (r.email || r.Email || "").trim(),
      notes: (r.notes || r.Notes || "").trim(),
    }))
    .filter((p) => p.name);
}

/* ------------------ XLSX Parser ------------------ */
function parseXlsx(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return json
    .map((r) => ({
      name: (r.name || r.Name || "").trim(),
      email: (r.email || r.Email || "").trim(),
      notes: (r.notes || r.Notes || "").trim(),
    }))
    .filter((p) => p.name);
}

/* ------------------ Upload Endpoint ------------------ */
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const participants = req.file.originalname.endsWith(".csv")
      ? parseCsv(req.file.path)
      : parseXlsx(req.file.path);

    fs.unlinkSync(req.file.path);

    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ Shuffle ------------------ */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ------------------ Pairing ------------------ */
app.post("/api/pair", (req, res) => {
  let participants = req.body.participants;

  if (!participants || !Array.isArray(participants))
    return res.status(400).json({ error: "Invalid participants" });

  // ensure every participant has a name
  participants = participants.filter((p) => p && p.name && p.name.trim());

  if (participants.length < 2)
    return res.status(400).json({ error: "Need at least 2 participants" });

  let receivers = participants.map((p) => ({ ...p }));
  let attempts = 0;
  let pairs = [];

  while (attempts < 2000) {
    shuffle(receivers);

    pairs = participants.map((giver, i) => ({
      giver,
      receiver: receivers[i],
    }));

    if (!pairs.some((p) => p.giver.name === p.receiver.name)) break;

    attempts++;
  }

  if (attempts >= 2000)
    return res.status(500).json({ error: "Pair generation failed" });

  res.json(pairs);
});

/* ------------------ Email Sending (BREVO RECOMMENDED) ------------------ */
app.post("/api/send-emails", async (req, res) => {
  const pairs = req.body.pairs || [];

  try {
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, // IMPORTANT for Brevo with port 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });


    const results = [];

    for (const pair of pairs) {
      if (!pair.giver.email) {
        results.push({ giver: pair.giver.name, status: "no-email" });
        continue;
      }

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: pair.giver.email,
        subject: "Your Secret Santa Match 🎁",
        text: `You will give a gift to: ${pair.receiver.name}`,
      });

      results.push({ giver: pair.giver.name, status: "sent" });
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ Server ------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
