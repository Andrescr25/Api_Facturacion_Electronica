import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { logger } from './utils/logger';
import { HaciendaPollerService } from './utils/HaciendaPollerService';

const dbUrl = process.env.DATABASE_URL || 'UNDEFINED';
logger.info(`CRITICAL DEBUG - DATABASE_URL in use: ${dbUrl.replace(/:([^:@]+)@/, ':***@')}`);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);

    // Iniciar Poller de Documentos de Hacienda CR
    HaciendaPollerService.start();
});
