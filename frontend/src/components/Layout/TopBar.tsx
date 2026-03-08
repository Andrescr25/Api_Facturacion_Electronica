import { useLocation, useNavigate } from 'react-router-dom';
import { User, CircleDot, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const title = pageTitles[location.pathname] || 'FacturaCR API';

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <header className={`${styles.topbar} ${collapsed ? styles.topbarCollapsed : styles.topbarExpanded}`}>
            <h1 className={styles.pageTitle}>{title}</h1>

            <div className={styles.actions}>
                <div className={styles.envBadge}>
                    <CircleDot size={12} />
                    Sandbox
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#475569' }}>
                    <User size={16} />
                    {currentUser?.email || 'Usuario'}
                </div>
                <button
                    onClick={handleLogout}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <LogOut size={16} />
                    Salir
                </button>
            </div>
        </header>
    );
}
