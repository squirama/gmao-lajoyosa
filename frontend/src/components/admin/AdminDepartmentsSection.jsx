import React from 'react';

export default function AdminDepartmentsSection({
    deleteDept,
    departments,
    deptForm,
    editingDept,
    handleDepartmentSubmit,
    locations,
    resetDepartmentForm,
    setDeptForm,
    startEditingDepartment,
}) {
    return (
        <div className="center-panel">
            <div className="card" style={{ border: '2px solid var(--neon-purple)', marginBottom: 20 }}>
                <h2>{editingDept ? 'EDITAR AREA' : 'NUEVA AREA'}</h2>
                <form onSubmit={handleDepartmentSubmit} style={{ display: 'grid', gap: 15 }}>
                    <select value={deptForm?.location_id || ''} onChange={(e) => setDeptForm({ ...deptForm, location_id: e.target.value })} required>
                        <option value="">-- Seleccionar Sede --</option>
                        {Array.isArray(locations) && locations.map((location) => <option key={location?.id} value={location?.id}>{location?.name}</option>)}
                    </select>
                    <input value={deptForm?.name || ''} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Nombre Area (ej: Embotellado)" required />
                    <input value={deptForm?.email || ''} onChange={(e) => setDeptForm({ ...deptForm, email: e.target.value })} placeholder="Email Responsable" />
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="hmi-btn" style={{ flex: 1 }}>GUARDAR</button>
                        {editingDept && <button type="button" onClick={resetDepartmentForm} className="btn-danger">CANCELAR</button>}
                    </div>
                </form>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
                {Array.isArray(departments) && departments.map((department) => {
                    const location = Array.isArray(locations) ? locations.find((item) => item.id === department.location_id) : null;
                    return (
                        <div key={department?.id || Math.random()} className="list-item">
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--neon-cyan)' }}>{department?.name}</div>
                                <div style={{ color: '#aaa' }}>Sede: {location ? location.name : 'Unknown'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => { startEditingDepartment(department); }} className="btn-manual">EDITAR</button>
                                <button onClick={() => deleteDept(department.id)} className="btn-danger">BORRAR</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
