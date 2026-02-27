import { useLocation } from 'react-router-dom';
import { User, CircleDot } from 'lucide-react';
import styles from './TopBar.module.css';

interface TopBarProps {
    collapsed: boolean;
}

const pageTitles: Record<string, string> = {
    '/': 'Dashboard',
    '/docs': 'Documentacion API',
    '/playground': 'API Playground',
    '/historial': 'Historial de Facturas',
    '/configuracion': 'Configuracion',
    '/api-keys': 'API Keys',
};

export default function TopBar({ collapsed }: TopBarProps) {
    const location = useLocation();
    const title = pageTitles[location.pathname] || 'FacturaCR API';

    return (
        <header className={`${styles.topbar} ${collapsed ? styles.topbarCollapsed : styles.topbarExpanded}`}>
            <h1 className={styles.pageTitle}>{title}</h1>

            <div className={styles.actions}>
                <div className={styles.envBadge}>
                    <CircleDot size={12} />
                    Sandbox
                </div>
                <button className={styles.userBtn}>
                    <User size={16} />
                    Mi Cuenta
                </button>
            </div>
        </header>
    );
}
