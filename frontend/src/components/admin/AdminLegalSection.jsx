import React from 'react';

function parseValidDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatPlanDate(value) {
    if (!value) return 'N/A';
    return String(value).slice(0, 10);
}

function resolveLegalPlanState(plan, { now, soonThreshold }) {
    const dueDate = parseValidDate(plan.next_due_date);

    if (!dueDate) {
        return {
            key: 'manual',
            borderColor: 'var(--neon-cyan)',
            summary: plan.last_performed
                ? `Ultimo registro: ${formatPlanDate(plan.last_performed)} | Seguimiento manual`
                : 'Sin fecha programada | Seguimiento manual',
        };
    }

    if (dueDate < now) {
        return {
            key: 'expired',
            borderColor: 'red',
            summary: `${plan.asset_name} | Vence: ${formatPlanDate(plan.next_due_date)}`,
        };
    }

    if (dueDate <= soonThreshold) {
        return {
            key: 'warning',
            borderColor: 'orange',
            summary: `${plan.asset_name} | Vence: ${formatPlanDate(plan.next_due_date)}`,
        };
    }

    return {
        key: 'valid',
        borderColor: 'var(--neon-green)',
        summary: `${plan.asset_name} | Vence: ${formatPlanDate(plan.next_due_date)}`,
    };
}

export default function AdminLegalSection({
    onManagePlan,
    onOpenHistory,
    plans,
}) {
    const legalPlans = Array.isArray(plans)
        ? plans.filter((plan) => plan.is_legal)
        : [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const soonThreshold = new Date();
    soonThreshold.setHours(0, 0, 0, 0);
    soonThreshold.setDate(soonThreshold.getDate() + 30);
    const plansWithState = legalPlans.map((plan) => ({
        ...plan,
        legalState: resolveLegalPlanState(plan, { now, soonThreshold }),
    }));
    const validCount = plansWithState.filter((plan) => plan.legalState.key === 'valid').length;
    const warningCount = plansWithState.filter((plan) => plan.legalState.key === 'warning').length;
    const expiredCount = plansWithState.filter((plan) => plan.legalState.key === 'expired').length;
    const manualCount = plansWithState.filter((plan) => plan.legalState.key === 'manual').length;
    const sortedPlans = [...plansWithState].sort((a, b) => {
        const dueA = parseValidDate(a.next_due_date);
        const dueB = parseValidDate(b.next_due_date);

        if (dueA && dueB) return dueA - dueB;
        if (dueA) return -1;
        if (dueB) return 1;

        const lastA = parseValidDate(a.last_performed);
        const lastB = parseValidDate(b.last_performed);
        if (lastA && lastB) return lastB - lastA;
        if (lastA) return -1;
        if (lastB) return 1;
        return 0;
    });

    return (
        <div className="center-panel">
            <h2 className="title" style={{ color: 'var(--neon-orange)' }}>NORMATIVA Y LEGAL</h2>
            <div className="card" style={{ border: '2px solid var(--neon-orange)', marginBottom: 20 }}>
                <h3>Estado de Cumplimiento</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center' }}>
                    <div style={{ padding: 10, background: 'rgba(0, 255, 0, 0.1)', border: '1px solid var(--neon-green)', borderRadius: 8 }}>
                        <div style={{ fontSize: '2rem' }}>{validCount}</div>
                        <div style={{ color: 'var(--neon-green)' }}>Vigente</div>
                    </div>
                    <div style={{ padding: 10, background: 'rgba(255, 165, 0, 0.1)', border: '1px solid orange', borderRadius: 8 }}>
                        <div style={{ fontSize: '2rem' }}>{warningCount}</div>
                        <div style={{ color: 'orange' }}>Proximo / Vence hoy</div>
                    </div>
                    <div style={{ padding: 10, background: 'rgba(255, 0, 0, 0.1)', border: '1px solid red', borderRadius: 8 }}>
                        <div style={{ fontSize: '2rem' }}>{expiredCount}</div>
                        <div style={{ color: 'red' }}>CADUCADO</div>
                    </div>
                    <div style={{ padding: 10, background: 'rgba(0, 191, 255, 0.1)', border: '1px solid var(--neon-cyan)', borderRadius: 8 }}>
                        <div style={{ fontSize: '2rem' }}>{manualCount}</div>
                        <div style={{ color: 'var(--neon-cyan)' }}>Sin fecha / por horas</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
                {sortedPlans.length > 0 ? (
                    sortedPlans.map((plan) => {
                        return (
                            <div key={plan.id} style={{ background: '#111', padding: 15, borderLeft: `6px solid ${plan.legalState.borderColor}`, border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: plan.legalState.borderColor }}>{plan.task_description}</div>
                                    <div style={{ color: '#aaa' }}>{plan.legalState.summary}</div>
                                </div>
                                <div>
                                    <button onClick={() => onManagePlan(plan)} className="btn-manual" style={{ marginRight: 10 }}>gestionar</button>
                                    <button onClick={() => onOpenHistory(plan)} className="btn-manual" style={{ borderColor: 'var(--neon-orange)', color: 'white' }}>CERTIFICADOS</button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No hay planes marcados como "Normativa".</div>
                )}
            </div>
        </div>
    );
}
