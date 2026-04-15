const express = require("express");
const cors = require("cors");
const path = require("path");

const uploadRouter = require("./uploadTs");

const app = express();
app.use(cors());
app.use(express.json());

const uploadsPath = path.join(__dirname, "uploads");

app.use(
  "/uploads",
  express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  })
);


app.use("/api", uploadRouter);


const fs = require("fs");

app.get("/api/latest-mp4", (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) return res.status(404).json({ error: "no uploads directory" });

    const files = fs.readdirSync(uploadsDir)
      .filter((f) => f.toLowerCase().endsWith(".mp4"))
      .map((f) => {
        const stat = fs.statSync(path.join(uploadsDir, f));
        return { name: f, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (!files.length) return res.status(404).json({ error: "no mp4 files" });

    const latest = files[0].name;
    return res.json({ mp4Url: `/uploads/${latest}` });
  } catch (err) {
    console.error("error listing uploads:", err);
    return res.status(500).json({ error: "server error" });
  }
});



app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Upload/convert server running on http://localhost:${PORT}`));
