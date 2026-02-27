import { Router } from 'express';
import { FacturacionController } from '../controllers/FacturacionController';

const router = Router();

// Recepción de facturas desde FrontEnd o Puntos de Venta locales
router.post('/emitir', FacturacionController.emitirFactura);

// Descarga de PDF de la representación gráfica del comprobante electrónico
router.get('/:clave/pdf', FacturacionController.descargarPDF);

// Pendientes futuros:
// router.get('/estado/:clave', FacturacionController.consultarEstado);
// router.post('/recepcion-compras', FacturacionController.aceptarCompra);

export default router;
