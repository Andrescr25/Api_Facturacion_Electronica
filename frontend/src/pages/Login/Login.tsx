import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

export default function Login() {
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: implementar autenticacion real contra el backend
        navigate('/');
    };

    return (
        <div className={styles.loginWrapper}>
            <form className={styles.loginCard} onSubmit={handleLogin}>
                <div className={styles.brand}>
                    <Zap size={28} className={styles.brandIcon} />
                    <span className={styles.brandName}>FacturaCR API</span>
                </div>

                <p className={styles.subtitle}>
                    Inicia sesion para gestionar tu integracion de facturacion electronica
                </p>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Cedula del Emisor</label>
                    <input className={styles.input} placeholder="3101654321" required />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Contrasena</label>
                    <input className={styles.input} type="password" placeholder="Tu contrasena" required />
                </div>

                <button type="submit" className={styles.loginBtn}>Iniciar sesion</button>

                <p className={styles.footer}>
                    Plataforma de Facturacion Electronica para Costa Rica
                </p>
            </form>
        </div>
    );
}
