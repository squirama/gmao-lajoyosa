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

            localStorage.setItem('session_token', token);
            localStorage.setItem('user_info', JSON.stringify(user));

            if (setContext) setContext({ user, token });

            axios.defaults.headers.common.Authorization = `Bearer ${token}`;
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Error al iniciar sesion');
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#121212',
                color: '#eeeeee',
                fontFamily: 'Segoe UI, sans-serif',
            }}
        >
            <div
                style={{
                    background: '#1e272e',
                    padding: '40px',
                    borderRadius: '12px',
                    border: '1px solid #3b4650',
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
                }}
            >
                <h1 style={{ textAlign: 'center', color: '#f39c12', marginBottom: '30px' }}>GMAO ACCESO</h1>

                {error && (
                    <div
                        role="alert"
                        style={{
                            background: 'rgba(192,57,43,0.18)',
                            color: '#f1948a',
                            padding: '10px',
                            borderRadius: '6px',
                            marginBottom: '20px',
                            textAlign: 'center',
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="login-username" style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>
                            Usuario
                        </label>
                        <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#2c3e50',
                                border: '1px solid #435364',
                                color: 'white',
                                borderRadius: '6px',
                                fontSize: '1.1rem',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label htmlFor="login-password" style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>
                            Contrasena
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#2c3e50',
                                border: '1px solid #435364',
                                color: 'white',
                                borderRadius: '6px',
                                fontSize: '1.1rem',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '15px',
                            background: '#2980b9',
                            border: '2px solid #2471a3',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
                        }}
                    >
                        ENTRAR
                    </button>
                </form>
            </div>
        </div>
    );
}
