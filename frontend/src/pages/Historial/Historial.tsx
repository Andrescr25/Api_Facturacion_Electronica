import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import styles from './Historial.module.css';

const mockData = [
    { clave: '50601022600310112345600100001010000000001199999999', tipo: 'FE-01', receptor: 'Tech Solutions SA', monto: '56,500.00', estado: 'ACEPTADO', fecha: '2026-02-26 14:32' },
    { clave: '50601022600310112345600100001010000000002199999999', tipo: 'FE-01', receptor: 'Cafe del Valle SRL', monto: '12,300.00', estado: 'ENVIADO', fecha: '2026-02-26 15:01' },
    { clave: '50601022600310112345600100001030000000001199999999', tipo: 'NC-03', receptor: 'Distribuidora CR', monto: '8,450.00', estado: 'RECHAZADO', fecha: '2026-02-25 09:45' },
    { clave: '50601022600310112345600100001010000000003199999999', tipo: 'FE-01', receptor: 'Importadora Global', monto: '245,000.00', estado: 'ACEPTADO', fecha: '2026-02-25 11:20' },
    { clave: '50601022600310112345600100001040000000001199999999', tipo: 'TE-04', receptor: 'Cliente Final', monto: '5,650.00', estado: 'ACEPTADO', fecha: '2026-02-24 17:15' },
];

export default function Historial() {
    const [filtroEstado, setFiltroEstado] = useState('TODOS');
    const [busqueda, setBusqueda] = useState('');

    const filtrados = mockData.filter((d) => {
        if (filtroEstado !== 'TODOS' && d.estado !== filtroEstado) return false;
        if (busqueda && !d.receptor.toLowerCase().includes(busqueda.toLowerCase()) && !d.clave.includes(busqueda)) return false;
        return true;
    });

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
                        {filtrados.map((row) => (
                            <tr key={row.clave}>
                                <td className={styles.claveText}>{row.clave.substring(0, 20)}...</td>
                                <td>{row.tipo}</td>
                                <td>{row.receptor}</td>
                                <td>CRC {row.monto}</td>
                                <td><span className={`${styles.badge} ${badgeClass(row.estado)}`}>{row.estado}</span></td>
                                <td>{row.fecha}</td>
                                <td>
                                    <button className={styles.actionBtn}>
                                        <Download size={12} /> PDF
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
