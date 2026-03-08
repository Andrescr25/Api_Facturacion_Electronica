import { useState } from 'react';
import { ChevronRight, Server } from 'lucide-react';
import styles from './ApiDocs.module.css';

interface Endpoint {
    method: 'POST' | 'GET' | 'DELETE';
    path: string;
    description: string;
    params?: { name: string; type: string; required: boolean; description: string }[];
    requestBody?: string;
    responseBody?: string;
}

const endpoints: Endpoint[] = [
    {
        method: 'POST',
        path: '/api/facturas/emitir',
        description: 'Emitir una factura electronica',
        params: [
            { name: 'emisorId', type: 'string (UUID)', required: true, description: 'ID del emisor registrado en el sistema' },
        ],
        requestBody: `{
  "emisorId": "uuid-del-emisor",
  "factura": {
    "receptor": {
      "nombre": "Empresa Receptora SA",
      "tipoIdentificacion": "02",
      "identificacion": "3101654321",
      "correoElectronico": "contacto@empresa.com"
    },
    "condicionVenta": "01",
    "medioPago": ["01"],
    "sucursal": 1,
    "caja": 1,
    "lineasDetalle": [
      {
        "codigoCabys": "4321500000100",
        "cantidad": 2,
        "unidadMedida": "Unid",
        "detalle": "Licencia de software anual",
        "precioUnitario": 75000.00,
        "montoTotal": 150000.00,
        "subTotal": 150000.00,
        "impuestos": [
          {
            "codigo": "01",
            "codigoTarifa": "08",
            "tarifa": 13.00,
            "monto": 19500.00
          }
        ],
        "impuestoNeto": 19500.00,
        "montoTotalLinea": 169500.00
      }
    ],
    "resumenFactura": {
      "codigoMoneda": "CRC",
      "totalGravado": 150000.00,
      "totalExento": 0,
      "totalDescuentos": 0,
      "totalVentaNeta": 150000.00,
      "totalImpuesto": 19500.00,
      "totalComprobante": 169500.00
    }
  }
}`,
        responseBody: `{
  "message": "Comprobante electronico procesado exitosamente",
  "data": {
    "clave": "50601022600310112345600100001010000000001199999999",
    "consecutivo": "00100001010000000001",
    "estado": "ENVIADO"
  }
}`,
    },
    {
        method: 'POST',
        path: '/api/facturas/tiquete/emitir',
        description: 'Emitir un Tiquete Electronico (Tipo 04) para consumidores finales',
        params: [
            { name: 'emisorId', type: 'string (UUID)', required: true, description: 'ID del emisor registrado en el sistema' },
        ],
        requestBody: `// Mismo formato base que Factura Electrónica,
// pero el objeto "receptor" es opcional.
{
  "emisorId": "uuid-del-emisor",
  "factura": {
    "condicionVenta": "01",
    "medioPago": ["01"],
    "sucursal": 1,
    "caja": 1,
    "lineasDetalle": [
      {
        "codigoCabys": "4321500000100",
        "cantidad": 1,
        "unidadMedida": "Unid",
        "detalle": "Consumo en Restaurante",
        "precioUnitario": 10000.00,
        "montoTotal": 10000.00,
        "subTotal": 10000.00,
        "impuestos": [{"codigo": "01", "codigoTarifa": "08", "tarifa": 13.00, "monto": 1300.00}],
        "impuestoNeto": 1300.00,
        "montoTotalLinea": 11300.00
      }
    ],
    "resumenFactura": {
      "codigoMoneda": "CRC",
      "totalGravado": 10000.00,
      "totalExento": 0,
      "totalVentaNeta": 10000.00,
      "totalImpuesto": 1300.00,
      "totalComprobante": 11300.00
    }
  }
}`,
        responseBody: `{
  "message": "Comprobante electrónico procesado exitosamente",
  ...
}`
    },
    {
        method: 'POST',
        path: '/api/facturas/nota-credito/emitir',
        description: 'Emitir una Nota de Credito Electronica (Tipo 03) para anular o corregir facturas',
        params: [
            { name: 'emisorId', type: 'string (UUID)', required: true, description: 'ID del emisor' },
        ],
        requestBody: `// Mismo formato que la Factura, pero REQUIERE el array "referencias"
{
  "emisorId": "uuid-del-emisor",
  "factura": {
    ... // Receptor, lineas, etc (Ver Factura)
    "referencias": [
      {
        "tipoDocumento": "01", // 01 hace referencia a una Factura
        "numeroDocumento": "50601022600310112345600100001010000000001199999999", // Clave original
        "fechaEmision": "2026-02-26T10:00:00Z",
        "codigo": "01", // 01: Anula Documento de Referencia
        "razon": "Anulacion por devolucion de mercaderia"
      }
    ]
  }
}`,
    },
    {
        method: 'POST',
        path: '/api/facturas/nota-debito/emitir',
        description: 'Emitir una Nota de Debito Electronica (Tipo 02) para cobrar montos adicionales',
        params: [
            { name: 'emisorId', type: 'string (UUID)', required: true, description: 'ID del emisor' },
        ],
        requestBody: `// Requiere el array "referencias" apuntando a la Factura/Tiquete original
{
  "emisorId": "uuid-del-emisor",
  "factura": {
    ... // Receptor, lineas, etc
    "referencias": [
      {
        "tipoDocumento": "01", 
        "numeroDocumento": "50601022600310112345600100001010000000001199999999",
        "fechaEmision": "2026-02-26T10:00:00Z",
        "codigo": "02", // 02: Corrige monto, 04: Referencia a otro documento
        "razon": "Cobro adicional por flete no incluido"
      }
    ]
  }
}`,
    },
    {
        method: 'GET',
        path: '/api/facturas/:clave/pdf',
        description: 'Descargar el PDF de un comprobante emitido',
        params: [
            { name: 'clave', type: 'string', required: true, description: 'Clave numerica de 50 digitos del comprobante' },
        ],
        responseBody: `// Retorna el archivo PDF como descarga directa
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="Factura_<clave>.pdf"`,
    },
    {
        method: 'GET',
        path: '/health',
        description: 'Verificar el estado del servicio',
        responseBody: `{
  "status": "ok",
  "timestamp": "2026-02-26T22:00:00.000Z"
}`,
    },
];

