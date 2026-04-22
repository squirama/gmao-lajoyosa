import React from 'react';
import { parseDocumentPaths } from '../../utils/documentPaths';

const CLASSIFICATION_LABELS = {
    CORRECTION: 'Correccion puntual',
    CORRECTIVE_ACTION: 'Accion correctiva',
    IMPROVEMENT_OPPORTUNITY: 'Oportunidad de mejora',
    TECHNICAL_CHANGE: 'Cambio tecnico',
};

const IMPACT_LABELS = {
    NONE: 'Sin impacto',
    POTENTIAL: 'Impacto potencial',
    CONFIRMED: 'Impacto confirmado',
};

const STATUS_LABELS = {
    NOT_REQUIRED: 'Sin seguimiento',
    OPEN: 'Abierta',
    CLOSED: 'Cerrada',
};

function requestClosurePayload(item) {
    const solution = window.prompt('Solucion aplicada para cerrar la averia:', item.solution || '');
    if (solution === null) return null;

    const followUpNotes = window.prompt('Notas de cierre / seguimiento:', item.follow_up_notes || '');
    if (followUpNotes === null) return null;

    return {
        classification: item.classification,
        impact_level: item.impact_level,
        solution,
        probable_cause: item.probable_cause || '',
        preventive_action: item.preventive_action || '',
        follow_up_required: true,
        follow_up_status: 'CLOSED',
        follow_up_notes: followUpNotes || 'Cerrada desde seguimiento admin',
    };
}

function buildReopenPayload(item) {
    return {
        classification: item.classification,
        impact_level: item.impact_level,
        solution: item.solution || '',
        probable_cause: item.probable_cause || '',
        preventive_action: item.preventive_action || '',
        follow_up_required: true,
        follow_up_status: 'OPEN',
        follow_up_notes: item.follow_up_notes || '',
    };
}

