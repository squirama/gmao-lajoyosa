import React, { useState } from 'react';
import axios from 'axios';

const RequestButton = () => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState({ operator: '', reason: '', urgency: 'Baja' });

    const handleSubmit = async () => {
        if (!data.operator || !data.reason) return alert("Nombre y motivo obligatorios");

        try {
            await axios.post('/api/requests', {
                operator_name: data.operator,
                reason: data.reason,
                urgency: data.urgency
            });
            alert("✅ Solicitud enviada");
            setOpen(false);
            setData({ operator: '', reason: '', urgency: 'Baja' });
        } catch (e) {
            alert("❌ Error al enviar solicitud");
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '110px',
                    right: '20px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    fontSize: '30px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    zIndex: 10000
                }}
                title="Solicitar Mantenimiento"
            >
                🔧
            </button>

            {open && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 2001
                }}>
                    <div style={{
                        background: '#1e293b',
                        padding: '20px',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: '400px',
                        border: '1px solid #ef4444'
                    }}>
                        <h2 style={{ color: '#ef4444', marginTop: 0 }}>🚨 Solicitud Mantenimiento</h2>

                        <label style={{ display: 'block', color: '#ccc', marginTop: '10px' }}>Operario:</label>
                        <input
                            type="text"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '5px', background: '#0f172a', border: '1px solid #333', color: 'white', borderRadius: '6px' }}
                            value={data.operator}
                            onChange={e => setData({ ...data, operator: e.target.value })}
                        />

                        <label style={{ display: 'block', color: '#ccc', marginTop: '10px' }}>Urgencia:</label>
                        <select
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '5px', background: '#0f172a', border: '1px solid #333', color: 'white', borderRadius: '6px' }}
                            value={data.urgency}
                            onChange={e => setData({ ...data, urgency: e.target.value })}
                        >
                            <option>Baja</option>
                            <option>Media</option>
                            <option>Alta</option>
                        </select>

                        <label style={{ display: 'block', color: '#ccc', marginTop: '10px' }}>Motivo:</label>
                        <textarea
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', marginTop: '5px', background: '#0f172a', border: '1px solid #333', color: 'white', height: '80px', borderRadius: '6px', resize: 'vertical' }}
                            value={data.reason}
                            onChange={e => setData({ ...data, reason: e.target.value })}
                        />

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button onClick={handleSubmit} style={{ flex: 1, background: '#ef4444', color: 'white', padding: '10px', border: 'none', cursor: 'pointer' }}>ENVIAR</button>
                            <button onClick={() => setOpen(false)} style={{ flex: 1, background: '#334155', color: 'white', padding: '10px', border: 'none', cursor: 'pointer' }}>CANCELAR</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default RequestButton;
