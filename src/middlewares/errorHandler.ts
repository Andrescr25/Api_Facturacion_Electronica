import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Unhandled Error: ${err.message}`, { 
        url: req.originalUrl, 
        method: req.method, 
        ip: req.ip,
        stack: err.stack 
    });

    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor. Por favor intente más tarde.' 
        : err.message;

    res.status(status).json({
        error: message
    });
};
