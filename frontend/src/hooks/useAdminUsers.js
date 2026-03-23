import { useState } from 'react';
import axios from 'axios';

export function useAdminUsers(authHeader) {
    const [usersList, setUsersList] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({ full_name: '', username: '', role: 'OPERATOR', department_ids: [] });

    const resetUserForm = () => {
        setEditingUser(null);
        setUserForm({ full_name: '', username: '', role: 'OPERATOR', department_ids: [] });
    };

    const refreshUsers = async () => {
        try {
            const res = await axios.get('/api/users/all', { headers: { Authorization: authHeader } });
            setUsersList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
            setUsersList([]);
        }
    };

    const handleUserSubmit = async (event) => {
        event.preventDefault();

        try {
            if (editingUser) {
                await axios.put(`/api/users/${editingUser.id}`, userForm, { headers: { Authorization: authHeader } });
            } else {
                await axios.post('/api/users', userForm, { headers: { Authorization: authHeader } });
            }

            alert('✅ Guardado');
            resetUserForm();
            await refreshUsers();
        } catch (error) {
            alert(`Error: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleDeactivateUser = async (userId) => {
        if (!window.confirm('¿Baja usuario?')) return;
        await axios.delete(`/api/users/${userId}`, { headers: { Authorization: authHeader } });
        await refreshUsers();
    };

    const startEditingUser = (user) => {
        setEditingUser(user);
        setUserForm({
            full_name: user.full_name,
            username: user.username || '',
            role: user.role,
            department_ids: (user.department_ids || []).map(Number),
        });
    };

    return {
        editingUser,
        handleDeactivateUser,
        handleUserSubmit,
        refreshUsers,
        resetUserForm,
        setUserForm,
        startEditingUser,
        userForm,
        usersList,
    };
}
