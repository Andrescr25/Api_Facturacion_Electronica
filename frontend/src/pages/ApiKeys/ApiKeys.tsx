import { useState } from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';
import styles from './ApiKeys.module.css';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    createdAt: string;
}

const mockKeys: ApiKey[] = [
    { id: '1', name: 'Produccion - POS Principal', key: 'sk_live_abcdef1234567890abcdef1234567890', createdAt: '2026-01-15' },
    { id: '2', name: 'Desarrollo - Testing', key: 'sk_test_xyz9876543210xyz9876543210abcd', createdAt: '2026-02-01' },
];

export default function ApiKeys() {
    const [keys] = useState<ApiKey[]>(mockKeys);

    const handleCopy = (key: string) => {
        navigator.clipboard.writeText(key);
    };

    return (
        <div className={styles.page}>
            <p className={styles.description}>
                Las API Keys te permiten autenticar solicitudes desde tus sistemas.
                Cada key tiene acceso completo a tu cuenta de emisor. Mantenlas seguras.
            </p>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>Tus API Keys</span>
                    <button className={styles.createBtn}>
                        <Plus size={16} />
                        Crear nueva key
                    </button>
                </div>

                <ul className={styles.keyList}>
                    {keys.map((k) => (
                        <li key={k.id} className={styles.keyItem}>
                            <div className={styles.keyInfo}>
                                <span className={styles.keyName}>{k.name}</span>
                                <span className={styles.keyValue}>{k.key.substring(0, 12)}...{k.key.substring(k.key.length - 4)}</span>
                                <span className={styles.keyMeta}>Creada: {k.createdAt}</span>
                            </div>
                            <div className={styles.keyActions}>
                                <button className={styles.copyBtn} onClick={() => handleCopy(k.key)}>
                                    <Copy size={14} /> Copiar
                                </button>
                                <button className={styles.deleteBtn}>
                                    <Trash2 size={14} /> Revocar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
