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

          const fileName = req.headers['x-file-name'] || `upload_${Date.now()}`;
          const safeName = Array.isArray(fileName) ? fileName[0] : fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const filePath = path.join(uploadDir, safeName);

          const stream = fs.createWriteStream(filePath);
          req.pipe(stream);

          req.on('end', () => {
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
