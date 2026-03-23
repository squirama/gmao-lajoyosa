import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AssetSelect({ context, setContext }) {
    const [assets, setAssets] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!context.department) {
            navigate('/department');
            return;
        }

        axios.get(`/api/config/assets?department_id=${context.department.id}`)
            .then(res => {
                setAssets(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => console.error(err));
    }, [context.department]);

    const handleSelect = (asset) => {
        setContext(prev => ({ ...prev, asset: asset }));
        navigate('/action');
    };

    return (
        <div className="page-container">
            <div className="nav-bar">
                <span>{context.location?.name} / {context.department?.name}</span>
            </div>
            <h1 className="title">Seleccione Máquina</h1>
            <div className="grid-menu">
                {assets.map(a => (
                    <button key={a.id} className="btn-large" onClick={() => handleSelect(a)}>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{a.name}</div>
                            <div style={{ fontSize: '0.8em' }}>{a.brand} {a.model}</div>
                        </div>
                    </button>
                ))}
            </div>
            <div className="bottom-nav">
                <button onClick={() => navigate('/department')}>Atrás</button>
                <button onClick={() => navigate('/calendar')} style={{ background: 'var(--neon-purple)', color: 'white' }}>Ver Planificación</button>
            </div>
        </div>
    );
}
