import { FileText, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import styles from './Dashboard.module.css';

const mockRecent = [
    { clave: '50601022600012345678', tipo: 'FE-01', receptor: 'Tech Solutions SA', estado: 'ACEPTADO', fecha: '2026-02-26' },
    { clave: '50601022600012345679', tipo: 'FE-01', receptor: 'Cafe del Valle SRL', estado: 'ENVIADO', fecha: '2026-02-26' },
    { clave: '50601022600012345680', tipo: 'NC-03', receptor: 'Distribuidora CR', estado: 'RECHAZADO', fecha: '2026-02-25' },
];

export default function Dashboard() {
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
                    <span className={styles.statValue}>1,247</span>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Aceptadas</span>
                        <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                            <CheckCircle size={18} />
                        </div>
                    </div>
                    <span className={styles.statValue}>1,198</span>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Rechazadas</span>
                        <div className={`${styles.statIcon} ${styles.statIconRed}`}>
                            <XCircle size={18} />
                        </div>
                    </div>
                    <span className={styles.statValue}>12</span>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Pendientes</span>
                        <div className={`${styles.statIcon} ${styles.statIconOrange}`}>
                            <Clock size={18} />
                        </div>
                    </div>
                    <span className={styles.statValue}>37</span>
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
                        <pre>{`curl -X POST https://api.facturacr.com/api/facturas/emitir \\
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
                        {mockRecent.map((row) => (
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
