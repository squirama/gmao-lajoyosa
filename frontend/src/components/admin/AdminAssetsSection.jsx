import React from 'react';

export default function AdminAssetsSection({
    assetForm,
    assets,
    departments,
    deleteAsset,
    editingAsset,
    handleAssetSubmit,
    handleLocationChange,
    locations,
    onOpenCalendar,
    resetAssetForm,
    selectedLocationId,
    setAssetForm,
    setUploadFiles,
    startEditingAsset,
    uploadFiles,
}) {
    const filteredDepartments = Array.isArray(departments)
        ? departments.filter((department) => !selectedLocationId || department.location_id === Number.parseInt(selectedLocationId, 10))
        : [];

    return (
        <div className="center-panel admin-section">
            <div className="card admin-form-card" style={{ border: '2px solid var(--neon-orange)' }}>
                <h2>{editingAsset ? 'EDITAR MAQUINA' : 'NUEVA MAQUINA'}</h2>
                <form onSubmit={handleAssetSubmit} className="admin-form-grid">
                    <div>
                        <label className="hmi-label">Sede:</label>
                        <select
                            value={selectedLocationId}
                            onChange={(e) => handleLocationChange(e.target.value)}
                            className="operator-select admin-field"
                        >
                            <option value="">-- Sede --</option>
                            {Array.isArray(locations) && locations.map((location) => (
                                <option key={location.id} value={location.id}>{location.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="hmi-label">Area:</label>
                        <select
                            value={assetForm.dept_id}
                            onChange={(e) => setAssetForm({ ...assetForm, dept_id: e.target.value })}
                            className="operator-select admin-field"
                            required
                        >
                            <option value="">-- Area --</option>
                            {filteredDepartments.map((department) => (
                                <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-field--full">
                        <label className="hmi-label">Nombre:</label>
                        <input
                            placeholder="Nombre"
                            value={assetForm.name}
                            onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                            className="operator-select admin-field"
                            required
                        />
                    </div>

                    <div>
                        <label className="hmi-label">Marca:</label>
                        <input
                            placeholder="Marca"
                            value={assetForm.brand}
                            onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                            className="operator-select admin-field"
                        />
                    </div>

                    <div>
                        <label className="hmi-label">Modelo:</label>
                        <input
                            placeholder="Modelo"
                            value={assetForm.model}
                            onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                            className="operator-select admin-field"
                        />
                    </div>

                    <div className="admin-field--full">
                        <label className="hmi-label">Manual:</label>
                        <input
                            placeholder="Manual (filename)"
                            value={assetForm.manual_filename}
                            onChange={(e) => setAssetForm({ ...assetForm, manual_filename: e.target.value })}
                            className="operator-select admin-field"
                        />
                    </div>

                    <div className="admin-field--full">
                        <label className="hmi-label">Archivos:</label>
                        <input type="file" multiple onChange={(e) => setUploadFiles(Array.from(e.target.files || []))} style={{ color: 'white', marginBottom: 0 }} />
                        {uploadFiles.length > 0 && <div className="admin-form-note">{uploadFiles.length} archivos seleccionados</div>}
                    </div>

                    <div className="admin-actions admin-field--full">
                        <button className="hmi-btn">GUARDAR</button>
                        {editingAsset && <button type="button" onClick={resetAssetForm} className="btn-danger">CANCELAR</button>}
                    </div>
                </form>
            </div>

            <div className="admin-list-grid">
                {Array.isArray(assets) && assets.length > 0 ? (
                    assets.map((asset) => (
                        <div key={asset.id} className="list-item">
                            <div>
                                <div style={{ color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '1.2rem' }}>{asset.name}</div>
                                <div style={{ color: '#aaa' }}>{asset.brand} {asset.model}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button onClick={() => onOpenCalendar(asset)} className="btn-manual" style={{ borderColor: 'var(--neon-purple)', color: 'white' }}>
                                    CALENDARIO
                                </button>
                                <button
                                    onClick={() => {
                                        startEditingAsset(asset);
                                        window.scrollTo(0, 0);
                                    }}
                                    className="btn-manual"
                                >
                                    EDITAR
                                </button>
                                <button onClick={() => deleteAsset(asset.id)} className="btn-danger">BORRAR</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: 20, border: '1px dashed #666', textAlign: 'center' }}>No hay maquinas cargadas o error de conexion.</div>
                )}
            </div>
        </div>
    );
}
