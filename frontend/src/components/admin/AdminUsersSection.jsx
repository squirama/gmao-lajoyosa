import React from 'react';

export default function AdminUsersSection({
    currentUserRole,
    departments,
    editingUser,
    handleDeactivateUser,
    handleUserSubmit,
    locations,
    resetUserForm,
    setUserForm,
    startEditingUser,
    userForm,
    usersList,
}) {
    return (
        <div className="center-panel admin-section">
            <div className="card admin-form-card" style={{ border: '2px solid var(--neon-green)' }}>
                <h2>{editingUser ? 'EDITAR USUARIO' : 'NUEVO USUARIO'}</h2>
                <form onSubmit={handleUserSubmit} className="admin-form-grid">
                    <div>
                        <label className="hmi-label">Nombre de usuario:</label>
                        <input
                            value={userForm.username}
                            onChange={(e) => setUserForm({ ...userForm, username: e.target.value, full_name: e.target.value })}
                            placeholder="Nombre de Usuario"
                            className="operator-select admin-field"
                            required
                        />
                    </div>

                    <div>
                        <label className="hmi-label">Contrasena:</label>
                        <input
                            type="password"
                            value={userForm.password || ''}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            placeholder={editingUser ? 'Nueva Contrasena (Opcional)' : 'Contrasena'}
                            className="operator-select admin-field"
                            required={!editingUser}
                        />
                    </div>

                    <div className="admin-field--full">
                        <label className="hmi-label">Rol:</label>
                        <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                            className="operator-select admin-field"
                        >
                            <option value="OPERATOR">OPERARIO (Solo Web Usuario)</option>
                            <option value="ADMIN">ADMIN (Gestion Limitada)</option>
                            <option value="SUPER_ADMIN">SUPER ADMIN (Acceso Total)</option>
                        </select>
                    </div>

                    {userForm.role !== 'SUPER_ADMIN' && (
                        <div className="admin-permissions-box admin-field--full">
                            <div className="admin-permissions-title">ASIGNAR PERMISOS (SEDES Y AREAS)</div>
                            <div className="admin-permissions-grid">
                                {Array.isArray(locations) && locations.map((location) => {
                                    const locationDepartments = Array.isArray(departments)
                                        ? departments.filter((department) => department.location_id === location.id)
                                        : [];

                                    return (
                                        <div key={location.id} className="admin-permissions-card">
                                            <div className="admin-permissions-location">{location.name}</div>
                                            <div className="admin-permissions-items">
                                                {locationDepartments.length > 0 ? locationDepartments.map((department) => (
                                                    <div key={department.id} className="admin-permissions-item">
                                                        <input
                                                            type="checkbox"
                                                            id={`dept_${department.id}`}
                                                            style={{ width: 16, height: 16, cursor: 'pointer', margin: 0 }}
                                                            checked={userForm.department_ids?.includes(department.id)}
                                                            onChange={(e) => {
                                                                const currentIds = userForm.department_ids || [];
                                                                const nextIds = e.target.checked
                                                                    ? [...currentIds, department.id]
                                                                    : currentIds.filter((id) => id !== department.id);

                                                                setUserForm({ ...userForm, department_ids: nextIds });
                                                            }}
                                                        />
                                                        <label htmlFor={`dept_${department.id}`} style={{ color: '#ccc', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                                                            {department.name}
                                                        </label>
                                                    </div>
                                                )) : <div className="admin-muted-note">(Sin Areas/Departamentos)</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {userForm.role === 'SUPER_ADMIN' && (
                        <div className="admin-muted-note admin-field--full" style={{ color: 'var(--neon-purple)' }}>
                            Los Super Admin tienen acceso a todas las sedes y departamentos automaticamente.
                        </div>
                    )}

                    <div className="admin-actions admin-field--full">
                        <button className="hmi-btn">GUARDAR USUARIO</button>
                        {editingUser && <button type="button" onClick={resetUserForm} className="btn-danger">CANCELAR</button>}
                    </div>
                </form>
            </div>

            <div className="admin-list-grid">
                {Array.isArray(usersList) && usersList.filter((user) => user.active).length > 0 ? (
                    usersList.filter((user) => user.active).map((user) => (
                        <div
                            key={user.id}
                            className="list-item"
                            style={{ background: '#111', border: '1px solid #333' }}
                        >
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {user.full_name} <span style={{ fontSize: '0.8rem', color: '#aaa' }}>({user.username})</span>
                                </div>
                                <div style={{ color: user.role === 'SUPER_ADMIN' ? 'var(--neon-purple)' : user.role === 'ADMIN' ? 'var(--neon-orange)' : 'var(--neon-green)' }}>
                                    {user.role} {!user.active && '[BAJA]'}
                                </div>
                                {user.role !== 'SUPER_ADMIN' && user.department_ids && (
                                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 5 }}>
                                        Permisos: {user.department_ids.length > 0 ? `${user.department_ids.length} Depts asignados` : 'Sin asignacion'}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => {
                                        startEditingUser(user);
                                        window.scrollTo(0, 0);
                                    }}
                                    className="btn-manual"
                                >
                                    EDITAR
                                </button>

                                {(currentUserRole === 'SUPER_ADMIN' || (currentUserRole === 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) && (
                                    <button onClick={() => handleDeactivateUser(user.id)} className="btn-danger">ELIMINAR</button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: 20, border: '1px dashed #666', textAlign: 'center' }}>No hay usuarios registrados.</div>
                )}
            </div>
        </div>
    );
}
