import React from 'react';

export default function AdminReportsSection({
    assets,
    downloadReport,
    reportAssetId,
    reportEndDate,
    reportStartDate,
    setReportAssetId,
    setReportEndDate,
    setReportStartDate,
}) {
    return (
        <div className="center-panel">
            <div className="card" style={{ border: '2px solid var(--neon-cyan)', marginBottom: 20 }}>
                <h2 className="title" style={{ fontSize: '1.8rem', marginTop: 0 }}>GENERADOR DE INFORMES</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
                    <div>
                        <label className="hmi-label">Fecha Inicio:</label>
                        <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="operator-select" style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label className="hmi-label">Fecha Fin:</label>
                        <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="operator-select" style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label className="hmi-label">Maquina (Opcional):</label>
                        <select value={reportAssetId} onChange={(e) => setReportAssetId(e.target.value)} className="operator-select" style={{ width: '100%' }}>
                            <option value="">-- TODAS --</option>
                            {Array.isArray(assets) && assets.map((asset) => (
                                <option key={asset.id} value={asset.id}>{asset.name} {asset.brand ? `(${asset.brand})` : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                    <div style={{ border: '1px solid var(--neon-green)', padding: 20, borderRadius: 12, background: 'rgba(0, 255, 0, 0.05)' }}>
                        <h3 style={{ color: 'var(--neon-green)', marginTop: 0 }}>PREVENTIVOS (Compliance)</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Listado de mantenimientos programados realizados. Compara fechas y operarios.</p>
                        <button onClick={() => downloadReport('history')} className="hmi-btn" style={{ width: '100%', fontSize: '1rem', padding: 15 }}>
                            DESCARGAR CSV
                        </button>
                    </div>

                    <div style={{ border: '1px solid var(--neon-red)', padding: 20, borderRadius: 12, background: 'rgba(255, 0, 0, 0.05)' }}>
                        <h3 style={{ color: 'var(--neon-red)', marginTop: 0 }}>AVERIAS (Correctivo)</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Intervenciones correctivas con duracion, problema y solucion aplicada.</p>
                        <button onClick={() => downloadReport('interventions')} className="hmi-btn" style={{ width: '100%', fontSize: '1rem', padding: 15, borderColor: 'var(--neon-red)', color: 'white' }}>
                            DESCARGAR CSV
                        </button>
                    </div>

                    <div style={{ border: '1px solid var(--neon-cyan)', padding: 20, borderRadius: 12, background: 'rgba(0, 255, 255, 0.05)' }}>
                        <h3 style={{ color: 'var(--neon-cyan)', marginTop: 0 }}>SOLICITUDES</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Peticiones realizadas por operarios desde planta (Boton Rojo).</p>
                        <button onClick={() => downloadReport('requests')} className="hmi-btn" style={{ width: '100%', fontSize: '1rem', padding: 15, borderColor: 'var(--neon-cyan)', color: 'white' }}>
                            DESCARGAR CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
