import React from 'react';
import { parseDocumentPaths } from '../../utils/documentPaths';

function formatHistoryDate(item) {
    const rawDate = item.created_at || item.performed_date;
    if (!rawDate) return 'Sin fecha';

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
        return String(rawDate);
    }

    return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
}

function formatReviewedDate(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
}

function getHistoryTypeMeta(item) {
    if (item.entry_type === 'corrective') {
        return {
            badgeClassName: 'admin-history-badge admin-history-badge--corrective',
            label: 'Correctivo',
        };
    }

    return {
        badgeClassName: 'admin-history-badge admin-history-badge--preventive',
        label: 'Preventivo',
    };
}

function getCorrectiveClassificationLabel(item) {
    const labels = {
        CORRECTION: 'Correccion puntual',
        CORRECTIVE_ACTION: 'Accion correctiva',
        IMPROVEMENT_OPPORTUNITY: 'Oportunidad de mejora',
        TECHNICAL_CHANGE: 'Cambio tecnico',
    };

    return labels[item.classification] || item.classification || '';
}

export default function AdminHistorySection({
    assets,
    departments,
    historyError,
    historyFilters,
    historyLoading,
    historyRows,
    locations,
    onApplyFilters,
    onReview = () => {},
    setHistoryFilters,
}) {
    const visibleDepartments = historyFilters.location_id
        ? departments.filter((department) => String(department.location_id) === String(historyFilters.location_id))
        : departments;

    const visibleAssets = historyFilters.department_id
        ? assets.filter((asset) => String(asset.dept_id) === String(historyFilters.department_id))
        : historyFilters.location_id
            ? assets.filter((asset) => {
                const department = departments.find((item) => item.id === asset.dept_id);
                return department && String(department.location_id) === String(historyFilters.location_id);
            })
            : assets;

    const handleFilterChange = (field, value) => {
        setHistoryFilters((current) => {
            const next = { ...current, [field]: value };

            if (field === 'location_id') {
                next.department_id = '';
                next.asset_id = '';
            }

            if (field === 'department_id') {
                next.asset_id = '';
            }

            return next;
        });
    };

    return (
        <div className="center-panel admin-section">
            <div className="card admin-form-card" style={{ border: '2px solid var(--neon-green)', maxWidth: 1280 }}>
                <h2 className="title" style={{ fontSize: '1.8rem', marginTop: 0 }}>HISTORIAL DE MANTENIMIENTOS</h2>
                <div className="admin-form-note" style={{ marginBottom: 18 }}>
                    Vista rapida de preventivos y correctivos realizados. Desde aqui puedes localizar registros, revisar lo ejecutado y abrir los archivos adjuntos.
                </div>

                <div className="admin-form-grid" style={{ marginBottom: 18 }}>
                    <div>
                        <label className="hmi-label">Fecha inicio</label>
                        <input
                            className="operator-select admin-field"
                            onChange={(event) => handleFilterChange('start', event.target.value)}
                            type="date"
                            value={historyFilters.start}
                        />
                    </div>
                    <div>
                        <label className="hmi-label">Fecha fin</label>
                        <input
                            className="operator-select admin-field"
                            onChange={(event) => handleFilterChange('end', event.target.value)}
                            type="date"
                            value={historyFilters.end}
                        />
                    </div>
                    <div>
                        <label className="hmi-label">Sede</label>
                        <select
                            className="operator-select admin-field"
                            onChange={(event) => handleFilterChange('location_id', event.target.value)}
                            value={historyFilters.location_id}
                        >
                            <option value="">Todas</option>
                            {locations.map((location) => (
                                <option key={location.id} value={location.id}>{location.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="hmi-label">Area</label>
                        <select
                            className="operator-select admin-field"
                            onChange={(event) => handleFilterChange('department_id', event.target.value)}
                            value={historyFilters.department_id}
                        >
                            <option value="">Todas</option>
                            {visibleDepartments.map((department) => (
                                <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="hmi-label">Maquina</label>
                        <select
                            className="operator-select admin-field"
                            onChange={(event) => handleFilterChange('asset_id', event.target.value)}
                            value={historyFilters.asset_id}
                        >
                            <option value="">Todas</option>
                            {visibleAssets.map((asset) => (
                                <option key={asset.id} value={asset.id}>{asset.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="hmi-label">Solo con adjuntos</label>
                        <label className="admin-toggle">
                            <input
                                checked={historyFilters.with_documents}
                                onChange={(event) => handleFilterChange('with_documents', event.target.checked)}
                                type="checkbox"
                            />
                            <span>Mostrar solo registros con archivo</span>
                        </label>
                    </div>
                </div>

                <div className="admin-actions" style={{ marginBottom: 22 }}>
                    <button className="hmi-btn" onClick={() => onApplyFilters(historyFilters)} type="button">
                        Aplicar filtros
                    </button>
                </div>

                {historyError && (
                    <div className="admin-empty-state" style={{ borderColor: 'var(--neon-red)', color: '#f5b7b1' }}>
                        {historyError}
                    </div>
                )}

                {historyLoading ? (
                    <div className="admin-empty-state">Cargando historial...</div>
                ) : historyRows.length === 0 ? (
                    <div className="admin-empty-state">
                        No hay mantenimientos en ese rango o con esos filtros.
                    </div>
                ) : (
                    <div className="admin-history-list">
                        {historyRows.map((item) => {
                            const documentPaths = parseDocumentPaths(item.document_path);
                            const typeMeta = getHistoryTypeMeta(item);

                            return (
                                <article className={`admin-history-item ${item.entry_type === 'corrective' ? 'is-corrective' : 'is-preventive'}`} key={`${item.entry_type || 'preventive'}-${item.id}`}>
                                    <div className="admin-history-header">
                                        <div>
                                            <span className={typeMeta.badgeClassName}>{typeMeta.label}</span>
                                            <div className="admin-history-title">{item.asset_name}</div>
                                            <div className="admin-history-subtitle">
                                                {item.task_description || 'Mantenimiento realizado'}
                                            </div>
                                        </div>
                                        <div className="admin-history-date">{formatHistoryDate(item)}</div>
                                    </div>

                                    <div className="admin-history-meta">
                                        <span>{item.location_name || 'Sin sede'}</span>
                                        <span>{item.department_name || 'Sin area'}</span>
                                        <span>Hecho por: {item.operator_name || 'Sin operario'}</span>
                                        {item.duration_minutes > 0 && <span>{item.duration_minutes} min</span>}
                                        <span>{documentPaths.length > 0 ? `${documentPaths.length} adjunto(s)` : 'Sin adjuntos'}</span>
                                        {item.reviewed_at && (
                                            <span>
                                                Revisado por: {item.reviewed_by_name || 'Usuario eliminado'} ({formatReviewedDate(item.reviewed_at)})
                                            </span>
                                        )}
                                    </div>

                                    <div className="admin-history-notes">
                                        {item.entry_type === 'corrective'
                                            ? `Causa de la averia: ${item.notes || 'Sin causa registrada.'}`
                                            : (item.notes || 'Sin notas registradas.')}
                                    </div>

                                    {item.solution && (
                                        <div className="admin-history-solution">
                                            <strong>Solucion aplicada:</strong> {item.solution}
                                        </div>
                                    )}

                                    {item.entry_type === 'corrective' && item.classification && (
                                        <div className="admin-history-solution">
                                            <strong>Clasificacion ISO:</strong> {getCorrectiveClassificationLabel(item)}
                                            {item.impact_level ? ` | Impacto: ${item.impact_level}` : ''}
                                            {item.follow_up_status ? ` | Seguimiento: ${item.follow_up_status}` : ''}
                                        </div>
                                    )}

                                    <div className="admin-history-docs">
                                        {documentPaths.length > 0 ? (
                                            documentPaths.map((path, index) => (
                                                <a
                                                    className="hmi-btn admin-history-doc-btn"
                                                    href={path}
                                                    key={`${item.id}-${path}-${index}`}
                                                    rel="noreferrer"
                                                    target="_blank"
                                                >
                                                    Ver archivo {documentPaths.length > 1 ? index + 1 : ''}
                                                </a>
                                            ))
                                        ) : (
                                            <span className="admin-history-no-docs">Sin archivos adjuntos</span>
                                        )}
                                        {!item.reviewed_at && (
                                            <button
                                                className="hmi-btn admin-history-doc-btn"
                                                onClick={() => onReview(item.entry_type, item.id)}
                                                type="button"
                                            >
                                                Marcar revisado
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
