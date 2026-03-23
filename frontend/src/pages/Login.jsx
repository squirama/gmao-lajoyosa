import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login({ setContext }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post('/api/login', { username, password });
            const { token, user } = res.data;

            // Store Token
            localStorage.setItem('session_token', token);
            localStorage.setItem('user_info', JSON.stringify(user));

            // Set Context (forces App re-render or state update)
            if (setContext) setContext({ user, token });

            // Config Axios default header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Always redirect to User App (Admin button will appear there)
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Error al iniciar sesión');
        }
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
            background: '#050505', color: 'white', fontFamily: 'Segoe UI, sans-serif'
        }}>
            <div style={{
                background: '#111', padding: '40px', borderRadius: '12px',
                border: '1px solid #333', width: '100%', maxWidth: '400px',
                boxShadow: '0 0 20px rgba(0,255,255,0.1)'
            }}>
                <h1 style={{ textAlign: 'center', color: '#00FFFF', marginBottom: '30px' }}>GMAO ACCESO</h1>

                {error && <div style={{ background: 'rgba(255,0,0,0.2)', color: '#ff4444', padding: '10px', borderRadius: '6px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '6px', fontSize: '1.1rem', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '6px', fontSize: '1.1rem', boxSizing: 'border-box' }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%', padding: '15px', background: 'rgba(0, 255, 255, 0.1)',
                            border: '2px solid #00FFFF', color: '#00FFFF', borderRadius: '6px',
                            fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer',
                            boxShadow: '0 0 10px rgba(0,255,255,0.2)'
                        }}
                    >
                        ENTRAR
                    </button>
                </form>
            </div>
        </div>
    );
}
