/**
 * Servicio de almacenamiento de archivos usando MinIO
 */

import { Client } from 'minio'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

// Detectar si estamos dentro de Docker o fuera
// Si MINIO_ENDPOINT no está definido, intentar detectar automáticamente
const getMinioEndpoint = () => {
  if (process.env.MINIO_ENDPOINT) {
    return process.env.MINIO_ENDPOINT
  }
  // Si estamos en Docker, usar el nombre del servicio
  // Si estamos fuera, usar localhost
  // Podemos detectar si estamos en Docker verificando si existe el archivo /.dockerenv
  try {
    fs.accessSync('/.dockerenv')
    console.log('🔍 Detectado: Backend corriendo dentro de Docker, usando "minio" como endpoint')
    return 'minio' // Dentro de Docker
  } catch {
    console.log('🔍 Detectado: Backend corriendo fuera de Docker, usando "localhost" como endpoint')
    return 'localhost' // Fuera de Docker
  }
}

// Obtener el puerto de MinIO según el entorno
const getMinioPort = () => {
  // Si estamos en Docker, siempre usar el puerto interno 9000
  // MINIO_PORT es para el puerto externo (mapeo del host)
  try {
    fs.accessSync('/.dockerenv')
    return 9000 // Puerto interno en Docker
  } catch {
    // Fuera de Docker, usar el puerto configurado o el externo por defecto
    return parseInt(process.env.MINIO_PORT || '9000')
  }
}

// Configuración de MinIO
const minioClient = new Client({
  endPoint: getMinioEndpoint(),
  port: getMinioPort(),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
})

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'lumo-documents'

// Detectar URL pública basada en el entorno
const getPublicUrl = () => {
  if (process.env.MINIO_PUBLIC_URL) {
    return process.env.MINIO_PUBLIC_URL
  }
  if (process.env.PUBLIC_URL) {
    return `${process.env.PUBLIC_URL}/storage`
  }
  // Si estamos en producción o usando IP pública, detectar automáticamente
  // Por defecto usar localhost/storage para desarrollo local
  return 'http://localhost/storage'
}

const MINIO_PUBLIC_URL = getPublicUrl()

/**
 * Inicializa el bucket si no existe
 * Con reintentos para esperar a que MinIO esté disponible
 */
export async function initializeStorage(retries: number = 5, delay: number = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const exists = await minioClient.bucketExists(BUCKET_NAME)
      if (!exists) {
        await minioClient.makeBucket(BUCKET_NAME, 'us-east-1')
        // Configurar política pública para lectura (opcional, según necesidades)
        // await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify({
        //   Version: '2012-10-17',
        //   Statement: [{
        //     Effect: 'Allow',
        //     Principal: { AWS: ['*'] },
        //     Action: ['s3:GetObject'],
        //     Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
        //   }]
        // }))
        console.log(`✅ Bucket ${BUCKET_NAME} creado exitosamente`)
      } else {
        console.log(`✅ Bucket ${BUCKET_NAME} ya existe`)
      }
      return // Éxito, salir
    } catch (error: any) {
      const isLastAttempt = attempt === retries
      const errorMessage = error?.message || String(error)
      
      if (isLastAttempt) {
        // Si es el último intento, solo loguear el error pero no fallar
        // Esto permite que el servidor arranque incluso si MinIO no está disponible
        console.warn(`⚠️  No se pudo inicializar MinIO después de ${retries} intentos.`)
        console.warn(`   El servicio seguirá funcionando, pero la subida de archivos no estará disponible.`)
        console.warn(`   Error: ${errorMessage}`)
        console.warn(`   Asegúrate de que MinIO esté corriendo y accesible en ${getMinioEndpoint()}:${getMinioPort()}`)
        return // No lanzar error, permitir que el servidor continúe
      }
      
      console.log(`⏳ Intento ${attempt}/${retries} de conexión a MinIO falló, reintentando en ${delay}ms...`)
      console.log(`   Error: ${errorMessage}`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Sube un archivo a MinIO
 */
export async function uploadFile(
  file: Express.Multer.File,
  folder: string = 'documents'
): Promise<{ url: string; fileName: string }> {
  try {
    // Generar nombre único para el archivo
    const fileExtension = path.extname(file.originalname)
    const fileName = `${folder}/${uuidv4()}${fileExtension}`
    
    // Subir archivo a MinIO
    await minioClient.putObject(
      BUCKET_NAME,
      fileName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      }
    )

    // Generar URL presignada (más seguro) o URL pública
    // Para desarrollo, usar URL pública a través de nginx
    // Para producción, considerar usar URLs presignadas
    let url: string
    if (process.env.MINIO_USE_PRESIGNED === 'true') {
      // Usar URL presignada (válida por 7 días)
      url = await minioClient.presignedGetObject(BUCKET_NAME, fileName, 7 * 24 * 60 * 60)
    } else {
      // Usar URL pública a través de nginx
      const baseUrl = MINIO_PUBLIC_URL.endsWith('/') ? MINIO_PUBLIC_URL.slice(0, -1) : MINIO_PUBLIC_URL
      url = `${baseUrl}/${BUCKET_NAME}/${fileName}`
    }

    return {
      url,
      fileName: file.originalname,
    }
  } catch (error: any) {
    console.error('Error subiendo archivo:', error)
    const errorMessage = error?.message || String(error)
    // Proporcionar mensaje más descriptivo
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('EAI_AGAIN')) {
      throw new Error(`No se puede conectar a MinIO en ${getMinioEndpoint()}:${getMinioPort()}. Asegúrate de que MinIO esté corriendo.`)
    }
    throw new Error(`Error al subir archivo: ${errorMessage}`)
  }
}

/**
 * Elimina un archivo de MinIO
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    // Extraer el nombre del archivo desde la URL
    const fileName = filePath.replace(`${MINIO_PUBLIC_URL}/${BUCKET_NAME}/`, '')
    await minioClient.removeObject(BUCKET_NAME, fileName)
  } catch (error) {
    console.error('Error eliminando archivo:', error)
    throw new Error('Error al eliminar archivo')
  }
}

/**
 * Obtiene una URL firmada temporal para acceso privado
 */
export async function getPresignedUrl(filePath: string, expiry: number = 7 * 24 * 60 * 60): Promise<string> {
  try {
    const fileName = filePath.replace(`${MINIO_PUBLIC_URL}/${BUCKET_NAME}/`, '')
    return await minioClient.presignedGetObject(BUCKET_NAME, fileName, expiry)
  } catch (error) {
    console.error('Error generando URL firmada:', error)
    throw new Error('Error al generar URL firmada')
  }
}

