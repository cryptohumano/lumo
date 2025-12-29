/**
 * Rutas para subir archivos
 */

import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/auth'
import { uploadFile } from '../services/storageService'

const router = Router()

// Configurar multer para almacenar en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir imágenes y PDFs
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes y PDFs.'))
    }
  },
})

/**
 * POST /api/upload
 * Sube un archivo y devuelve la URL
 */
router.post('/', authenticate, upload.single('file') as any, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No se proporcionó ningún archivo'
      })
    }

    const folder = req.body.folder || 'documents'
    const { url, fileName } = await uploadFile(req.file, folder)

    res.json({
      url,
      fileName,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    })
  } catch (error: any) {
    console.error('Error subiendo archivo:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error al subir archivo'
    })
  }
})

export default router

