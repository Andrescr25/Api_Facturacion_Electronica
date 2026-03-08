import { Upload, Shield } from 'lucide-react';
import styles from './Configuracion.module.css';

export default function Configuracion() {
    return (
        <div className={styles.page}>
            {/* Datos del Emisor */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>Datos del Emisor</div>
                <div className={styles.cardBody}>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nombre / Razon Social</label>
                            <input className={styles.input} placeholder="Empresa SA" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Cedula Juridica</label>
                            <input className={styles.input} placeholder="3101654321" />
                        </div>
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Usuario ATV (Hacienda)</label>
                            <input className={styles.input} placeholder="cpj-3101654321@stag.comprobanteselectronicos.go.cr" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Password ATV</label>
                            <input className={styles.input} type="password" placeholder="********" />
                        </div>
                    </div>
                    <button className={styles.saveBtn}>Guardar cambios</button>
                </div>
            </div>

            {/* Certificado Digital */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>Certificado Digital (.p12)</div>
                <div className={styles.cardBody}>
                    <div className={styles.inputFile}>
                        <Upload size={24} style={{ marginBottom: 8, color: 'var(--text-muted)' }} />
                        <p>Arrastra tu archivo .p12 aqui o haz click para seleccionarlo</p>
                        <span className={styles.hint}>El certificado es encriptado y almacenado de forma segura</span>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>PIN del certificado</label>
                        <input className={styles.input} type="password" placeholder="PIN del .p12" />
                        <span className={styles.hint}>Este PIN es necesario para firmar los comprobantes electronicos</span>
                    </div>
                    <button className={styles.saveBtn}>
                        <Shield size={14} style={{ marginRight: 6 }} />
                        Subir certificado
                    </button>
                </div>
            </div>
        </div>
    );
}
