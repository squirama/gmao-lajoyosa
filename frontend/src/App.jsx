import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import './styles/main.css';
import RequestButton from './components/RequestButton';

const LocationSelect = lazy(() => import('./pages/LocationSelect'));
const DepartmentSelect = lazy(() => import('./pages/DepartmentSelect'));
const AssetSelect = lazy(() => import('./pages/AssetSelect'));
const ActionPanel = lazy(() => import('./pages/ActionPanel'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const UserCalendar = lazy(() => import('./pages/UserCalendar'));
const Login = lazy(() => import('./pages/Login'));

const token = localStorage.getItem('session_token');
if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

function RequireRole({ children, allowedRoles, user, redirectTo = '/login' }) {
    if (!user) return <Navigate to={redirectTo} />;
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/" />;
    }
    return children;
}

function RequireAuth({ children, redirectTo }) {
    const token = localStorage.getItem('session_token');
    return token ? children : <Navigate to={redirectTo} />;
}

function RouteLoadingFallback() {
    return (
        <div className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="card" style={{ width: 320, textAlign: 'center' }}>
                <h2 className="title" style={{ fontSize: '1.6rem', marginTop: 0 }}>Cargando</h2>
                <div style={{ color: 'var(--text-muted)' }}>Preparando pantalla...</div>
            </div>
        </div>
    );
}

function AppContent({ context, setContext, logout }) {
    const location = useLocation();

    return (
        <div className="page-container">
            {context.token && !location.pathname.startsWith('/admin') && (
                <>
                    {(context.user?.role === 'SUPER_ADMIN' || context.user?.role === 'ADMIN' || context.user?.role === 'admin') && (
                        <button
                            onClick={() => window.location.href = '/admin/assets'}
                            style={{
                                position: 'fixed',
                                top: '20px',
                                right: '20px',
                                zIndex: 2000,
                                background: '#0ea5e9',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            }}
                        >
                            Panel Admin
                        </button>
                    )}

                    <button
                        onClick={logout}
                        style={{
                            position: 'fixed',
                            top: '20px',
                            left: '20px',
                            zIndex: 2000,
                            background: 'rgba(0,0,0,0.5)',
                            color: '#888',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Salir
                    </button>
                </>
            )}

            <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                    <Route path="/login" element={<Login setContext={setContext} />} />
                    <Route
                        path="/admin"
                        element={
                            <RequireRole user={context.user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'admin']} redirectTo="/login">
                                <Navigate to="/admin/assets" replace />
                            </RequireRole>
                        }
                    />
                    <Route
                        path="/admin/:section"
                        element={
                            <RequireRole user={context.user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'admin']} redirectTo="/login">
                                <AdminPanel />
                            </RequireRole>
                        }
                    />
                    <Route path="/" element={<RequireAuth redirectTo="/login"><LocationSelect setContext={setContext} /></RequireAuth>} />
                    <Route path="/department" element={<RequireAuth redirectTo="/login"><DepartmentSelect context={context} setContext={setContext} /></RequireAuth>} />
                    <Route path="/asset" element={<RequireAuth redirectTo="/login"><AssetSelect context={context} setContext={setContext} /></RequireAuth>} />
                    <Route path="/action" element={<RequireAuth redirectTo="/login"><ActionPanel context={context} /></RequireAuth>} />
                    <Route path="/calendar" element={<RequireAuth redirectTo="/login"><UserCalendar context={context} /></RequireAuth>} />
                </Routes>
            </Suspense>

            {context.token && !location.pathname.startsWith('/admin') && <RequestButton />}
        </div>
    );
}

function App() {
    const safeParse = (key) => {
        try {
            const item = localStorage.getItem(key);
            if (!item || item === 'undefined') return null;
            return JSON.parse(item);
        } catch (e) {
            console.error(`Error parsing ${key}`, e);
            localStorage.removeItem(key);
            return null;
        }
    };

    const [context, setContext] = useState({
        location: null,
        department: null,
        asset: null,
        user: safeParse('user_info'),
        token: localStorage.getItem('session_token') || null,
    });

    useEffect(() => {
        const t = localStorage.getItem('session_token');
        const u = safeParse('user_info');
        if (t && u) setContext((prev) => ({ ...prev, token: t, user: u }));
    }, []);

    const logout = () => {
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_info');
        setContext({ location: null, department: null, asset: null, user: null, token: null });
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent context={context} setContext={setContext} logout={logout} />
        </Router>
    );
}

export default App;
