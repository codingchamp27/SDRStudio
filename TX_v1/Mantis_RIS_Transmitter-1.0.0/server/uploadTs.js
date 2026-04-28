const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const router = express.Router();
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, unique);
  },
});
const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 1024 } });

function pruneFiles(keepNames = []) {
  try {
    const files = fs.readdirSync(uploadDir);
    for (const f of files) {
      const lower = f.toLowerCase();
      if ((lower.endsWith(".mp4") || lower.endsWith(".ts")) && !keepNames.includes(f)) {
        try {
          fs.unlinkSync(path.join(uploadDir, f));
        } catch (e) {
          console.warn("Failed to delete file during prune:", f, e);
        }
      }
    }
  } catch (e) {
    console.error("pruneFiles error:", e);
  }
}

router.post("/upload-ts", upload.single("tsfile"), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const inputPath = file.path;
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const tempOutName = `${baseName}-${Date.now()}.mp4`;
    const tempOutPath = path.join(uploadDir, tempOutName);

    const latestMp4Name = "latest.mp4";
    const latestMp4Path = path.join(uploadDir, latestMp4Name);
    const latestTsName = "latest.ts";
    const latestTsPath = path.join(uploadDir, latestTsName);

    const args = [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      tempOutPath,
    ];

    const ff = spawn("ffmpeg", args);

    ff.stderr.on("data", (d) => {
      process.stderr.write(`[ffmpeg] ${d}`);
    });

    ff.on("error", (err) => {
      console.error("ffmpeg spawn error:", err);
      try { if (fs.existsSync(tempOutPath)) fs.unlinkSync(tempOutPath); } catch (e) {}
      return res.status(500).json({ error: "ffmpeg spawn failed" });
    });

    ff.on("close", (code) => {
      if (code !== 0 || !fs.existsSync(tempOutPath)) {
        console.error("ffmpeg failed (code):", code);
        try { if (fs.existsSync(tempOutPath)) fs.unlinkSync(tempOutPath); } catch (e) {}
        return res.status(500).json({ error: "Conversion failed" });
      }

      try {
        if (fs.existsSync(latestMp4Path)) {
          try { fs.unlinkSync(latestMp4Path); } catch (e) { console.warn(e); }
        }
        fs.renameSync(tempOutPath, latestMp4Path);

        try {
          if (fs.existsSync(latestTsPath)) {
            try { fs.unlinkSync(latestTsPath); } catch (e) { console.warn(e); }
          }
          fs.renameSync(inputPath, latestTsPath);
        } catch (e) {
          console.warn("rename inputPath -> latest.ts failed, attempting copy fallback", e);
          try {
            fs.copyFileSync(inputPath, latestTsPath);
            fs.unlinkSync(inputPath);
          } catch (e2) {
            console.error("Failed to move/copy uploaded TS to latest.ts:", e2);
          }
        }

        pruneFiles([latestMp4Name, latestTsName]);

        return res.json({
          mp4Url: `/uploads/${latestMp4Name}`,
          tsPath: latestTsPath,
        });
      } catch (err) {
        console.error("Post-conversion file handling error:", err);
        try { if (fs.existsSync(tempOutPath)) fs.unlinkSync(tempOutPath); } catch (e) {}
        return res.status(500).json({ error: "Server post-conversion error" });
      }
    });
  } catch (err) {
    console.error("upload-ts error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
