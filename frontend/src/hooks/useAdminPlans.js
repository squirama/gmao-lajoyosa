import { useState } from 'react';
import axios from 'axios';

const emptyPlanForm = {
    asset_id: '',
    task_description: '',
    frequency_days: 7,
    notify_external: false,
    notification_email: '',
    start_date: '',
    is_legal: false,
    force_dow: false,
    is_documentary: false,
    document_steps: [],
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
            if (!payload.notification_email) delete payload.notification_email;

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

    const savePlanNotificationSettings = async (plan, overrides = {}) => {
        const payload = {
            asset_id: plan.asset_id,
            task_description: plan.task_description,
            frequency_days: plan.frequency_days,
            notify_external: Boolean(plan.notify_external),
            notification_email: plan.notification_email || '',
            is_legal: Boolean(plan.is_legal),
            force_dow: Boolean(plan.force_dow),
            ...overrides,
        };

        if (!payload.notification_email) {
            delete payload.notification_email;
        }

        await axios.put(`/api/admin/plans/${plan.id}`, payload, {
            headers: { Authorization: authHeader },
        });
        await refreshConfig();
    };

    const saveDepartmentReminderSettings = async (department, overrides = {}) => {
        const payload = {
            location_id: department.location_id,
            name: department.name,
            email: department.email || '',
            weekly_reminder_enabled: Boolean(department.weekly_reminder_enabled),
            weekly_reminder_email: department.weekly_reminder_email || '',
            ...overrides,
        };

        if (!payload.email) {
            delete payload.email;
        }
        if (!payload.weekly_reminder_email) {
            delete payload.weekly_reminder_email;
        }

        await axios.put(`/api/admin/departments/${department.id}`, payload, {
            headers: { Authorization: authHeader },
        });
        await refreshConfig();
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
        saveDepartmentReminderSettings,
        savePlanNotificationSettings,
        setEditingPlan,
        setPlanForm,
        startEditingPlan,
    };
}
