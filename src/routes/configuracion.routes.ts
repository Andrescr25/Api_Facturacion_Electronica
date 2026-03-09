import { Router } from 'express';
import { ConfiguracionController } from '../controllers/ConfiguracionController';
import multer from 'multer';

const router = Router();

// Configurar multer para almacenar el archivo temporalmente en la memoria de Node
// (No en disco) porque lo queremos enviar en formato binario "Bytes" hacia PostgreSQL
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit para el .p12 por precaución
});

// GET /api/configuracion
router.get('/', ConfiguracionController.getConfiguracion);

// PUT /api/configuracion
router.put('/', ConfiguracionController.updateConfiguracion);

// POST /api/configuracion/certificado
// Importante: 'upload.single("certificado")' le indica a multer que busque el archivo atado a la llave "certificado" en el FormData
router.post('/certificado', upload.single('certificado'), ConfiguracionController.uploadCertificado);

export default router;
