import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import facturacionRoutes from './routes/facturacion.routes';
import dashboardRoutes from './routes/dashboard.routes';
import apikeyRoutes from './routes/apikey.routes';
import catalogoRoutes from './routes/catalogo.routes';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir PDFs estáticos
app.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs')));

// Routes
// Routes
app.use('/api/facturas', facturacionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/keys', apikeyRoutes);
app.use('/api/catalogos', catalogoRoutes);

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'API Facturacion Electronica CR is running' });
});

export default app;
