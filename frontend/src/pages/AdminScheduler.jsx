import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Importaciones para el motor de arrastre
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const DnDCalendar = withDragAndDrop(Calendar);

export default function AdminScheduler({ allPlans, planExceptions, onSelectEvent, onReschedule, authHeader, refreshAll }) {

    const generateEvents = () => {
        if (!allPlans || !Array.isArray(allPlans)) return [];
        let events = [];

        // Helper to match dates ignoring time
        const formatDate = (dateObj) => {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const getExceptionDate = (pId, oDateStr) => {
            if (!planExceptions) return null;
            const ex = planExceptions.find(e => e.plan_id === pId && formatDate(new Date(e.original_date)) === oDateStr);
            return ex ? new Date(ex.new_date) : null;
        };

        allPlans.forEach(plan => {
            if (!plan.next_due_date) return;
            const freq = parseInt(plan.frequency_days) || 0;

            // 1. Evento Real (El próximo vencimiento en DB)
            const nextDue = new Date(plan.next_due_date);
            const nextDueStr = formatDate(nextDue);
            const excNextDue = getExceptionDate(plan.id, nextDueStr);
            const finalNextDue = excNextDue || nextDue;

            events.push({
                id: `${plan.id}-real`,
                title: `${plan.asset_name || 'Desconocido'}: ${plan.task_description}`,
                start: finalNextDue,
                end: finalNextDue,
                allDay: true,
                resource: plan,
                isReal: true,
                isException: !!excNextDue,
                originalDateStr: nextDueStr
            });

            // 2. Proyecciones Futuras (Ghost Events) ONLY IF FREQ > 0
            if (freq > 0) {
                let baseDate = plan.start_date ? new Date(plan.start_date) : nextDue;
                let cycleDate = new Date(baseDate);

                if (plan.start_date) {
                    while (cycleDate <= nextDue) {
                        cycleDate.setDate(cycleDate.getDate() + freq);
                    }
                } else {
                    cycleDate.setDate(cycleDate.getDate() + freq);
                }

                for (let i = 0; i < 12; i++) {
                    // Pre-ajuste: si la progresión matemática cae en Sábado (6) o Domingo (0), mover a Viernes
                    let displayDate = new Date(cycleDate);
                    const dow = displayDate.getDay();
                    if (dow === 6) {
                        // Sábado -> Viernes (-1)
                        displayDate.setDate(displayDate.getDate() - 1);
                    } else if (dow === 0) {
                        // Domingo -> Viernes (-2)
                        displayDate.setDate(displayDate.getDate() - 2);
                    }

                    const oDateStr = formatDate(displayDate);
                    const excDate = getExceptionDate(plan.id, oDateStr);
                    const finalDate = excDate || displayDate;

                    events.push({
                        id: `${plan.id}-proj-${i}`,
                        title: `${plan.asset_name || 'Desconocido'}: ${plan.task_description} (Est.)`,
                        start: finalDate,
                        end: finalDate,
                        allDay: true,
                        resource: plan,
                        isReal: false,
                        isException: !!excDate,
                        originalDateStr: oDateStr
                    });

                    cycleDate.setDate(cycleDate.getDate() + freq);
                }
            }
        });
        return events;
    };

    const onEventDrop = async ({ event, start }) => {
        if (!event.isReal) {
            // Dragging a Ghost Event (Projection) => Create an Exception
            if (!window.confirm(`¿Mover estó solo para esta ocurrencia al ${start.toLocaleDateString()}?`)) return;

            try {
                const offset = start.getTimezoneOffset();
                const dateLocal = new Date(start.getTime() - (offset * 60 * 1000));
                const newDateStr = dateLocal.toISOString().split('T')[0];

                const axios = require('axios'); // Requires axios in this component or via props, using window.fetch bypass or dynamic require
                // To be safe in React, we assume `fetch` or pass axios from parent. Using native fetch:
                const res = await fetch(`/api/admin/maintenance-plans/${event.resource.id}/exception`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                    body: JSON.stringify({ original_date: event.originalDateStr, new_date: newDateStr })
                });

                if (!res.ok) throw new Error("Error del servidor");
                refreshAll();
            } catch (e) {
                alert("Error al crear excepción: " + e.message);
            }
            return;
        }

        // Dragging the REAL next due date => Permanent Reschedule
        onReschedule(event.resource, start);
    };

    return (
        <div className="admin-scheduler-shell" style={{ height: 800, background: 'white', padding: 20, color: 'black', borderRadius: 8 }}>
            {/* El DndProvider activa el soporte para arrastrar */}
            <DndProvider backend={HTML5Backend}>
                <DnDCalendar
                    localizer={localizer}
                    events={generateEvents()}
                    style={{ height: 700 }}
                    className="admin-scheduler-calendar"
                    culture='es'
                    onEventDrop={onEventDrop}
                    onSelectEvent={onSelectEvent}
                    draggableAccessor={(event) => true} // Make all draggable
                    eventPropGetter={(event) => ({
                        style: {
                            backgroundColor: event.isException ? '#f97316' : (event.isReal ? '#2563eb' : '#93c5fd'),
                            cursor: 'move',
                            border: event.isException ? '1px dashed white' : 'none',
                            color: 'white'
                        }
                    })}
                    messages={{
                        next: "Sig.", previous: "Ant.", today: "Hoy",
                        month: "Mes", week: "Semana", day: "Día", agenda: "Agenda"
                    }}
                />
            </DndProvider>
        </div>
    );
}
