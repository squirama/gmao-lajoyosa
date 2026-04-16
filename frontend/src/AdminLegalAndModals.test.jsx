import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import AdminLegalSection from './components/admin/AdminLegalSection';
import LegalHistoryModal from './components/admin/LegalHistoryModal';
import AdminAssetCalendarModal from './components/admin/AdminAssetCalendarModal';

vi.mock('axios');

describe('Admin legal and modal flows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        window.confirm = vi.fn(() => true);
        window.prompt = vi.fn(() => 'Revision completada');
    });

    it('clasifica planes legales por vigente, proximo y caducado y dispara acciones', async () => {
        const onManagePlan = vi.fn();
        const onOpenHistory = vi.fn();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in10Days = new Date(today);
        in10Days.setDate(in10Days.getDate() + 10);
        const in60Days = new Date(today);
        in60Days.setDate(in60Days.getDate() + 60);
        const pastDue = new Date(today);
        pastDue.setDate(pastDue.getDate() - 2);

        render(
            <AdminLegalSection
                onManagePlan={onManagePlan}
                onOpenHistory={onOpenHistory}
                plans={[
                    { id: 1, is_legal: true, task_description: 'Extintores', asset_name: 'Linea 1', next_due_date: in60Days.toISOString() },
                    { id: 2, is_legal: true, task_description: 'Calibracion', asset_name: 'Linea 2', next_due_date: in10Days.toISOString() },
                    { id: 3, is_legal: true, task_description: 'Inspeccion OCA', asset_name: 'Linea 3', next_due_date: pastDue.toISOString() },
                    { id: 4, is_legal: false, task_description: 'Preventivo normal', asset_name: 'Linea 4', next_due_date: in10Days.toISOString() },
                ]}
            />
        );

        expect(screen.getByText('Vigente')).toBeInTheDocument();
        expect(screen.getByText('Proximo / Vence hoy')).toBeInTheDocument();
        expect(screen.getByText('CADUCADO')).toBeInTheDocument();
        expect(screen.getByText('Sin fecha / por horas')).toBeInTheDocument();
        expect(screen.getByText('Vigente').previousSibling).toHaveTextContent('1');
        expect(screen.getByText('Proximo / Vence hoy').previousSibling).toHaveTextContent('1');
        expect(screen.getByText('CADUCADO').previousSibling).toHaveTextContent('1');
        expect(screen.getByText('Sin fecha / por horas').previousSibling).toHaveTextContent('0');
        expect(screen.getByText('Extintores')).toBeInTheDocument();
        expect(screen.getByText('Calibracion')).toBeInTheDocument();
        expect(screen.getByText('Inspeccion OCA')).toBeInTheDocument();
        expect(screen.queryByText('Preventivo normal')).not.toBeInTheDocument();

        const manageButtons = screen.getAllByRole('button', { name: /gestionar/i });
        const certButtons = screen.getAllByRole('button', { name: /certificados/i });

        await userEvent.click(manageButtons[0]);
        await userEvent.click(certButtons[0]);

        expect(onManagePlan).toHaveBeenCalled();
        expect(onOpenHistory).toHaveBeenCalled();
    });

    it('no marca en rojo los planes legales sin proxima fecha y los clasifica como seguimiento manual', () => {
        render(
            <AdminLegalSection
                onManagePlan={vi.fn()}
                onOpenHistory={vi.fn()}
                plans={[
                    {
                        id: 9,
                        is_legal: true,
                        task_description: 'Compresor bodega care',
                        asset_name: 'Compresor 1',
                        next_due_date: null,
                        last_performed: '2026-04-10T00:00:00Z',
                    },
                ]}
            />
        );

        expect(screen.getByText('Sin fecha / por horas').previousSibling).toHaveTextContent('1');
        expect(screen.getByText('CADUCADO').previousSibling).toHaveTextContent('0');
        expect(screen.getByText('Compresor bodega care')).toHaveStyle({ color: 'var(--neon-cyan)' });
        expect(screen.getByText(/Ultimo registro: 2026-04-10 \| Seguimiento manual/i)).toBeInTheDocument();
    });

    it('muestra el calendario del activo y permite cerrarlo', async () => {
        const onClose = vi.fn();

        render(
            <AdminAssetCalendarModal
                asset={{ id: 7, name: 'Etiquetadora' }}
                onClose={onClose}
                plans={[
                    { id: 1, asset_id: 7, task_description: 'Lubricacion', next_due_date: '2026-04-01T00:00:00Z', frequency_days: 30 },
                    { id: 2, asset_id: 7, task_description: 'Ajuste sensores', next_due_date: '2026-04-15T00:00:00Z', frequency_days: 15 },
                    { id: 3, asset_id: 8, task_description: 'Otro activo', next_due_date: '2026-04-20T00:00:00Z', frequency_days: 10 },
                ]}
            />
        );

        expect(screen.getByText(/Calendario: Etiquetadora/i)).toBeInTheDocument();
        expect(screen.getAllByText('Lubricacion').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Ajuste sensores').length).toBeGreaterThan(0);
        expect(screen.queryByText('Otro activo')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /cerrar/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it('sube documentos en historial legal, registra revision y refresca datos', async () => {
        const fetchHistory = vi.fn().mockResolvedValue();
        const onRefreshConfig = vi.fn().mockResolvedValue();

        axios.post
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    files: [{ url: '/documents/cert-1.pdf' }, { url: '/documents/cert-2.pdf' }],
                },
            })
            .mockResolvedValueOnce({ data: { success: true } });

        render(
            <LegalHistoryModal
                authHeader="Bearer token-demo"
                currentUserId={12}
                fetchHistory={fetchHistory}
                historyData={[
                    {
                        performed_date: '2026-03-01T00:00:00Z',
                        notes: 'Revision previa',
                        operator_name: 'Admin',
                        document_path: '["/documents/previo.pdf"]',
                    },
                ]}
                historyPlan={{ id: 55, task_description: 'Certificacion anual' }}
                onClose={vi.fn()}
                onRefreshConfig={onRefreshConfig}
            />
        );

        const fileInput = document.querySelector('input[type="file"]');
        const file1 = new File(['pdf-1'], 'cert-1.pdf', { type: 'application/pdf' });
        const file2 = new File(['pdf-2'], 'cert-2.pdf', { type: 'application/pdf' });

        expect(fileInput).not.toBeNull();
        await userEvent.upload(fileInput, [file1, file2]);
        const form = document.querySelector('form');
        expect(form).not.toBeNull();
        fireEvent.submit(form);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledTimes(2);
        });

        expect(axios.post).toHaveBeenNthCalledWith(
            1,
            '/api/admin/plans/55/upload',
            expect.any(FormData),
            { headers: { Authorization: 'Bearer token-demo', 'Content-Type': 'multipart/form-data' } }
        );
        expect(axios.post).toHaveBeenNthCalledWith(
            2,
            '/api/admin/maintenance-plans/55/complete',
            {
                operator_id: 12,
                notes: 'Revision completada',
                document_path: JSON.stringify(['/documents/cert-1.pdf', '/documents/cert-2.pdf']),
            },
            { headers: { Authorization: 'Bearer token-demo' } }
        );
        expect(fetchHistory).toHaveBeenCalledWith(55);
        expect(onRefreshConfig).toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalled();
    });

    it('avisa si se intenta registrar historial legal sin archivos', async () => {
        render(
            <LegalHistoryModal
                authHeader="Bearer token-demo"
                currentUserId={12}
                fetchHistory={vi.fn()}
                historyData={[]}
                historyPlan={{ id: 55, task_description: 'Certificacion anual' }}
                onClose={vi.fn()}
                onRefreshConfig={vi.fn()}
            />
        );

        const form = document.querySelector('form');
        expect(form).not.toBeNull();
        fireEvent.submit(form);
        expect(window.alert).toHaveBeenCalledWith('Selecciona al menos un documento PDF/Imagen.');
        expect(axios.post).not.toHaveBeenCalled();
    });
});
