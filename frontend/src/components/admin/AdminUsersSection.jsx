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
        <div className="center-panel">
            <div className="card" style={{ border: '2px solid var(--neon-green)', marginBottom: 20 }}>
                <h2>{editingUser ? 'EDITAR USUARIO' : 'NUEVO USUARIO'}</h2>
                <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            value={userForm.username}
                            onChange={(e) => setUserForm({ ...userForm, username: e.target.value, full_name: e.target.value })}
                            placeholder="Nombre de Usuario"
                            className="operator-select"
                            style={{ flex: 1 }}
                            required
                        />
                        <input
                            type="password"
                            value={userForm.password || ''}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            placeholder={editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                            className="operator-select"
                            style={{ flex: 1 }}
                            required={!editingUser}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <label style={{ color: 'white', fontWeight: 'bold' }}>Rol:</label>
                        <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                            className="operator-select"
                            style={{ flex: 1 }}
                        >
                            <option value="OPERATOR">OPERARIO (Solo Web Usuario)</option>
                            <option value="ADMIN">ADMIN (Gestión Limitada)</option>
                            <option value="SUPER_ADMIN">SUPER ADMIN (Acceso Total)</option>
                        </select>
                    </div>

                    {userForm.role !== 'SUPER_ADMIN' && (
                        <div style={{ background: '#222', padding: 15, borderRadius: 6, border: '1px solid #444' }}>
                            <div style={{ color: 'var(--neon-green)', marginBottom: 10, fontSize: '0.9rem', fontWeight: 'bold', borderBottom: '1px solid #444', paddingBottom: 5 }}>
                                ASIGNAR PERMISOS (SEDES Y AREAS):
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 }}>
                                {Array.isArray(locations) && locations.map((location) => {
                                    const locationDepartments = Array.isArray(departments)
                                        ? departments.filter((department) => department.location_id === location.id)
                                        : [];

                                    return (
                                        <div key={location.id} style={{ background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 4 }}>
                                            <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: 5 }}>🏢 {location.name}</div>
                                            <div style={{ display: 'grid', gap: 5 }}>
                                                {locationDepartments.length > 0 ? locationDepartments.map((department) => (
                                                    <div key={department.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <input
                                                            type="checkbox"
                                                            id={`dept_${department.id}`}
                                                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                                                            checked={userForm.department_ids?.includes(department.id)}
                                                            onChange={(e) => {
                                                                const currentIds = userForm.department_ids || [];
                                                                const nextIds = e.target.checked
                                                                    ? [...currentIds, department.id]
                                                                    : currentIds.filter((id) => id !== department.id);

                                                                setUserForm({ ...userForm, department_ids: nextIds });
                                                            }}
                                                        />
                                                        <label htmlFor={`dept_${department.id}`} style={{ color: '#ccc', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                                                            {department.name}
                                                        </label>
                                                    </div>
                                                )) : <div style={{ color: '#666', fontSize: '0.8rem', fontStyle: 'italic' }}>(Sin Areas/Departamentos)</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {userForm.role === 'SUPER_ADMIN' && (
                        <div style={{ color: 'var(--neon-purple)', fontStyle: 'italic' }}>
                            Los Super Admin tienen acceso a todas las sedes y departamentos automáticamente.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="hmi-btn" style={{ flex: 1 }}>GUARDAR USUARIO</button>
                        {editingUser && <button type="button" onClick={resetUserForm} className="btn-danger">CANCELAR</button>}
                    </div>
                </form>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
                {Array.isArray(usersList) && usersList.filter((user) => user.active).length > 0 ? (
                    usersList.filter((user) => user.active).map((user) => (
                        <div key={user.id} style={{ background: '#111', padding: 15, border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {user.full_name} <span style={{ fontSize: '0.8rem', color: '#aaa' }}>({user.username})</span>
                                </div>
                                <div style={{ color: user.role === 'SUPER_ADMIN' ? 'var(--neon-purple)' : user.role === 'ADMIN' ? 'var(--neon-orange)' : 'var(--neon-green)' }}>
                                    {user.role} {!user.active && '[BAJA]'}
                                </div>
                                {user.role !== 'SUPER_ADMIN' && user.department_ids && (
                                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 5 }}>
                                        Permisos: {user.department_ids.length > 0 ? `${user.department_ids.length} Depts asignados` : 'Sin asignación'}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
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
                    <div>No hay usuarios registrados.</div>
                )}
            </div>
        </div>
    );
}
