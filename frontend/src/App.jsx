import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import LocationSelect from './pages/LocationSelect';
import DepartmentSelect from './pages/DepartmentSelect';
import AssetSelect from './pages/AssetSelect';
import ActionPanel from './pages/ActionPanel';
import AdminPanel from './pages/AdminPanel';
// import AdminDashboard from './pages/AdminDashboard'; // Placeholder used inline
// import ... other placeholders

import UserCalendar from './pages/UserCalendar';
import Login from './pages/Login';
import './styles/main.css';

import RequestButton from './components/RequestButton';

// Setup Axios Default
const token = localStorage.getItem('session_token');
if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Role Based Route Wrapper
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

// Internal Component inside Router to use useLocation
function AppContent({ context, setContext, logout }) {
    const location = useLocation();

    return (
        <div className="page-container">
            {/* Logout Button & Admin Button (Only if logged in and not in Admin Panel) */}
            {context.token && !location.pathname.startsWith('/admin') && (
                <>
                    {/* ADMIN ACCESS BUTTON */}
                    {(context.user?.role === 'SUPER_ADMIN' || context.user?.role === 'ADMIN' || context.user?.role === 'admin') && (
                        <button
                            onClick={() => window.location.href = '/admin/assets'}
                            style={{
                                position: 'fixed', top: '20px', right: '20px', zIndex: 2000,
                                background: '#0ea5e9', color: 'white', border: 'none',
                                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                                fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                        >
                            ⚙️ Panel Admin
                        </button>
                    )}

                    <button
                        onClick={logout}
                        style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 2000, background: 'rgba(0,0,0,0.5)', color: '#888', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Log Out
                    </button>
                </>
            )}

            <Routes>
                <Route path="/login" element={<Login setContext={setContext} />} />

                {/* ADMIN PANEL ROUTES */}
                <Route path="/admin" element={
                    <RequireRole user={context.user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'admin']} redirectTo="/login">
                        <Navigate to="/admin/assets" replace />
                    </RequireRole>
                } />
                <Route path="/admin/:section" element={
                    <RequireRole user={context.user} allowedRoles={['SUPER_ADMIN', 'ADMIN', 'admin']} redirectTo="/login">
                        <AdminPanel />
                    </RequireRole>
                } />

                {/* OPERATOR / USER ROUTES */}
                <Route path="/" element={<RequireAuth redirectTo="/login"><LocationSelect setContext={setContext} /></RequireAuth>} />
                <Route path="/department" element={<RequireAuth redirectTo="/login"><DepartmentSelect context={context} setContext={setContext} /></RequireAuth>} />
                <Route path="/asset" element={<RequireAuth redirectTo="/login"><AssetSelect context={context} setContext={setContext} /></RequireAuth>} />
                <Route path="/action" element={<RequireAuth redirectTo="/login"><ActionPanel context={context} /></RequireAuth>} />
                <Route path="/calendar" element={<RequireAuth redirectTo="/login"><UserCalendar context={context} /></RequireAuth>} />
            </Routes>

            {/* RequestButton if logged in and NOT in admin */}
            {context.token && !location.pathname.startsWith('/admin') && <RequestButton />}
        </div>
    );
}

function App() {
    // Safe Parser for LocalStorage
    const safeParse = (key) => {
        try {
            const item = localStorage.getItem(key);
            if (!item || item === "undefined") return null;
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
        token: localStorage.getItem('session_token') || null
    });

    useEffect(() => {
        // Sync context with localStorage on mount
        const t = localStorage.getItem('session_token');
        const u = safeParse('user_info');
        if (t && u) setContext(prev => ({ ...prev, token: t, user: u }));
    }, []);

    const logout = () => {
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_info');
        setContext({ location: null, department: null, asset: null, user: null, token: null });
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <Router>
            <AppContent context={context} setContext={setContext} logout={logout} />
        </Router>
    );
}

export default App;
