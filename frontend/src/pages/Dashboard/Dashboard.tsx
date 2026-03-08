import { FileText, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

export default function Dashboard() {
    const [stats, setStats] = useState({
        facturasEmitidas: 0,
        aceptadas: 0,
        rechazadas: 0,
        pendientes: 0
    });
    const [recent, setRecent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('http://localhost:3000/api/dashboard/stats').then(res => res.json()),
            fetch('http://localhost:3000/api/dashboard/recent').then(res => res.json())
        ])
            .then(([statsData, recentData]) => {
                setStats(statsData);
                setRecent(Array.isArray(recentData) ? recentData : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching dashboard data:", err);
                setLoading(false);
            });
    }, []);

    return (
        <div className={styles.dashboard}>
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Facturas emitidas</span>
                        <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
                            <FileText size={18} />
                        </div>
                    </div>
                    <span className={styles.statValue}>
                        {loading ? '...' : stats.facturasEmitidas.toLocaleString()}
                    </span>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Aceptadas</span>
                        <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                            <CheckCircle size={18} />
                        </div>
                    </div>
                    <span className={styles.statValue}>
                        {loading ? '...' : stats.aceptadas.toLocaleString()}
                    </span>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Rechazadas</span>
                        <div className={`${styles.statIcon} ${styles.statIconRed}`}>
                            <XCircle size={18} />
                        </div>
                    </div>
                    <span className={styles.statValue}>
                        {loading ? '...' : stats.rechazadas.toLocaleString()}
                    </span>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Pendientes</span>
                        <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
                            <Clock size={18} />
                        </div>
                    </div>
                    <span className={styles.statValue}>
                        {loading ? '...' : stats.pendientes.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Quick Start */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Inicio rapido</h2>
                    <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className={styles.quickStart}>
                    <span className={styles.codeLabel}>Emitir tu primera factura</span>
                    <div className={styles.codeBlock}>
                        <pre>{`curl -X POST http://localhost:3000/api/facturas/emitir \\
  -H "Authorization: Bearer TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "emisorId": "uuid-del-emisor",
    "factura": {
      "receptor": {
        "nombre": "Cliente SA",
        "tipoIdentificacion": "02",
        "identificacion": "3101123456"
      },
      "condicionVenta": "01",
      "medioPago": ["01"],
      "sucursal": 1,
      "caja": 1,
      "lineasDetalle": [{
        "codigoCabys": "4321500000100",
        "cantidad": 1,
        "unidadMedida": "Unid",
        "detalle": "Servicio de consultoria",
        "precioUnitario": 50000,
        "montoTotal": 50000,
        "subTotal": 50000,
        "montoTotalLinea": 56500,
        "impuestos": [{
          "codigo": "01",
          "codigoTarifa": "08",
          "tarifa": 13,
          "monto": 6500
        }],
        "impuestoNeto": 6500
      }],
      "resumenFactura": {
        "codigoMoneda": "CRC",
        "totalGravado": 50000,
        "totalExento": 0,
        "totalDescuentos": 0,
        "totalVentaNeta": 50000,
        "totalImpuesto": 6500,
        "totalComprobante": 56500
      }
    }
  }'`}</pre>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Actividad reciente</h2>
                </div>
                <table className={styles.recentTable}>
                    <thead>
                        <tr>
                            <th>Clave</th>
                            <th>Tipo</th>
                            <th>Receptor</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recent.map((row) => (
                            <tr key={row.clave}>
                                <td className={styles.claveText}>{row.clave}</td>
                                <td>{row.tipo}</td>
                                <td>{row.receptor}</td>
                                <td>
                                    <span className={`${styles.badge} ${row.estado === 'ACEPTADO' ? styles.badgeSuccess :
                                        row.estado === 'RECHAZADO' ? styles.badgeDanger :
                                            styles.badgeWarning
                                        }`}>
                                        {row.estado}
                                    </span>
                                </td>
                                <td>{row.fecha}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
