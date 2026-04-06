import React, { useEffect, useMemo, useState } from 'react';

function normalizePlanDrafts(plans) {
    return Object.fromEntries(
        (Array.isArray(plans) ? plans : [])
            .filter((plan) => plan.notify_external)
            .map((plan) => [
                plan.id,
                {
                    notification_email: plan.notification_email || '',
                },
            ])
    );
}

function normalizeReminderDrafts(departments) {
    return Object.fromEntries(
        (Array.isArray(departments) ? departments : []).map((department) => [
            department.id,
            {
                weekly_reminder_enabled: Boolean(department.weekly_reminder_enabled),
                weekly_reminder_email: department.weekly_reminder_email || '',
            },
        ])
    );
}

export default function AdminPlansSection({
    assets,
    deletePlan,
    departments,
    editingPlan,
    handlePlanSubmit,
    handleReschedule,
    handleSkip,
    locations,
    planForm,
    plans,
    resetPlanForm,
    saveDepartmentReminderSettings,
    savePlanNotificationSettings,
    setPlanForm,
    startEditingPlan,
}) {
    const [notificationDrafts, setNotificationDrafts] = useState(() => normalizePlanDrafts(plans));
    const [reminderDrafts, setReminderDrafts] = useState(() => normalizeReminderDrafts(departments));
    const [savingPlanId, setSavingPlanId] = useState(null);
    const [savingDepartmentId, setSavingDepartmentId] = useState(null);

    useEffect(() => {
        setNotificationDrafts(normalizePlanDrafts(plans));
    }, [plans]);

    useEffect(() => {
        setReminderDrafts(normalizeReminderDrafts(departments));
    }, [departments]);

    const departmentMap = useMemo(
        () => new Map((Array.isArray(departments) ? departments : []).map((department) => [department.id, department])),
        [departments]
    );
    const locationMap = useMemo(
        () => new Map((Array.isArray(locations) ? locations : []).map((location) => [location.id, location])),
        [locations]
    );

    const notificationPlans = Array.isArray(plans) ? plans.filter((plan) => plan.notify_external) : [];

    const resolvePlanRecipient = (plan) => {
        const department = departmentMap.get(plan.dept_id);
        const location = department ? locationMap.get(department.location_id) : null;
        return plan.notification_email || department?.email || location?.email || 'Sin destino configurado';
    };

    const resolveReminderRecipient = (department) => {
        const location = locationMap.get(department.location_id);
        const draft = reminderDrafts[department.id];
        return draft?.weekly_reminder_email || department.weekly_reminder_email || department.email || location?.email || 'Sin destino configurado';
    };

    const handleSavePlanNotification = async (plan) => {
        const draft = notificationDrafts[plan.id] || { notification_email: '' };
        setSavingPlanId(plan.id);
        try {
            await savePlanNotificationSettings(plan, {
                notify_external: true,
                notification_email: draft.notification_email.trim(),
            });
            alert('Correo de notificacion actualizado');
        } catch (error) {
            alert(error.response?.data?.error || error.message || 'No se pudo actualizar el correo del plan');
        } finally {
            setSavingPlanId(null);
        }
    };

    const handleSaveReminder = async (department) => {
        const draft = reminderDrafts[department.id] || {
            weekly_reminder_enabled: false,
            weekly_reminder_email: '',
        };
        setSavingDepartmentId(department.id);
        try {
            await saveDepartmentReminderSettings(department, {
                weekly_reminder_enabled: draft.weekly_reminder_enabled,
                weekly_reminder_email: draft.weekly_reminder_email.trim(),
            });
            alert('Recordatorio semanal actualizado');
        } catch (error) {
            alert(error.response?.data?.error || error.message || 'No se pudo guardar el recordatorio semanal');
        } finally {
            setSavingDepartmentId(null);
        }
    };

    return (
        <div className="center-panel admin-section">
            <div className="card admin-form-card" style={{ border: '2px solid var(--neon-cyan)' }}>
                <h2>{editingPlan ? 'EDITAR PLAN' : 'NUEVO PLAN PREVENTIVO'}</h2>
                <form onSubmit={handlePlanSubmit} className="admin-form-grid">
                    <div className="admin-field--full">
                        <label className="hmi-label">Maquina:</label>
                        <select
                            value={planForm.asset_id}
                            onChange={(e) => setPlanForm({ ...planForm, asset_id: e.target.value })}
                            className="operator-select admin-field"
                            required
                        >
                            <option value="">-- Seleccionar Activo --</option>
                            {Array.isArray(assets) && assets.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                    {asset.name} {asset.brand ? `(${asset.brand})` : ''} - {asset.loc_name || 'Sin Sede'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-field--full">
                        <label className="hmi-label">Tarea:</label>
                        <input
                            value={planForm.task_description}
                            onChange={(e) => setPlanForm({ ...planForm, task_description: e.target.value })}
                            className="operator-select admin-field"
                            required
                        />
                    </div>

                    <div>
                        <label className="hmi-label">Frecuencia en dias:</label>
                        <input
                            type="number"
                            value={planForm.frequency_days}
                            onChange={(e) => setPlanForm({ ...planForm, frequency_days: e.target.value })}
                            className="operator-select admin-field"
                        />
                    </div>

                    <div>
                        <label className="hmi-label">Fecha de inicio:</label>
                        <input
                            type="date"
                            value={planForm.start_date}
                            onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                            className="operator-select admin-field"
                        />
                    </div>

                    <div>
                        <label className="hmi-label">Notificar email:</label>
                        <div className="admin-toggle">
                            <input
                                type="checkbox"
                                checked={planForm.notify_external}
                                onChange={(e) => setPlanForm({
                                    ...planForm,
                                    notify_external: e.target.checked,
                                    notification_email: e.target.checked ? planForm.notification_email || '' : '',
                                })}
                            />
                            <label className="hmi-label">Activado</label>
                        </div>
                    </div>

                    <div className="admin-toggle">
                        <input
                            type="checkbox"
                            checked={planForm.is_legal || false}
                            onChange={(e) => setPlanForm({ ...planForm, is_legal: e.target.checked })}
                            style={{ accentColor: 'var(--neon-orange)' }}
                        />
                        <label className="hmi-label" style={{ color: 'var(--neon-orange)' }}>Requisito legal / normativa</label>
                    </div>

                    {planForm.notify_external && (
                        <div className="admin-field--full admin-inline-banner">
                            <label className="hmi-label">Correo de notificacion del plan:</label>
                            <input
                                value={planForm.notification_email || ''}
                                onChange={(e) => setPlanForm({ ...planForm, notification_email: e.target.value })}
                                className="operator-select admin-field"
                                placeholder="Si lo dejas vacio, usa el correo del area o la sede"
                                type="email"
                            />
                            <div className="admin-inline-help">
                                Puedes poner un correo distinto al general del area para este plan concreto.
                            </div>
                        </div>
                    )}

                    <div className="admin-toggle admin-field--full">
                        <input
                            type="checkbox"
                            checked={planForm.force_dow || false}
                            onChange={(e) => setPlanForm({ ...planForm, force_dow: e.target.checked })}
                            style={{ accentColor: 'var(--neon-cyan)' }}
                        />
                        <label className="hmi-label">
                            Forzar a que coincida siempre con el dia de la semana de la fecha inicio
                        </label>
                    </div>

                    <div className="admin-actions admin-field--full">
                        <button className="hmi-btn">{editingPlan ? 'ACTUALIZAR' : 'CREAR PLAN'}</button>
                        {editingPlan && <button type="button" onClick={resetPlanForm} className="btn-danger">CANCELAR</button>}
                    </div>
                </form>
            </div>

            <div className="card admin-form-card admin-summary-card">
                <h2>Planes con notificacion</h2>
                <div className="admin-inline-help" style={{ marginBottom: 16 }}>
                    Aqui puedes ver rapido a que correo avisa cada plan y cambiar el destino sin entrar a editar todo el plan.
                </div>
                {notificationPlans.length === 0 ? (
                    <div className="admin-empty-state">No hay planes con notificacion activa.</div>
                ) : (
                    <div className="admin-summary-list">
                        {notificationPlans.map((plan) => {
                            const draft = notificationDrafts[plan.id] || { notification_email: '' };
                            const asset = Array.isArray(assets) ? assets.find((item) => item.id === plan.asset_id) : null;
                            return (
                                <div key={plan.id} className="admin-summary-row">
                                    <div className="admin-summary-main">
                                        <div className="admin-summary-title">{plan.task_description}</div>
                                        <div className="admin-summary-meta">
                                            {asset?.name || plan.asset_name || 'Maquina desconocida'} · Destino actual: {resolvePlanRecipient(plan)}
                                        </div>
                                    </div>
                                    <div className="admin-summary-actions">
                                        <input
                                            type="email"
                                            className="operator-select admin-inline-input"
                                            value={draft.notification_email}
                                            onChange={(e) => setNotificationDrafts((current) => ({
                                                ...current,
                                                [plan.id]: {
                                                    ...current[plan.id],
                                                    notification_email: e.target.value,
                                                },
                                            }))}
                                            placeholder="Correo especifico del plan"
                                        />
                                        <button
                                            type="button"
                                            className="btn-manual"
                                            onClick={() => handleSavePlanNotification(plan)}
                                            disabled={savingPlanId === plan.id}
                                        >
                                            {savingPlanId === plan.id ? 'GUARDANDO...' : 'GUARDAR'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-manual"
                                            onClick={() => {
                                                startEditingPlan(plan);
                                                window.scrollTo(0, 0);
                                            }}
                                        >
                                            EDITAR
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="card admin-form-card admin-summary-card">
                <h2>Recordatorio semanal por area</h2>
                <div className="admin-inline-help" style={{ marginBottom: 16 }}>
                    Si lo activas, todos los lunes el sistema envia al correo elegido las tareas pendientes o previstas de esa semana para el area.
                </div>
                {Array.isArray(departments) && departments.length > 0 ? (
                    <div className="admin-summary-list">
                        {departments.map((department) => {
                            const draft = reminderDrafts[department.id] || {
                                weekly_reminder_enabled: false,
                                weekly_reminder_email: '',
                            };
                            const location = locationMap.get(department.location_id);
                            return (
                                <div key={department.id} className="admin-summary-row">
                                    <div className="admin-summary-main">
                                        <div className="admin-summary-title">
                                            {department.name} {location ? `· ${location.name}` : ''}
                                        </div>
                                        <div className="admin-summary-meta">
                                            Destino actual: {resolveReminderRecipient(department)}
                                        </div>
                                    </div>
                                    <div className="admin-summary-actions admin-summary-actions--stack">
                                        <label className="admin-toggle" style={{ margin: 0 }}>
                                            <input
                                                type="checkbox"
                                                checked={draft.weekly_reminder_enabled}
                                                onChange={(e) => setReminderDrafts((current) => ({
                                                    ...current,
                                                    [department.id]: {
                                                        ...current[department.id],
                                                        weekly_reminder_enabled: e.target.checked,
                                                    },
                                                }))}
                                            />
                                            <span className="hmi-label">Lunes</span>
                                        </label>
                                        <input
                                            type="email"
                                            className="operator-select admin-inline-input"
                                            value={draft.weekly_reminder_email}
                                            onChange={(e) => setReminderDrafts((current) => ({
                                                ...current,
                                                [department.id]: {
                                                    ...current[department.id],
                                                    weekly_reminder_email: e.target.value,
                                                },
                                            }))}
                                            placeholder="Correo especifico del recordatorio"
                                        />
                                        <button
                                            type="button"
                                            className="btn-manual"
                                            onClick={() => handleSaveReminder(department)}
                                            disabled={savingDepartmentId === department.id}
                                        >
                                            {savingDepartmentId === department.id ? 'GUARDANDO...' : 'GUARDAR'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="admin-empty-state">No hay areas disponibles.</div>
                )}
            </div>

            <div className="admin-list-grid">
                {Array.isArray(plans) && plans.map((plan) => {
                    const asset = Array.isArray(assets) ? assets.find((item) => item.id === plan.asset_id) : null;

                    return (
                        <div
                            key={plan.id}
                            style={{
                                background: '#111',
                                padding: 15,
                                border: '1px solid #333',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 15,
                                flexWrap: 'wrap'
                            }}
                        >
                            <div>
                                <div style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{plan.task_description}</div>
                                <div style={{ color: '#aaa' }}>{asset?.name || 'Maquina desconocida'} | Cada {plan.frequency_days} dias</div>
                                <div style={{ color: 'var(--neon-orange)' }}>Proxima: {plan.next_due_date ? plan.next_due_date.split('T')[0] : 'N/A'}</div>
                                {plan.notify_external && (
                                    <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                                        Notifica a: {resolvePlanRecipient(plan)}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {plan.frequency_days > 0 && <button onClick={() => handleReschedule(plan)} className="btn-manual" title="Reprogramar">...</button>}
                                {plan.frequency_days > 0 && <button onClick={() => handleSkip(plan)} className="btn-manual" title="Saltar turno">SALTAR</button>}
                                <button
                                    onClick={() => {
                                        startEditingPlan(plan);
                                        window.scrollTo(0, 0);
                                    }}
                                    className="btn-manual"
                                >
                                    EDITAR
                                </button>
                                <button onClick={() => deletePlan(plan.id)} className="btn-danger">BORRAR</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
