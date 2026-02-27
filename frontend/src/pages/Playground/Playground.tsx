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

interface ResponseData {
    status: number;
    body: string;
    time: number;
}

export default function Playground() {
    const [method, setMethod] = useState('POST');
    const [url, setUrl] = useState('/api/facturas/emitir');
    const [body, setBody] = useState(defaultBody);
    const [response, setResponse] = useState<ResponseData | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        setLoading(true);
        const start = Date.now();
        try {
            const config: any = {
                method,
                url,
                headers: { 'Content-Type': 'application/json' },
            };
            if (method === 'POST' && body) {
                config.data = JSON.parse(body);
            }
            const res = await axios(config);
            setResponse({
                status: res.status,
                body: JSON.stringify(res.data, null, 2),
                time: Date.now() - start,
            });
        } catch (err: any) {
            setResponse({
                status: err.response?.status || 0,
                body: JSON.stringify(err.response?.data || { error: err.message }, null, 2),
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
                <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>Request</span>
                </div>
                <div className={styles.panelBody}>
                    <div className={styles.urlBar}>
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
