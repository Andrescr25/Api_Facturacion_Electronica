import { useState } from 'react';
import { Send, Terminal } from 'lucide-react';
import axios from 'axios';
import styles from './Playground.module.css';

const defaultBody = `{
  "emisorId": "tu-emisor-id",
  "factura": {
    "receptor": {
      "nombre": "Cliente de Prueba",
      "tipoIdentificacion": "01",
      "identificacion": "123456789"
    },
    "condicionVenta": "01",
    "medioPago": ["01"],
    "sucursal": 1,
    "caja": 1,
    "lineasDetalle": [
      {
        "codigoCabys": "4321500000100",
        "cantidad": 1,
        "unidadMedida": "Unid",
        "detalle": "Servicio de prueba",
        "precioUnitario": 10000,
        "montoTotal": 10000,
        "subTotal": 10000,
        "impuestos": [{
          "codigo": "01",
          "codigoTarifa": "08",
          "tarifa": 13,
          "monto": 1300
        }],
        "impuestoNeto": 1300,
        "montoTotalLinea": 11300
      }
    ],
    "resumenFactura": {
      "codigoMoneda": "CRC",
      "totalGravado": 10000,
      "totalExento": 0,
      "totalDescuentos": 0,
      "totalVentaNeta": 10000,
      "totalImpuesto": 1300,
      "totalComprobante": 11300
    }
  }
}`;

const presets = [
    {
        name: 'Factura Electrónica (01)',
        method: 'POST',
        url: '/api/facturas/emitir',
        body: defaultBody
    },
    {
        name: 'Tiquete Electrónico (04)',
        method: 'POST',
        url: '/api/facturas/tiquete/emitir',
        body: `{
  "emisorId": "tu-emisor-id",
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
        "precioUnitario": 10000,
        "montoTotal": 10000,
        "subTotal": 10000,
        "impuestos": [{"codigo": "01", "codigoTarifa": "08", "tarifa": 13, "monto": 1300}],
        "impuestoNeto": 1300,
        "montoTotalLinea": 11300
      }
    ],
    "resumenFactura": {
      "codigoMoneda": "CRC",
      "totalGravado": 10000,
      "totalExento": 0,
      "totalDescuentos": 0,
      "totalVentaNeta": 10000,
      "totalImpuesto": 1300,
      "totalComprobante": 11300
    }
  }
}`
    },
    {
        name: 'Nota de Crédito (03)',
        method: 'POST',
        url: '/api/facturas/nota-credito/emitir',
        body: `{
  "emisorId": "tu-emisor-id",
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
        "detalle": "Devolución de mercadería",
        "precioUnitario": 10000,
        "montoTotal": 10000,
        "subTotal": 10000,
        "impuestos": [{"codigo": "01", "codigoTarifa": "08", "tarifa": 13, "monto": 1300}],
        "impuestoNeto": 1300,
        "montoTotalLinea": 11300
      }
    ],
    "resumenFactura": {
      "codigoMoneda": "CRC",
      "totalGravado": 10000,
      "totalExento": 0,
      "totalDescuentos": 0,
      "totalVentaNeta": 10000,
      "totalImpuesto": 1300,
      "totalComprobante": 11300
    },
    "referencias": [
      {
        "tipoDocumento": "01",
        "numeroDocumento": "50601022600310112345600100001010000000001199999999",
        "fechaEmision": "2026-03-01T10:00:00Z",
        "codigo": "01",
        "razon": "Anulacion por devolucion"
      }
    ]
  }
}`
    },
    {
        name: 'Dashboard Stats',
        method: 'GET',
        url: '/api/dashboard/stats',
        body: ''
    },
    {
        name: 'Dashboard Recent',
        method: 'GET',
        url: '/api/dashboard/recent',
        body: ''
    }
];

interface ResponseData {
    status: number;
    body: string;
    time: number;
}

export default function Playground() {
    const [method, setMethod] = useState(presets[0].method);
    const [url, setUrl] = useState(presets[0].url);
    const [body, setBody] = useState(presets[0].body);
    const [authKey, setAuthKey] = useState('');
    const [response, setResponse] = useState<ResponseData | null>(null);
    const [loading, setLoading] = useState(false);

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const idx = parseInt(e.target.value);
        if (isNaN(idx)) return;
        setMethod(presets[idx].method);
        setUrl(presets[idx].url);
        setBody(presets[idx].body);
        setResponse(null); // Clear previous response when changing templates
    };

    const handleSend = async () => {
        setLoading(true);
        const start = Date.now();
        try {
            let parsedBody = undefined;
            if (method !== 'GET' && method !== 'DELETE' && body) {
                try {
                    parsedBody = JSON.parse(body);
                } catch (parseError: any) {
                    setResponse({
                        status: 400,
                        body: `Invalid JSON payload: ${parseError.message}`,
                        time: Date.now() - start,
                    });
                    setLoading(false);
                    return;
                }
            }

            const config: any = {
                method,
                // Ensure we call the backend at port 3000
                url: url.startsWith('http') ? url : `http://localhost:3000${url.startsWith('/') ? '' : '/'}${url}`,
                headers: {
                    'Content-Type': 'application/json',
                    ...(authKey ? { 'Authorization': `Bearer ${authKey}` } : {})
                },
                data: parsedBody,
            };

            const res = await axios(config);
            setResponse({
                status: res.status,
                body: JSON.stringify(res.data, null, 2),
                time: Date.now() - start,
            });
        } catch (err: any) {
            setResponse({
                status: err.response?.status || 0,
                body: err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message,
                time: Date.now() - start,
            });
        } finally {
            setLoading(false);
        }
    };

    const statusClass = response
        ? response.status >= 200 && response.status < 300
            ? styles.status2xx
            : response.status >= 400 && response.status < 500
                ? styles.status4xx
                : styles.status5xx
        : '';

    return (
        <div className={styles.playground}>
            {/* Request Panel */}
            <div className={styles.panel}>
                <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={styles.panelTitle}>Request</span>
                    <select
                        onChange={handlePresetChange}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    >
                        {presets.map((preset, idx) => (
                            <option key={preset.name} value={idx}>{preset.name}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.panelBody}>
                    <div className={styles.urlBar} style={{ marginBottom: '10px' }}>
                        <select className={styles.methodSelect} value={method} onChange={(e) => setMethod(e.target.value)}>
                            <option value="POST">POST</option>
                            <option value="GET">GET</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                        <input
                            className={styles.urlInput}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="/api/facturas/emitir"
                        />
                        <button className={styles.sendBtn} onClick={handleSend} disabled={loading}>
                            <Send size={14} />
                        </button>
                    </div>

                    <div className={styles.urlBar}>
                        <div style={{ padding: '0 10px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border)' }}>
                            Header
                        </div>
                        <input
                            className={styles.urlInput}
                            value={authKey}
                            onChange={(e) => setAuthKey(e.target.value)}
                            placeholder="Authorization: Bearer sk_live_..."
                        />
                    </div>

                    {method === 'POST' && (
                        <textarea
                            className={styles.editor}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            spellCheck={false}
                        />
                    )}
                </div>
            </div>

            {/* Response Panel */}
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Response</span>
                </div>
                <div className={styles.panelBody}>
                    {response ? (
                        <>
                            <div className={styles.responseMeta}>
                                <span className={`${styles.statusCode} ${statusClass}`}>
                                    {response.status}
                                </span>
                                <span className={styles.responseTime}>{response.time}ms</span>
                            </div>
                            <div className={styles.responseBlock}>
                                <pre>{response.body}</pre>
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <Terminal size={40} />
                            <span>Envia una solicitud para ver la respuesta</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
