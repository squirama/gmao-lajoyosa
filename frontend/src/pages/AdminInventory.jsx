import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const VIEWS = [
    { id: 'catalog', label: 'Catalogo' },
    { id: 'distribution', label: 'Stock por sede' },
    { id: 'movements', label: 'Movimientos' },
];

const INITIAL_FORM = {
    part_number: '',
    name: '',
    description: '',
    stock_current: 0,
    stock_min: 0,
    cost_price: 0,
    location: '',
    supplier_name: '',
    supplier_contact: '',
    active: true,
    compatible_assets: [],
};

const INITIAL_DISTRIBUTION = {
    spare_part_id: '',
    location_id: '',
    physical_location: '',
    quantity: 0,
};

const INITIAL_MOVEMENT = {
    spare_part_id: '',
    movement_type: 'ENTRY',
    source_stock_id: '',
    destination_location_id: '',
    destination_physical_location: '',
    quantity: 1,
    notes: '',
};

function movementLabel(movement) {
    if (movement.movement_type === 'ENTRY') {
        return `Entrada a ${movement.destination_location_name} / ${movement.destination_physical_location}`;
    }
    if (movement.movement_type === 'OUTPUT') {
        return `Salida desde ${movement.source_location_name} / ${movement.source_physical_location}`;
    }
    return `Traslado ${movement.source_location_name} -> ${movement.destination_location_name}`;
}

