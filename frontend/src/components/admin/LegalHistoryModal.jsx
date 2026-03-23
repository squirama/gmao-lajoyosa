import React, { useState } from 'react';
import axios from 'axios';
import { parseDocumentPaths } from '../../utils/documentPaths';

export default function LegalHistoryModal({
    authHeader,
    currentUserId,
    fetchHistory,
    historyData,
    historyPlan,
    onClose,
    onRefreshConfig,
}) {
    const [uploadFiles, setUploadFiles] = useState([]);

    if (!historyPlan) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (uploadFiles.length === 0) {
            alert('Selecciona al menos un documento PDF/Imagen.');
            return;
        }

        if (!window.confirm('¿Confirmar registro y subida de documentos?')) {
            return;
        }

        try {
            const formData = new FormData();
            uploadFiles.forEach((file) => formData.append('file', file));

            const uploadResponse = await axios.post(
                `/api/admin/plans/${historyPlan.id}/upload`,
                formData,
                { headers: { Authorization: authHeader, 'Content-Type': 'multipart/form-data' } }
            );

            if (!uploadResponse.data.success) {
                throw new Error('Error subiendo archivos');
            }

            const documentPath = JSON.stringify(uploadResponse.data.files.map((file) => file.url));
            const notes = window.prompt('Notas de la revisión (Opcional):', 'Revisión Externa Completada');

            await axios.post(
                `/api/admin/maintenance-plans/${historyPlan.id}/complete`,
                {
                    operator_id: currentUserId,
                    notes,
                    document_path: documentPath,
                },
                { headers: { Authorization: authHeader } }
            );

            alert('✅ Revisión registrada y documentos archivados.');
            setUploadFiles([]);
            await fetchHistory(historyPlan.id);
            await onRefreshConfig();
        } catch (error) {
            alert(`Error: ${error.response?.data?.error || error.message}`);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="card" style={{ width: 900, maxHeight: '90vh', overflowY: 'auto', border: '2px solid var(--neon-orange)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ color: 'var(--neon-orange)', marginTop: 0 }}>📂 Archivo Legal: {historyPlan.task_description}</h2>
                        <div style={{ color: '#aaa' }}>Historial de revisiones y certificados de cumplimiento</div>
                    </div>
                    <button onClick={onClose} className="btn-danger" style={{ width: 'auto', padding: '10px 20px', height: 'fit-content' }}>CERRAR</button>
                </div>

                <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 8, marginBottom: 20, borderTop: '1px solid #333' }}>
                    <h3 style={{ marginTop: 0, color: 'white' }}>➕ Registrar Nueva Revisión / Subir Certificado</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input
                                type="file"
                                multiple
                                onChange={(event) => setUploadFiles(Array.from(event.target.files))}
                                style={{ color: 'white' }}
                                accept=".pdf,.jpg,.png,.doc,.docx"
                                required
                            />
                            {uploadFiles.length > 0 && (
                                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                    {uploadFiles.length} archivos seleccionados
                                </div>
                            )}
                            <button className="hmi-btn" style={{ background: 'var(--neon-orange)', color: 'black', fontWeight: 'bold' }}>
                                SUBIR Y REGISTRAR
                            </button>
                        </div>
                    </form>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                    {historyData ? (
                        historyData.length > 0 ? historyData.map((item, index) => (
                            <div key={index} style={{ background: '#111', padding: 15, borderLeft: '4px solid var(--neon-green)', display: 'grid', gridTemplateColumns: '150px 1fr 150px', alignItems: 'center', gap: 15 }}>
                                <div style={{ color: 'white', fontWeight: 'bold' }}>
                                    {item.performed_date ? item.performed_date.split('T')[0] : 'N/A'}
                                </div>
                                <div>
                                    <div style={{ color: '#ccc' }}>{item.notes || 'Sin notas'}</div>
                                    <div style={{ color: '#666', fontSize: '0.8rem' }}>Reg por: {item.operator_name || 'Admin'}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {parseDocumentPaths(item.document_path).length > 0 ? (
                                        parseDocumentPaths(item.document_path).map((path, pathIndex, paths) => (
                                            <a
                                                key={pathIndex}
                                                href={path}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hmi-btn"
                                                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', fontSize: '0.8rem', padding: '5px 10px' }}
                                            >
                                                📄 DOC {paths.length > 1 ? pathIndex + 1 : ''}
                                            </a>
                                        ))
                                    ) : (
                                        <span style={{ color: '#555', fontStyle: 'italic', fontSize: '0.9rem' }}>Sin documento</span>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No hay revisiones registradas aún.</div>
                        )
                    ) : (
                        <div style={{ padding: 20, textAlign: 'center' }}>Cargando historial...</div>
                    )}
                </div>
            </div>
        </div>
    );
}
