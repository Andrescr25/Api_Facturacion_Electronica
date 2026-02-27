import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import facturacionRoutes from './routes/facturacion.routes';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir PDFs estáticos
app.use('/pdfs', express.static(path.join(__dirname, '../public/pdfs')));

// Routes
app.use('/api/facturas', facturacionRoutes);

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'API Facturacion Electronica CR is running' });
});

export default app;
