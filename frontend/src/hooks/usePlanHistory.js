import { useState } from 'react';
import axios from 'axios';

export function usePlanHistory(authHeader) {
    const [historyPlan, setHistoryPlan] = useState(null);
    const [historyData, setHistoryData] = useState(null);

    const fetchHistory = async (planId) => {
        setHistoryData(null);

        try {
            const res = await axios.get(`/api/admin/plans/${planId}/history`, {
                headers: { Authorization: authHeader },
            });
            setHistoryData(res.data);
        } catch (error) {
            console.error(error);
            alert('Error cargando historial');
        }
    };

    const openHistory = async (plan) => {
        setHistoryPlan(plan);
        await fetchHistory(plan.id);
    };

    const closeHistory = () => {
        setHistoryPlan(null);
        setHistoryData(null);
    };

    return {
        closeHistory,
        fetchHistory,
        historyData,
        historyPlan,
        openHistory,
    };
}
