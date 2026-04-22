import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ActionPanel from './pages/ActionPanel';

vi.mock('axios');

describe('ActionPanel documentary plans', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
    });

    it('bloquea el guardado si falta un paso obligatorio del plan documental', async () => {
        axios.get
            .mockResolvedValueOnce({
                data: [{
                    id: 91,
                    task_description: 'Revision trimestral PCI',
                    frequency_days: 90,
                    next_due_date: '2026-04-20T00:00:00Z',
                    is_documentary: true,
                    document_steps: [
                        { id: 11, title: 'Comprobar accesibilidad', step_type: 'CHECK', required: true },
                        { id: 12, title: 'Anotar observaciones', step_type: 'LONG_TEXT', required: true },
                    ],
                }],
            })
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] });

        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ActionPanel
                    context={{
                        asset: { id: 4, name: 'BIE Nave 1', dept_id: 2 },
                        user: { id: 7, full_name: 'Operario Demo' },
                    }}
                />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/revision trimestral pci/i)).toBeInTheDocument();
        });

        await userEvent.click(screen.getAllByRole('checkbox')[0]);
        expect(screen.getByText(/checklist del plan/i)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /guardar tareas realizadas/i }));

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Comprobar accesibilidad'));
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('separa observaciones de mantenimiento y causa de averia en el registro', async () => {
        axios.get
            .mockResolvedValueOnce({
                data: [{
                    id: 91,
                    task_description: 'Revision trimestral PCI',
                    frequency_days: 90,
                    next_due_date: '2026-04-20T00:00:00Z',
                    is_documentary: false,
                    document_steps: [],
                }],
            })
            .mockResolvedValueOnce({ data: [] })
            .mockResolvedValueOnce({ data: [] });

        axios.post.mockResolvedValue({ data: { success: true } });

        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ActionPanel
                    context={{
                        asset: { id: 4, name: 'BIE Nave 1', dept_id: 2 },
                        user: { id: 7, full_name: 'Operario Demo' },
                    }}
                />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/revision trimestral pci/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/causa de la averia/i)).toBeInTheDocument();
        expect(screen.getByText(/observacion del mantenimiento realizado/i)).toBeInTheDocument();

        await userEvent.type(
            screen.getByPlaceholderText(/anade una observacion general del mantenimiento preventivo si procede/i),
            'Se limpia la zona y se reajusta el protector'
        );
        await userEvent.type(
            screen.getByPlaceholderText(/indica la causa o descripcion de la averia/i),
            'Motor bloqueado por sobrecarga'
        );

        await userEvent.click(screen.getByRole('button', { name: /registrar averia \/ correctivo/i }));

        const breakdownCall = axios.post.mock.calls.find(([url]) => url === '/api/log');
        expect(breakdownCall).toBeTruthy();
        expect(breakdownCall[1]).toEqual(expect.objectContaining({
            asset_id: 4,
            user_id: 7,
            failure_cause: 'Motor bloqueado por sobrecarga',
        }));
        expect(breakdownCall[1].tasks).toEqual([
            expect.objectContaining({
                description: 'AVERÍA GENERAL / MANTENIMIENTO CORRECTIVO',
                comment: '',
            }),
        ]);
        await userEvent.click(screen.getAllByRole('checkbox')[0]);
        await userEvent.click(screen.getByRole('button', { name: /guardar tareas realizadas/i }));

        const preventiveCall = axios.post.mock.calls.find(([url]) => url === '/api/admin/maintenance-plans/91/complete');
        expect(preventiveCall).toBeTruthy();
        expect(preventiveCall[1]).toEqual(expect.objectContaining({
            notes: 'Se limpia la zona y se reajusta el protector',
        }));
    });
});
