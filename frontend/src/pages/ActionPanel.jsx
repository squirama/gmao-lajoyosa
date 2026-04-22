import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Clock from '../components/Clock';
// import '../styles/main.css'; // Comenta esto si no tienes el archivo, o déjalo si existe.

export default function ActionPanel({ context }) {
    const DOCUMENTARY_STEP_TYPES = {
        CHECK: 'CHECK',
        TEXT: 'TEXT',
        LONG_TEXT: 'LONG_TEXT',
        NUMBER: 'NUMBER',
        DATE: 'DATE',
    };
    const ISO_CLASSIFICATIONS = [
        { value: 'CORRECTION', label: 'Correccion puntual' },
        { value: 'CORRECTIVE_ACTION', label: 'Accion correctiva' },
        { value: 'IMPROVEMENT_OPPORTUNITY', label: 'Oportunidad de mejora' },
        { value: 'TECHNICAL_CHANGE', label: 'Cambio tecnico realizado' },
    ];
    const ISO_IMPACTS = [
        { value: 'NONE', label: 'Sin impacto' },
        { value: 'POTENTIAL', label: 'Impacto potencial' },
        { value: 'CONFIRMED', label: 'Impacto confirmado' },
    ];

    const [availableTasks, setAvailableTasks] = useState([]);
    const [selectedTasks, setSelectedTasks] = useState({});
    const [users, setUsers] = useState([]);
    // Auto-assign operator from logged-in user context
    const [operator, setOperator] = useState(context.user?.id || "");
    const [maintenanceObservation, setMaintenanceObservation] = useState("");
    const [failureCause, setFailureCause] = useState("");
    const [solution, setSolution] = useState(""); // New state for solution
    const [duration, setDuration] = useState(0); // New state for duration
    const [loading, setLoading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]); // Nuevo estado para archivos adjuntos

    // Inventory state
    const [inventory, setInventory] = useState([]);
    const [consumedParts, setConsumedParts] = useState([]); // [{ spare_part_id, quantity, name }]
    const [inventorySearch, setInventorySearch] = useState("");
    const [selectedPartId, setSelectedPartId] = useState("");
    const [selectedPartQty, setSelectedPartQty] = useState(1);
    const [openPlanDocuments, setOpenPlanDocuments] = useState({});
    const [improvementMeta, setImprovementMeta] = useState({
        classification: 'CORRECTION',
        impact_level: 'NONE',
        probable_cause: '',
        preventive_action: '',
        follow_up_required: false,
    });
    const normalizedSolution = String(solution || '').trim();
    const requiresOpenFollowUp = improvementMeta.follow_up_required || normalizedSolution.length === 0;

    const resolvePlanDocumentLabel = (document) => {
        if (document?.document_name) return document.document_name;
        if (document?.document_type) return document.document_type;
        if (document?.document_path) {
            const segments = String(document.document_path).split('/');
            return segments[segments.length - 1] || 'VER DOCUMENTO';
        }
        return 'VER DOCUMENTO';
    };

    const navigate = useNavigate();

    const compatibleInventory = inventory.filter((part) => {
        const isUniversal = !part.compatible_assets || part.compatible_assets.length === 0;
        const isCompatible = part.compatible_assets && part.compatible_assets.includes(context.asset?.id);
        return part.active && (isUniversal || isCompatible);
    });

    const filteredInventory = compatibleInventory.filter((part) => {
        const query = inventorySearch.trim().toLowerCase();
        if (!query) return true;
        const haystack = `${part.part_number || ''} ${part.name || ''}`.toLowerCase();
        return haystack.includes(query);
    });

    const addConsumedPart = () => {
        const partId = parseInt(selectedPartId, 10);
        const qty = parseInt(selectedPartQty, 10);

        if (!partId || qty <= 0) return;

        const part = inventory.find((item) => item.id === partId);
        if (!part) return;

        setConsumedParts((prev) => [...prev, {
            id: part.id,
            name: part.name,
            part_number: part.part_number,
            qty,
        }]);
        setSelectedPartId("");
        setSelectedPartQty(1);
    };

    const updateTaskState = (planId, updater) => {
        setSelectedTasks((prev) => {
            const current = prev[planId] || {
                checked: false,
                alert: false,
                comment: '',
                scheduledDate: null,
                stepResponses: {},
            };
            return {
                ...prev,
                [planId]: updater(current),
            };
        });
    };

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
    const toggleTask = (planId, scheduledDate = null) => {
        updateTaskState(planId, (current) => ({
            ...current,
            checked: !current.checked,
            scheduledDate: scheduledDate || current.scheduledDate || null,
            stepResponses: current.stepResponses || {},
        }));
    };

    // Handle Alert Toggle
    const toggleAlert = (planId, e) => {
        e.stopPropagation();
        updateTaskState(planId, (current) => ({
            ...current,
            alert: !current.alert,
            checked: true,
            stepResponses: current.stepResponses || {},
        }));
    };

    const updateDocumentaryResponse = (planId, stepId, value) => {
        updateTaskState(planId, (current) => ({
            ...current,
            stepResponses: {
                ...(current.stepResponses || {}),
                [stepId]: value,
            },
        }));
    };

    const isDocumentaryValueFilled = (step, value) => {
        if (!step?.required) return true;
        if (step.step_type === DOCUMENTARY_STEP_TYPES.CHECK) {
            return value === true || value === false;
        }
        if (step.step_type === DOCUMENTARY_STEP_TYPES.NUMBER) {
            return value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value));
        }
        return value !== '' && value !== null && value !== undefined;
    };

    const renderDocumentaryStepInput = (plan, step, currentValue) => {
        if (step.step_type === DOCUMENTARY_STEP_TYPES.CHECK) {
            return (
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <label className="admin-toggle" style={{ margin: 0 }}>
                        <input
                            type="radio"
                            name={`doc-step-${plan.id}-${step.id}`}
                            checked={currentValue === true}
                            onChange={() => updateDocumentaryResponse(plan.id, step.id, true)}
                        />
                        <span className="hmi-label">SI</span>
                    </label>
                    <label className="admin-toggle" style={{ margin: 0 }}>
                        <input
                            type="radio"
                            name={`doc-step-${plan.id}-${step.id}`}
                            checked={currentValue === false}
                            onChange={() => updateDocumentaryResponse(plan.id, step.id, false)}
                        />
                        <span className="hmi-label">NO</span>
                    </label>
                </div>
            );
        }

        if (step.step_type === DOCUMENTARY_STEP_TYPES.LONG_TEXT) {
            return (
                <textarea
                    className="hmi-textarea"
                    style={{ marginTop: '8px', height: '80px' }}
                    value={currentValue || ''}
                    onChange={(e) => updateDocumentaryResponse(plan.id, step.id, e.target.value)}
                />
            );
        }

        return (
            <input
                type={step.step_type === DOCUMENTARY_STEP_TYPES.NUMBER ? 'number' : step.step_type === DOCUMENTARY_STEP_TYPES.DATE ? 'date' : 'text'}
                className="operator-select"
                style={{ width: '100%', marginTop: '8px' }}
                value={currentValue ?? ''}
                onChange={(e) => updateDocumentaryResponse(plan.id, step.id, e.target.value)}
            />
        );
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
                const planSteps = Array.isArray(plan?.document_steps) ? plan.document_steps : [];
                return {
                    plan_id: plan ? plan.id : null,
                    description: plan ? plan.task_description : "Tarea Desconocida",
                    checked: true,
                    alert: val.alert,
                    comment: val.comment,
                    scheduled_date: val.scheduledDate || null,
                    step_responses: planSteps
                        .map((step) => ({
                            step_id: step.id,
                            value: (val.stepResponses || {})[step.id],
                        }))
                        .filter((response) => response.value !== undefined),
                };
            });

        if (!isGeneralBreakdown && validTasks.length === 0) {
            alert("⚠️ Seleccione al menos una tarea de mantenimiento.");
            return;
        }

        if (isGeneralBreakdown && !failureCause.trim()) {
            alert("⚠️ Para 'AVERIA O CORRECTIVO', debe indicar la causa de la averia.");
            return;
        }

        for (const task of validTasks) {
            const plan = availableTasks.find((item) => item.id === task.plan_id);
            if (!plan?.is_documentary) continue;

            const missingStep = (Array.isArray(plan.document_steps) ? plan.document_steps : []).find((step) => {
                const value = (selectedTasks[plan.id]?.stepResponses || {})[step.id];
                return !isDocumentaryValueFilled(step, value);
            });

            if (missingStep) {
                alert(`Complete el paso obligatorio "${missingStep.title}" antes de guardar.`);
                return;
            }
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

            // 1. Log General Breakdown if needed
            if (isGeneralBreakdown) {
                await axios.post('/api/log', {
                    asset_id: context.asset.id,
                    user_id: operator,
                    failure_cause: failureCause,
                    duration_minutes: parseInt(duration), // Send duration for general breakdown too
                    solution: solution,
                    document_path: documentPath,
                    classification: improvementMeta.classification,
                    impact_level: improvementMeta.impact_level,
                    probable_cause: improvementMeta.probable_cause,
                    preventive_action: improvementMeta.preventive_action,
                    follow_up_required: requiresOpenFollowUp,
                    tasks: [{
                        description: "AVERÍA GENERAL / MANTENIMIENTO CORRECTIVO",
                        checked: true,
                        alert: true,
                        comment: ''
                    }],
                    consumed_parts: consumedParts.map(p => ({ spare_part_id: p.id, quantity: p.qty }))
                });
            }

            // 2. Complete Selected Plans (Green in Calendar)
            // We iterate validTasks and call the specific complete endpoint for each
            // This ensures logic for Next Due Date and History is executed server-side
            for (const task of validTasks) {
                if (task.plan_id) {
                    const combinedNotes = String(maintenanceObservation || '').trim() || 'Completado desde App';

                    await axios.post(`/api/admin/maintenance-plans/${task.plan_id}/complete`, {
                        operator_id: operator,
                        notes: combinedNotes,
                        solution: solution,
                        alert: task.alert,
                        scheduled_date: task.scheduled_date,
                        document_path: documentPath, // Guardar el archivo adjunto
                        consumed_parts: consumedParts.map(p => ({ spare_part_id: p.id, quantity: p.qty })),
                        step_responses: task.step_responses,
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
            toggleTask(alert.plan_id, alert.scheduled_date);
            alert("Tarea seleccionada en la lista principal.");
            setShowAlertsModal(false);
        } else {
            window.confirm(`Esta alerta es para la máquina: ${alert.asset_name}. ¿Desea cambiar de máquina?`);
        }
    };

    const togglePlanDocuments = (planId, event) => {
        event.stopPropagation();
        setOpenPlanDocuments((current) => ({
            ...current,
            [planId]: !current[planId],
        }));
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
                <div className="tasks-container action-panel-tasks action-panel-section-card" style={{
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
                            const state = selectedTasks[plan.id] || { checked: false, alert: false, stepResponses: {} };

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
                                    padding: '10px',
                                    borderBottom: '1px solid #222',
                                    background: state.checked ? '#0a2a0a' : 'transparent'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
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
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '10px'
                                    }}>
                                        <span>{plan.task_description}</span>

                                        {plan.is_documentary && (
                                            <span style={{
                                                color: 'var(--neon-purple)',
                                                fontWeight: 'bold',
                                                fontSize: '0.75rem',
                                                background: 'rgba(128, 0, 128, 0.12)',
                                                padding: '2px 8px',
                                                borderRadius: '999px'
                                            }}>
                                                PLAN DOCUMENTAL
                                            </span>
                                        )}

                                        {plan.is_calibration && (
                                            <span style={{
                                                color: '#f97316',
                                                fontWeight: 'bold',
                                                fontSize: '0.75rem',
                                                background: 'rgba(249, 115, 22, 0.12)',
                                                padding: '2px 8px',
                                                borderRadius: '999px'
                                            }}>
                                                CALIBRACION
                                            </span>
                                        )}

                                        {/* Inyectamos la fecha aquí */}
                                        {isScheduled && (
                                            <span style={{
                                                color: dateColor,
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                background: '#222',
                                                padding: '2px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                {dateText}
                                            </span>
                                        )}

                                        {Array.isArray(plan.reference_documents) && plan.reference_documents.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={(e) => togglePlanDocuments(plan.id, e)}
                                                className="action-panel-plan-doc-trigger"
                                                title={`Documentos del plan: ${plan.reference_documents.length}`}
                                                aria-label={`Ver documentos del plan ${plan.task_description}`}
                                            >
                                                <span className="action-panel-plan-doc-icon" aria-hidden="true">📄</span>
                                                <span className="action-panel-plan-doc-label">DOC</span>
                                                <span className="action-panel-plan-doc-count">{plan.reference_documents.length}</span>
                                            </button>
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

                                    {Array.isArray(plan.reference_documents) && plan.reference_documents.length > 0 && openPlanDocuments[plan.id] && (
                                        <div className="action-panel-plan-documents">
                                            {plan.reference_documents.map((document) => (
                                                <a
                                                    key={`plan-doc-${plan.id}-${document.id}`}
                                                    className="btn-manual action-panel-plan-document-link"
                                                    href={document.document_path}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {resolvePlanDocumentLabel(document)}
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {state.checked && plan.is_documentary && Array.isArray(plan.document_steps) && plan.document_steps.length > 0 && (
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '12px',
                                            border: '1px solid rgba(128, 0, 128, 0.35)',
                                            borderRadius: '8px',
                                            background: 'rgba(128, 0, 128, 0.06)'
                                        }}>
                                            <div style={{ color: 'var(--neon-purple)', fontWeight: 'bold', marginBottom: '10px' }}>
                                                Checklist del plan
                                            </div>
                                            {plan.document_steps.map((step, stepIndex) => {
                                                const currentValue = (state.stepResponses || {})[step.id];
                                                const missingRequired = !isDocumentaryValueFilled(step, currentValue);
                                                return (
                                                    <div key={`task-step-${plan.id}-${step.id}`} style={{ marginBottom: '14px' }}>
                                                        <label className="hmi-label" style={{ color: missingRequired ? '#fca5a5' : '#ddd' }}>
                                                            {stepIndex + 1}. {step.title}{step.required ? ' *' : ''}
                                                        </label>
                                                        {renderDocumentaryStepInput(plan, step, currentValue)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                </div>
                            );
                        })
                    )}
                </div>

                <div className="action-panel-section-card" style={{
                    marginTop: '12px',
                    padding: '12px',
                    border: '1px solid rgba(249, 115, 22, 0.35)',
                    borderRadius: '8px',
                    background: 'rgba(249, 115, 22, 0.06)'
                }}>
                    <label className="hmi-label" style={{ color: 'var(--neon-orange)', display: 'block', marginBottom: '8px' }}>
                        Observacion del mantenimiento realizado
                    </label>
                    <textarea
                        className="hmi-textarea"
                        placeholder="Anade una observacion general del mantenimiento preventivo si procede..."
                        value={maintenanceObservation}
                        onChange={(e) => setMaintenanceObservation(e.target.value)}
                        style={{ height: '72px' }}
                    />
                </div>

                <div className="action-panel-primary-submit" style={{ width: '100%', marginTop: '16px' }}>
                    <button
                        className="btn-accent"
                        style={{ width: '100%', margin: '0 auto', display: 'block', minHeight: '96px', padding: '20px 24px', background: 'var(--neon-green)', color: 'black', fontWeight: 'bold', fontSize: '1.2rem' }}
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                    >
                        GUARDAR TAREAS REALIZADAS
                    </button>
                </div>

                {/* Breakdown details and execution data */}
                <div className="action-panel-details action-panel-section-card" style={{ borderTop: '1px solid #333', paddingTop: '20px' }}>
                    <label className="hmi-label" style={{ color: 'var(--neon-red)' }}>
                        CAUSA DE LA AVERIA:
                    </label>
                    <textarea
                        className="hmi-textarea"
                        placeholder="Indica la causa o descripcion de la averia. Este campo es solo para correctivos."
                        value={failureCause}
                        onChange={e => setFailureCause(e.target.value)}
                        style={{ height: '80px', borderColor: 'var(--neon-red)' }}
                    />

                    <label className="hmi-label" style={{ color: 'var(--neon-green)', marginTop: '10px' }}>
                        SOLUCION APLICADA:
                    </label>
                    <textarea
                        className="hmi-textarea"
                        placeholder="Indica la solucion aplicada si procede..."
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
                            <label className="hmi-label" style={{ color: 'var(--neon-purple)', display: 'block' }}>Adjuntar documento / foto:</label>
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
                </div>

                <div className="action-panel-details action-panel-section-card" style={{ borderTop: '1px solid #333', paddingTop: '20px', marginTop: '20px' }}>
                    <label className="hmi-label" style={{ color: 'var(--neon-cyan)' }}>
                        EVALUACION ISO / MEJORA (AVERIA O CORRECTIVO):
                    </label>
                    <div style={{ color: requiresOpenFollowUp ? '#fca5a5' : '#9ae6b4', marginTop: '10px', fontSize: '0.95rem' }}>
                        {requiresOpenFollowUp
                            ? 'Si no indicas solucion, la averia quedara abierta en Admin > Correctivos hasta que alguien la cierre.'
                            : 'Con solucion indicada y sin seguimiento manual, el registro quedara cerrado al guardar.'}
                    </div>
                    <div className="admin-form-grid" style={{ marginTop: '12px' }}>
                        <div>
                            <label className="hmi-label">Tipo de cierre</label>
                            <select
                                className="operator-select admin-field"
                                value={improvementMeta.classification}
                                onChange={e => setImprovementMeta(current => ({ ...current, classification: e.target.value }))}
                            >
                                {ISO_CLASSIFICATIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="hmi-label">Impacto inocuidad / calidad</label>
                            <select
                                className="operator-select admin-field"
                                value={improvementMeta.impact_level}
                                onChange={e => setImprovementMeta(current => ({ ...current, impact_level: e.target.value }))}
                            >
                                {ISO_IMPACTS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-field--full">
                            <label className="hmi-label">Causa probable</label>
                            <textarea
                                className="hmi-textarea"
                                placeholder="Que ha originado la averia o que debilidad se ha detectado..."
                                value={improvementMeta.probable_cause}
                                onChange={e => setImprovementMeta(current => ({ ...current, probable_cause: e.target.value }))}
                                style={{ height: '80px' }}
                            />
                        </div>
                        <div className="admin-field--full">
                            <label className="hmi-label">Medida preventiva / mejora</label>
                            <textarea
                                className="hmi-textarea"
                                placeholder="Que accion ayuda a evitar recurrencia o que mejora se propone..."
                                value={improvementMeta.preventive_action}
                                onChange={e => setImprovementMeta(current => ({ ...current, preventive_action: e.target.value }))}
                                style={{ height: '80px' }}
                            />
                        </div>
                        <div className="admin-field--full">
                            <label className="admin-toggle">
                                <input
                                    type="checkbox"
                                    checked={improvementMeta.follow_up_required}
                                    onChange={e => setImprovementMeta(current => ({ ...current, follow_up_required: e.target.checked }))}
                                />
                                <span>Dejar abierta para seguimiento posterior</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Inventario / Repuestos */}
                <div className="action-panel-inventory-box action-panel-section-card" style={{ width: '100%', maxWidth: '940px', boxSizing: 'border-box', margin: '25px auto 0', padding: '15px', border: '1px solid var(--neon-purple)', borderRadius: '8px', background: 'rgba(128, 0, 128, 0.05)' }}>
                    <label className="hmi-label" style={{ color: 'var(--neon-purple)', marginBottom: '10px' }}>Repuestos utilizados:</label>

                    <div className="action-panel-inventory-search" style={{ marginBottom: '12px' }}>
                        <input
                            type="text"
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder="Buscar repuesto por referencia o nombre..."
                            className="operator-select"
                        />
                    </div>

                    <div className="action-panel-inventory-row" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <select
                            value={selectedPartId}
                            onChange={(e) => setSelectedPartId(e.target.value)}
                            className="operator-select"
                            style={{ flex: 1, maxWidth: '100%' }}
                        >
                            <option value="">-- Buscar / Seleccionar Repuesto --</option>
                            {filteredInventory.map(p => (
                                <option key={p.id} value={p.id}>{p.part_number} - {p.name} (Stock: {p.stock_current})</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="1"
                            value={selectedPartQty}
                            onChange={(e) => setSelectedPartQty(e.target.value)}
                            style={{ width: '80px', textAlign: 'center', background: '#222', color: 'white', border: '1px solid #444' }}
                        />
                        <button
                            className="hmi-btn" style={{ padding: '0 20px', background: '#444' }}
                            onClick={(e) => {
                                e.preventDefault();
                                addConsumedPart();
                            }}
                        >
                            AÑADIR
                        </button>
                    </div>

                    {inventorySearch.trim() !== '' && (
                        <div style={{ color: '#9fb0bf', fontSize: '0.9rem', marginBottom: '10px' }}>
                            {filteredInventory.length} repuestos coinciden con la busqueda.
                        </div>
                    )}

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

                <div className="action-panel-submit-row" style={{ marginTop: '25px' }}>
                    <button
                        className="btn-danger"
                        style={{ width: '100%', margin: '0 auto', display: 'block', minHeight: '96px', padding: '20px 24px' }}
                        onClick={() => handleSubmit(true)}
                        disabled={loading}
                    >
                        REGISTRAR AVERIA / CORRECTIVO
                    </button>
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

