import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import esLocale from '@fullcalendar/core/locales/es';

export default function UserCalendar({ context }) {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (!context.department) {
            navigate('/department');
            return;
        }

        const fetchEvents = async () => {
            try {
                // Fetch filtered by department (Public Route)
                const res = await axios.get(`/api/calendar/events?department_id=${context.department.id}`);
                setEvents(res.data);
            } catch (err) {
                console.error("Error fetching calendar events:", err);
                if (err.response && err.response.status === 401) {
                    // Token invalid/expired
                    console.warn("Token expired, logging out...");
                    localStorage.removeItem('session_token');
                    localStorage.removeItem('user_info');
                    window.location.href = '/login';
                }
            }
        };

        fetchEvents();
    }, [context.department, navigate]);

    return (
        <div className="page-container">
            <div className="nav-bar">
                <span>{context.location?.name} / {context.department?.name}</span>
            </div>

            <h1 className="title">Calendario de Mantenimiento</h1>

            <div style={{
                background: '#fff',
                color: '#000',
                padding: '15px',
                borderRadius: '12px',
                flex: 1,
                width: '100%',
                maxWidth: '1200px',
                margin: '0 auto',
                overflow: 'hidden',
                marginBottom: '20px'
            }}>
                <FullCalendar
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    locale={esLocale}
                    events={events}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,dayGridWeek'
                    }}
                    height="100%"
                    editable={false} // READ-ONLY
                    selectable={false}
                    eventClick={(info) => {
                        // Optional: Show detail in alert if needed
                        const { title, extendedProps } = info.event;
                        let msg = title;
                        if (extendedProps.notes) msg += `\nNotas: ${extendedProps.notes}`;
                        alert(msg);
                    }}
                />
            </div>

            <div className="bottom-nav">
                <button onClick={() => navigate('/asset')}>Máquinas</button>
                <button onClick={() => navigate('/department')}>Atrás</button>
            </div>
        </div>
    );
}
