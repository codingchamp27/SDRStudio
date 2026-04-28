import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/sdrangel': {
        target: 'http://127.0.0.1:8091',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'sdr-file-uploadPlugin',
      configureServer(server) {
        server.middlewares.use('/api/open-video', async (req, res) => {
          if (req.method !== 'POST') return res.end();
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            try {
              const { filePath } = JSON.parse(body);
              const { exec } = await import('child_process');
              exec(`mpv "${filePath}" 2>/dev/null || vlc "${filePath}" 2>/dev/null || xdg-open "${filePath}" 2>/dev/null &`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (e) { res.statusCode = 400; res.end('Bad request'); }
          });
        });

        server.middlewares.use('/api/stat', async (req, res) => {
          const fs = await import('fs');
          const url = new URL(req.url || '/', `http://${req.headers.host}`);
          const file = url.searchParams.get('path');
          if (!file) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ exists: false }));
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ exists: fs.existsSync(file) }));
        });

        server.middlewares.use('/api/transcode', async (req, res) => {
          if (req.method !== 'POST') return res.end();
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            try {
              const { filePath } = JSON.parse(body);
              if (!filePath) { res.statusCode = 400; return res.end(); }
              const fs = await import('fs');
              const { exec } = await import('child_process');
              
              const optimizedPath = filePath.replace(/\.[^/.]+$/, "") + '_web.mp4';
              
              if (fs.existsSync(optimizedPath)) {
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ ok: true, optimizedPath }));
              }
              
              exec(`ffmpeg -y -i "${filePath}" -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -movflags +faststart "${optimizedPath}"`, (err) => {
                res.setHeader('Content-Type', 'application/json');
                if (err) {
                  res.end(JSON.stringify({ ok: false, error: err.message }));
                } else {
                  res.end(JSON.stringify({ ok: true, optimizedPath }));
                }
              });
            } catch (e) { res.statusCode = 400; res.end('Bad request'); }
          });
        });

        server.middlewares.use('/api/stream', async (req, res) => {
          const fs = await import('fs');
          const url = new URL(req.url || '/', `http://${req.headers.host}`);
          const file = url.searchParams.get('path');
          if (!file || !fs.existsSync(file)) {
             res.statusCode = 404; return res.end('Not found');
          }
          
          const stat = fs.statSync(file);
          const fileSize = stat.size;
          const range = req.headers.range;

          const contentType = file.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/mp2t';

          if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const fileStream = fs.createReadStream(file, { start, end });
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*'
            });
            fileStream.pipe(res);
          } else {
            res.writeHead(200, {
              'Content-Length': fileSize,
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*'
            });
            fs.createReadStream(file).pipe(res);
          }
        });

        server.middlewares.use('/api/browse', async (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
          const { exec } = await import('child_process');
          // Try zenity (GNOME) or kdialog (KDE) — both return the selected path on stdout
          const cmd = `zenity --file-selection --title="Select TS / video file" --file-filter="Media files | *.ts *.mp4 *.mpg *.mpeg *.mkv *.avi" 2>/dev/null || kdialog --getopenfilename "$HOME" "*.ts *.mp4 *.mpg *.mpeg *.mkv *.avi" 2>/dev/null`;
          exec(cmd, (err, stdout) => {
            res.setHeader('Content-Type', 'application/json');
            if (err || !stdout.trim()) {
              return res.end(JSON.stringify({ cancelled: true }));
            }
            res.end(JSON.stringify({ path: stdout.trim() }));
          });
        });

        server.middlewares.use('/api/upload', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            return res.end('Method not allowed');
          }

          const fs = await import('fs');
          const path = await import('path');

          const uploadDir = path.resolve(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const rawFileName = req.headers['x-file-name'] || `upload_${Date.now()}`;
          const decodedFileName = decodeURIComponent(Array.isArray(rawFileName) ? rawFileName[0] : rawFileName);
          const safeName = decodedFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const filePath = path.join(uploadDir, safeName);

          const stream = fs.createWriteStream(filePath);
          req.pipe(stream);

          req.on('end', () => {
            stream.close();
          });

          stream.on('close', () => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ path: filePath }));
          });

          req.on('error', () => {
            res.statusCode = 500;
            res.end('Upload failed');
          });
        });
      }
    }
  ]
})
