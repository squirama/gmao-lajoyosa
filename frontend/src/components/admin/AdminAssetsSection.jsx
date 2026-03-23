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
        <div className="center-panel">
            <div className="card" style={{ border: '2px solid var(--neon-orange)', marginBottom: 20 }}>
                <h2>{editingAsset ? 'EDITAR MAQUINA' : 'NUEVA MAQUINA'}</h2>
                <form onSubmit={handleAssetSubmit} style={{ display: 'grid', gap: 15 }}>
                    <div style={{ display: 'flex', gap: 15 }}>
                        <select
                            value={selectedLocationId}
                            onChange={(e) => handleLocationChange(e.target.value)}
                            className="operator-select"
                            style={{ flex: 1 }}
                        >
                            <option value="">-- Sede --</option>
                            {Array.isArray(locations) && locations.map((location) => (
                                <option key={location.id} value={location.id}>{location.name}</option>
                            ))}
                        </select>
                        <select
                            value={assetForm.dept_id}
                            onChange={(e) => setAssetForm({ ...assetForm, dept_id: e.target.value })}
                            className="operator-select"
                            required
                            style={{ flex: 1 }}
                        >
                            <option value="">-- Dept --</option>
                            {filteredDepartments.map((department) => (
                                <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </select>
                    </div>
                    <input
                        placeholder="Nombre"
                        value={assetForm.name}
                        onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                        className="operator-select"
                        required
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            placeholder="Marca"
                            value={assetForm.brand}
                            onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                            className="operator-select"
                            style={{ flex: 1 }}
                        />
                        <input
                            placeholder="Modelo"
                            value={assetForm.model}
                            onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                            className="operator-select"
                            style={{ flex: 1 }}
                        />
                    </div>
                    <input
                        placeholder="Manual (filename)"
                        value={assetForm.manual_filename}
                        onChange={(e) => setAssetForm({ ...assetForm, manual_filename: e.target.value })}
                        className="operator-select"
                    />
                    <input type="file" multiple onChange={(e) => setUploadFiles(Array.from(e.target.files || []))} style={{ color: 'white' }} />
                    {uploadFiles.length > 0 && <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{uploadFiles.length} archivos seleccionados</div>}
                    <div style={{ display: 'flex', gap: 20 }}>
                        <button className="hmi-btn" style={{ flex: 1 }}>GUARDAR</button>
                        {editingAsset && <button type="button" onClick={resetAssetForm} className="btn-danger">CANCELAR</button>}
                    </div>
                </form>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
                {Array.isArray(assets) && assets.length > 0 ? (
                    assets.map((asset) => (
                        <div key={asset.id} className="list-item">
                            <div>
                                <div style={{ color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '1.2rem' }}>{asset.name}</div>
                                <div style={{ color: '#aaa' }}>{asset.brand} {asset.model}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
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
