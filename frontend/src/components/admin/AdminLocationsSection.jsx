import React from 'react';

export default function AdminLocationsSection({
    deleteLocation,
    editingLocation,
    handleLocationSubmit,
    locationForm,
    locations,
    resetLocationForm,
    setLocationForm,
    startEditingLocation,
}) {
    return (
        <div className="center-panel">
            <div className="card" style={{ border: '2px solid var(--neon-cyan)', marginBottom: 20 }}>
                <h2>{editingLocation ? 'EDITAR SEDE' : 'NUEVA SEDE'}</h2>
                <form onSubmit={handleLocationSubmit} style={{ display: 'grid', gap: 15 }}>
                    <input value={locationForm?.name || ''} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="Nombre Sede (ej: Sede A)" required />
                    <input value={locationForm?.address || ''} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} placeholder="Direccion" required />
                    <input value={locationForm?.email || ''} onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })} placeholder="Email de Contacto" />
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="hmi-btn" style={{ flex: 1 }}>GUARDAR</button>
                        {editingLocation && <button type="button" onClick={resetLocationForm} className="btn-danger">CANCELAR</button>}
                    </div>
                </form>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
                {Array.isArray(locations) && locations.map((location) => (
                    <div key={location?.id || Math.random()} className="list-item">
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>
                            🏢 {location?.name} <span style={{ fontSize: '0.9rem', color: '#888', fontWeight: 'normal' }}>({location?.address})</span>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => { startEditingLocation(location); }} className="btn-manual">EDITAR</button>
                            <button onClick={() => deleteLocation(location.id)} className="btn-danger">BORRAR</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
