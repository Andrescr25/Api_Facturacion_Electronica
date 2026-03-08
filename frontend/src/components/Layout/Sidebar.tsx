import { NavLink, useLocation } from 'react-router-dom';
import {
    Zap,
    LayoutDashboard,
    BookOpen,
    PlayCircle,
    Clock,
    Settings,
    Key,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/docs', label: 'Documentacion API', icon: BookOpen },
    { path: '/playground', label: 'API Playground', icon: PlayCircle },
    { path: '/historial', label: 'Historial', icon: Clock },
];

const configItems = [
    { path: '/configuracion', label: 'Configuracion', icon: Settings },
    { path: '/api-keys', label: 'API Keys', icon: Key },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const location = useLocation();

    const linkClass = (path: string) => {
        const isActive = location.pathname === path;
        return `${styles.navItem} ${isActive ? styles.navItemActive : ''}`;
    };

    return (
        <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
            <div className={styles.brand}>
                <Zap size={24} className={styles.brandIcon} />
                <span className={styles.brandText}>FacturaCR API</span>
            </div>

            <nav className={styles.nav}>
                <div className={styles.sectionLabel}>Principal</div>
                {navItems.map((item) => (
                    <NavLink key={item.path} to={item.path} className={linkClass(item.path)}>
                        <item.icon size={20} className={styles.navIcon} />
                        <span className={styles.navLabel}>{item.label}</span>
                    </NavLink>
                ))}

                <div className={styles.sectionLabel}>Cuenta</div>
                {configItems.map((item) => (
                    <NavLink key={item.path} to={item.path} className={linkClass(item.path)}>
                        <item.icon size={20} className={styles.navIcon} />
                        <span className={styles.navLabel}>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className={styles.footer}>
                <button className={styles.collapseBtn} onClick={onToggle}>
                    {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>
        </aside>
    );
}
