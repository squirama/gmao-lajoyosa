import { useState, useCallback } from 'react';
import axios from 'axios';

export function useAdminActivity(authHeader) {
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState(null);
    const [activitySummary, setActivitySummary] = useState(null);
    const [activityUsers, setActivityUsers] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [recentLogins, setRecentLogins] = useState([]);

    const refreshActivity = useCallback(async () => {
        if (!authHeader) return;
        setActivityLoading(true);
        setActivityError(null);
        try {
            const [summaryRes, usersRes, activityRes, loginsRes] = await Promise.allSettled([
                axios.get('/api/activity/summary', { headers: authHeader }),
                axios.get('/api/activity/users', { headers: authHeader }),
                axios.get('/api/activity/recent', { headers: authHeader }),
                axios.get('/api/activity/logins', { headers: authHeader }),
            ]);
            if (summaryRes.status === 'fulfilled') setActivitySummary(summaryRes.value.data);
            if (usersRes.status === 'fulfilled') setActivityUsers(usersRes.value.data);
            if (activityRes.status === 'fulfilled') setRecentActivity(activityRes.value.data);
            if (loginsRes.status === 'fulfilled') setRecentLogins(loginsRes.value.data);
        } catch (err) {
            setActivityError('No se pudo cargar la actividad.');
        } finally {
            setActivityLoading(false);
        }
    }, [authHeader]);

    return {
        activityError,
        activityLoading,
        activitySummary,
        activityUsers,
        recentActivity,
        recentLogins,
        refreshActivity,
    };
}
