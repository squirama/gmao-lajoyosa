import React, { useState, useEffect } from 'react';

const Clock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();

        return `${hh}:${mm}:${ss} - ${dd}/${mo}/${yyyy}`;
    };

    return (
        <div className="digital-clock">
            {formatTime(time)}
        </div>
    );
};

export default Clock;
