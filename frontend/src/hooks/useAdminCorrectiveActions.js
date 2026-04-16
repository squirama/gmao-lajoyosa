import { useEffect, useState } from 'react';
import axios from 'axios';

export function useAdminCorrectiveActions(authHeader) {
    const [correctiveRows, setCorrectiveRows] = useState([]);
    const [correctiveLoading, setCorrectiveLoading] = useState(false);
    const [correctiveError, setCorrectiveError] = useState('');
    const [correctiveFilters, setCorrectiveFilters] = useState({
        location_id: '',
        department_id: '',
        asset_id: '',
        status: 'OPEN',
        classification: '',
        follow_up_required: false,
    });

    const fetchCorrectiveActions = async (nextFilters = correctiveFilters, header = authHeader) => {
        if (!header) return [];

        setCorrectiveLoading(true);
        setCorrectiveError('');

        try {
            const params = new URLSearchParams();
            if (nextFilters.location_id) params.set('location_id', nextFilters.location_id);
            if (nextFilters.department_id) params.set('department_id', nextFilters.department_id);
            if (nextFilters.asset_id) params.set('asset_id', nextFilters.asset_id);
            if (nextFilters.status) params.set('status', nextFilters.status);
            if (nextFilters.classification) params.set('classification', nextFilters.classification);
            if (nextFilters.follow_up_required) params.set('follow_up_required', 'true');

            const res = await axios.get(`/api/admin/corrective-actions?${params.toString()}`, {
                headers: { Authorization: header },
            });

            const data = Array.isArray(res.data) ? res.data : [];
            setCorrectiveRows(data);
            return data;
        } catch (error) {
            console.error(error);
            setCorrectiveError(error.response?.data?.error || 'No se pudo cargar el seguimiento de mejoras.');
            setCorrectiveRows([]);
            return [];
        } finally {
            setCorrectiveLoading(false);
        }
    };

    const updateCorrectiveAction = async (id, payload) => {
        if (!authHeader) return null;
        const res = await axios.put(`/api/admin/corrective-actions/${id}`, payload, {
            headers: { Authorization: authHeader },
        });
        await fetchCorrectiveActions();
        return res.data;
    };

    useEffect(() => {
        if (authHeader) {
            fetchCorrectiveActions(correctiveFilters, authHeader);
        }
    }, [authHeader]);

    return {
        correctiveError,
        correctiveFilters,
        correctiveLoading,
        correctiveRows,
        fetchCorrectiveActions,
        setCorrectiveFilters,
        updateCorrectiveAction,
    };
}
