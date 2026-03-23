import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function AdminSidebar({ user, logout }) {
    const isSuper = user.role === 'SUPER_ADMIN';
    const isAdmin = user.role === 'ADMIN' || user.role === 'admin';

    // Base links for all admins
    const links = [
        { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
        { to: '/admin/calendar', icon: '📅', label: 'Planificación' },
        { to: '/admin/users', icon: '👷', label: 'Usuarios' },
        { to: '/admin/assets', icon: '🏭', label: 'Máquinas' },
        { to: '/admin/maintenance-plans', icon: '📋', label: 'Planes' },
    ];

    // Super Admin only links
    if (isSuper) {
        links.splice(2, 0, { to: '/admin/locations', icon: '🌍', label: 'Sedes' });
    }

    // Admin/Super links
    if (isSuper || isAdmin) {
        links.splice(3, 0, { to: '/admin/departments', icon: '🏢', label: 'Departamentos' });
    }

    return (
        <div className="admin-sidebar">
            <div className="sidebar-header">
                <h3>🛠️ GMAO Admin</h3>
                <div className="user-info">
                    <small>{user.username}</small>
                    <span className="badge">{user.role}</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                    >
                        <span className="icon">{link.icon}</span>
                        <span className="label">{link.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button onClick={logout} className="logout-btn">
                    🚪 Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
