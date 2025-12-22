import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// ====== ŚCIEŻKI ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());

// 🔑 KLUCZOWE: serwujemy CAŁY katalog główny jako static
// dzięki temu dostępne są:
// /index.html
// /manifest.json
// /sw.js
app.use(express.static(__dirname));

// ====== STAN APLIKACJI ======
let chaos = [];
let currentTask = null;
let status = "IDLE"; // IDLE | DECIDED | DOING
let skipped = {}; // { task: timestamp }

// ====== LOGIKA ======
function decideNowTask(tasks) {
  const now = Date.now();
  const COOLDOWN = 1000 * 60 * 60; // 1h

  const available = tasks.filter(t => {
    if (!skipped[t]) return true;
    return now - skipped[t] > COOLDOWN;
  });

  return available[0] || tasks[0];
}

// ====== ROUTES API ======

app.get("/state", (req, res) => {
  res.json({
    status,
    chaos,
    currentTask
  });
});

app.post("/tasks", (req, res) => {
  chaos = req.body.tasks || [];
  currentTask = null;
  skipped = {};
  status = "IDLE";
  res.json({ status, chaos });
});

app.post("/decide", (req, res) => {
  if (!chaos.length) {
    return res.json({ task: null });
  }

  currentTask = decideNowTask(chaos);
  status = "DECIDED";
  res.json({ task: currentTask });
});

app.post("/start", (req, res) => {
  if (currentTask) {
    status = "DOING";
  }
  res.json({ status });
});

app.post("/done", (req, res) => {
  if (currentTask) {
    chaos = chaos.filter(t => t !== currentTask);
    delete skipped[currentTask];
  }
  currentTask = null;
  status = "IDLE";
  res.json({ status, chaos });
});

app.post("/later", (req, res) => {
  if (currentTask) {
    skipped[currentTask] = Date.now();
  }
  currentTask = null;
  status = "IDLE";
  res.json({ status });
});

// ====== START SERWERA ======
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("NOW backend działa na porcie", PORT);
});
