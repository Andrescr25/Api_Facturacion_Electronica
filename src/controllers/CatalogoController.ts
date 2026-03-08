import { Request, Response } from 'express';
import * as Catalogos from '../models/CatalogoHacienda';

export class CatalogoController {
    /**
     * Endpoint: GET /api/catalogos
     * Retorna todos los catálogos oficiales de Hacienda para ser utilizados en el Frontend.
     */
    static getCatalogos(req: Request, res: Response) {
        try {
            return res.json({
                UnidadesMedida: Catalogos.UnidadesMedida,
                TiposIdentificacion: Catalogos.TiposIdentificacion,
                CodigosImpuesto: Catalogos.CodigosImpuesto,
                TarifasIVA: Catalogos.TarifasIVA,
                MediosPago: Catalogos.MediosPago,
                CondicionesVenta: Catalogos.CondicionesVenta,
                MotivosReferenciaNC: Catalogos.MotivosReferenciaNC,
                TiposDocumentoAsociado: Catalogos.TiposDocumentoAsociado
            });
        } catch (error: any) {
            console.error('Error CatalogoController:', error);
            return res.status(500).json({ error: 'Error al obtener catálogos' });
        }
    }
}
