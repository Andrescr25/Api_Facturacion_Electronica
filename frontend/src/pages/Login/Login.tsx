import { useState } from 'react';
import { Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import styles from './Login.module.css';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError('Credenciales inválidas o error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError('No se pudo iniciar sesión con Google.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginWrapper}>
            <form className={styles.loginCard} onSubmit={handleEmailLogin}>
                <div className={styles.brand}>
                    <Zap size={28} className={styles.brandIcon} />
                    <span className={styles.brandName}>FacturaCR API</span>
                </div>

                <p className={styles.subtitle}>
                    Inicia sesión para gestionar tu integración de facturación electrónica
                </p>

                {error && <div style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}

                <div className={styles.formGroup}>
                    <label className={styles.label}>Correo Electrónico</label>
                    <input
                        className={styles.input}
                        type="email"
                        placeholder="usuario@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Contraseña</label>
                    <input
                        className={styles.input}
                        type="password"
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" disabled={loading} className={styles.loginBtn}>
                    {loading ? 'Iniciando...' : 'Iniciar sesión'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
                    <div style={{ flex: 1, backgroundColor: 'var(--border-color)', height: '1px' }}></div>
                    <span style={{ margin: '0 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>o</span>
                    <div style={{ flex: 1, backgroundColor: 'var(--border-color)', height: '1px' }}></div>
                </div>

                <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    style={{
                        width: '100%', padding: '0.75rem', borderRadius: '8px',
                        border: '1px solid var(--border-color-light)',
                        backgroundColor: 'var(--bg-elevated)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)',
                        transition: 'background 120ms ease'
                    }}
                >
                    <Globe size={17} />
                    Continuar con Google
                </button>

                <p className={styles.footer}>
                    Plataforma de Facturación Electrónica para Costa Rica
                </p>
            </form>
        </div>
    );
}
