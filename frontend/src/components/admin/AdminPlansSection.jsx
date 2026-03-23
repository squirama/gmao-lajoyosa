import React from 'react';

export default function AdminPlansSection({
    assets,
    deletePlan,
    editingPlan,
    handlePlanSubmit,
    handleReschedule,
    handleSkip,
    planForm,
    plans,
    resetPlanForm,
    setPlanForm,
    startEditingPlan,
}) {
    return (
        <div className="center-panel">
            <div className="card" style={{ border: '2px solid var(--neon-cyan)', marginBottom: 20 }}>
                <h2>{editingPlan ? 'EDITAR PLAN' : 'NUEVO PLAN PREVENTIVO'}</h2>
                <form onSubmit={handlePlanSubmit} style={{ display: 'grid', gap: 15, gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="hmi-label">Maquina:</label>
                        <select
                            value={planForm.asset_id}
                            onChange={(e) => setPlanForm({ ...planForm, asset_id: e.target.value })}
                            className="operator-select"
                            required
                            style={{ width: '100%', maxWidth: 'none' }}
                        >
                            <option value="">-- Seleccionar Activo --</option>
                            {Array.isArray(assets) && assets.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                    {asset.name} {asset.brand ? `(${asset.brand})` : ''} - {asset.loc_name || 'Sin Sede'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="hmi-label">Tarea:</label>
                        <input
                            value={planForm.task_description}
                            onChange={(e) => setPlanForm({ ...planForm, task_description: e.target.value })}
                            className="operator-select"
                            required
                            style={{ width: '100%', maxWidth: 'none' }}
                        />
                    </div>

                    <div>
                        <label className="hmi-label">Frecuencia en dias (0 o vacio para puntuales):</label>
                        <input
                            type="number"
                            value={planForm.frequency_days}
                            onChange={(e) => setPlanForm({ ...planForm, frequency_days: e.target.value })}
                            className="operator-select"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label className="hmi-label">Fecha inicio (opcional):</label>
                        <input
                            type="date"
                            value={planForm.start_date}
                            onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                            className="operator-select"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={planForm.notify_external}
                            onChange={(e) => setPlanForm({ ...planForm, notify_external: e.target.checked })}
                            style={{ width: 24, height: 24, marginRight: 10 }}
                        />
                        <label className="hmi-label" style={{ marginBottom: 0 }}>Notificar email</label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={planForm.is_legal || false}
                            onChange={(e) => setPlanForm({ ...planForm, is_legal: e.target.checked })}
                            style={{ width: 24, height: 24, marginRight: 10, accentColor: 'var(--neon-orange)' }}
                        />
                        <label className="hmi-label" style={{ marginBottom: 0, color: 'var(--neon-orange)' }}>Requisito legal / normativa</label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gridColumn: '1 / -1' }}>
                        <input
                            type="checkbox"
                            checked={planForm.force_dow || false}
                            onChange={(e) => setPlanForm({ ...planForm, force_dow: e.target.checked })}
                            style={{ width: 24, height: 24, marginRight: 10, accentColor: 'var(--neon-cyan)' }}
                        />
                        <label className="hmi-label" style={{ marginBottom: 0 }}>
                            Forzar a que coincida siempre con el dia de la semana de la fecha inicio
                        </label>
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 20 }}>
                        <button className="hmi-btn" style={{ flex: 1 }}>{editingPlan ? 'ACTUALIZAR' : 'CREAR PLAN'}</button>
                        {editingPlan && <button type="button" onClick={resetPlanForm} className="btn-danger">CANCELAR</button>}
                    </div>
                </form>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
                {Array.isArray(plans) && plans.map((plan) => {
                    const asset = Array.isArray(assets) ? assets.find((item) => item.id === plan.asset_id) : null;

                    return (
                        <div key={plan.id} style={{ background: '#111', padding: 15, border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{plan.task_description}</div>
                                <div style={{ color: '#aaa' }}>{asset?.name || 'Maquina desconocida'} | Cada {plan.frequency_days} dias</div>
                                <div style={{ color: 'var(--neon-orange)' }}>Proxima: {plan.next_due_date ? plan.next_due_date.split('T')[0] : 'N/A'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {plan.frequency_days > 0 && <button onClick={() => handleReschedule(plan)} className="btn-manual" title="Reprogramar">📅</button>}
                                {plan.frequency_days > 0 && <button onClick={() => handleSkip(plan)} className="btn-manual" title="Saltar turno">⏭️</button>}
                                <button
                                    onClick={() => {
                                        startEditingPlan(plan);
                                        window.scrollTo(0, 0);
                                    }}
                                    className="btn-manual"
                                >
                                    ✏️
                                </button>
                                <button onClick={() => deletePlan(plan.id)} className="btn-danger">🗑️</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
