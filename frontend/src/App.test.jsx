import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('./pages/Login', () => ({
    default: () => <div>Login View</div>,
}));

vi.mock('./pages/LocationSelect', () => ({
    default: () => <div>Location View</div>,
}));

vi.mock('./pages/DepartmentSelect', () => ({
    default: () => <div>Department View</div>,
}));

vi.mock('./pages/AssetSelect', () => ({
    default: () => <div>Asset View</div>,
}));

vi.mock('./pages/ActionPanel', () => ({
    default: () => <div>Action View</div>,
}));

vi.mock('./pages/AdminPanel', () => ({
    default: () => <div>Admin View</div>,
}));

vi.mock('./pages/UserCalendar', () => ({
    default: () => <div>User Calendar View</div>,
}));

vi.mock('./components/RequestButton', () => ({
    default: () => <div>Request Button</div>,
}));

import App from './App';

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.history.pushState({}, '', '/');
    });

    it('redirige a login si no hay sesion', async () => {
        render(<App />);
        expect(await screen.findByText('Login View')).toBeInTheDocument();
    });

    it('muestra acceso admin para un usuario con rol ADMIN', async () => {
        localStorage.setItem('session_token', 'token-demo');
        localStorage.setItem('user_info', JSON.stringify({ id: 1, username: 'admin', role: 'ADMIN' }));

        render(<App />);

        expect(await screen.findByText('Location View')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /panel admin/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cerrar sesion/i })).toBeInTheDocument();
        expect(screen.getByText('Request Button')).toBeInTheDocument();
    });

    it('oculta el acceso admin para un operario normal', async () => {
        localStorage.setItem('session_token', 'token-demo');
        localStorage.setItem('user_info', JSON.stringify({ id: 2, username: 'operario', role: 'OPERATOR' }));

        render(<App />);

        expect(await screen.findByText('Location View')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /panel admin/i })).not.toBeInTheDocument();
        expect(screen.getByText('Request Button')).toBeInTheDocument();
    });

    it('carga el panel admin cuando la ruta es /admin/:section y el usuario es admin', async () => {
        localStorage.setItem('session_token', 'token-demo');
        localStorage.setItem('user_info', JSON.stringify({ id: 1, username: 'admin', role: 'ADMIN' }));
        window.history.pushState({}, '', '/admin/assets');

        render(<App />);

        expect(await screen.findByText('Admin View')).toBeInTheDocument();
        expect(screen.queryByText('Request Button')).not.toBeInTheDocument();
    });
});
