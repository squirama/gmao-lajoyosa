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

        const token = localStorage.getItem('session_token');
        if (!token) {
            navigate('/login');
            return;
        }

        axios.get(`/api/config/assets?department_id=${context.department.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setAssets(Array.isArray(res.data) ? res.data : []);
            })
            .catch((err) => console.error(err));
    }, [context.department, navigate]);

    const handleSelect = (asset) => {
        setContext((prev) => ({ ...prev, asset }));
        navigate('/action');
    };

    return (
        <div className="page-container">
            <div className="nav-bar">
                <span>{context.location?.name} / {context.department?.name}</span>
            </div>
            <h1 className="title">Seleccione Maquina</h1>
            <div className="grid-menu">
                {assets.map((asset) => (
                    <button
                        key={asset.id}
                        className="btn-large btn-large--with-badge"
                        onClick={() => handleSelect(asset)}
                        title={`Tareas esta semana: ${asset.weekly_task_count || 0}`}
                    >
                        {(asset.weekly_task_count || 0) > 0 && (
                            <span className="task-badge">{asset.weekly_task_count}</span>
                        )}
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{asset.name}</div>
                            <div style={{ fontSize: '0.8em' }}>{asset.brand} {asset.model}</div>
                        </div>
                    </button>
                ))}
            </div>
            <div className="bottom-nav">
                <button onClick={() => navigate('/department')}>Atras</button>
                <button onClick={() => navigate(`/calendar?scope=department&department_id=${context.department.id}`)} style={{ background: 'var(--neon-purple)', color: 'white' }}>
                    Ver calendario area
                </button>
            </div>
        </div>
    );
}
