import { useState, useEffect } from 'react';
import { Download, Search, FileCode2 } from 'lucide-react';
import axios from 'axios';
import styles from './Historial.module.css';

interface FacturaRecord {
    id: string;
    claveNumerica: string | null;
    tipoDocumento: string;
    fechaEmision: string;
    montoTotal: string;
    estadoInterno: string;
}

export default function Historial() {
    const [facturas, setFacturas] = useState<FacturaRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [busqueda, setBusqueda] = useState('');
    const emisorIdMock = "tu-emisor-id"; // TODO: Obtain from AuthContext

    useEffect(() => {
        const fetchFacturas = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`http://localhost:3000/api/facturas?emisorId=${emisorIdMock}`);
                setFacturas(res.data);
            } catch (error) {
                console.error("Error fetching facturas", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFacturas();
    }, []);

    const filtrados = facturas.filter((d) => {
        if (filtroEstado !== 'TODOS' && d.estadoInterno !== filtroEstado) return false;

        // Since we don't have 'receptor' name in DocumentoElectronico DB directly yet, we search only by clave numeric
        if (busqueda && (!d.claveNumerica || !d.claveNumerica.includes(busqueda))) return false;
        return true;
    });

    const handleDownloadPDF = (clave: string | null) => {
        if (!clave) return alert("Clave no disponible");
        window.open(`http://localhost:3000/api/facturas/${clave}/pdf`, '_blank');
    };

    const handleDownloadXML = (clave: string | null) => {
        if (!clave) return alert("Clave no disponible");
        window.open(`http://localhost:3000/api/facturas/${clave}/xml`, '_blank');
    };

    const badgeClass = (estado: string) => {
        switch (estado) {
            case 'ACEPTADO': return styles.badgeSuccess;
            case 'RECHAZADO': return styles.badgeDanger;
            case 'ENVIADO': return styles.badgeWarning;
            default: return styles.badgeInfo;
        }
    };

    return (
        <div className={styles.historial}>
            <div className={styles.filters}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                    <input
                        className={styles.filterInput}
                        style={{ paddingLeft: 32 }}
                        placeholder="Buscar por receptor o clave..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <select className={styles.filterSelect} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="TODOS">Todos los estados</option>
                    <option value="ACEPTADO">Aceptado</option>
                    <option value="RECHAZADO">Rechazado</option>
                    <option value="ENVIADO">Enviado</option>
                </select>
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Clave</th>
                            <th>Tipo</th>
                            <th>Receptor</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Cargando documentos...</td>
                            </tr>
                        )}
                        {!loading && filtrados.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No se encontraron documentos</td>
                            </tr>
                        )}
                        {!loading && filtrados.map((row) => (
                            <tr key={row.id}>
                                <td className={styles.claveText}>{row.claveNumerica ? `${row.claveNumerica.substring(0, 20)}...` : 'Pendiente...'}</td>
                                <td>{row.tipoDocumento === '01' ? 'FE-01' : row.tipoDocumento === '04' ? 'TE-04' : row.tipoDocumento === '03' ? 'NC-03' : row.tipoDocumento === '02' ? 'ND-02' : 'OTRO'}</td>
                                <td>-- Cliente --</td>
                                <td>CRC {parseFloat(row.montoTotal).toLocaleString('es-CR')}</td>
                                <td><span className={`${styles.badge} ${badgeClass(row.estadoInterno)}`}>{row.estadoInterno}</span></td>
                                <td>{new Date(row.fechaEmision).toLocaleString('es-CR')}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className={styles.actionBtn}
                                            title="Descargar PDF"
                                            onClick={() => handleDownloadPDF(row.claveNumerica)}
                                            disabled={!row.claveNumerica}
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            className={styles.actionBtn}
                                            title="Descargar XML Firmado"
                                            onClick={() => handleDownloadXML(row.claveNumerica)}
                                            disabled={!row.claveNumerica}
                                        >
                                            <FileCode2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
