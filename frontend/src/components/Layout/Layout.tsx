import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './Layout.module.css';

export default function Layout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={styles.layout}>
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <TopBar collapsed={collapsed} />
            <main className={`${styles.content} ${collapsed ? styles.contentCollapsed : styles.contentExpanded}`}>
                <Outlet />
            </main>
        </div>
    );
}
