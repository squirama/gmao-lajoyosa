import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LocationSelect({ setContext }) {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('session_token');
        if (!token) {
            navigate('/login');
            return;
        }

        const authHeaders = { Authorization: `Bearer ${token}` };

        const loadLocations = async () => {
            setLoading(true);
            setError('');

            try {
                const directRes = await axios.get('/api/config/locations', {
                    headers: authHeaders,
                    params: { t: Date.now() }
                });

                const directLocations = Array.isArray(directRes.data) ? directRes.data : [];
                if (directLocations.length > 0) {
                    setLocations(directLocations);
                    return;
                }

                const fallbackRes = await axios.get('/api/config', {
                    headers: authHeaders,
                    params: { t: Date.now() }
                });

                const fallbackLocations = Array.isArray(fallbackRes.data?.locations) ? fallbackRes.data.locations : [];
                setLocations(fallbackLocations);

                if (fallbackLocations.length === 0) {
                    setError('No hay sedes disponibles para este usuario.');
                }
            } catch (err) {
                console.error(err);
                if (err.response?.status === 401) {
                    setError('La sesion no es valida. Vuelve a iniciar sesion.');
                } else {
                    setError('No se pudieron cargar las sedes.');
                }
            } finally {
                setLoading(false);
            }
        };

        loadLocations();
    }, [navigate]);

    const handleSelect = (loc) => {
        setContext((prev) => ({ ...prev, location: loc }));
        navigate('/department');
    };

    return (
        <div className="page-container">
            <h1 className="title">Seleccione Sede</h1>
            <div className="grid-menu">
                {loading && (
                    <div className="card" style={{ textAlign: 'center' }}>
                        Cargando sedes...
                    </div>
                )}

                {!loading && error && (
                    <div className="card" style={{ textAlign: 'center', borderColor: 'var(--neon-red)' }}>
                        {error}
                    </div>
                )}

                {!loading && !error && locations.map((loc) => (
                    <button key={loc.id} className="btn-large" onClick={() => handleSelect(loc)}>
                        {loc.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