export default function AdminInventory({ assets = [], currentUserId = null, locations = [] }) {
    const [inventory, setInventory] = useState([]);
    const [distributionRows, setDistributionRows] = useState([]);
    const [movementRows, setMovementRows] = useState([]);
    const [activeView, setActiveView] = useState('catalog');
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stockLoading, setStockLoading] = useState(false);
    const [movementLoading, setMovementLoading] = useState(false);
    const [compatibleAssetQuery, setCompatibleAssetQuery] = useState('');
    const [distributionQuery, setDistributionQuery] = useState('');
    const [distributionLocationFilter, setDistributionLocationFilter] = useState('');
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [distributionForm, setDistributionForm] = useState(INITIAL_DISTRIBUTION);
    const [movementForm, setMovementForm] = useState(INITIAL_MOVEMENT);

    const authHeader = useMemo(() => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('session_token')}` },
    }), []);

    useEffect(() => {
        refreshInventory();
        refreshDistribution();
        refreshMovements();
    }, []);

    async function refreshInventory() {
        try {
            const res = await axios.get('/api/inventory');
            setInventory(res.data);
        } catch (error) {
            console.error(error);
            alert('Error cargando inventario');
        }
    }

    async function refreshDistribution() {
        try {
            const res = await axios.get('/api/admin/inventory/distribution', authHeader);
            setDistributionRows(res.data);
        } catch (error) {
            console.error(error);
            alert('Error cargando stock por sede');
        }
    }

    async function refreshMovements() {
        try {
            const res = await axios.get('/api/admin/inventory/movements', authHeader);
            setMovementRows(res.data);
        } catch (error) {
            console.error(error);
            alert('Error cargando movimientos');
        }
    }

    const filteredCompatibleAssets = assets.filter((asset) => {
        const haystack = `${asset.name || ''} ${asset.brand || ''} ${asset.model || ''}`.toLowerCase();
        return haystack.includes(compatibleAssetQuery.trim().toLowerCase());
    });

    const filteredDistributionRows = distributionRows.filter((row) => {
        const matchesLocation = !distributionLocationFilter || String(row.location_id || '') === distributionLocationFilter;
        const haystack = `${row.part_number || ''} ${row.name || ''} ${row.location_name || ''} ${row.physical_location || ''}`.toLowerCase();
        return matchesLocation && haystack.includes(distributionQuery.trim().toLowerCase());
    });

    const sourceOptions = distributionRows.filter((row) => row.spare_part_id === Number(movementForm.spare_part_id || 0));

    const summaryCards = useMemo(() => {
        const grouped = new Map();
        for (const row of distributionRows) {
            const key = row.location_name || 'Sin asignar';
            grouped.set(key, (grouped.get(key) || 0) + Number(row.quantity || 0));
        }
        return Array.from(grouped.entries()).map(([locationName, total]) => ({ locationName, total }));
    }, [distributionRows]);

    const handleEdit = (item) => {
        setEditingItem(item.id);
        setCompatibleAssetQuery('');
        setFormData({
            part_number: item.part_number,
            name: item.name,
            description: item.description || '',
            stock_current: item.stock_current,
            stock_min: item.stock_min,
            cost_price: item.cost_price,
            location: item.location || '',
            supplier_name: item.supplier_name || '',
            supplier_contact: item.supplier_contact || '',
            active: item.active,
            compatible_assets: item.compatible_assets || [],
        });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setCompatibleAssetQuery('');
        setFormData(INITIAL_FORM);
    };

    const toggleCompatibleAsset = (assetId) => {
        const compatible_assets = formData.compatible_assets.includes(assetId)
            ? formData.compatible_assets.filter((id) => id !== assetId)
            : [...formData.compatible_assets, assetId];
        setFormData({ ...formData, compatible_assets });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem) {
                await axios.put(`/api/admin/inventory/${editingItem}`, formData, authHeader);
                alert('Repuesto actualizado');
            } else {
                await axios.post('/api/admin/inventory', formData, authHeader);
                alert('Repuesto creado');
            }
            await refreshInventory();
            await refreshDistribution();
            handleCancelEdit();
        } catch (error) {
            alert(`Error al guardar el repuesto: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Seguro que deseas eliminar o desactivar este repuesto?')) return;
        await axios.delete(`/api/admin/inventory/${id}`, authHeader);
        await refreshInventory();
        await refreshDistribution();
    };

    const handleDistributionSubmit = async (e) => {
        e.preventDefault();
        setStockLoading(true);
        try {
            await axios.post('/api/admin/inventory/distribution', {
                spare_part_id: Number(distributionForm.spare_part_id),
                location_id: Number(distributionForm.location_id),
                physical_location: distributionForm.physical_location,
                quantity: Number(distributionForm.quantity || 0),
            }, authHeader);
            alert('Stock por sede actualizado');
            setDistributionForm(INITIAL_DISTRIBUTION);
            await refreshInventory();
            await refreshDistribution();
        } catch (error) {
            alert(`Error al guardar stock por sede: ${error.response?.data?.error || error.message}`);
        } finally {
            setStockLoading(false);
        }
    };

    const handleMovementSubmit = async (e) => {
        e.preventDefault();
        setMovementLoading(true);
        try {
            await axios.post('/api/admin/inventory/movements', {
                spare_part_id: Number(movementForm.spare_part_id),
                movement_type: movementForm.movement_type,
                source_stock_id: movementForm.source_stock_id ? Number(movementForm.source_stock_id) : null,
                destination_location_id: movementForm.destination_location_id ? Number(movementForm.destination_location_id) : null,
                destination_physical_location: movementForm.destination_physical_location,
                quantity: Number(movementForm.quantity || 0),
                notes: movementForm.notes,
                user_id: currentUserId,
            }, authHeader);
            alert('Movimiento registrado');
            setMovementForm(INITIAL_MOVEMENT);
            await refreshInventory();
            await refreshDistribution();
            await refreshMovements();
        } catch (error) {
            alert(`Error al registrar movimiento: ${error.response?.data?.error || error.message}`);
        } finally {
            setMovementLoading(false);
        }
    };

    const catalogView = (
        <>
            <div className="card admin-form-card" style={{ maxWidth: 1200 }}>
                <h3>{editingItem ? 'Editar Repuesto' : 'Anadir Nuevo Repuesto'}</h3>
                <form onSubmit={handleSubmit} className="admin-form-grid">
                    <div><label>Ref. Fabricante *</label><input type="text" className="admin-field" required value={formData.part_number} onChange={(e) => setFormData({ ...formData, part_number: e.target.value })} /></div>
                    <div><label>Nombre Descriptivo *</label><input type="text" className="admin-field" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                    <div><label>Stock Total</label><input type="number" className="admin-field" min="0" required disabled={Boolean(editingItem)} value={formData.stock_current} onChange={(e) => setFormData({ ...formData, stock_current: parseInt(e.target.value, 10) || 0 })} /></div>
                    <div><label>Stock Minimo</label><input type="number" className="admin-field" min="0" required value={formData.stock_min} onChange={(e) => setFormData({ ...formData, stock_min: parseInt(e.target.value, 10) || 0 })} /></div>
                    <div><label>Coste Unitario (EUR)</label><input type="number" step="0.01" className="admin-field" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} /></div>
                    <div><label>Ubicacion inicial / legacy</label><input type="text" className="admin-field" disabled={Boolean(editingItem)} value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
                    <div><label>Proveedor</label><input type="text" className="admin-field" value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} /></div>
                    <div><label>Contacto proveedor</label><input type="text" className="admin-field" value={formData.supplier_contact} onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })} /></div>
                    {editingItem && <div className="admin-field--full admin-muted-note">El stock operativo se ajusta desde <strong>Stock por sede</strong> y <strong>Movimientos</strong>.</div>}
                    <div className="admin-field--full">
                        <label>Maquinas compatibles</label>
                        <input type="text" className="admin-field" value={compatibleAssetQuery} onChange={(e) => setCompatibleAssetQuery(e.target.value)} placeholder="Buscar maquina por nombre, marca o modelo" />
                        <div className="admin-checkbox-list">
                            {filteredCompatibleAssets.length > 0 ? filteredCompatibleAssets.map((asset) => {
                                const checked = formData.compatible_assets.includes(asset.id);
                                return (
                                    <label key={asset.id} className={`admin-checkbox-card ${checked ? 'is-selected' : ''}`}>
                                        <input type="checkbox" checked={checked} onChange={() => toggleCompatibleAsset(asset.id)} />
                                        <span><strong>{asset.name}</strong><span className="admin-checkbox-meta">{asset.brand || ''} {asset.model || ''}</span></span>
                                    </label>
                                );
                            }) : <div className="admin-muted-note">No hay maquinas que coincidan con la busqueda.</div>}
                        </div>
                    </div>
                    <div className="admin-field--full"><label>Notas</label><textarea className="admin-field" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                    <div className="admin-actions admin-field--full">
                        <button type="submit" disabled={loading} style={{ background: 'var(--neon-green)', color: 'black', padding: '10px 20px' }}>{editingItem ? 'Actualizar Repuesto' : 'Crear Repuesto'}</button>
                        {editingItem && <button type="button" onClick={handleCancelEdit} style={{ background: '#555', color: 'white', padding: '10px 20px' }}>Cancelar</button>}
                    </div>
                </form>
            </div>

            <div className="card admin-table-wrap">
                <table className="data-table" style={{ width: '100%' }}>
                    <thead><tr><th>Ref.</th><th>Nombre</th><th>Stock</th><th>Min.</th><th>Stock por sede</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {inventory.map((item) => (
                            <tr key={item.id} style={{ background: !item.active ? '#333' : item.stock_current <= item.stock_min ? 'rgba(255, 0, 0, 0.2)' : 'transparent' }}>
                                <td>{item.part_number}</td>
                                <td><strong>{item.name}</strong></td>
                                <td style={{ fontWeight: 'bold', color: item.stock_current <= item.stock_min ? '#f87171' : '#4ade80' }}>{item.stock_current}</td>
                                <td>{item.stock_min}</td>
                                <td>
                                    {(item.stock_locations || []).length > 0 ? item.stock_locations.map((entry) => (
                                        <div key={entry.id}>{entry.location_name}: {entry.physical_location} ({entry.quantity})</div>
                                    )) : <span style={{ color: '#8b949e' }}>Sin reparto</span>}
                                </td>
                                <td>
                                    <button onClick={() => handleEdit(item)} style={{ background: 'var(--neon-cyan)', color: 'black', marginRight: 5, padding: '5px 10px' }}>Editar</button>
                                    <button onClick={() => handleDelete(item.id)} style={{ background: 'var(--neon-red)', color: 'white', padding: '5px 10px' }}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                        {inventory.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>No hay repuestos registrados</td></tr>}
                    </tbody>
                </table>
            </div>
        </>
    );

    const distributionView = (
        <>
            <div className="admin-summary-grid">
                {summaryCards.map((summary) => (
                    <div key={summary.locationName} className="card admin-summary-card">
                        <div className="admin-summary-label">{summary.locationName}</div>
                        <div className="admin-summary-value">{summary.total}</div>
                    </div>
                ))}
            </div>
            <div className="card admin-form-card" style={{ maxWidth: 1200 }}>
                <h3>Asignar stock a una sede</h3>
                <form onSubmit={handleDistributionSubmit} className="admin-form-grid">
                    <div><label>Material *</label><select className="admin-field" required value={distributionForm.spare_part_id} onChange={(e) => setDistributionForm({ ...distributionForm, spare_part_id: e.target.value })}><option value="">Selecciona material</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.part_number} - {item.name}</option>)}</select></div>
                    <div><label>Sede *</label><select className="admin-field" required value={distributionForm.location_id} onChange={(e) => setDistributionForm({ ...distributionForm, location_id: e.target.value })}><option value="">Selecciona sede</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
                    <div><label>Ubicacion fisica *</label><input type="text" className="admin-field" required value={distributionForm.physical_location} onChange={(e) => setDistributionForm({ ...distributionForm, physical_location: e.target.value })} placeholder="Ej: Almacen central / Estanteria A3" /></div>
                    <div><label>Cantidad *</label><input type="number" className="admin-field" min="0" required value={distributionForm.quantity} onChange={(e) => setDistributionForm({ ...distributionForm, quantity: parseInt(e.target.value, 10) || 0 })} /></div>
                    <div className="admin-actions admin-field--full"><button type="submit" disabled={stockLoading} style={{ background: 'var(--neon-green)', color: 'black', padding: '10px 20px' }}>{stockLoading ? 'Guardando...' : 'Guardar stock por sede'}</button></div>
                </form>
            </div>
            <div className="card admin-form-card" style={{ maxWidth: 1200 }}>
                <h3>Buscar por sede y ubicacion</h3>
                <div className="admin-form-grid">
                    <div><label>Filtrar por sede</label><select className="admin-field" value={distributionLocationFilter} onChange={(e) => setDistributionLocationFilter(e.target.value)}><option value="">Todas las sedes</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
                    <div><label>Buscar</label><input type="text" className="admin-field" value={distributionQuery} onChange={(e) => setDistributionQuery(e.target.value)} placeholder="Material, referencia, ubicacion..." /></div>
                </div>
            </div>
            <div className="card admin-table-wrap">
                <table className="data-table" style={{ width: '100%' }}>
                    <thead><tr><th>Sede</th><th>Ubicacion</th><th>Material</th><th>Ref.</th><th>Cantidad</th></tr></thead>
                    <tbody>
                        {filteredDistributionRows.map((row) => <tr key={row.id}><td>{row.location_name}</td><td>{row.physical_location}</td><td>{row.name}</td><td>{row.part_number}</td><td style={{ fontWeight: 'bold' }}>{row.quantity}</td></tr>)}
                        {filteredDistributionRows.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>No hay stock que coincida con los filtros</td></tr>}
                    </tbody>
                </table>
            </div>
        </>
    );

    const movementsView = (
        <>
            <div className="card admin-form-card" style={{ maxWidth: 1200 }}>
                <h3>Registrar movimiento</h3>
                <form onSubmit={handleMovementSubmit} className="admin-form-grid">
                    <div><label>Material *</label><select className="admin-field" required value={movementForm.spare_part_id} onChange={(e) => setMovementForm({ ...movementForm, spare_part_id: e.target.value, source_stock_id: '' })}><option value="">Selecciona material</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.part_number} - {item.name}</option>)}</select></div>
                    <div><label>Tipo *</label><select className="admin-field" required value={movementForm.movement_type} onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value, source_stock_id: '' })}><option value="ENTRY">Entrada</option><option value="OUTPUT">Salida</option><option value="TRANSFER">Traslado</option></select></div>
                    {(movementForm.movement_type === 'OUTPUT' || movementForm.movement_type === 'TRANSFER') && <div><label>Origen *</label><select className="admin-field" required value={movementForm.source_stock_id} onChange={(e) => setMovementForm({ ...movementForm, source_stock_id: e.target.value })}><option value="">Selecciona origen</option>{sourceOptions.map((row) => <option key={row.id} value={row.id}>{row.location_name} / {row.physical_location} ({row.quantity})</option>)}</select></div>}
                    {(movementForm.movement_type === 'ENTRY' || movementForm.movement_type === 'TRANSFER') && <><div><label>Sede destino *</label><select className="admin-field" required value={movementForm.destination_location_id} onChange={(e) => setMovementForm({ ...movementForm, destination_location_id: e.target.value })}><option value="">Selecciona sede</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div><div><label>Ubicacion destino *</label><input type="text" className="admin-field" required value={movementForm.destination_physical_location} onChange={(e) => setMovementForm({ ...movementForm, destination_physical_location: e.target.value })} /></div></>}
                    <div><label>Cantidad *</label><input type="number" className="admin-field" min="1" required value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value, 10) || 1 })} /></div>
                    <div className="admin-field--full"><label>Notas</label><textarea className="admin-field" value={movementForm.notes} onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })} /></div>
                    <div className="admin-actions admin-field--full"><button type="submit" disabled={movementLoading} style={{ background: 'var(--neon-cyan)', color: 'black', padding: '10px 20px' }}>{movementLoading ? 'Registrando...' : 'Registrar movimiento'}</button></div>
                </form>
            </div>
            <div className="card admin-table-wrap">
                <table className="data-table" style={{ width: '100%' }}>
                    <thead><tr><th>Fecha</th><th>Material</th><th>Movimiento</th><th>Cantidad</th><th>Notas</th></tr></thead>
                    <tbody>
                        {movementRows.map((movement) => <tr key={movement.id}><td>{new Date(movement.created_at).toLocaleString()}</td><td>{movement.part_number} - {movement.part_name}</td><td>{movementLabel(movement)}</td><td style={{ fontWeight: 'bold' }}>{movement.quantity}</td><td>{movement.notes || '-'}</td></tr>)}
                        {movementRows.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>No hay movimientos registrados</td></tr>}
                    </tbody>
                </table>
            </div>
        </>
    );

    return (
        <div className="center-panel admin-section" style={{ color: 'white' }}>
            <div className="admin-inventory-shell" style={{ width: '100%', maxWidth: 1200 }}>
                <h2>Gestion de Inventario</h2>
                <div className="admin-subtabs">
                    {VIEWS.map((view) => (
                        <button key={view.id} type="button" className={`admin-subtab ${activeView === view.id ? 'is-active' : ''}`} onClick={() => setActiveView(view.id)}>
                            {view.label}
                        </button>
                    ))}
                </div>
                {activeView === 'catalog' && catalogView}
                {activeView === 'distribution' && distributionView}
                {activeView === 'movements' && movementsView}
            </div>
        </div>
    );
}
