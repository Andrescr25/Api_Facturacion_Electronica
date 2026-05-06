import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import facturacionRoutes from './routes/facturacion.routes';
import dashboardRoutes from './routes/dashboard.routes';
import apikeyRoutes from './routes/apikey.routes';
import catalogoRoutes from './routes/catalogo.routes';
import configuracionRoutes from './routes/configuracion.routes';
import authRoutes from './routes/auth.routes';
import { requireAuth } from './middlewares/authMiddleware';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir PDFs estáticos
app.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs')));

// Autenticación (Pública pero verificada por su propio token handler)
app.use('/api/auth', authRoutes);

// Protegiendo el resto de endpoints
app.use('/api/facturas', requireAuth, facturacionRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/keys', requireAuth, apikeyRoutes);
app.use('/api/catalogos', requireAuth, catalogoRoutes);
app.use('/api/configuracion', requireAuth, configuracionRoutes);

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'API Facturacion Electronica CR is running' });
});

export default app;
