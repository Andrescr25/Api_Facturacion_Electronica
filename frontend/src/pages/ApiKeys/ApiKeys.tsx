import { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Key } from 'lucide-react';
import axios from 'axios';
import styles from './ApiKeys.module.css';

interface ApiKey {
    id: string;
    nombre: string;
    key: string;
    fechaCreacion: string;
    ultimoUso: string | null;
    activa: boolean;
}

export default function ApiKeys() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const emisorIdMock = "tu-emisor-id"; // TODO: get from AuthContext

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:3000/api/keys?emisorId=${emisorIdMock}`);
            setKeys(res.data);
        } catch (error) {
            console.error('Error fetching API keys', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleCopy = (key: string) => {
        navigator.clipboard.writeText(key);
        alert('API Key copiada al portapapeles');
    };

    const handleCreate = async () => {
        if (!newKeyName.trim()) {
            alert('Debes ingresar un nombre para la API Key');
            return;
        }

        try {
            await axios.post('http://localhost:3000/api/keys', {
                emisorId: emisorIdMock,
                nombre: newKeyName.trim()
            });
            setNewKeyName('');
            setShowModal(false);
            fetchKeys();
        } catch (error) {
            console.error('Error creating API key', error);
            alert('Error al crear la API Key. Verifica si el perfil de emisor está configurado.');
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas revocar esta API Key? Esta acción cortará el acceso de las integraciones asociadas inmediatamente.')) return;

        try {
            await axios.delete(`http://localhost:3000/api/keys/${id}`);
            fetchKeys();
        } catch (error) {
            console.error('Error revoking API key', error);
        }
    };

    return (
        <div className={styles.page}>
            <p className={styles.description}>
                Las API Keys te permiten autenticar solicitudes desde tus sistemas.
                Cada key está limitada a 30 peticiones por mes. Mantenlas seguras.
            </p>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>Tus API Keys</span>
                    <button className={styles.createBtn} onClick={() => setShowModal(true)}>
                        <Plus size={16} />
                        Crear nueva key
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando tus credenciales...</div>
                ) : keys.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Key size={32} />
                        <span>No tienes ninguna API Key activa.</span>
                    </div>
                ) : (
                    <ul className={styles.keyList}>
                        {keys.map((k) => (
                            <li key={k.id} className={styles.keyItem}>
                                <div className={styles.keyInfo}>
                                    <span className={styles.keyName}>{k.nombre}</span>
                                    <span className={styles.keyValue}>
                                        {k.key.substring(0, 12)}...{k.key.substring(k.key.length - 4)}
                                    </span>
                                    <span className={styles.keyMeta}>
                                        Creada: {new Date(k.fechaCreacion).toLocaleDateString()}
                                        {k.ultimoUso ? ` | Último uso: ${new Date(k.ultimoUso).toLocaleDateString()}` : ' | Nunca usada'}
                                    </span>
                                </div>
                                <div className={styles.keyActions}>
                                    <button className={styles.copyBtn} onClick={() => handleCopy(k.key)}>
                                        <Copy size={14} /> Copiar
                                    </button>
                                    <button className={styles.deleteBtn} onClick={() => handleRevoke(k.id)}>
                                        <Trash2 size={14} /> Revocar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Modal para Crear API Key */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Crear Nueva API Key</h3>
                            <button className={styles.closeModalBtn} onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <label htmlFor="newKeyName">Nombre de la API Key</label>
                            <input
                                type="text"
                                id="newKeyName"
                                className={styles.inputField}
                                placeholder="ej: Producción, Servidor Pruebas"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className={styles.confirmBtn} onClick={handleCreate}>Crear Key</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
