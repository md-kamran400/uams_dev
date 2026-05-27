import { Router } from 'express'
import { db } from '../db/index.js'
import { files } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../lib/auth.js'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const router = Router()

// ── Storage location ───────────────────────────────────────
// Configurable via UPLOAD_DIR env var; defaults to <backend>/uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// ── Multer config ──────────────────────────────────────────
const MAX_IMAGE = 10 * 1024 * 1024        // 10 MB (already compressed client-side)
const MAX_VIDEO = 50 * 1024 * 1024        // 50 MB
const MAX_ANY   = 50 * 1024 * 1024

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.\w-]/g, '')
    cb(null, `${randomUUID()}${ext.toLowerCase()}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_ANY },
  fileFilter: (_req, file, cb) => {
    const type = file.mimetype
    if (type.startsWith('image/') || type.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image or video files are allowed'))
    }
  },
})

// ── POST /api/files — single or multi-file upload ─────────
router.post('/', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    const uploaded = req.files as Express.Multer.File[] | undefined
    if (!uploaded || uploaded.length === 0) {
      res.status(400).json({ error: 'No files uploaded' })
      return
    }

    const userId = (req as any).user?.id ?? null

    // Reject oversized images post-fact (multer-level filter is mime-only)
    for (const f of uploaded) {
      const cap = f.mimetype.startsWith('image/') ? MAX_IMAGE : MAX_VIDEO
      if (f.size > cap) {
        try { fs.unlinkSync(f.path) } catch { /* noop */ }
        res.status(413).json({ error: `${f.originalname} exceeds size limit` })
        return
      }
    }

    const rows = await db.insert(files).values(uploaded.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      sizeBytes: f.size,
      uploadedById: userId,
    }))).returning()

    res.status(201).json(rows.map(r => ({
      id: r.id,
      originalName: r.originalName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      url: `/api/files/${r.id}`,
    })))
  } catch (e) {
    console.error('File upload error:', e)
    const msg = e instanceof Error ? e.message : 'Upload failed'
    res.status(500).json({ error: msg })
  }
})

// ── GET /api/files/:id — stream the file (auth-gated) ─────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(files).where(eq(files.id, String(req.params.id)))
    if (!row) {
      res.status(404).json({ error: 'File not found' })
      return
    }
    const fullPath = path.join(UPLOAD_DIR, row.filename)
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File missing on disk' })
      return
    }
    res.setHeader('Content-Type', row.mimeType)
    // Inline disposition so <img>/<video> can render directly; download via ?download=1
    const disposition = req.query.download === '1' ? 'attachment' : 'inline'
    res.setHeader('Content-Disposition', `${disposition}; filename="${row.originalName.replace(/"/g, '')}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    fs.createReadStream(fullPath).pipe(res)
  } catch (e) {
    console.error('File serve error:', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/files/:id/meta — metadata only ───────────────
router.get('/:id/meta', requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(files).where(eq(files.id, String(req.params.id)))
    if (!row) { res.status(404).json({ error: 'Not found' }); return }
    res.json({
      id: row.id,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      uploadedById: row.uploadedById,
      createdAt: row.createdAt,
      url: `/api/files/${row.id}`,
    })
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
export { UPLOAD_DIR }
