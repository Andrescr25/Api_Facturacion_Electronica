import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';

export class DashboardController {
    /**
     * Endpoint: GET /api/dashboard/stats
     * Devuelve las estadísticas reales usando la tabla DocumentoElectronico.
     */
    static async getStats(req: Request, res: Response) {
        try {
            const result = await prisma.documentoElectronico.groupBy({
                by: ['estadoInterno'],
                _count: {
                    id: true
                }
            });

            const total = result.reduce((acc, curr) => acc + curr._count.id, 0);
            const aceptadas = result.find(c => c.estadoInterno === 'ACEPTADO')?._count.id || 0;
            const rechazadas = result.find(c => c.estadoInterno === 'RECHAZADO')?._count.id || 0;
            // Cualquier estado que no sea ACEPTADO o RECHAZADO podría considerarse pendiente para esta métrica general
            const pendientes = total - aceptadas - rechazadas;

            return res.json({
                facturasEmitidas: total,
                aceptadas,
                rechazadas,
                pendientes
            });
        } catch (error: any) {
            console.error('Error DashboardController - getStats:', error);
            return res.status(500).json({
                error: 'Ocurrió un error cargando las estadísticas del Dashboard',
                detalle: error.message
            });
        }
    }

    /**
     * Endpoint: GET /api/dashboard/recent
     * Devuelve los últimos 5 documentos emitidos
     */
    static async getRecent(req: Request, res: Response) {
        try {
            const documentos = await prisma.documentoElectronico.findMany({
                take: 5,
                orderBy: {
                    fechaEmision: 'desc'
                },
                select: {
                    claveNumerica: true,
                    tipoDocumento: true,
                    estadoInterno: true,
                    fechaEmision: true
                }
            });

            // Formatear para el frontend
            const formatted = documentos.map(doc => ({
                clave: doc.claveNumerica,
                tipo: doc.tipoDocumento === '01' ? 'FE-01' :
                    doc.tipoDocumento === '02' ? 'ND-02' :
                        doc.tipoDocumento === '03' ? 'NC-03' :
                            doc.tipoDocumento === '04' ? 'TE-04' : 'Otros',
                receptor: 'Cliente (Ver XML)', // No guardamos el nombre del receptor en la tabla principal actualmente
                estado: doc.estadoInterno,
                fecha: doc.fechaEmision.toISOString().split('T')[0]
            }));

            return res.json(formatted);
        } catch (error: any) {
            console.error('Error DashboardController - getRecent:', error);
            return res.status(500).json({
                error: 'Ocurrió un error cargando la actividad reciente',
                detalle: error.message
            });
        }
    }
}
