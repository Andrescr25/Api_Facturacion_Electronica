import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato personalizado para mostrar los logs en la consola
const myFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }), // Captura y formatea los stack traces
        winston.format.json() // Por defecto guarda en formato JSON
    ),
    transports: [
        // En producción escribir en archivos de error y combinados
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

// En desarrollo, también registrar en la consola con colores
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            myFormat
        )
    }));
}
