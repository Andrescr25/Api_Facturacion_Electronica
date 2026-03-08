import { Router } from 'express';
import { FacturacionController } from '../controllers/FacturacionController';
import { requireApiKeyAndRateLimit } from '../middleware/apiKeyValidation';

const router = Router();

// Recepción de facturas desde FrontEnd o Puntos de Venta locales
router.post('/emitir', requireApiKeyAndRateLimit, FacturacionController.emitirFactura);
router.post('/tiquete/emitir', requireApiKeyAndRateLimit, FacturacionController.emitirTiquete);
router.post('/nota-credito/emitir', requireApiKeyAndRateLimit, FacturacionController.emitirNotaCredito);
router.post('/nota-debito/emitir', requireApiKeyAndRateLimit, FacturacionController.emitirNotaDebito);

// Descarga de PDF de la representación gráfica del comprobante electrónico
router.get('/:clave/pdf', FacturacionController.descargarPDF);

// Descarga de XML firmado 
router.get('/:clave/xml', FacturacionController.descargarXML);

// Historial de Facturas
router.get('/', FacturacionController.listarFacturas);

// Pendientes futuros:
// router.get('/estado/:clave', FacturacionController.consultarEstado);
// router.post('/recepcion-compras', FacturacionController.aceptarCompra);

export default router;
