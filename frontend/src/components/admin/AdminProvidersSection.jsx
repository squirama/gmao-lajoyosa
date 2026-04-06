import React, { useEffect, useMemo, useState } from 'react';

function providerStatus(provider) {
    if (!provider.document_count) return { label: 'Sin docs', tone: 'neutral' };
    if (provider.expired_documents > 0) return { label: 'Caducado', tone: 'danger' };
    if (provider.expiring_documents > 0) return { label: 'Por vencer', tone: 'warn' };
    return { label: 'Vigente', tone: 'success' };
}

function formatDate(value) {
    if (!value) return 'Sin fecha';
    return String(value).slice(0, 10);
}

export default function AdminProvidersSection({
    assets,
    deactivateProvider,
    departments,
    deleteProviderDocument,
    editingProvider,
    fetchProviderDocuments,
    handleProviderSubmit,
    locations,
    providerDocuments,
    providerForm,
    providers,
    providersError,
    providersLoading,
    resetProviderForm,
    setProviderForm,
    startEditingProvider,
    uploadProviderDocument,
}) {
    const [expandedProviderId, setExpandedProviderId] = useState(null);
    const [departmentQuery, setDepartmentQuery] = useState('');
    const [assetQuery, setAssetQuery] = useState('');
    const [documentForms, setDocumentForms] = useState({});

    const departmentMap = useMemo(
        () => new Map((departments || []).map((department) => [department.id, department])),
        [departments]
    );
    const locationMap = useMemo(
        () => new Map((locations || []).map((location) => [location.id, location])),
        [locations]
    );
    const assetMap = useMemo(
        () => new Map((assets || []).map((asset) => [asset.id, asset])),
        [assets]
    );

    const filteredDepartments = (departments || []).filter((department) => {
        const haystack = `${department.name || ''} ${locationMap.get(department.location_id)?.name || ''}`.toLowerCase();
        return haystack.includes(departmentQuery.trim().toLowerCase());
    });

    const filteredAssets = (assets || []).filter((asset) => {
        if (!providerForm.department_ids.includes(asset.dept_id)) {
            return false;
        }
        const haystack = `${asset.name || ''} ${asset.brand || ''} ${asset.model || ''}`.toLowerCase();
        return haystack.includes(assetQuery.trim().toLowerCase());
    });

    const providerSummary = useMemo(() => ({
        total: providers.length,
        active: providers.filter((provider) => provider.active !== false).length,
        expired: providers.filter((provider) => provider.expired_documents > 0).length,
        expiring: providers.filter((provider) => provider.expiring_documents > 0).length,
    }), [providers]);

    useEffect(() => {
        if (editingProvider?.id) {
            fetchProviderDocuments(editingProvider.id);
        }
    }, [editingProvider?.id]);

    useEffect(() => {
        setProviderForm((current) => ({
            ...current,
            asset_ids: current.asset_ids.filter((assetId) => {
                const asset = assetMap.get(assetId);
                return asset && current.department_ids.includes(asset.dept_id);
            }),
        }));
    }, [assetMap, providerForm.department_ids.join(',')]);

    const toggleDepartment = (departmentId) => {
        const selected = providerForm.department_ids.includes(departmentId)
            ? providerForm.department_ids.filter((id) => id !== departmentId)
            : [...providerForm.department_ids, departmentId];
        setProviderForm({ ...providerForm, department_ids: selected });
    };

    const toggleAsset = (assetId) => {
        const selected = providerForm.asset_ids.includes(assetId)
            ? providerForm.asset_ids.filter((id) => id !== assetId)
            : [...providerForm.asset_ids, assetId];
        setProviderForm({ ...providerForm, asset_ids: selected });
    };

    const openProviderDocuments = async (providerId) => {
        const nextId = expandedProviderId === providerId ? null : providerId;
        setExpandedProviderId(nextId);
        if (nextId) {
            await fetchProviderDocuments(nextId);
        }
    };

    const updateDocumentForm = (providerId, partial) => {
        setDocumentForms((current) => ({
            ...current,
            [providerId]: {
                document_type: '',
                document_name: '',
                expires_on: '',
                notes: '',
                file: null,
                ...current[providerId],
                ...partial,
            },
        }));
    };

    const submitDocument = async (providerId) => {
        const form = documentForms[providerId];
        if (!form?.file) {
            alert('Selecciona un archivo');
            return;
        }

        const data = new FormData();
        data.append('file', form.file);
        data.append('document_type', form.document_type || '');
        data.append('document_name', form.document_name || '');
        data.append('expires_on', form.expires_on || '');
        data.append('notes', form.notes || '');

        try {
            await uploadProviderDocument(providerId, data);
            alert('Documento subido');
            updateDocumentForm(providerId, {
                document_type: '',
                document_name: '',
                expires_on: '',
                notes: '',
                file: null,
            });
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const currentEditDocuments = editingProvider ? (providerDocuments[editingProvider.id] || []) : [];
    const currentEditDocForm = editingProvider ? (documentForms[editingProvider.id] || {}) : {};

    return (
        <div className="center-panel admin-section">
            <div className="admin-stats-grid">
                <div className="card admin-stat-card">
                    <div className="admin-stat-label">Proveedores</div>
                    <div className="admin-stat-value">{providerSummary.total}</div>
                </div>
                <div className="card admin-stat-card">
                    <div className="admin-stat-label">Activos</div>
                    <div className="admin-stat-value">{providerSummary.active}</div>
                </div>
                <div className="card admin-stat-card admin-stat-card--warning">
                    <div className="admin-stat-label">Por vencer</div>
                    <div className="admin-stat-value">{providerSummary.expiring}</div>
                </div>
                <div className="card admin-stat-card admin-stat-card--danger">
                    <div className="admin-stat-label">Caducados</div>
                    <div className="admin-stat-value">{providerSummary.expired}</div>
                </div>
            </div>

            <div className="card admin-form-card" style={{ border: '2px solid var(--neon-cyan)' }}>
                <h2>{editingProvider ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'}</h2>
                <form onSubmit={handleProviderSubmit} className="admin-form-grid">
                    <div>
                        <label className="hmi-label">Empresa:</label>
                        <input
                            className="operator-select admin-field"
                            value={providerForm.company_name}
                            onChange={(e) => setProviderForm({ ...providerForm, company_name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="hmi-label">Servicio / especialidad:</label>
                        <input
                            className="operator-select admin-field"
                            value={providerForm.service_type}
                            onChange={(e) => setProviderForm({ ...providerForm, service_type: e.target.value })}
                            placeholder="Frio, electricidad, limpieza, CAE..."
                        />
                    </div>
                    <div>
                        <label className="hmi-label">Persona de contacto:</label>
                        <input
                            className="operator-select admin-field"
                            value={providerForm.contact_name}
                            onChange={(e) => setProviderForm({ ...providerForm, contact_name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="hmi-label">Telefono:</label>
                        <input
                            className="operator-select admin-field"
                            value={providerForm.phone}
                            onChange={(e) => setProviderForm({ ...providerForm, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="hmi-label">Email:</label>
                        <input
                            type="email"
                            className="operator-select admin-field"
                            value={providerForm.email}
                            onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="hmi-label">Vencimiento contrato:</label>
                        <input
                            type="date"
                            className="operator-select admin-field"
                            value={providerForm.contract_expires_on}
                            onChange={(e) => setProviderForm({ ...providerForm, contract_expires_on: e.target.value })}
                        />
                    </div>
                    <div className="admin-field--full">
                        <label className="hmi-label">Notas:</label>
                        <textarea
                            className="operator-select admin-field"
                            rows={4}
                            value={providerForm.notes}
                            onChange={(e) => setProviderForm({ ...providerForm, notes: e.target.value })}
                        />
                    </div>

                    <div className="admin-field--full admin-provider-pickers">
                        <div className="admin-provider-picker">
                            <label className="hmi-label">Areas asociadas:</label>
                            <input
                                className="operator-select admin-field"
                                value={departmentQuery}
                                onChange={(e) => setDepartmentQuery(e.target.value)}
                                placeholder="Buscar area o sede..."
                            />
                            <div className="admin-provider-checklist">
                                {filteredDepartments.map((department) => {
                                    const location = locationMap.get(department.location_id);
                                    return (
                                        <label key={department.id} className="admin-provider-check">
                                            <input
                                                type="checkbox"
                                                checked={providerForm.department_ids.includes(department.id)}
                                                onChange={() => toggleDepartment(department.id)}
                                            />
                                            <span className="admin-provider-check__text">
                                                {department.name} {location ? `· ${location.name}` : ''}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="admin-provider-picker">
                            <label className="hmi-label">Maquinas que llevan:</label>
                            <input
                                className="operator-select admin-field"
                                value={assetQuery}
                                onChange={(e) => setAssetQuery(e.target.value)}
                                placeholder="Buscar maquina..."
                                disabled={providerForm.department_ids.length === 0}
                            />
                            {providerForm.department_ids.length === 0 && (
                                <div className="admin-form-note">Selecciona primero una o varias areas asociadas.</div>
                            )}
                            <div className="admin-provider-checklist">
                                {filteredAssets.map((asset) => (
                                    <label key={asset.id} className="admin-provider-check">
                                        <input
                                            type="checkbox"
                                            checked={providerForm.asset_ids.includes(asset.id)}
                                            onChange={() => toggleAsset(asset.id)}
                                        />
                                        <span className="admin-provider-check__text">
                                            {asset.name}{asset.loc_name ? ` (${asset.loc_name})` : ''}
                                        </span>
                                    </label>
                                ))}
                                {providerForm.department_ids.length > 0 && filteredAssets.length === 0 && (
                                    <div className="admin-empty-state">No hay maquinas en las areas seleccionadas.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="admin-toggle admin-field--full">
                        <input
                            type="checkbox"
                            checked={providerForm.active}
                            onChange={(e) => setProviderForm({ ...providerForm, active: e.target.checked })}
                        />
                        <label className="hmi-label">Proveedor activo</label>
                    </div>

                    <div className="admin-actions admin-field--full">
                        <button className="hmi-btn">{editingProvider ? 'ACTUALIZAR' : 'CREAR PROVEEDOR'}</button>
                        {editingProvider && <button type="button" className="btn-danger" onClick={resetProviderForm}>CANCELAR</button>}
                    </div>
                </form>
            </div>

            {editingProvider && (
                <div className="card admin-form-card admin-summary-card">
                    <h2>Documentacion del proveedor</h2>
                    <div className="admin-inline-help" style={{ marginBottom: 14 }}>
                        Proveedor actual: <strong>{editingProvider.company_name}</strong>. Aqui puedes subir directamente sus certificados, CAE, seguros y cualquier documentacion de control.
                    </div>
                    <div className="admin-provider-documents">
                        <div className="admin-provider-documents__form">
                            <h3>Subir documento</h3>
                            <div className="admin-form-grid">
                                <div>
                                    <label className="hmi-label">Tipo:</label>
                                    <input
                                        className="operator-select admin-field"
                                        value={currentEditDocForm.document_type || ''}
                                        onChange={(e) => updateDocumentForm(editingProvider.id, { document_type: e.target.value })}
                                        placeholder="Seguro RC, CAE, APPCC, PRL..."
                                    />
                                </div>
                                <div>
                                    <label className="hmi-label">Nombre visible:</label>
                                    <input
                                        className="operator-select admin-field"
                                        value={currentEditDocForm.document_name || ''}
                                        onChange={(e) => updateDocumentForm(editingProvider.id, { document_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="hmi-label">Caducidad:</label>
                                    <input
                                        type="date"
                                        className="operator-select admin-field"
                                        value={currentEditDocForm.expires_on || ''}
                                        onChange={(e) => updateDocumentForm(editingProvider.id, { expires_on: e.target.value })}
                                    />
                                </div>
                                <div className="admin-field--full">
                                    <label className="hmi-label">Notas del documento:</label>
                                    <input
                                        className="operator-select admin-field"
                                        value={currentEditDocForm.notes || ''}
                                        onChange={(e) => updateDocumentForm(editingProvider.id, { notes: e.target.value })}
                                    />
                                </div>
                                <div className="admin-field--full">
                                    <label className="hmi-label">Archivo:</label>
                                    <input
                                        type="file"
                                        className="admin-provider-file-input"
                                        onChange={(e) => updateDocumentForm(editingProvider.id, { file: e.target.files?.[0] || null })}
                                    />
                                    <div className="admin-form-note">
                                        {currentEditDocForm.file ? `Archivo seleccionado: ${currentEditDocForm.file.name}` : 'Selecciona PDF, imagen o documento del proveedor'}
                                    </div>
                                </div>
                            </div>
                            <div className="admin-summary-actions">
                                <button type="button" className="hmi-btn" onClick={() => submitDocument(editingProvider.id)}>SUBIR DOCUMENTO</button>
                            </div>
                        </div>

                        <div className="admin-provider-documents__list">
                            <h3>Documentacion cargada</h3>
                            {currentEditDocuments.length === 0 ? (
                                <div className="admin-empty-state">No hay documentos cargados todavia.</div>
                            ) : (
                                currentEditDocuments.map((document) => {
                                    const expired = document.expires_on && String(document.expires_on).slice(0, 10) < new Date().toISOString().slice(0, 10);
                                    return (
                                        <div key={document.id} className="admin-provider-document-row">
                                            <div>
                                                <div className="admin-summary-title">{document.document_name || document.document_type}</div>
                                                <div className="admin-summary-meta">
                                                    {document.document_type} · Caduca: {formatDate(document.expires_on)} · Subido: {formatDate(document.uploaded_at)}
                                                </div>
                                                {document.notes && <div className="admin-summary-meta">{document.notes}</div>}
                                            </div>
                                            <div className="admin-summary-actions">
                                                <span className={`admin-badge ${expired ? 'admin-badge--danger' : 'admin-badge--success'}`}>
                                                    {expired ? 'CADUCADO' : 'OK'}
                                                </span>
                                                <a className="btn-manual" href={document.document_path} target="_blank" rel="noreferrer">VER</a>
                                                <button type="button" className="btn-danger" onClick={() => deleteProviderDocument(editingProvider.id, document.id)}>BORRAR</button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="card admin-form-card admin-summary-card">
                <h2>Estado documental</h2>
                <div className="admin-inline-help" style={{ marginBottom: 14 }}>
                    Aqui ves rapido quien esta vigente, quien tiene documentos por vencer y quien necesita regularizar papeles.
                </div>
                {providersLoading ? (
                    <div className="admin-empty-state">Cargando proveedores...</div>
                ) : providersError ? (
                    <div className="admin-empty-state">{providersError}</div>
                ) : (
                    <div className="admin-summary-list">
                        {providers.map((provider) => {
                            const status = providerStatus(provider);
                            const providerDepartments = provider.department_ids.map((id) => departmentMap.get(id)?.name).filter(Boolean);
                            const providerAssets = provider.asset_ids.map((id) => assetMap.get(id)?.name).filter(Boolean);
                            const documents = providerDocuments[provider.id] || [];
                            const docForm = documentForms[provider.id] || {};

                            return (
                                <div key={provider.id} className="admin-provider-card">
                                    <div className="admin-provider-card__top">
                                        <div>
                                            <div className="admin-summary-title">{provider.company_name}</div>
                                            <div className="admin-summary-meta">
                                                {provider.service_type || 'Sin especialidad definida'} · {provider.contact_name || 'Sin contacto'} · {provider.phone || 'Sin telefono'}
                                            </div>
                                            <div className="admin-summary-meta">
                                                {provider.email || 'Sin email'} · Contrato: {formatDate(provider.contract_expires_on)}
                                            </div>
                                        </div>
                                        <div className="admin-provider-badges">
                                            <span className={`admin-badge admin-badge--${status.tone}`}>{status.label}</span>
                                            <span className={`admin-badge ${provider.active === false ? 'admin-badge--danger' : 'admin-badge--success'}`}>
                                                {provider.active === false ? 'BAJA' : 'ACTIVO'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="admin-provider-card__meta">
                                        <div><strong>Areas:</strong> {providerDepartments.length > 0 ? providerDepartments.join(', ') : 'Sin areas'}</div>
                                        <div><strong>Maquinas:</strong> {providerAssets.length > 0 ? providerAssets.slice(0, 6).join(', ') : 'Sin maquinas'}</div>
                                        <div><strong>Documentos:</strong> {provider.document_count} total · {provider.expiring_documents} por vencer · {provider.expired_documents} caducados</div>
                                    </div>

                                    {provider.notes && (
                                        <div className="admin-summary-meta" style={{ marginTop: 8 }}>
                                            <strong>Notas:</strong> {provider.notes}
                                        </div>
                                    )}

                                    <div className="admin-summary-actions" style={{ marginTop: 14 }}>
                                        <button type="button" className="btn-manual" onClick={() => startEditingProvider(provider)}>EDITAR</button>
                                        <button type="button" className="btn-manual" onClick={() => openProviderDocuments(provider.id)}>
                                            {expandedProviderId === provider.id ? 'OCULTAR DOCUMENTACION' : 'DOCUMENTACION Y SUBIDA'}
                                        </button>
                                        {provider.active !== false && (
                                            <button type="button" className="btn-danger" onClick={() => deactivateProvider(provider.id)}>DAR DE BAJA</button>
                                        )}
                                    </div>

                                    <div className="admin-summary-meta" style={{ marginTop: 8 }}>
                                        Pulsa <strong>DOCUMENTACION Y SUBIDA</strong> para adjuntar certificados, CAE, seguros y revisar caducidades.
                                    </div>

                                    {expandedProviderId === provider.id && (
                                        <div className="admin-provider-documents">
                                            <div className="admin-provider-documents__form">
                                                <h3>Subir documento</h3>
                                                <div className="admin-inline-help" style={{ marginBottom: 14 }}>
                                                    Aqui puedes adjuntar documentos del proveedor y marcar su fecha de caducidad.
                                                </div>
                                                <div className="admin-form-grid">
                                                    <div>
                                                        <label className="hmi-label">Tipo:</label>
                                                        <input
                                                            className="operator-select admin-field"
                                                            value={docForm.document_type || ''}
                                                            onChange={(e) => updateDocumentForm(provider.id, { document_type: e.target.value })}
                                                            placeholder="Seguro RC, CAE, APPCC, PRL..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="hmi-label">Nombre visible:</label>
                                                        <input
                                                            className="operator-select admin-field"
                                                            value={docForm.document_name || ''}
                                                            onChange={(e) => updateDocumentForm(provider.id, { document_name: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="hmi-label">Caducidad:</label>
                                                        <input
                                                            type="date"
                                                            className="operator-select admin-field"
                                                            value={docForm.expires_on || ''}
                                                            onChange={(e) => updateDocumentForm(provider.id, { expires_on: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="admin-field--full">
                                                        <label className="hmi-label">Notas del documento:</label>
                                                        <input
                                                            className="operator-select admin-field"
                                                            value={docForm.notes || ''}
                                                            onChange={(e) => updateDocumentForm(provider.id, { notes: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="admin-field--full">
                                                        <label className="hmi-label">Archivo:</label>
                                                        <input
                                                            type="file"
                                                            className="admin-provider-file-input"
                                                            onChange={(e) => updateDocumentForm(provider.id, { file: e.target.files?.[0] || null })}
                                                        />
                                                        <div className="admin-form-note">
                                                            {docForm.file ? `Archivo seleccionado: ${docForm.file.name}` : 'Selecciona PDF, imagen o documento del proveedor'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="admin-summary-actions">
                                                    <button type="button" className="hmi-btn" onClick={() => submitDocument(provider.id)}>SUBIR DOCUMENTO</button>
                                                </div>
                                            </div>

                                            <div className="admin-provider-documents__list">
                                                <h3>Documentacion</h3>
                                                {documents.length === 0 ? (
                                                    <div className="admin-empty-state">No hay documentos cargados.</div>
                                                ) : (
                                                    documents.map((document) => {
                                                        const expired = document.expires_on && String(document.expires_on).slice(0, 10) < new Date().toISOString().slice(0, 10);
                                                        return (
                                                            <div key={document.id} className="admin-provider-document-row">
                                                                <div>
                                                                    <div className="admin-summary-title">{document.document_name || document.document_type}</div>
                                                                    <div className="admin-summary-meta">
                                                                        {document.document_type} · Caduca: {formatDate(document.expires_on)} · Subido: {formatDate(document.uploaded_at)}
                                                                    </div>
                                                                    {document.notes && <div className="admin-summary-meta">{document.notes}</div>}
                                                                </div>
                                                                <div className="admin-summary-actions">
                                                                    <span className={`admin-badge ${expired ? 'admin-badge--danger' : 'admin-badge--success'}`}>
                                                                        {expired ? 'CADUCADO' : 'OK'}
                                                                    </span>
                                                                    <a className="btn-manual" href={document.document_path} target="_blank" rel="noreferrer">VER</a>
                                                                    <button type="button" className="btn-danger" onClick={() => deleteProviderDocument(provider.id, document.id)}>BORRAR</button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
