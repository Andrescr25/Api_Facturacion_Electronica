import { useState, useEffect, useRef } from 'react';
import { Upload, Shield } from 'lucide-react';
import axios from 'axios';
import styles from './Configuracion.module.css';

export default function Configuracion() {
    // Basic Info State
    const [nombre, setNombre] = useState('');
    const [identificacion, setIdentificacion] = useState('');
    const [usuarioAtv, setUsuarioAtv] = useState('');
    const [passwordAtv, setPasswordAtv] = useState('');

    // Status Flags from DB
    const [hasPasswordAtv, setHasPasswordAtv] = useState(false);
    const [hasCertificado, setHasCertificado] = useState(false);
    const [hasPinCertificado, setHasPinCertificado] = useState(false);

    // File upload State
    const [pinCertificadoInput, setPinCertificadoInput] = useState('');
    const [fileCert, setFileCert] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:3000/api/configuracion');
            const data = res.data;
            setNombre(data.nombre || '');
            setIdentificacion(data.identificacion || '');
            setUsuarioAtv(data.usuarioAtv || '');
            setHasPasswordAtv(data.hasPasswordAtv);
            setHasCertificado(data.hasCertificado);
            setHasPinCertificado(data.hasPinCertificado);
        } catch (error) {
            console.error("Error cargando configuración", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const handleSaveInfo = async () => {
        try {
            await axios.put('http://localhost:3000/api/configuracion', {
                nombre, identificacion, usuarioAtv, passwordAtv
            });
            alert('Datos del emisor actualizados correctamente.');
            setPasswordAtv(''); // Clear form field for security
            loadConfig();
        } catch (error) {
            console.error(error);
            alert('Fallo actualizando la información del emisor.');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.p12')) {
                alert('Solo se admiten certificados .p12');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('El archivo es demasiado grande (> 5MB)');
                return;
            }
            setFileCert(file);
        }
    };

    const handleUploadCert = async () => {
        if (!fileCert) {
            alert('Por favor selecciona un archivo .p12');
            return;
        }
        if (!pinCertificadoInput) {
            alert('Es necesario ingresar el PIN criptográfico del certificado para firmar.');
            return;
        }

        const formData = new FormData();
        formData.append('certificado', fileCert);
        formData.append('pinCertificado', pinCertificadoInput);

        try {
            await axios.post('http://localhost:3000/api/configuracion/certificado', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Certificado importado y almacenado correctamente de forma segura.');
            setFileCert(null);
            setPinCertificadoInput('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadConfig();
        } catch (error) {
            console.error(error);
            alert('Error al importar el certificado p12.');
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Cargando configuración...</div>;

    return (
        <div className={styles.page}>
            {/* Datos del Emisor */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>Datos del Emisor y ATV (Hacienda)</div>
                <div className={styles.cardBody}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                        Estos datos son los que se usarán como <b>Emisor</b> en tus facturas y para conectarse vía API al ATV del Ministerio.
                    </p>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nombre / Razón Social</label>
                            <input className={styles.input} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Empresa SA" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Cédula Jurídica / Física</label>
                            <input className={styles.input} value={identificacion} onChange={e => setIdentificacion(e.target.value)} placeholder="3101654321" />
                        </div>
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Usuario de API ATV</label>
                            <input className={styles.input} value={usuarioAtv} onChange={e => setUsuarioAtv(e.target.value)} placeholder="cpj-3101654321@stag.comprobanteselectronicos.go.cr" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Contraseña ATV {hasPasswordAtv && <span style={{ color: 'var(--color-success)', fontSize: '0.75rem' }}>(Guardada ✓)</span>}</label>
                            <input className={styles.input} type="password" value={passwordAtv} onChange={e => setPasswordAtv(e.target.value)} placeholder="********" />
                            <span className={styles.hint}>Déjalo en blanco si no deseas cambiar el guardado actualmente.</span>
                        </div>
                    </div>
                    <button className={styles.saveBtn} onClick={handleSaveInfo}>Guardar información</button>
                </div>
            </div>

            {/* Certificado Digital */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>Certificado Digital Críptográfico (.p12)</div>
                <div className={styles.cardBody}>
                    {hasCertificado && hasPinCertificado ? (
                        <div style={{ marginBottom: '1rem', padding: '10px', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: '4px' }}>
                            <p style={{ color: 'var(--color-success)', margin: 0, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={16} /> Sistema criptográfico operativo y asegurado contra hacienda.
                            </p>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '1rem', padding: '10px', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', borderRadius: '4px' }}>
                            <p style={{ color: 'var(--color-warning)', margin: 0, fontWeight: 500 }}>
                                Aún no has importado un certificado legal activo. Sube tu archivo .p12 generado en el Banco Central.
                            </p>
                        </div>
                    )}

                    <div className={styles.inputFile} onClick={() => fileInputRef.current?.click()}>
                        <Upload size={24} style={{ marginBottom: 8, color: 'var(--text-muted)' }} />
                        <p>{fileCert ? fileCert.name : "Haz click para seleccionar tu archivo .p12 local"}</p>
                        <span className={styles.hint}>Solamente enviaremos los bytes encriptados vía PostgreSQL</span>
                        <input
                            type="file"
                            accept=".p12"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                    </div>

                    {fileCert && (
                        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                            <label className={styles.label}>Clave / PIN del certificado</label>
                            <input className={styles.input} type="password" value={pinCertificadoInput} onChange={e => setPinCertificadoInput(e.target.value)} placeholder="Clave generada en el BCCR" />
                            <span className={styles.hint}>Este PIN es rigurosamente necesario para desencriptar remotamente y timbrar XML en tiempo real.</span>
                        </div>
                    )}

                    <button className={styles.saveBtn} style={{ marginTop: '1rem' }} onClick={handleUploadCert} disabled={!fileCert}>
                        <Shield size={14} style={{ marginRight: 6 }} />
                        Reemplazar / Subir mi certificado
                    </button>
                </div>
            </div>
        </div>
    );
}
