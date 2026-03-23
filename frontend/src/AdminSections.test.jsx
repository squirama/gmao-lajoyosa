import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminAssetsSection from './components/admin/AdminAssetsSection';
import AdminHistorySection from './components/admin/AdminHistorySection';
import AdminPlansSection from './components/admin/AdminPlansSection';
import AdminReportsSection from './components/admin/AdminReportsSection';

describe('Admin sections', () => {
    it('assets filtra departamentos por sede y dispara acciones principales', async () => {
        const handleLocationChange = vi.fn();
        const setAssetForm = vi.fn();
        const setUploadFiles = vi.fn();
        const resetAssetForm = vi.fn();
        const onOpenCalendar = vi.fn();
        const startEditingAsset = vi.fn();
        const deleteAsset = vi.fn();
        const handleAssetSubmit = vi.fn((e) => e.preventDefault());

        render(
            <AdminAssetsSection
                assetForm={{ dept_id: '', name: '', brand: '', model: '', manual_filename: '' }}
                assets={[{ id: 9, name: 'Llenadora 1', brand: 'KHS', model: 'A1' }]}
                departments={[
                    { id: 1, name: 'Produccion', location_id: 1 },
                    { id: 2, name: 'Laboratorio', location_id: 2 },
                ]}
                deleteAsset={deleteAsset}
                editingAsset={false}
                handleAssetSubmit={handleAssetSubmit}
                handleLocationChange={handleLocationChange}
                locations={[
                    { id: 1, name: 'Sede Norte' },
                    { id: 2, name: 'Sede Sur' },
                ]}
                onOpenCalendar={onOpenCalendar}
                resetAssetForm={resetAssetForm}
                selectedLocationId="1"
                setAssetForm={setAssetForm}
                setUploadFiles={setUploadFiles}
                startEditingAsset={startEditingAsset}
                uploadFiles={[]}
            />
        );

        const selects = screen.getAllByRole('combobox');
        expect(screen.getByRole('option', { name: 'Produccion' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Laboratorio' })).not.toBeInTheDocument();

        await userEvent.selectOptions(selects[0], '2');
        expect(handleLocationChange).toHaveBeenCalledWith('2');

        await userEvent.click(screen.getByRole('button', { name: 'CALENDARIO' }));
        expect(onOpenCalendar).toHaveBeenCalledWith({ id: 9, name: 'Llenadora 1', brand: 'KHS', model: 'A1' });

        await userEvent.click(screen.getByRole('button', { name: 'EDITAR' }));
        expect(startEditingAsset).toHaveBeenCalledWith({ id: 9, name: 'Llenadora 1', brand: 'KHS', model: 'A1' });

        await userEvent.click(screen.getByRole('button', { name: 'BORRAR' }));
        expect(deleteAsset).toHaveBeenCalledWith(9);
    });

    it('plans muestra acciones de recurrente y permite cancelar edicion', async () => {
        const deletePlan = vi.fn();
        const handlePlanSubmit = vi.fn((e) => e.preventDefault());
        const handleReschedule = vi.fn();
        const handleSkip = vi.fn();
        const resetPlanForm = vi.fn();
        const setPlanForm = vi.fn();
        const startEditingPlan = vi.fn();

        render(
            <AdminPlansSection
                assets={[{ id: 5, name: 'Etiquetadora', loc_name: 'Principal' }]}
                deletePlan={deletePlan}
                editingPlan={true}
                handlePlanSubmit={handlePlanSubmit}
                handleReschedule={handleReschedule}
                handleSkip={handleSkip}
                planForm={{
                    asset_id: '5',
                    task_description: 'Revision mensual',
                    frequency_days: '30',
                    start_date: '2026-03-01',
                    notify_external: false,
                    is_legal: true,
                    force_dow: false,
                }}
                plans={[
                    { id: 7, asset_id: 5, task_description: 'Revision mensual', frequency_days: 30, next_due_date: '2026-04-01T00:00:00Z' },
                    { id: 8, asset_id: 5, task_description: 'Auditoria puntual', frequency_days: 0, next_due_date: null },
                ]}
                resetPlanForm={resetPlanForm}
                setPlanForm={setPlanForm}
                startEditingPlan={startEditingPlan}
            />
        );

        expect(screen.getByText('EDITAR PLAN')).toBeInTheDocument();
        expect(screen.getByText(/revision mensual/i)).toBeInTheDocument();
        expect(screen.getByText(/auditoria puntual/i)).toBeInTheDocument();

        await userEvent.click(screen.getByTitle('Reprogramar'));
        expect(handleReschedule).toHaveBeenCalledWith(
            expect.objectContaining({ id: 7, task_description: 'Revision mensual' })
        );

        await userEvent.click(screen.getByTitle('Saltar turno'));
        expect(handleSkip).toHaveBeenCalledWith(
            expect.objectContaining({ id: 7, task_description: 'Revision mensual' })
        );

        await userEvent.click(screen.getByRole('button', { name: 'CANCELAR' }));
        expect(resetPlanForm).toHaveBeenCalled();
    });

    it('reports propaga filtros y descarga el tipo correcto de informe', async () => {
        const downloadReport = vi.fn();
        const setReportAssetId = vi.fn();
        const setReportStartDate = vi.fn();
        const setReportEndDate = vi.fn();

        render(
            <AdminReportsSection
                assets={[{ id: 1, name: 'Llenadora', brand: 'KHS' }]}
                downloadReport={downloadReport}
                reportAssetId=""
                reportEndDate="2026-03-31"
                reportStartDate="2026-03-01"
                setReportAssetId={setReportAssetId}
                setReportEndDate={setReportEndDate}
                setReportStartDate={setReportStartDate}
            />
        );

        const dateInputs = screen.getAllByDisplayValue(/2026-03-/i);
        fireEvent.change(dateInputs[0], { target: { value: '2026-03-05' } });
        expect(setReportStartDate).toHaveBeenCalledWith('2026-03-05');

        const selects = screen.getAllByRole('combobox');
        await userEvent.selectOptions(selects[0], '1');
        expect(setReportAssetId).toHaveBeenCalledWith('1');

        const buttons = screen.getAllByRole('button', { name: 'DESCARGAR CSV' });
        await userEvent.click(buttons[0]);
        await userEvent.click(buttons[1]);
        await userEvent.click(buttons[2]);

        expect(downloadReport).toHaveBeenNthCalledWith(1, 'history');
        expect(downloadReport).toHaveBeenNthCalledWith(2, 'interventions');
        expect(downloadReport).toHaveBeenNthCalledWith(3, 'requests');
    });

    it('history muestra adjuntos y aplica filtros', async () => {
        const onApplyFilters = vi.fn();
        const setHistoryFilters = vi.fn();

        render(
            <AdminHistorySection
                assets={[{ id: 3, name: 'Encajadora', dept_id: 8 }]}
                departments={[{ id: 8, name: 'Produccion', location_id: 2 }]}
                historyError=""
                historyFilters={{
                    start: '2026-03-01',
                    end: '2026-03-31',
                    location_id: '',
                    department_id: '',
                    asset_id: '',
                    with_documents: true,
                }}
                historyLoading={false}
                historyRows={[{
                    id: 77,
                    asset_name: 'Encajadora',
                    task_description: 'Revision de cadena',
                    location_name: 'Sede Central',
                    department_name: 'Produccion',
                    operator_name: 'Laura',
                    notes: 'Se adjunta parte externo',
                    document_path: '["/documents/parte-1.pdf","/documents/foto-1.jpg"]',
                    created_at: '2026-03-18T08:30:00.000Z',
                    entry_type: 'corrective',
                    duration_minutes: 45,
                    solution: 'Cambio de rodamiento',
                }]}
                locations={[{ id: 2, name: 'Sede Central' }]}
                onApplyFilters={onApplyFilters}
                setHistoryFilters={setHistoryFilters}
            />
        );

        expect(screen.getByText(/historial de mantenimientos/i)).toBeInTheDocument();
        expect(screen.getAllByText('Encajadora').length).toBeGreaterThan(0);
        expect(screen.getByText('Correctivo')).toBeInTheDocument();
        expect(screen.getByText(/cambio de rodamiento/i)).toBeInTheDocument();
        expect(screen.getByText(/2 adjunto/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Ver archivo 1' })).toHaveAttribute('href', '/documents/parte-1.pdf');

        const selects = screen.getAllByRole('combobox');
        await userEvent.selectOptions(selects[0], '2');
        expect(setHistoryFilters).toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: /aplicar filtros/i }));
        expect(onApplyFilters).toHaveBeenCalledWith(expect.objectContaining({ with_documents: true }));
    });
});
