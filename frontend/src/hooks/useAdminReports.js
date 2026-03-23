import { useState } from 'react';
import axios from 'axios';
import { triggerBlobDownload } from '../utils/adminPanelUtils';

export function useAdminReports(authHeader) {
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');
    const [reportAssetId, setReportAssetId] = useState('');

    const downloadReport = async (type) => {
        if (!reportStartDate || !reportEndDate) {
            alert('Selecciona fecha inicio y fecha fin.');
            return;
        }

        try {
            let url = `/api/reports/${type}?start=${reportStartDate}&end=${reportEndDate}`;
            if (reportAssetId) url += `&asset_id=${reportAssetId}`;

            const res = await axios.get(url, {
                headers: { Authorization: authHeader },
                responseType: 'blob',
            });

            triggerBlobDownload(res.data, `${type}_${reportStartDate}_${reportEndDate}.csv`);
        } catch (error) {
            console.error(error);
            alert('Error al descargar informe. Revisa las fechas.');
        }
    };

    return {
        downloadReport,
        reportAssetId,
        reportEndDate,
        reportStartDate,
        setReportAssetId,
        setReportEndDate,
        setReportStartDate,
    };
}
