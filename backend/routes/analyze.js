const multer = require('multer');
const express = require('express');
const { analyzeResume } = require('../analyzer');

const router = express.Router();

// Multer: store in memory, 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'), false);
    }
  },
});

// POST /api/analyze
router.post('/analyze', (req, res, _next) => {
  upload.single('resume')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a PDF resume.' });
    }

    try {
      const result = await analyzeResume(req.file.buffer);
      return res.json(result);
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      if (analysisError.message.includes('parse')) {
        return res.status(422).json({ error: 'Could not parse the PDF. Please ensure it is a valid, text-based PDF.' });
      }
      return res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }
  });
});

// GET /api/health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
