import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/admin.css'; // We'll create this next

export default function AdminLayout({ context, logout }) {
    if (!context.user) return <div>Cargando...</div>;

    return (
        <div className="admin-layout">
            <AdminSidebar user={context.user} logout={logout} />
            <main className="admin-content">
                <Outlet />
            </main>
        </div>
    );
}
