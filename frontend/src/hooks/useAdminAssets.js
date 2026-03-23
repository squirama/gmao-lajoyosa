import { useState } from 'react';
import axios from 'axios';

const emptyAssetForm = {
    dept_id: '',
    name: '',
    brand: '',
    model: '',
    manual_filename: '',
};

export function useAdminAssets(authHeader, refreshAssets, refreshConfig) {
    const [editingAsset, setEditingAsset] = useState(null);
    const [assetForm, setAssetForm] = useState(emptyAssetForm);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [selectedLocationId, setSelectedLocationId] = useState('');

    const resetAssetForm = () => {
        setEditingAsset(null);
        setAssetForm(emptyAssetForm);
        setUploadFiles([]);
        setSelectedLocationId('');
    };

    const startEditingAsset = (asset) => {
        setEditingAsset(asset);
        setAssetForm({
            dept_id: asset.dept_id,
            name: asset.name,
            brand: asset.brand || '',
            model: asset.model || '',
            manual_filename: asset.manual_filename || '',
        });
    };

    const handleLocationChange = (locationId) => {
        setSelectedLocationId(locationId);
        setAssetForm({ ...assetForm, dept_id: '' });
    };

    const handleAssetSubmit = async (event) => {
        event.preventDefault();

        try {
            let assetId = editingAsset?.id;

            if (editingAsset) {
                await axios.put(`/api/admin/asset/${assetId}`, assetForm, {
                    headers: { Authorization: authHeader },
                });
            } else {
                const res = await axios.post('/api/admin/assets', assetForm, {
                    headers: { Authorization: authHeader },
                });
                assetId = res.data.id;
            }

            if (uploadFiles.length > 0 && assetId) {
                const formData = new FormData();
                uploadFiles.forEach((file) => formData.append('file', file));
                await axios.post(`/api/admin/asset/${assetId}/manual`, formData, {
                    headers: {
                        Authorization: authHeader,
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }

            alert('Maquina guardada');
            resetAssetForm();
            await refreshAssets();
            await refreshConfig();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const deleteAsset = async (assetId) => {
        if (!window.confirm('Borrar maquina? Esta accion no se puede deshacer.')) return;

        try {
            await axios.delete(`/api/admin/assets/${assetId}`, {
                headers: { Authorization: authHeader },
            });
            await refreshAssets();
            await refreshConfig();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    return {
        assetForm,
        deleteAsset,
        editingAsset,
        handleAssetSubmit,
        handleLocationChange,
        resetAssetForm,
        selectedLocationId,
        setAssetForm,
        setUploadFiles,
        startEditingAsset,
        uploadFiles,
    };
}
