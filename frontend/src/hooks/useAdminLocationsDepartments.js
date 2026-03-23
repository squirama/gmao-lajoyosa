import { useState } from 'react';
import axios from 'axios';

const emptyLocationForm = { name: '', address: '', email: '' };
const emptyDepartmentForm = { name: '', location_id: '', email: '' };

export function useAdminLocationsDepartments(authHeader, refreshConfig) {
    const [editingLocation, setEditingLocation] = useState(null);
    const [locationForm, setLocationForm] = useState(emptyLocationForm);
    const [editingDept, setEditingDept] = useState(null);
    const [deptForm, setDeptForm] = useState(emptyDepartmentForm);

    const resetLocationForm = () => {
        setEditingLocation(null);
        setLocationForm(emptyLocationForm);
    };

    const resetDepartmentForm = () => {
        setEditingDept(null);
        setDeptForm(emptyDepartmentForm);
    };

    const handleLocationSubmit = async (event) => {
        event.preventDefault();

        try {
            if (editingLocation) {
                await axios.put(`/api/admin/locations/${editingLocation.id}`, locationForm, {
                    headers: { Authorization: authHeader },
                });
            } else {
                await axios.post('/api/admin/locations', locationForm, {
                    headers: { Authorization: authHeader },
                });
            }

            alert('✅ Sede Guardada');
            resetLocationForm();
            await refreshConfig();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const deleteLocation = async (locationId) => {
        if (!window.confirm('¿Borrar sede? ¡Cuidado!')) return;

        try {
            await axios.delete(`/api/admin/locations/${locationId}`, {
                headers: { Authorization: authHeader },
            });
            await refreshConfig();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const startEditingLocation = (location) => {
        setEditingLocation(location);
        setLocationForm(location);
    };

    const handleDepartmentSubmit = async (event) => {
        event.preventDefault();

        try {
            if (editingDept) {
                await axios.put(`/api/admin/departments/${editingDept.id}`, deptForm, {
                    headers: { Authorization: authHeader },
                });
            } else {
                await axios.post('/api/admin/departments', deptForm, {
                    headers: { Authorization: authHeader },
                });
            }

            alert('✅ Área Guardada');
            resetDepartmentForm();
            await refreshConfig();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const deleteDept = async (departmentId) => {
        if (!window.confirm('¿Borrar área?')) return;

        try {
            await axios.delete(`/api/admin/departments/${departmentId}`, {
                headers: { Authorization: authHeader },
            });
            await refreshConfig();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    const startEditingDepartment = (department) => {
        setEditingDept(department);
        setDeptForm(department);
    };

    return {
        deleteDept,
        deleteLocation,
        deptForm,
        editingDept,
        editingLocation,
        handleDepartmentSubmit,
        handleLocationSubmit,
        locationForm,
        resetDepartmentForm,
        resetLocationForm,
        setDeptForm,
        setLocationForm,
        startEditingDepartment,
        startEditingLocation,
    };
}
