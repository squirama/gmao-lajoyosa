import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import esLocale from '@fullcalendar/core/locales/es';

function resolveCalendarScope(context, searchParams) {
    const scope = searchParams.get('scope');
    const searchLocationId = searchParams.get('location_id');
    const searchDepartmentId = searchParams.get('department_id');
    const searchAssetId = searchParams.get('asset_id');

    if (scope === 'asset' && (searchAssetId || context.asset?.id)) {
        return {
            params: { asset_id: Number(searchAssetId || context.asset.id) },
            title: `Calendario de ${context.asset?.name || 'la maquina'}`,
            subtitle: `${context.location?.name || ''}${context.department ? ` / ${context.department.name}` : ''}`.trim(),
            backPath: '/action',
            backLabel: 'Volver a maquina',
        };
    }

    if (scope === 'department' && (searchDepartmentId || context.department?.id)) {
        return {
            params: { department_id: Number(searchDepartmentId || context.department.id) },
            title: `Calendario del area ${context.department?.name || ''}`.trim(),
            subtitle: context.location?.name || '',
            backPath: '/asset',
            backLabel: 'Volver a maquinas',
        };
    }

    if (scope === 'location' && (searchLocationId || context.location?.id)) {
        return {
            params: { location_id: Number(searchLocationId || context.location.id) },
            title: `Calendario de la sede ${context.location?.name || ''}`.trim(),
            subtitle: 'Mostrando todo lo permitido en esta sede',
            backPath: '/department',
            backLabel: 'Volver a areas',
        };
    }

    return {
        params: {},
        title: 'Calendario general',
        subtitle: 'Mostrando todo lo que permite tu acceso',
        backPath: '/',
        backLabel: 'Volver a sedes',
    };
}

export default function UserCalendar({ context }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const calendarScope = useMemo(
        () => resolveCalendarScope(context, searchParams),
        [context, searchParams]
    );

    useEffect(() => {
        const token = localStorage.getItem('session_token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchEvents = async () => {
            setLoading(true);
            setError('');

            try {
                const res = await axios.get('/api/calendar/events', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: calendarScope.params,
                });
                setEvents(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Error fetching calendar events:', err);
                if (err.response?.status === 401) {
                    localStorage.removeItem('session_token');
                    localStorage.removeItem('user_info');
                    window.location.href = '/login';
                    return;
                }
                setError(err.response?.data?.error || 'No se pudo cargar el calendario');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [calendarScope, navigate]);

    return (
        <div className="page-container">
            <div className="nav-bar">
                <span>{calendarScope.subtitle || 'Planificacion de mantenimiento'}</span>
            </div>

            <h1 className="title">{calendarScope.title}</h1>

            <div className="card user-calendar-shell">
                <div className="user-calendar-legend">
                    <span><i style={{ background: '#22c55e' }} />Hecho</span>
                    <span><i style={{ background: '#3b82f6' }} />Futuro</span>
                    <span><i style={{ background: '#ef4444' }} />Pendiente vencido</span>
                </div>

                {loading ? (
                    <div className="user-calendar-empty">Cargando calendario...</div>
                ) : error ? (
                    <div className="user-calendar-empty user-calendar-empty--error">{error}</div>
                ) : (
                    <FullCalendar
                        plugins={[dayGridPlugin]}
                        initialView="dayGridMonth"
                        locale={esLocale}
                        events={events}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,dayGridWeek',
                        }}
                        height="auto"
                        contentHeight="auto"
                        dayMaxEvents={3}
                        editable={false}
                        selectable={false}
                        eventClick={(info) => {
                            const { title, extendedProps } = info.event;
                            let message = title;
                            if (extendedProps.notes) {
                                message += `\nNotas: ${extendedProps.notes}`;
                            }
                            alert(message);
                        }}
                    />
                )}
            </div>

            <div className="bottom-nav">
                <button onClick={() => navigate(calendarScope.backPath)} style={{ background: '#333', color: '#ccc', border: '1px solid #555' }}>
                    {calendarScope.backLabel}
                </button>
            </div>
        </div>
    );
}
