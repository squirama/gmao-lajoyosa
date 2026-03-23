import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Login from './pages/Login';

const navigateMock = vi.fn();

vi.mock('axios');
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

describe('Login', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        vi.clearAllMocks();
        axios.defaults.headers.common = {};
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('guarda sesion y navega al inicio cuando el login es correcto', async () => {
        const setContext = vi.fn();
        axios.post.mockResolvedValue({
            data: {
                token: 'token-demo',
                user: { id: 1, username: 'admin', role: 'ADMIN' },
            },
        });

        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Login setContext={setContext} />
            </MemoryRouter>
        );

        await userEvent.type(screen.getByLabelText(/usuario/i), 'admin');
        await userEvent.type(screen.getByLabelText(/contras/i), '1234');
        await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/login', { username: 'admin', password: '1234' });
        });

        expect(localStorage.getItem('session_token')).toBe('token-demo');
        expect(localStorage.getItem('user_info')).toContain('"role":"ADMIN"');
        expect(setContext).toHaveBeenCalledWith({
            token: 'token-demo',
            user: { id: 1, username: 'admin', role: 'ADMIN' },
        });
        expect(axios.defaults.headers.common.Authorization).toBe('Bearer token-demo');
        expect(navigateMock).toHaveBeenCalledWith('/');
    });

    it('muestra el error devuelto por la API cuando el login falla', async () => {
        axios.post.mockRejectedValue({
            response: { data: { error: 'Credenciales invalidas' } },
        });

        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Login setContext={vi.fn()} />
            </MemoryRouter>
        );

        await userEvent.type(screen.getByLabelText(/usuario/i), 'admin');
        await userEvent.type(screen.getByLabelText(/contras/i), 'bad');
        await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

        expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument();
        expect(navigateMock).not.toHaveBeenCalled();
    });
});
