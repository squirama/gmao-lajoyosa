import { useEffect, useState } from 'react';
import axios from 'axios';
import { toLocalDateInputValue } from '../utils/adminPanelUtils';

function createDefaultDateRange() {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);

    return {
        start: toLocalDateInputValue(lastMonth),
        end: toLocalDateInputValue(today),
    };
}

export function useAdminHistory(authHeader) {
    const defaultRange = createDefaultDateRange();
    const initialFilters = {
        start: defaultRange.start,
        end: defaultRange.end,
        location_id: '',
        department_id: '',
        asset_id: '',
        with_documents: false,
    };
    const [historyRows, setHistoryRows] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');
    const [lastFetchedFilters, setLastFetchedFilters] = useState(initialFilters);
    const [historyFilters, setHistoryFilters] = useState(initialFilters);

    const fetchHistory = async (nextFilters = historyFilters, header = authHeader) => {
        if (!header) return [];

        setHistoryLoading(true);
        setHistoryError('');

        try {
            const params = new URLSearchParams();

            if (nextFilters.start) params.set('start', nextFilters.start);
            if (nextFilters.end) params.set('end', nextFilters.end);
            if (nextFilters.location_id) params.set('location_id', nextFilters.location_id);
            if (nextFilters.department_id) params.set('department_id', nextFilters.department_id);
            if (nextFilters.asset_id) params.set('asset_id', nextFilters.asset_id);
            if (nextFilters.with_documents) params.set('with_documents', 'true');

            const res = await axios.get(`/api/admin/history?${params.toString()}`, {
                headers: { Authorization: header },
            });

            const data = Array.isArray(res.data) ? res.data : [];
            setLastFetchedFilters({ ...nextFilters });
            setHistoryRows(data);
            return data;
        } catch (error) {
            console.error(error);
            setHistoryError(error.response?.data?.error || 'No se pudo cargar el historial.');
            setHistoryRows([]);
            return [];
        } finally {
            setHistoryLoading(false);
        }
    };

    const reviewHistoryEntry = async (entryType, id) => {
        if (!authHeader) return null;

        const res = await axios.put(`/api/admin/history/${entryType}/${id}/review`, {}, {
            headers: { Authorization: authHeader },
        });

        await fetchHistory(lastFetchedFilters, authHeader);
        return res.data;
    };

    useEffect(() => {
        if (authHeader) {
            fetchHistory(historyFilters, authHeader);
        }
    }, [authHeader]);

    return {
        fetchHistory,
        historyError,
        historyFilters,
        historyLoading,
        historyRows,
        reviewHistoryEntry,
        setHistoryFilters,
    };
}
