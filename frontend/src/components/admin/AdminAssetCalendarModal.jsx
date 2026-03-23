import React from 'react';
import { generatePlanProjections } from '../../utils/adminPanelUtils';

export default function AdminAssetCalendarModal({
    asset,
    onClose,
    plans,
}) {
    if (!asset) return null;

    const assetPlans = Array.isArray(plans)
        ? plans.filter((plan) => plan.asset_id === asset.id)
        : [];
    const projections = generatePlanProjections(assetPlans);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="card" style={{ width: 800, maxHeight: '80vh', overflowY: 'auto', border: '2px solid var(--neon-purple)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2>Calendario: {asset.name}</h2>
                    <button onClick={onClose} className="btn-danger" style={{ width: 'auto', padding: '10px 20px' }}>CERRAR</button>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                    {projections.length > 0 ? projections.map((event, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', padding: 15, background: '#222', borderLeft: '4px solid var(--neon-purple)' }}>
                            <div style={{ minWidth: 120, fontWeight: 'bold', color: 'white', fontSize: '1.1rem' }}>{event.date.toLocaleDateString()}</div>
                            <div style={{ flex: 1, color: '#ddd', fontSize: '1.1rem' }}>{event.task}</div>
                            <div style={{ color: '#aaa', fontSize: '0.9rem' }}>Cada {event.freq} dias</div>
                        </div>
                    )) : <div>Error cargando planes</div>}
                </div>
            </div>
        </div>
    );
}
