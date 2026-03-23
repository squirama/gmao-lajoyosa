import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LocationSelect({ setContext }) {
    const [locations, setLocations] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get('/api/config/locations')
            .then(res => {
                setLocations(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => console.error(err));
    }, []);

    const handleSelect = (loc) => {
        setContext(prev => ({ ...prev, location: loc }));
        navigate('/department');
    };

    return (
        <div className="page-container">
            <h1 className="title">Seleccione Sede</h1>
            <div className="grid-menu">
                {locations.map(loc => (
                    <button key={loc.id} className="btn-large" onClick={() => handleSelect(loc)}>
                        {loc.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
