import React from 'react';

export default function AdminLegalSection({
    onManagePlan,
    onOpenHistory,
    plans,
}) {
    const legalPlans = Array.isArray(plans)
        ? plans.filter((plan) => plan.is_legal)
        : [];
    const now = new Date();
    const soonThreshold = new Date();
    soonThreshold.setDate(soonThreshold.getDate() + 30);
    const recentThreshold = new Date();
    recentThreshold.setDate(recentThreshold.getDate() - 7);

    const validCount = legalPlans.filter((plan) => new Date(plan.next_due_date) > now).length;
    const warningCount = legalPlans.filter((plan) => {
        const dueDate = new Date(plan.next_due_date);
        return dueDate <= now && dueDate > recentThreshold;
    }).length;
    const expiredCount = legalPlans.filter((plan) => new Date(plan.next_due_date) < now).length;
    const sortedPlans = [...legalPlans].sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));

    return (
        <div className="center-panel">
            <h2 className="title" style={{ color: 'var(--neon-orange)' }}>NORMATIVA Y LEGAL</h2>
            <div className="card" style={{ border: '2px solid var(--neon-orange)', marginBottom: 20 }}>
                <h3>Estado de Cumplimiento</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
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
                </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
                {sortedPlans.length > 0 ? (
                    sortedPlans.map((plan) => {
                        const dueDate = new Date(plan.next_due_date);
                        const isExpired = dueDate < now;
                        const isSoon = !isExpired && dueDate < soonThreshold;
                        const borderColor = isExpired ? 'red' : isSoon ? 'orange' : 'var(--neon-green)';

                        return (
                            <div key={plan.id} style={{ background: '#111', padding: 15, borderLeft: `6px solid ${borderColor}`, border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: borderColor }}>{plan.task_description}</div>
                                    <div style={{ color: '#aaa' }}>{plan.asset_name} | Vence: {plan.next_due_date ? plan.next_due_date.split('T')[0] : 'N/A'}</div>
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