export default function AdminCorrectiveActionsSection({
    assets,
    correctiveError,
    correctiveFilters,
    correctiveLoading,
    correctiveRows,
    departments,
    locations,
    onApplyFilters,
    onUpdate,
    setCorrectiveFilters,
}) {
    const visibleDepartments = correctiveFilters.location_id
        ? departments.filter((department) => String(department.location_id) === String(correctiveFilters.location_id))
        : departments;

    const visibleAssets = correctiveFilters.department_id
        ? assets.filter((asset) => String(asset.dept_id) === String(correctiveFilters.department_id))
        : correctiveFilters.location_id
            ? assets.filter((asset) => {
                const department = departments.find((item) => item.id === asset.dept_id);
                return department && String(department.location_id) === String(correctiveFilters.location_id);
            })
            : assets;
    const openCount = correctiveRows.filter((item) => item.follow_up_status === 'OPEN').length;
    const closedCount = correctiveRows.filter((item) => item.follow_up_status === 'CLOSED').length;
    const noFollowUpCount = correctiveRows.filter((item) => item.follow_up_status === 'NOT_REQUIRED').length;

    const handleFilterChange = (field, value) => {
        setCorrectiveFilters((current) => {
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
            <div className="card admin-form-card" style={{ border: '2px solid var(--neon-cyan)', maxWidth: 1280 }}>
                <h2 className="title" style={{ fontSize: '1.8rem', marginTop: 0 }}>AVERIAS ABIERTAS Y CORRECTIVAS</h2>
                <div className="admin-form-note" style={{ marginBottom: 18 }}>
                    Aqui aparecen primero las averias que siguen abiertas. Desde este panel puedes cerrarlas cuando ya tengan solucion.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                    <div style={{ padding: 12, border: '1px solid #ef4444', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fca5a5' }}>{openCount}</div>
                        <div style={{ color: '#fca5a5' }}>Abiertas</div>
                    </div>
                    <div style={{ padding: 12, border: '1px solid var(--neon-green)', borderRadius: 8, background: 'rgba(0, 255, 0, 0.08)' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>{closedCount}</div>
                        <div style={{ color: 'var(--neon-green)' }}>Cerradas</div>
                    </div>
                    <div style={{ padding: 12, border: '1px solid #64748b', borderRadius: 8, background: 'rgba(100, 116, 139, 0.12)' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#cbd5f5' }}>{noFollowUpCount}</div>
                        <div style={{ color: '#cbd5f5' }}>Sin seguimiento</div>
                    </div>
                </div>

                <div className="admin-form-grid" style={{ marginBottom: 18 }}>
                    <div>
                        <label className="hmi-label">Sede</label>
                        <select className="operator-select admin-field" value={correctiveFilters.location_id} onChange={(event) => handleFilterChange('location_id', event.target.value)}>
                            <option value="">Todas</option>
                            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="hmi-label">Area</label>
                        <select className="operator-select admin-field" value={correctiveFilters.department_id} onChange={(event) => handleFilterChange('department_id', event.target.value)}>
                            <option value="">Todas</option>
                            {visibleDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="hmi-label">Maquina</label>
                        <select className="operator-select admin-field" value={correctiveFilters.asset_id} onChange={(event) => handleFilterChange('asset_id', event.target.value)}>
                            <option value="">Todas</option>
                            {visibleAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="hmi-label">Tipo</label>
                        <select className="operator-select admin-field" value={correctiveFilters.classification} onChange={(event) => handleFilterChange('classification', event.target.value)}>
                            <option value="">Todos</option>
                            {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="hmi-label">Estado</label>
                        <select className="operator-select admin-field" value={correctiveFilters.status} onChange={(event) => handleFilterChange('status', event.target.value)}>
                            <option value="">Todos</option>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="hmi-label">Solo con seguimiento</label>
                        <label className="admin-toggle">
                            <input type="checkbox" checked={correctiveFilters.follow_up_required} onChange={(event) => handleFilterChange('follow_up_required', event.target.checked)} />
                            <span>Mostrar solo abiertas o controladas</span>
                        </label>
                    </div>
                </div>

                <div className="admin-actions" style={{ marginBottom: 22 }}>
                    <button className="hmi-btn" onClick={() => onApplyFilters(correctiveFilters)} type="button">
                        Aplicar filtros
                    </button>
                </div>

                {correctiveError && <div className="admin-empty-state" style={{ borderColor: 'var(--neon-red)', color: '#f5b7b1' }}>{correctiveError}</div>}

                {correctiveLoading ? (
                    <div className="admin-empty-state">Cargando seguimiento...</div>
                ) : correctiveRows.length === 0 ? (
                    <div className="admin-empty-state">No hay correctivos o mejoras con esos filtros.</div>
                ) : (
                    <div className="admin-history-list">
                        {correctiveRows.map((item) => {
                            const documentPaths = parseDocumentPaths(item.document_path);
                            const canClose = item.follow_up_required && item.follow_up_status !== 'CLOSED';
                            const canReopen = item.follow_up_required && item.follow_up_status === 'CLOSED';

                            return (
                                <article className="admin-history-item is-corrective" key={item.id}>
                                    <div className="admin-history-header">
                                        <div>
                                            <span className="admin-history-badge admin-history-badge--corrective">
                                                {CLASSIFICATION_LABELS[item.classification] || item.classification}
                                            </span>
                                            <div className="admin-history-title">{item.asset_name}</div>
                                            <div className="admin-history-subtitle">{item.task_description}</div>
                                        </div>
                                        <div className="admin-history-date">
                                            {new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.created_at))}
                                        </div>
                                    </div>

                                    <div className="admin-history-meta">
                                        <span>{item.location_name || 'Sin sede'}</span>
                                        <span>{item.department_name || 'Sin area'}</span>
                                        <span>{item.operator_name || 'Sin operario'}</span>
                                        <span>{IMPACT_LABELS[item.impact_level] || item.impact_level}</span>
                                        <span>{STATUS_LABELS[item.follow_up_status] || item.follow_up_status}</span>
                                    </div>

                                    <div className="admin-history-solution">
                                        <strong>Causa de la averia:</strong> {item.failure_cause || 'Sin causa registrada.'}
                                    </div>

                                    {item.solution && (
                                        <div className="admin-history-solution">
                                            <strong>Solucion aplicada:</strong> {item.solution}
                                        </div>
                                    )}

                                    {item.probable_cause && (
                                        <div className="admin-history-solution">
                                            <strong>Causa probable:</strong> {item.probable_cause}
                                        </div>
                                    )}

                                    {item.preventive_action && (
                                        <div className="admin-history-solution">
                                            <strong>Medida preventiva / mejora:</strong> {item.preventive_action}
                                        </div>
                                    )}

                                    {item.follow_up_notes && (
                                        <div className="admin-history-solution">
                                            <strong>Notas de seguimiento:</strong> {item.follow_up_notes}
                                        </div>
                                    )}

                                    <div className="admin-history-docs">
                                        {documentPaths.length > 0 ? (
                                            documentPaths.map((path, index) => (
                                                <a className="hmi-btn admin-history-doc-btn" href={path} key={`${item.id}-${path}-${index}`} rel="noreferrer" target="_blank">
                                                    Ver archivo {documentPaths.length > 1 ? index + 1 : ''}
                                                </a>
                                            ))
                                        ) : (
                                            <span className="admin-history-no-docs">Sin archivos adjuntos</span>
                                        )}
                                        {canClose && (
                                            <button
                                                className="hmi-btn admin-history-doc-btn"
                                                onClick={() => {
                                                    const payload = requestClosurePayload(item);
                                                    if (payload) {
                                                        onUpdate(item.id, payload);
                                                    }
                                                }}
                                                type="button"
                                            >
                                                Cerrar averia
                                            </button>
                                        )}
                                        {canReopen && (
                                            <button
                                                className="hmi-btn admin-history-doc-btn"
                                                onClick={() => onUpdate(item.id, buildReopenPayload(item))}
                                                type="button"
                                            >
                                                Reabrir
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
