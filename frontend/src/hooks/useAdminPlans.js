import { useState } from 'react';
import axios from 'axios';

const emptyPlanForm = {
    asset_id: '',
    task_description: '',
    frequency_days: 7,
    notify_external: false,
    start_date: '',
    is_legal: false,
    force_dow: false,
};

export function useAdminPlans(authHeader, refreshConfig) {
    const [editingPlan, setEditingPlan] = useState(null);
    const [planForm, setPlanForm] = useState(emptyPlanForm);

    const resetPlanForm = () => {
        setEditingPlan(null);
        setPlanForm(emptyPlanForm);
    };

    const startEditingPlan = (plan) => {
        setEditingPlan(plan);
        setPlanForm({ ...plan, start_date: '' });
    };

    const handlePlanSubmit = async (event) => {
        event.preventDefault();

        try {
            const payload = { ...planForm };
            if (!payload.start_date) delete payload.start_date;

            if (editingPlan) {
                await axios.put(`/api/admin/plans/${editingPlan.id}`, payload, {
                    headers: { Authorization: authHeader },
                });
            } else {
                await axios.post('/api/admin/plans', payload, {
                    headers: { Authorization: authHeader },
                });
            }

            alert('Plan guardado');
            resetPlanForm();
            await refreshConfig();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al guardar plan');
        }
    };

    const handleSkip = async (plan) => {
        if (!window.confirm(`Saltar la proxima ocurrencia (${plan.next_due_date})?`)) return;

        try {
            const res = await axios.post(`/api/admin/maintenance-plans/${plan.id}/skip`, {}, {
                headers: { Authorization: authHeader },
            });
            alert(`Saltado. Nueva fecha: ${res.data.new_date}`);
            await refreshConfig();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleReschedule = async (plan) => {
        const newDate = window.prompt('Nueva fecha (YYYY-MM-DD):', plan.next_due_date?.split('T')[0]);
        if (!newDate) return;

        try {
            await axios.put(`/api/admin/maintenance-plans/${plan.id}/reschedule`, {
                new_date: newDate,
            }, {
                headers: { Authorization: authHeader },
            });
            alert('Reprogramado');
            await refreshConfig();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const deletePlan = async (planId) => {
        if (!window.confirm('Borrar plan?')) return;

        try {
            await axios.delete(`/api/admin/plans/${planId}`, {
                headers: { Authorization: authHeader },
            });
            await refreshConfig();
        } catch (error) {
            alert(error.response?.data?.error || error.message);
        }
    };

    return {
        deletePlan,
        editingPlan,
        handlePlanSubmit,
        handleReschedule,
        handleSkip,
        planForm,
        resetPlanForm,
        setEditingPlan,
        setPlanForm,
        startEditingPlan,
    };
}
