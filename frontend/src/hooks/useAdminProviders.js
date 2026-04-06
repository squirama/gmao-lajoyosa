import { useEffect, useState } from 'react';
import axios from 'axios';

const emptyProviderForm = {
    company_name: '',
    service_type: '',
    contact_name: '',
    phone: '',
    email: '',
    notes: '',
    contract_expires_on: '',
    active: true,
    department_ids: [],
    asset_ids: [],
};

export function useAdminProviders(authHeader) {
    const [providers, setProviders] = useState([]);
    const [providerDocuments, setProviderDocuments] = useState({});
    const [providersLoading, setProvidersLoading] = useState(false);
    const [providersError, setProvidersError] = useState('');
    const [editingProvider, setEditingProvider] = useState(null);
    const [providerForm, setProviderForm] = useState(emptyProviderForm);

    const fetchProviders = async (header = authHeader) => {
        if (!header) return [];

        setProvidersLoading(true);
        setProvidersError('');
        try {
            const res = await axios.get('/api/admin/providers', {
                headers: { Authorization: header },
            });
            const rows = Array.isArray(res.data) ? res.data : [];
            setProviders(rows);
            return rows;
        } catch (error) {
            console.error(error);
            setProviders([]);
            setProvidersError(error.response?.data?.error || 'No se pudieron cargar los proveedores.');
            return [];
        } finally {
            setProvidersLoading(false);
        }
    };

    useEffect(() => {
        if (authHeader) {
            fetchProviders(authHeader);
        }
    }, [authHeader]);

    const resetProviderForm = () => {
        setEditingProvider(null);
        setProviderForm(emptyProviderForm);
    };

    const startEditingProvider = (provider) => {
        setEditingProvider(provider);
        setProviderForm({
            company_name: provider.company_name || '',
            service_type: provider.service_type || '',
            contact_name: provider.contact_name || '',
            phone: provider.phone || '',
            email: provider.email || '',
            notes: provider.notes || '',
            contract_expires_on: provider.contract_expires_on ? String(provider.contract_expires_on).slice(0, 10) : '',
            active: provider.active !== false,
            department_ids: Array.isArray(provider.department_ids) ? provider.department_ids : [],
            asset_ids: Array.isArray(provider.asset_ids) ? provider.asset_ids : [],
        });
    };

    const handleProviderSubmit = async (event) => {
        event.preventDefault();
        try {
            let savedProvider;
            if (editingProvider) {
                const res = await axios.put(`/api/admin/providers/${editingProvider.id}`, providerForm, {
                    headers: { Authorization: authHeader },
                });
                savedProvider = res.data;
            } else {
                const res = await axios.post('/api/admin/providers', providerForm, {
                    headers: { Authorization: authHeader },
                });
                savedProvider = res.data;
            }

            const rows = await fetchProviders();
            const hydratedProvider = rows.find((item) => item.id === savedProvider?.id) || savedProvider;
            if (hydratedProvider) {
                startEditingProvider(hydratedProvider);
            }

            alert(editingProvider ? 'Proveedor actualizado' : 'Proveedor creado. Ya puedes subir documentacion abajo.');
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const deactivateProvider = async (providerId) => {
        if (!window.confirm('Dar de baja este proveedor?')) return;
        try {
            await axios.delete(`/api/admin/providers/${providerId}`, {
                headers: { Authorization: authHeader },
            });
            await fetchProviders();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const fetchProviderDocuments = async (providerId) => {
        try {
            const res = await axios.get(`/api/admin/providers/${providerId}/documents`, {
                headers: { Authorization: authHeader },
            });
            const rows = Array.isArray(res.data) ? res.data : [];
            setProviderDocuments((current) => ({ ...current, [providerId]: rows }));
            return rows;
        } catch (error) {
            alert(error.response?.data?.error || error.message);
            return [];
        }
    };

    const uploadProviderDocument = async (providerId, formData) => {
        const res = await axios.post(`/api/admin/providers/${providerId}/documents`, formData, {
            headers: { Authorization: authHeader, 'Content-Type': 'multipart/form-data' },
        });
        await fetchProviderDocuments(providerId);
        await fetchProviders();
        return res.data;
    };

    const deleteProviderDocument = async (providerId, documentId) => {
        if (!window.confirm('Borrar este documento?')) return;
        await axios.delete(`/api/admin/provider-documents/${documentId}`, {
            headers: { Authorization: authHeader },
        });
        await fetchProviderDocuments(providerId);
        await fetchProviders();
    };

    return {
        deactivateProvider,
        editingProvider,
        fetchProviderDocuments,
        handleProviderSubmit,
        providerDocuments,
        providerForm,
        providers,
        providersError,
        providersLoading,
        resetProviderForm,
        setProviderForm,
        startEditingProvider,
        uploadProviderDocument,
        deleteProviderDocument,
    };
}
