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
import prisma from './utils/prismaClient';

const app: Application = express();

// ============================
// [SEC-04] CORS con lista blanca de orígenes
// ============================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origin (Postman, curl, requests server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origen no autorizado: ${origin}`));
        }
    },
    credentials: true
}));

// [SEC-05] Límite de tamaño en el body (evitar OOM con payloads gigantes)
app.use(express.json({ limit: '1mb' }));

// Servir PDFs estáticos (fallback local, normalmente se sirven desde Firebase Storage)
app.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs')));

// Autenticación (Pública pero verificada por su propio token handler)
app.use('/api/auth', authRoutes);

// Protegiendo el resto de endpoints
app.use('/api/facturas', requireAuth, facturacionRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/keys', requireAuth, apikeyRoutes);
app.use('/api/catalogos', requireAuth, catalogoRoutes);
app.use('/api/configuracion', requireAuth, configuracionRoutes);

// ============================
// [OPS-03] Health Check profundo — verifica conectividad a la BD
// ============================
app.get('/health', async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({
            status: 'OK',
            db: 'connected',
            timestamp: new Date().toISOString(),
            message: 'API Facturacion Electronica CR is running'
        });
    } catch (dbError: any) {
        console.error('Health check: DB connection failed:', dbError.message);
        return res.status(503).json({
            status: 'ERROR',
            db: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
});

export default app;
