import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const TOURS_DIR = path.join(UPLOAD_ROOT, 'tours');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(TOURS_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir(TOURS_DIR);
    cb(null, TOURS_DIR);
  },
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^\w\-]+/g, '_')
      .slice(0, 60);
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase}-${unique}${ext}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Chỉ hỗ trợ upload file ảnh (image/*).'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/images', upload.single('image'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ status: 'fail', message: 'Không có file ảnh.' });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/uploads/tours/${file.filename}`;

  return res.status(201).json({
    status: 'success',
    data: {
      url,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    },
  });
});

export default router;

