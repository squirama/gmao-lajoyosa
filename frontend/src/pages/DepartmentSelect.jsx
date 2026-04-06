import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function DepartmentSelect({ context, setContext }) {
    const [depts, setDepts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!context.location) {
            navigate('/');
            return;
        }

        const token = localStorage.getItem('session_token');
        if (!token) {
            navigate('/login');
            return;
        }

        axios.get(`/api/config/departments?location_id=${context.location.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setDepts(Array.isArray(res.data) ? res.data : []);
            })
            .catch((err) => console.error(err));
    }, [context.location, navigate]);

    const handleSelect = (dept) => {
        setContext((prev) => ({ ...prev, department: dept }));
        navigate('/asset');
    };

    return (
        <div className="page-container">
            <div className="nav-bar">
                <span>{context.location?.name}</span>
            </div>
            <h1 className="title">Seleccione Area</h1>
            <div className="grid-menu">
                {depts.map((dept) => (
                    <button
                        key={dept.id}
                        className="btn-large btn-large--with-badge"
                        onClick={() => handleSelect(dept)}
                        title={`Tareas esta semana: ${dept.weekly_task_count || 0}`}
                    >
                        {(dept.weekly_task_count || 0) > 0 && (
                            <span className="task-badge">{dept.weekly_task_count}</span>
                        )}
                        <span>{dept.name}</span>
                    </button>
                ))}
            </div>
            <div className="bottom-nav">
                <button onClick={() => navigate('/')}>Atras</button>
                <button onClick={() => navigate(`/calendar?scope=location&location_id=${context.location.id}`)} style={{ background: 'var(--neon-purple)', color: 'white' }}>
                    Ver calendario sede
                </button>
            </div>
        </div>
    );
}