function MethodBadge({ method }: { method: string }) {
    const cls = method === 'POST' ? styles.methodPost : method === 'GET' ? styles.methodGet : styles.methodDelete;
    return <span className={`${styles.methodBadge} ${cls}`}>{method}</span>;
}

function EndpointItem({ ep }: { ep: Endpoint }) {
    const [open, setOpen] = useState(false);

    return (
        <div className={styles.endpointCard}>
            <div className={styles.endpointHeader} onClick={() => setOpen(!open)}>
                <MethodBadge method={ep.method} />
                <span className={styles.endpointPath}>{ep.path}</span>
                <span className={styles.endpointDesc}>{ep.description}</span>
                <ChevronRight size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
            </div>

            {open && (
                <div className={styles.endpointBody}>
                    {ep.params && ep.params.length > 0 && (
                        <>
                            <span className={styles.fieldTitle}>Parametros</span>
                            <table className={styles.paramTable}>
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Tipo</th>
                                        <th>Requerido</th>
                                        <th>Descripcion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ep.params.map((p) => (
                                        <tr key={p.name}>
                                            <td className={styles.paramName}>{p.name}</td>
                                            <td className={styles.paramType}>{p.type}</td>
                                            <td>{p.required ? <span className={styles.required}>Si</span> : 'No'}</td>
                                            <td>{p.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}

                    {ep.requestBody && (
                        <>
                            <span className={styles.fieldTitle}>Request Body</span>
                            <div className={styles.codeBlock}>
                                <pre>{ep.requestBody}</pre>
                            </div>
                        </>
                    )}

                    {ep.responseBody && (
                        <>
                            <span className={styles.fieldTitle}>Response</span>
                            <div className={styles.codeBlock}>
                                <pre>{ep.responseBody}</pre>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ApiDocs() {
    return (
        <div className={styles.docs}>
            <p className={styles.intro}>
                Referencia completa de los endpoints disponibles en la API de Facturacion Electronica.
                Todos los endpoints requieren autenticacion mediante API Key en el header Authorization.
            </p>

            <div className={styles.baseUrl}>
                <Server size={18} style={{ color: 'var(--text-muted)' }} />
                <span className={styles.baseUrlLabel}>Base URL</span>
                <span className={styles.baseUrlValue}>https://api.facturacr.com</span>
            </div>

            {endpoints.map((ep) => (
                <EndpointItem key={`${ep.method}-${ep.path}`} ep={ep} />
            ))}
        </div>
    );
}
