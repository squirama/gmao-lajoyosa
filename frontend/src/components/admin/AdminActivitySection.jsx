import React from 'react';

export default function AdminActivitySection({
    activityError,
    activityLoading,
    activitySummary,
    activityUsers,
    onRefresh,
    recentActivity,
    recentLogins,
}) {
    if (activityLoading) return <div style={{ padding: '2rem', color: '#aaa' }}>Cargando actividad...</div>;
    if (activityError) return (
        <div style={{ padding: '2rem' }}>
            <p style={{ color: '#f1948a' }}>{activityError}</p>
            <button onClick={onRefresh} style={{ marginTop: '1rem', padding: '8px 16px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Reintentar
            </button>
        </div>
    );

    return (
        <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: '#f39c12', margin: 0 }}>Actividad del sistema</h2>
                <button onClick={onRefresh} style={{ padding: '8px 16px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    Actualizar
                </button>
            </div>

            {activitySummary && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {Object.entries(activitySummary).map(([key, value]) => (
                        <div key={key} style={{ background: '#1e272e', border: '1px solid #3b4650', borderRadius: '8px', padding: '1rem 1.5rem', minWidth: '140px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f39c12' }}>{value}</div>
                            <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '4px' }}>{key}</div>
                        </div>
                    ))}
                </div>
            )}

            {recentActivity && recentActivity.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ color: '#ccc', marginBottom: '1rem' }}>Actividad reciente</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {recentActivity.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #2c3e50' }}>
                                    <td style={{ padding: '8px', color: '#aaa', fontSize: '0.85rem' }}>{item.created_at?.slice(0, 10)}</td>
                                    <td style={{ padding: '8px', color: '#eee' }}>{item.description || item.global_comment || JSON.stringify(item)}</td>
                                    <td style={{ padding: '8px', color: '#7fb3d3' }}>{item.user_name || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(!recentActivity || recentActivity.length === 0) && !activityLoading && (
                <p style={{ color: '#aaa' }}>No hay actividad reciente registrada.</p>
            )}
        </div>
    );
}
