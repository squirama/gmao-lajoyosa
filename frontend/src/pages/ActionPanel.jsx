import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Clock from '../components/Clock';
// import '../styles/main.css'; // Comenta esto si no tienes el archivo, o déjalo si existe.

export default function ActionPanel({ context }) {
    const [availableTasks, setAvailableTasks] = useState([]);
    const [selectedTasks, setSelectedTasks] = useState({});
    const [users, setUsers] = useState([]);
    // Auto-assign operator from logged-in user context
    const [operator, setOperator] = useState(context.user?.id || "");
    const [globalComment, setGlobalComment] = useState("");
    const [solution, setSolution] = useState(""); // New state for solution
    const [duration, setDuration] = useState(0); // New state for duration
    const [loading, setLoading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]); // Nuevo estado para archivos adjuntos

    // Inventory state
    const [inventory, setInventory] = useState([]);
    const [consumedParts, setConsumedParts] = useState([]); // [{ spare_part_id, quantity, name }]

    const navigate = useNavigate();

    useEffect(() => {
        if (!context.asset) {
            navigate('/asset');
            return;
        }

        if (context.user) {
            setOperator(context.user.id);
        }

        const fetchData = async () => {
            // ... existing fetch logic ...
            try {
                const plansRes = await axios.get(`/api/config/plans?asset_id=${context.asset.id}`);
                setAvailableTasks(Array.isArray(plansRes.data) ? plansRes.data : []);

                const invRes = await axios.get('/api/inventory');
                // Opt: optionally filter by context.asset.id using the compatible_assets array if needed,
                // but usually operators want to see everything to search. We show all active parts.
                setInventory(invRes.data.filter(p => p.active));
            } catch (err) {
                console.error("Error loading data:", err);
            }
        };
        fetchData();
    }, [context.asset, context.user, navigate]);

    // Handle Checkbox Toggle
    const toggleTask = (planId) => {
        setSelectedTasks(prev => {
            const current = prev[planId] || { checked: false, alert: false, comment: '' };
            return {
                ...prev,
                [planId]: { ...current, checked: !current.checked }
            };
        });
    };

    // Handle Alert Toggle
    const toggleAlert = (planId, e) => {
        e.stopPropagation();
        setSelectedTasks(prev => {
            const current = prev[planId] || { checked: false, alert: false, comment: '' };
            return {
                ...prev,
                [planId]: { ...current, alert: !current.alert, checked: true }
            };
        });
    };

    const handleSubmit = async (isGeneralBreakdown = false) => {
        if (!operator) {
            alert("⚠️ POR FAVOR, SELECCIONE UN OPERARIO.");
            return;
        }

        const validTasks = Object.entries(selectedTasks)
            .filter(([_, val]) => val.checked)
            .map(([id, val]) => {
                const plan = availableTasks.find(p => p.id === parseInt(id));
                return {
                    plan_id: plan ? plan.id : null,
                    description: plan ? plan.task_description : "Tarea Desconocida",
                    checked: true,
                    alert: val.alert,
                    comment: val.comment
                };
            });

        if (!isGeneralBreakdown && validTasks.length === 0 && !globalComment) {
            alert("⚠️ Seleccione al menos una tarea o escriba un comentario global.");
            return;
        }

        if (isGeneralBreakdown && !globalComment) {
            alert("⚠️ Para 'AVERÍA O CORRECTIVO', debe escribir un comentario global.");
            return;
        }

        if (!window.confirm("¿CONFIRMAR REGISTRO?")) return;

        setLoading(true);
        try {
            let documentPaths = [];
            if (uploadFiles && uploadFiles.length > 0) {
                const firstPlanId = (validTasks.length > 0 && validTasks[0].plan_id) ? validTasks[0].plan_id : 0;
                const fd = new FormData();
                for (let i = 0; i < uploadFiles.length; i++) {
                    fd.append('file', uploadFiles[i]);
                }
                
                try {
                    const resUpload = await axios.post(`/api/admin/plans/${firstPlanId}/upload`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (resUpload.data && resUpload.data.success) {
                        // Backend now returns an array of files: { filename, url }
                        documentPaths = resUpload.data.files.map(f => f.url);
                    }
                } catch (uploadErr) {
                    console.error("Error subiendo archivos:", uploadErr);
                    alert("⚠️ Ocurrió un error al subir los archivos, pero se intentará guardar el registro.");
                }
            }

            // Convert array to JSON string for storage in the single TEXT column
            const documentPath = documentPaths.length > 0 ? JSON.stringify(documentPaths) : null;

            const payload = {
                asset_id: context.asset.id,
                user_id: operator,
                global_comment: globalComment,
                duration_minutes: parseInt(duration),
                solution: solution,
                document_path: documentPath,
                tasks: validTasks,
                consumed_parts: consumedParts.map(p => ({ spare_part_id: p.id, quantity: p.qty }))
            };

            // 1. Log General Breakdown if needed
            if (isGeneralBreakdown) {
                await axios.post('/api/log', {
                    asset_id: context.asset.id,
                    user_id: operator,
                    global_comment: globalComment,
                    duration_minutes: parseInt(duration), // Send duration for general breakdown too
                    solution: solution, // <--- ADDED THIS LINE
                    document_path: documentPath,
                    tasks: [{
                        description: "AVERÍA GENERAL / MANTENIMIENTO CORRECTIVO",
                        checked: true,
                        alert: true,
                        comment: globalComment
                    }],
                    consumed_parts: consumedParts.map(p => ({ spare_part_id: p.id, quantity: p.qty }))
                });
            }

            // 2. Complete Selected Plans (Green in Calendar)
            // We iterate validTasks and call the specific complete endpoint for each
            // This ensures logic for Next Due Date and History is executed server-side
            for (const task of validTasks) {
                if (task.plan_id) {
                    // Combine specific task comment and global comment
                    const combinedNotes = [task.comment, globalComment].filter(Boolean).join(' | ') || 'Completado desde App';

                    await axios.post(`/api/admin/maintenance-plans/${task.plan_id}/complete`, {
                        operator_id: operator,
                        notes: combinedNotes,
                        alert: task.alert,
                        document_path: documentPath, // Guardar el archivo adjunto
                        consumed_parts: consumedParts.map(p => ({ spare_part_id: p.id, quantity: p.qty }))
                    });
                } else {
                    // Legacy/Ad-hoc task logging if any (though we filtered by plan_id usually)
                }
            }

            alert("✅ REGISTRO GUARDADO CORRECTAMENTE");
            navigate('/');
        } catch (e) {
            console.error(e);
            alert("❌ ERROR AL GUARDAR: " + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    const openManual = () => {
        if (context.asset.manual_filename) {
            window.open(`http://localhost:3000/manuals/${context.asset.manual_filename}`, '_blank');
        } else {
            alert("NO HAY MANUAL DISPONIBLE");
        }
    };

    const [alerts, setAlerts] = useState([]);
    const [showAlertsModal, setShowAlertsModal] = useState(false);
    const [postponeData, setPostponeData] = useState({ alert_id: null, new_date: '', reason: '' });

    // Fetch Alerts
    useEffect(() => {
        if (context.asset) {
            axios.get(`/api/alerts/pending?dept_id=${context.asset.dept_id}`)
                .then(res => setAlerts(res.data))
                .catch(console.error);
        }
    }, [context.asset]);

    const handlePostponeSubmit = async () => {
        if (!postponeData.new_date || !postponeData.reason) return alert("Falta fecha o motivo");
        try {
            await axios.post('/api/alerts/postpone', {
                alert_id: postponeData.alert_id,
                new_date: postponeData.new_date,
                reason: postponeData.reason,
                user_id: operator
            });
            alert("✅ Tarea Pospuesta");
            setShowAlertsModal(false);
            setPostponeData({ alert_id: null, new_date: '', reason: '' });
            const res = await axios.get(`/api/alerts/pending?dept_id=${context.asset.dept_id}`);
            setAlerts(res.data);
        } catch (e) {
            alert("❌ Error: " + (e.response?.data?.error || e.message));
        }
    };

    const handleDoAlert = (alert) => {
        if (alert.asset_id === context.asset.id) {
            toggleTask(alert.plan_id);
            alert("Tarea seleccionada en la lista principal.");
            setShowAlertsModal(false);
        } else {
            window.confirm(`Esta alerta es para la máquina: ${alert.asset_name}. ¿Desea cambiar de máquina?`);
        }
    };

    return (
        <div className="page-container action-panel-page">
            {/* Header */}
            <div className="hmi-header">
                <div className="machine-name">{context.asset?.name || "MÁQUINA NO SELECCIONADA"}</div>

                {alerts.length > 0 && (
                    <button
                        className="btn-danger blink"
                        style={{ padding: '5px 15px', fontSize: '1.2rem', marginRight: '20px' }}
                        onClick={() => setShowAlertsModal(true)}
                    >
                        🔔 {alerts.length} PENDIENTES
                    </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}><Clock /></div>
            </div>

            {/* Modal for Alerts */}
            {showAlertsModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="card action-panel-alert-modal" style={{ width: '80%', maxWidth: '800px', border: '2px solid var(--neon-orange)' }}>
                        <h2 style={{ color: 'var(--neon-orange)', marginTop: 0 }}>⚠️ TAREAS PENDIENTES (DEPARTAMENTO)</h2>

                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {alerts.map(a => (
                                <div key={a.id} className="action-panel-alert-item" style={{ background: '#220', padding: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ color: 'yellow', fontWeight: 'bold' }}>{a.asset_name} - {a.task_description}</div>
                                        <div style={{ color: '#aaa' }}>Fecha Programada: {new Date(a.scheduled_date).toLocaleDateString()}</div>
                                        {a.postpone_count > 0 && <div style={{ color: 'red' }}>Pospuesto {a.postpone_count} veces</div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button className="btn-manual" onClick={() => handleDoAlert(a)}>✅ HACER</button>
                                        <button className="btn-danger" onClick={() => setPostponeData({ ...postponeData, alert_id: a.id })}>⏳ POSPONER</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {postponeData.alert_id && (
                            <div className="action-panel-postpone-box" style={{ marginTop: '20px', padding: '10px', background: '#333' }}>
                                <h3 style={{ marginTop: 0 }}>Posponer Tarea</h3>
                                <input
                                    type="date"
                                    value={postponeData.new_date}
                                    onChange={e => setPostponeData({ ...postponeData, new_date: e.target.value })}
                                    style={{ padding: '10px', marginRight: '10px' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Motivo (Obligatorio)"
                                    value={postponeData.reason}
                                    onChange={e => setPostponeData({ ...postponeData, reason: e.target.value })}
                                    style={{ padding: '10px', width: '300px' }}
                                />
                                <button className="btn-manual" onClick={handlePostponeSubmit}>CONFIRMAR</button>
                                <button className="btn-danger" onClick={() => setPostponeData({ alert_id: null, new_date: '', reason: '' })}>CANCELAR</button>
                            </div>
                        )}

                        <button className="btn-danger" style={{ marginTop: '20px', width: '100%' }} onClick={() => setShowAlertsModal(false)}>CERRAR</button>
                    </div>
                </div>
            )}

            <div className="center-panel action-panel-shell" style={{
                maxWidth: '1000px',
                width: '95%',
                margin: '0 auto',
                paddingBottom: '150px', // Added padding to prevent button overlap
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Manual & Operator */}
                <div className="action-panel-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', width: '100%' }}>
                    <button onClick={openManual} className="btn-manual" style={{ width: 'auto', padding: '10px 30px' }}>
                        📖 MANUAL
                    </button>

                    <div className="action-panel-operator" style={{ flex: 1, textAlign: 'right' }}>
                        <label className="hmi-label" style={{ color: 'var(--neon-cyan)', marginRight: '10px' }}>OPERARIO:</label>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                            {context.user?.full_name || "DESCONOCIDO"}
                        </span>
                    </div>
                </div>

                {/* Task List (Checkboxes) */}
                <div className="tasks-container action-panel-tasks" style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: '#111',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ color: 'var(--neon-green)', marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                        LISTA DE TAREAS (MANTENIMIENTO PREVENTIVO)
                    </h3>

                    {availableTasks.length === 0 ? (
                        <p style={{ color: '#666', textAlign: 'center' }}>No hay tareas planificadas para este activo.</p>
                    ) : (
                        availableTasks.map(plan => {
                            const state = selectedTasks[plan.id] || { checked: false, alert: false };

                            // --- CÁLCULO DE FECHAS (SEMÁFORO) ---
                            // Solo mostramos fecha si tiene frecuencia y fecha próxima definida
                            const isScheduled = plan.frequency_days > 0 && plan.next_due_date;
                            let dateColor = '#666';
                            let dateText = '';

                            if (isScheduled) {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const dueDate = new Date(plan.next_due_date);
                                dueDate.setHours(0, 0, 0, 0);

                                // Formatear fecha (DD/MM)
                                const dateStr = dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

                                if (dueDate < today) {
                                    dateColor = '#ef4444'; // Rojo (Vencido)
                                    dateText = `⚠ VENCIDO (${dateStr})`;
                                } else if (dueDate.getTime() === today.getTime()) {
                                    dateColor = '#facc15'; // Amarillo (Hoy)
                                    dateText = `HOY (${dateStr})`;
                                } else {
                                    dateColor = '#22c55e'; // Verde (Futuro)
                                    dateText = `📅 ${dateStr}`;
                                }
                            }
                            // ------------------------------------

                            return (
                                <div key={plan.id} className="action-panel-task-row" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px',
                                    borderBottom: '1px solid #222',
                                    background: state.checked ? '#0a2a0a' : 'transparent'
                                }}>
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={state.checked}
                                        onChange={() => toggleTask(plan.id)}
                                        style={{ width: '24px', height: '24px', marginRight: '15px', cursor: 'pointer' }}
                                    />

                                    {/* Description + DATE */}
                                    <span className="action-panel-task-text" style={{
                                        flex: 1,
                                        color: state.checked ? 'white' : '#aaa',
                                        fontSize: '1.1rem',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {plan.task_description}

                                        {/* Inyectamos la fecha aquí */}
                                        {isScheduled && (
                                            <span style={{
                                                color: dateColor,
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                marginLeft: '15px',
                                                background: '#222',
                                                padding: '2px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                {dateText}
                                            </span>
                                        )}
                                    </span>

                                    {/* Bell Icon */}
                                    <button
                                        onClick={(e) => toggleAlert(plan.id, e)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            fontSize: '1.5rem',
                                            cursor: 'pointer',
                                            opacity: state.alert ? 1 : 0.3,
                                            filter: state.alert ? 'drop-shadow(0 0 5px red)' : 'none',
                                            transition: 'all 0.3s'
                                        }}
                                        title="Reportar Problema / Alerta"
                                    >
                                        {state.alert ? '🔔' : '🔕'}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Global Comment / General Breakdown */}
                <div style={{ borderTop: '1px solid #333', paddingTop: '20px' }}>
                    <label className="hmi-label" style={{ color: 'var(--neon-orange)' }}>
                        OBSERVACIONES GLOBALES / INCIDENCIA:
                    </label>
                    <textarea
                        className="hmi-textarea"
                        placeholder="Describa el PROBLEMA / AVERÍA..."
                        value={globalComment}
                        onChange={e => setGlobalComment(e.target.value)}
                        style={{ height: '80px' }}
                    />

                    <label className="hmi-label" style={{ color: 'var(--neon-green)', marginTop: '10px' }}>
                        SOLUCIÓN APLICADA:
                    </label>
                    <textarea
                        className="hmi-textarea"
                        placeholder="Describa la SOLUCIÓN aplicada..."
                        value={solution}
                        onChange={e => setSolution(e.target.value)}
                        style={{ height: '80px', borderColor: 'var(--neon-green)' }}
                    />

                    <div className="action-panel-meta-row" style={{ marginTop: '15px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div className="action-panel-duration-box">
                            <label className="hmi-label" style={{ color: 'var(--neon-cyan)', display: 'block' }}>TIEMPO EMPLEADO (MINUTOS):</label>
                            <input
                                type="number"
                                min="0"
                                value={duration}
                                onChange={e => setDuration(e.target.value)}
                                style={{
                                    width: '100px', padding: '10px', background: '#111',
                                    border: '1px solid #333', color: 'white', borderRadius: '6px',
                                    fontSize: '1.2rem', textAlign: 'center'
                                }}
                            />
                        </div>
                        <div className="action-panel-upload-box" style={{ flex: 1, borderLeft: '1px solid #333', paddingLeft: '20px' }}>
                            <label className="hmi-label" style={{ color: 'var(--neon-purple)', display: 'block' }}>📎 ADJUNTAR DOCUMENTO / FOTO (OPCIONAL):</label>
                            <input
                                type="file"
                                onChange={e => setUploadFiles(Array.from(e.target.files))}
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                multiple
                                style={{
                                    width: '100%', padding: '10px', background: '#111',
                                    border: '1px dashed var(--neon-purple)', color: 'white', borderRadius: '6px'
                                }}
                            />
                            {uploadFiles.length > 0 && (
                                <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '5px' }}>
                                    {uploadFiles.length} archivos seleccionados: {uploadFiles.map(f => f.name).join(', ')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECCIÓN INVENTARIO / REPUESTOS */}
                    <div style={{ marginTop: '25px', padding: '15px', border: '1px solid var(--neon-purple)', borderRadius: '8px', background: 'rgba(128, 0, 128, 0.05)' }}>
                        <label className="hmi-label" style={{ color: 'var(--neon-purple)', marginBottom: '10px' }}>📦 REPUESTOS UTILIZADOS (Opcional):</label>

                        <div className="action-panel-inventory-row" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <select id="partSelect" className="operator-select" style={{ flex: 1 }}>
                                <option value="">-- Buscar / Seleccionar Repuesto --</option>
                                {inventory.filter(p => {
                                    // Muestra si la pieza es Universal (sin máquinas asignadas) 
                                    // O si la máquina actual está en la lista de compatibles
                                    const isUniversal = !p.compatible_assets || p.compatible_assets.length === 0;
                                    const isCompatible = p.compatible_assets && p.compatible_assets.includes(context.asset.id);
                                    return isUniversal || isCompatible;
                                }).map(p => (
                                    <option key={p.id} value={p.id}>{p.part_number} - {p.name} (Stock: {p.stock_current})</option>
                                ))}
                            </select>
                            <input id="partQty" type="number" min="1" defaultValue="1" style={{ width: '80px', textAlign: 'center', background: '#222', color: 'white', border: '1px solid #444' }} />
                            <button
                                className="hmi-btn" style={{ padding: '0 20px', background: '#444' }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    const select = document.getElementById('partSelect');
                                    const qtyInput = document.getElementById('partQty');
                                    const partId = parseInt(select.value);
                                    const qty = parseInt(qtyInput.value);

                                    if (!partId || qty <= 0) return;

                                    const part = inventory.find(i => i.id === partId);
                                    if (part) {
                                        setConsumedParts([...consumedParts, { id: part.id, name: part.name, part_number: part.part_number, qty }]);
                                        select.value = '';
                                        qtyInput.value = '1';
                                    }
                                }}
                            >
                                AÑADIR
                            </button>
                        </div>

                        {consumedParts.length > 0 && (
                            <div style={{ background: '#111', padding: '10px', borderRadius: '4px' }}>
                                {consumedParts.map((cp, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', padding: '5px 0' }}>
                                        <span style={{ color: '#ccc' }}>{cp.qty}x {cp.part_number} - {cp.name}</span>
                                        <button
                                            style={{ background: 'transparent', color: 'red', border: 'none', cursor: 'pointer' }}
                                            onClick={(e) => { e.preventDefault(); setConsumedParts(consumedParts.filter((_, i) => i !== idx)); }}
                                        >
                                            ✖
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="action-panel-submit-row" style={{ display: 'flex', gap: '20px', marginTop: '25px' }}>
                        <button
                            className="btn-accent"
                            style={{ flex: 1, background: 'var(--neon-green)', color: 'black', fontWeight: 'bold' }}
                            onClick={() => handleSubmit(false)}
                            disabled={loading}
                        >
                            ✅ GUARDAR TAREAS REALIZADAS
                        </button>

                        <button
                            className="btn-danger"
                            style={{ flex: 1 }}
                            onClick={() => handleSubmit(true)}
                            disabled={loading}
                        >
                            🚨 REGISTRAR AVERÍA GENERAL O CORRECTIVO REALIZADO
                        </button>
                    </div>
                </div>

                {/* Back Link */}
                {/* Back Link Moved to Bottom Nav */}
            </div>

            <div className="bottom-nav">
                <button onClick={() => navigate('/asset')} style={{ background: '#333', color: '#ccc', border: '1px solid #555' }}>
                    Volver
                </button>
                <button
                    onClick={() => navigate(`/calendar?scope=asset&asset_id=${context.asset.id}`)}
                    style={{ background: 'var(--neon-purple)', color: 'white' }}
                >
                    Ver calendario maquina
                </button>
            </div>
        </div>
    );
}

