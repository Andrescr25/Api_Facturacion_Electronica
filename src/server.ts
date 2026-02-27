import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { HaciendaPollerService } from './utils/HaciendaPollerService';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Iniciar Poller de Documentos de Hacienda CR
    HaciendaPollerService.start();
});
