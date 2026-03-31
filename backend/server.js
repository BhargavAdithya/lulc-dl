const express  = require('express');
const multer   = require('multer');
const axios    = require('axios');
const FormData = require('form-data');
const cors     = require('cors');
require('dotenv').config();

const app              = express();
const PORT             = process.env.PORT             || 4000;
const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL || 'http://localhost:5000';

app.options('/*path', cors());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.tif')) cb(null, true);
    else cb(new Error('Only .tif files are allowed'));
  },
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const r = await axios.get(`${MODEL_SERVER_URL}/health`, { timeout: 5000 });
    res.json({ backend: 'ok', modelServer: r.data });
  } catch {
    res.status(503).json({ backend: 'ok', modelServer: 'unreachable' });
  }
});

// Predict route
app.post('/api/predict', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename:    req.file.originalname,
      contentType: req.file.mimetype || 'image/tiff',
    });

    const response = await axios.post(`${MODEL_SERVER_URL}/predict`, form, {
      headers:          form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength:    Infinity,
      timeout:          600_000,
    });

    res.json(response.data);
  } catch (err) {
    const message = err.response?.data?.error || err.message || 'Prediction failed';
    console.error('[predict error]', message);
    res.status(500).json({ error: message });
  }
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[error]', err.message);
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () =>
  console.log(`✅  Backend running → http://localhost:${PORT}`)
);