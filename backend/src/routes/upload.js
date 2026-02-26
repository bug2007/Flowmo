const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');  // Imports Supabase SDK to talk to Supabase Storage.
const multer = require('multer');  // to handle file uploads
const authenticateToken = require('../middleware/auth');

// Initialize Supabase client (only if env vars exist)
let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  console.log('Supabase Storage enabled');
} else {
  console.log('Supabase not configured - file uploads disabled');
}

// Use memory storage (file goes to memory, then to Supabase)
const upload = multer({         
  storage: multer.memoryStorage(),   // uploaded file stored on RAM. file available as req.file.buffer
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload file to Supabase Storage
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {  // expects a form field named 'file'. puts file into req.file
    
  try {
    if (!supabase) {
        return res.status(503).json({
            error: 'File upload not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env'
        });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const userId = req.user.userId;
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}-${req.file.originalname}`;   // 12345/1706700000000-report.pdf
    
    // Upload to Supabase Storage bucket 'uploads'
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filename, req.file.buffer, {  // buffer is actual file bytes in memory
        contentType: req.file.mimetype,
        upsert: false  // Disallows overwriting an existing file with same name
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL. Supabase generates a public HTTP URL for the file.
    const { data: urlData } = supabase.storage  
      .from('uploads')
      .getPublicUrl(filename);
    
    res.json({
      message: 'File uploaded successfully',
      file: {
        originalName: req.file.originalname,
        filename: filename,
        path: urlData.publicUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
});

// List user's files
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
        return res.status(503).json({
            error: 'File upload not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env'
        });
    }
    const userId = req.user.userId;  // only list this user's files
    
    const { data, error } = await supabase.storage
      .from('uploads')
      .list(`${userId}/`, {  // Lists files inside that user’s folder.
        limit: 100,  // max 100 files
        sortBy: { column: 'created_at', order: 'desc' }  // newest files first
      });
    
    if (error) throw error;
    
    const files = data.map(file => ({
      filename: `${userId}/${file.name}`,
      originalName: file.name.split('-').slice(1).join('-'),
      size: file.metadata?.size,
      uploadedAt: file.created_at
    }));
    
    res.json({ files });  // returns file list to frontend
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Delete file
router.delete('/:userId/:filename', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'File upload not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env'
      });
    }
    
    const { userId, filename } = req.params;
    const authUserId = req.user.userId;
    
    // Verify file belongs to user
    if (parseInt(userId) !== authUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const fullPath = `${userId}/${filename}`;
    
    const { error } = await supabase.storage
      .from('uploads')
      .remove([fullPath]);
    
    if (error) throw error;
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
