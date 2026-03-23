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

        axios.get(`/api/config/departments?location_id=${context.location.id}`)
            .then(res => {
                setDepts(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => console.error(err));
    }, [context.location]);

    const handleSelect = (dept) => {
        setContext(prev => ({ ...prev, department: dept }));
        navigate('/asset');
    };

    return (
        <div className="page-container">
            <div className="nav-bar">
                <span>{context.location?.name}</span>
            </div>
            <h1 className="title">Seleccione Área</h1>
            <div className="grid-menu">
                {depts.map(d => (
                    <button key={d.id} className="btn-large" onClick={() => handleSelect(d)}>
                        {d.name}
                    </button>
                ))}
            </div>
            <div className="bottom-nav">
                <button onClick={() => navigate('/')}>Atrás</button>
            </div>
        </div>
    );
}
