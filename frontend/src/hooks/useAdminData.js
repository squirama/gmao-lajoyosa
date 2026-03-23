import { useState } from 'react';
import axios from 'axios';

export const emptyAdminConfig = {
    locations: [],
    departments: [],
    plans: [],
    assets: [],
    plan_exceptions: [],
    stats: [],
    user: null,
};

export function useAdminData(authHeader) {
    const [config, setConfig] = useState(emptyAdminConfig);
    const [assets, setAssets] = useState([]);

    const fetchConfigData = async (header = authHeader) => {
        if (!header) return emptyAdminConfig;

        const [locationsRes, departmentsRes, assetsRes, plansRes, configRes] = await Promise.all([
            axios.get('/api/config/locations', { headers: { Authorization: header } }),
            axios.get('/api/config/departments', { headers: { Authorization: header } }),
            axios.get('/api/config/assets', { headers: { Authorization: header } }),
            axios.get('/api/config/plans', { headers: { Authorization: header } }),
            axios.get('/api/config', { headers: { Authorization: header } }),
        ]);

        return {
            locations: Array.isArray(locationsRes.data) ? locationsRes.data : [],
            departments: Array.isArray(departmentsRes.data) ? departmentsRes.data : [],
            assets: Array.isArray(assetsRes.data) ? assetsRes.data : [],
            plans: Array.isArray(plansRes.data) ? plansRes.data : [],
            plan_exceptions: Array.isArray(configRes.data?.plan_exceptions) ? configRes.data.plan_exceptions : [],
            stats: Array.isArray(configRes.data?.stats) ? configRes.data.stats : [],
            user: configRes.data?.user || null,
        };
    };

    const refreshConfig = async (header = authHeader) => {
        const data = await fetchConfigData(header);
        setConfig(data);
        return data;
    };

    const refreshAssets = async (header = authHeader) => {
        const res = await axios.get('/api/admin/assets', { headers: { Authorization: header } });
        const data = Array.isArray(res.data) ? res.data : [];
        setAssets(data);
        return data;
    };

    const refreshAll = async (header = authHeader) => {
        try {
            await Promise.all([
                refreshAssets(header),
                refreshConfig(header),
            ]);
        } catch (error) {
            console.error('Error al refrescar:', error);
        }
    };

    return {
        assets,
        config,
        fetchConfigData,
        refreshAll,
        refreshAssets,
        refreshConfig,
    };
}
