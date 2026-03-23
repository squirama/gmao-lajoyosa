import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminInventory({ assets = [] }) {
    const [inventory, setInventory] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [compatibleAssetQuery, setCompatibleAssetQuery] = useState('');
    const [formData, setFormData] = useState({
        part_number: '',
        name: '',
        description: '',
        stock_current: 0,
        stock_min: 0,
        cost_price: 0.0,
        location: '',
        supplier_name: '',
        supplier_contact: '',
        active: true,
        compatible_assets: []
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const res = await axios.get('/api/inventory');
            setInventory(res.data);
        } catch (error) {
            console.error(error);
            alert('Error cargando inventario');
        }
    };

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
            compatible_assets: item.compatible_assets || []
        });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setCompatibleAssetQuery('');
        setFormData({
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
            compatible_assets: []
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const authHeader = {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            };

            if (editingItem) {
                await axios.put(`/api/admin/inventory/${editingItem}`, formData, authHeader);
                alert('Repuesto actualizado');
            } else {
                await axios.post('/api/admin/inventory', formData, authHeader);
                alert('Repuesto creado');
            }

            fetchInventory();
            handleCancelEdit();
        } catch (error) {
            console.error(error);
            alert(`Error al guardar el repuesto: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Seguro que deseas eliminar o desactivar este repuesto?')) return;
        try {
            const authHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            await axios.delete(`/api/admin/inventory/${id}`, authHeader);
            fetchInventory();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const filteredCompatibleAssets = assets.filter((asset) => {
        const haystack = `${asset.name || ''} ${asset.brand || ''} ${asset.model || ''}`.toLowerCase();
        return haystack.includes(compatibleAssetQuery.trim().toLowerCase());
    });

    const toggleCompatibleAsset = (assetId) => {
        const alreadySelected = formData.compatible_assets.includes(assetId);
        const compatibleAssets = alreadySelected
            ? formData.compatible_assets.filter((id) => id !== assetId)
            : [...formData.compatible_assets, assetId];

        setFormData({ ...formData, compatible_assets: compatibleAssets });
    };

    return (
        <div className="center-panel admin-section" style={{ color: 'white' }}>
            <div style={{ width: '100%', maxWidth: 1200 }}>
                <h2>Gestion de Inventario (Repuestos)</h2>

                <div className="card admin-form-card" style={{ maxWidth: 1200 }}>
                    <h3>{editingItem ? 'Editar Repuesto' : 'Anadir Nuevo Repuesto'}</h3>
                    <form onSubmit={handleSubmit} className="admin-form-grid">
                        <div>
                            <label>Ref. Fabricante *</label>
                            <input
                                type="text"
                                className="admin-field"
                                required
                                value={formData.part_number}
                                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                                placeholder="Ej: SKF-6204-2Z"
                            />
                        </div>
                        <div>
                            <label>Nombre Descriptivo *</label>
                            <input
                                type="text"
                                className="admin-field"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Rodamiento de bolas"
                            />
                        </div>

                        <div>
                            <label>Stock Actual</label>
                            <input
                                type="number"
                                className="admin-field"
                                required
                                min="0"
                                value={formData.stock_current}
                                onChange={(e) => setFormData({ ...formData, stock_current: parseInt(e.target.value, 10) || 0 })}
                            />
                        </div>
                        <div>
                            <label>Stock Minimo (Alerta)</label>
                            <input
                                type="number"
                                className="admin-field"
                                required
                                min="0"
                                value={formData.stock_min}
                                onChange={(e) => setFormData({ ...formData, stock_min: parseInt(e.target.value, 10) || 0 })}
                            />
                        </div>

                        <div>
                            <label>Coste Unitario (EUR)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="admin-field"
                                value={formData.cost_price}
                                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label>Ubicacion Fisica</label>
                            <input
                                type="text"
                                className="admin-field"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Ej: Pasillo A, Estante 3"
                            />
                        </div>

                        <div>
                            <label>Proveedor Habitual</label>
                            <input
                                type="text"
                                className="admin-field"
                                value={formData.supplier_name}
                                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label>Contacto Proveedor / Enlace</label>
                            <input
                                type="text"
                                className="admin-field"
                                value={formData.supplier_contact}
                                onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                            />
                        </div>

                        <div className="admin-field--full">
                            <label>Maquinas compatibles</label>
                            <input
                                type="text"
                                className="admin-field"
                                value={compatibleAssetQuery}
                                onChange={(e) => setCompatibleAssetQuery(e.target.value)}
                                placeholder="Buscar maquina por nombre, marca o modelo"
                            />
                            <div className="admin-checkbox-list">
                                {filteredCompatibleAssets.length > 0 ? (
                                    filteredCompatibleAssets.map((asset) => {
                                        const checked = formData.compatible_assets.includes(asset.id);
                                        return (
                                            <label key={asset.id} className={`admin-checkbox-card ${checked ? 'is-selected' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCompatibleAsset(asset.id)}
                                                />
                                                <span>
                                                    <strong>{asset.name}</strong>
                                                    {(asset.brand || asset.model) && (
                                                        <span className="admin-checkbox-meta">
                                                            {asset.brand || ''} {asset.model || ''}
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        );
                                    })
                                ) : (
                                    <div className="admin-muted-note">No hay maquinas que coincidan con la busqueda.</div>
                                )}
                            </div>
                            <small className="admin-form-note">
                                Seleccionadas: {formData.compatible_assets.length}
                            </small>
                        </div>

                        <div className="admin-field--full">
                            <label>Notas Adicionales</label>
                            <textarea
                                className="admin-field"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="admin-actions admin-field--full">
                            <button type="submit" disabled={loading} style={{ background: 'var(--neon-green)', color: 'black', padding: '10px 20px', fontWeight: 'bold' }}>
                                {editingItem ? 'Actualizar Repuesto' : 'Crear Repuesto'}
                            </button>
                            {editingItem && (
                                <button type="button" onClick={handleCancelEdit} style={{ background: '#555', color: 'white', padding: '10px 20px' }}>
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="card admin-table-wrap">
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Ref.</th>
                                <th>Nombre</th>
                                <th>Ubicacion</th>
                                <th>Stock</th>
                                <th>Min.</th>
                                <th>Coste</th>
                                <th>Compatibilidad</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map((item) => (
                                <tr
                                    key={item.id}
                                    style={{
                                        background: !item.active ? '#333' : item.stock_current <= item.stock_min ? 'rgba(255, 0, 0, 0.2)' : 'transparent',
                                        color: !item.active ? '#777' : 'inherit'
                                    }}
                                >
                                    <td>{item.part_number}</td>
                                    <td>
                                        <strong>{item.name}</strong>
                                        {!item.active && <span style={{ fontSize: '0.8em', marginLeft: 10 }}> (Inactivo)</span>}
                                    </td>
                                    <td>{item.location}</td>
                                    <td style={{ fontWeight: 'bold', fontSize: '1.2em', color: item.stock_current <= item.stock_min ? '#f87171' : '#4ade80' }}>
                                        {item.stock_current}
                                    </td>
                                    <td>{item.stock_min}</td>
                                    <td>{item.cost_price} EUR</td>
                                    <td>
                                        {item.compatible_assets && item.compatible_assets.length > 0 ? (
                                            <div style={{ fontSize: '0.85em', color: '#aaa', maxWidth: 150 }}>
                                                {item.compatible_assets.map((id) => {
                                                    const asset = assets.find((candidate) => candidate.id === id);
                                                    return asset ? <div key={id}>- {asset.name}</div> : <div key={id}>- ID {id}</div>;
                                                })}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#555', fontStyle: 'italic' }}>Universal</span>
                                        )}
                                    </td>
                                    <td>
                                        <button onClick={() => handleEdit(item)} style={{ background: 'var(--neon-cyan)', color: 'black', marginRight: 5, padding: '5px 10px' }}>Editar</button>
                                        <button onClick={() => handleDelete(item.id)} style={{ background: 'var(--neon-red)', color: 'white', padding: '5px 10px' }}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                            {inventory.length === 0 && (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>No hay repuestos registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
