
import React, { Suspense, lazy, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/admin.css'; // Ensure styles are loaded
import AdminAssetCalendarModal from '../components/admin/AdminAssetCalendarModal';
import AdminAssetsSection from '../components/admin/AdminAssetsSection';
import AdminDepartmentsSection from '../components/admin/AdminDepartmentsSection';
import AdminErrorBoundary from '../components/admin/AdminErrorBoundary';
import AdminHistorySection from '../components/admin/AdminHistorySection';
import AdminLegalSection from '../components/admin/AdminLegalSection';
import AdminLocationsSection from '../components/admin/AdminLocationsSection';
import AdminPlansSection from '../components/admin/AdminPlansSection';
import AdminReportsSection from '../components/admin/AdminReportsSection';
import AdminUsersSection from '../components/admin/AdminUsersSection';
import LegalHistoryModal from '../components/admin/LegalHistoryModal';
import { useAdminData } from '../hooks/useAdminData';
import { useAdminAssets } from '../hooks/useAdminAssets';
import { useAdminLocationsDepartments } from '../hooks/useAdminLocationsDepartments';
import { useAdminPlans } from '../hooks/useAdminPlans';
import { usePlanHistory } from '../hooks/usePlanHistory';
import { useAdminReports } from '../hooks/useAdminReports';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAdminHistory } from '../hooks/useAdminHistory';
import { toLocalDateInputValue } from '../utils/adminPanelUtils';

const AdminScheduler = lazy(() => import('../pages/AdminScheduler'));
const AdminInventory = lazy(() => import('../pages/AdminInventory'));

const ADMIN_SECTIONS = [
    'planning',
    'locations',
    'departments',
    'assets',
    'plans',
    'inventory',
    'history',
    'legal',
    'users',
    'reports',
];

const ADMIN_SECTION_LABELS = {
    planning: 'Calendario',
    locations: 'Sedes',
    departments: 'Areas',
    assets: 'Maquinas',
    plans: 'Planes',
    inventory: 'Inventario',
    history: 'Historial',
    legal: 'Normativa',
    users: 'Operarios',
    reports: 'Informes',
};

export default function AdminPanel() {
    const navigate = useNavigate();
    const { section } = useParams();

    // Data and auth state.
    const [authHeader, setAuthHeader] = useState(() => {
        const token = localStorage.getItem('session_token');
        return token ? `Bearer ${token}` : null;
    });
    const { config, assets, refreshAll, refreshAssets, refreshConfig } = useAdminData(authHeader);
    const {
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
    } = useAdminAssets(authHeader, refreshAssets, refreshConfig);
    const {
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
    } = useAdminLocationsDepartments(authHeader, refreshConfig);
    const { closeHistory, fetchHistory, historyData, historyPlan, openHistory } = usePlanHistory(authHeader);
    const {
        deletePlan,
        editingPlan,
        handlePlanSubmit,
        handleReschedule,
        handleSkip,
        planForm,
        resetPlanForm,
        setPlanForm,
        startEditingPlan,
    } = useAdminPlans(authHeader, refreshConfig);
    const {
        editingUser,
        handleDeactivateUser,
        handleUserSubmit,
        refreshUsers,
        resetUserForm,
        setUserForm,
        startEditingUser,
        userForm,
        usersList,
    } = useAdminUsers(authHeader);
    const {
        downloadReport,
        reportAssetId,
        reportEndDate,
        reportStartDate,
        setReportAssetId,
        setReportEndDate,
        setReportStartDate,
    } = useAdminReports(authHeader);
    const {
        fetchHistory: fetchMaintenanceHistory,
        historyError,
        historyFilters,
        historyLoading,
        historyRows,
        setHistoryFilters,
    } = useAdminHistory(authHeader);

    const [loading, setLoading] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const isSuperAdminView = config.user?.role === 'SUPER_ADMIN' || authHeader?.startsWith('Basic ');
    const visibleSections = isSuperAdminView
        ? ADMIN_SECTIONS
        : ADMIN_SECTIONS.filter((sectionName) => sectionName !== 'locations');

    // Modal state.
    const [calendarAsset, setCalendarAsset] = useState(null);
    const activeTab = visibleSections.includes(section) ? section : 'assets';

    const renderLazySection = (node) => (
        <Suspense
            fallback={
                <div className="center-panel">
                    <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
                        <h2 style={{ marginTop: 0 }}>Cargando seccion...</h2>
                        <div style={{ color: 'var(--text-muted)' }}>Preparando contenido.</div>
                    </div>
                </div>
            }
        >
            {node}
        </Suspense>
    );

    // Initial load.
    useEffect(() => {
        if (authHeader) {
            refreshAll(authHeader);
        }
    }, [authHeader]);

    useEffect(() => {
        if (!section) {
            navigate('/admin/assets', { replace: true });
            return;
        }

        if (!visibleSections.includes(section)) {
            navigate('/admin/assets', { replace: true });
        }
    }, [navigate, section, isSuperAdminView]);

    useEffect(() => {
        if (activeTab === 'users' && authHeader) {
            refreshUsers();
        }
    }, [activeTab, authHeader]);

    useEffect(() => {
        setIsMobileNavOpen(false);
    }, [activeTab]);

    // Login.
    const handleLogin = async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        const header = `Basic ${btoa(`${username}:${password}`)}`;

        setLoading(true);

        try {
            await refreshAssets(header);

            setAuthHeader(header);

            await refreshConfig(header);

        } catch (err) {
            console.error(err);
            alert('Acceso denegado o error de servidor');
        } finally {
            setLoading(false);
        }
    };

    // Calendar drag and drop reschedule.
    const handleDragReschedule = async (plan, newDate) => {
        if (!window.confirm(`Mover la tarea '${plan.task_description}' al ${newDate.toLocaleDateString()}?`)) return;

        try {
            const dateStr = toLocalDateInputValue(newDate);

            await axios.put(`/api/admin/maintenance-plans/${plan.id}/reschedule`,
                { new_date: dateStr },
                { headers: { 'Authorization': authHeader } }
            );

            await refreshConfig();

        } catch (e) {
            alert("Error al mover la tarea: " + e.message);
        }
    };

    const handleManageLegalPlan = (plan) => {
        startEditingPlan(plan);
        navigate('/admin/plans');
        window.scrollTo(0, 0);
    };

    const goToAdminSection = (nextSection) => {
        navigate(`/admin/${nextSection}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_info');
        delete axios.defaults.headers.common.Authorization;
        setAuthHeader(null);
        window.location.href = '/login';
    };

    // Calendar click handler.
    const handleSchedulerEvent = (evt) => {
        if (evt.isReal) {
            if (window.confirm(`Plan: ${evt.title}\nEditar o reprogramar esta tarea?`)) {
                startEditingPlan(evt.resource);
                navigate('/admin/plans');
                window.scrollTo(0, 0);
            }
        } else {
            alert(`Proyeccion futura\n${evt.title}\nEsta es una estimacion. Para cambiarla, mueve la tarea original o edita el plan.`);
        }
    };

    // Login view.
    if (!authHeader) return (
        <div className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="card" style={{ width: 400, border: '2px solid var(--neon-cyan)' }}>
                <h1 className="title">ACCESO ADMIN</h1>
                <form onSubmit={handleLogin} style={{ display: 'grid', gap: 20 }}>
                    <input name="username" placeholder="Usuario" defaultValue="admin" style={{ padding: 15 }} />
                    <input name="password" type="password" placeholder="Contrasena" style={{ padding: 15 }} />
                    <button className="hmi-btn" disabled={loading}>{loading ? 'CARGANDO...' : 'ENTRAR'}</button>
                </form>
            </div>
        </div>
    );

    // Main admin layout.
    return (
        <div className="admin-layout">
            <AdminErrorBoundary>
                {isMobileNavOpen && <button className="admin-mobile-backdrop" onClick={() => setIsMobileNavOpen(false)} aria-label="Cerrar navegacion admin" />}
                {/* Sidebar */}
                <div className={`admin-sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
                    <div className="sidebar-brand">GMAO ADMIN <span style={{ fontSize: '0.6rem', color: '#666' }}>v1.2</span></div>

                    <button onClick={() => goToAdminSection('planning')} className={`sidebar-btn ${activeTab === 'planning' ? 'active' : ''}`}>Calendario</button>
                    {isSuperAdminView && (
                        <button onClick={() => goToAdminSection('locations')} className={`sidebar-btn ${activeTab === 'locations' ? 'active' : ''}`}>Sedes</button>
                    )}
                    <button onClick={() => goToAdminSection('departments')} className={`sidebar-btn ${activeTab === 'departments' ? 'active' : ''}`}>Areas</button>
                    <button onClick={() => goToAdminSection('assets')} className={`sidebar-btn ${activeTab === 'assets' ? 'active' : ''}`}>Maquinas</button>
                    <button onClick={() => goToAdminSection('plans')} className={`sidebar-btn ${activeTab === 'plans' ? 'active' : ''}`}>Planes</button>
                    <button onClick={() => goToAdminSection('inventory')} className={`sidebar-btn ${activeTab === 'inventory' ? 'active' : ''}`}>Inventario</button>
                    <button onClick={() => goToAdminSection('history')} className={`sidebar-btn ${activeTab === 'history' ? 'active' : ''}`}>Historial</button>
                    <button onClick={() => goToAdminSection('legal')} className={`sidebar-btn ${activeTab === 'legal' ? 'active' : ''}`} style={{ color: 'var(--neon-orange)' }}>Normativa</button>
                    <button onClick={() => goToAdminSection('users')} className={`sidebar-btn ${activeTab === 'users' ? 'active' : ''}`}>Operarios</button>
                    <button onClick={() => goToAdminSection('reports')} className={`sidebar-btn ${activeTab === 'reports' ? 'active' : ''}`}>Informes</button>

                    <div className="sidebar-footer">
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 5 }}>
                            L:{config.locations?.length || 0} D:{config.departments?.length || 0}
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => window.location.href = '/'} className="sidebar-btn" style={{ flex: 1, fontSize: '0.8rem', color: 'var(--neon-cyan)' }}>Ir a Web</button>
                            <button onClick={handleLogout} className="sidebar-btn" style={{ flex: 1, fontSize: '0.8rem', color: 'var(--neon-red)' }}>Cerrar sesion</button>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="admin-content">
                    <div className="admin-mobile-toolbar">
                        <button className="btn-manual" onClick={() => setIsMobileNavOpen((value) => !value)}>
                            {isMobileNavOpen ? 'Cerrar menu' : 'Menu admin'}
                        </button>
                        <div className="admin-mobile-current">{ADMIN_SECTION_LABELS[activeTab]}</div>
                    </div>

                    {/* A. CALENDARIO */}
                    {activeTab === 'planning' && (
                        renderLazySection(
                            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                                <h2 className="title">CALENDARIO PREVENTIVO GLOBAL</h2>
                                {config.plans && Array.isArray(config.plans) ? (
                                    <AdminScheduler
                                        allPlans={config.plans}
                                        planExceptions={config.plan_exceptions || []}
                                        onSelectEvent={handleSchedulerEvent}
                                        onReschedule={handleDragReschedule}
                                        authHeader={authHeader}
                                        refreshAll={refreshAll}
                                    />
                                ) : (
                                    <div style={{ color: 'red' }}>Error cargando eventos.</div>
                                )}
                            </div>
                        )
                    )}

                    {/* B. SEDES (LOCATIONS) */}
                    {activeTab === 'locations' && (
                        <AdminLocationsSection
                            deleteLocation={deleteLocation}
                            editingLocation={editingLocation}
                            handleLocationSubmit={handleLocationSubmit}
                            locationForm={locationForm}
                            locations={config.locations}
                            resetLocationForm={resetLocationForm}
                            setLocationForm={setLocationForm}
                            startEditingLocation={startEditingLocation}
                        />
                    )}
                    {/* C. AREAS (DEPARTMENTS) */}
                    {activeTab === 'departments' && (
                        <AdminDepartmentsSection
                            deleteDept={deleteDept}
                            departments={config.departments}
                            deptForm={deptForm}
                            editingDept={editingDept}
                            handleDepartmentSubmit={handleDepartmentSubmit}
                            locations={config.locations}
                            resetDepartmentForm={resetDepartmentForm}
                            setDeptForm={setDeptForm}
                            startEditingDepartment={startEditingDepartment}
                        />
                    )}
                    {/* D. MAQUINAS (ASSETS) */}
                    {
                        activeTab === 'assets' && (
                            <AdminAssetsSection
                                assetForm={assetForm}
                                assets={assets}
                                departments={config.departments}
                                deleteAsset={deleteAsset}
                                editingAsset={editingAsset}
                                handleAssetSubmit={handleAssetSubmit}
                                handleLocationChange={handleLocationChange}
                                locations={config.locations}
                                onOpenCalendar={setCalendarAsset}
                                resetAssetForm={resetAssetForm}
                                selectedLocationId={selectedLocationId}
                                setAssetForm={setAssetForm}
                                setUploadFiles={setUploadFiles}
                                startEditingAsset={startEditingAsset}
                                uploadFiles={uploadFiles}
                            />
                        )
                    }

                    {/* E. PLANES (MAINTENANCE PLANS) */}
                    {activeTab === 'plans' && (
                        <AdminPlansSection
                            assets={config.assets}
                            deletePlan={deletePlan}
                            editingPlan={editingPlan}
                            handlePlanSubmit={handlePlanSubmit}
                            handleReschedule={handleReschedule}
                            handleSkip={handleSkip}
                            planForm={planForm}
                            plans={config.plans}
                            resetPlanForm={resetPlanForm}
                            setPlanForm={setPlanForm}
                            startEditingPlan={startEditingPlan}
                        />
                    )}
                    {/* F. OPERARIOS (USERS) */}
                    {activeTab === 'users' && (
                        <AdminUsersSection
                            currentUserRole={config.user?.role}
                            departments={config.departments}
                            editingUser={editingUser}
                            handleDeactivateUser={handleDeactivateUser}
                            handleUserSubmit={handleUserSubmit}
                            locations={config.locations}
                            resetUserForm={resetUserForm}
                            setUserForm={setUserForm}
                            startEditingUser={startEditingUser}
                            userForm={userForm}
                            usersList={usersList}
                        />
                    )}
                    {/* G. NORMATIVA (LEGAL) */}
                    {activeTab === 'legal' && (
                        <AdminLegalSection
                            onManagePlan={handleManageLegalPlan}
                            onOpenHistory={openHistory}
                            plans={config.plans}
                        />
                    )}

                    {/* H. INFORMES (REPORTS) */}
                    {
                        activeTab === 'reports' && (
                            <AdminReportsSection
                                assets={config.assets}
                                downloadReport={downloadReport}
                                reportAssetId={reportAssetId}
                                reportEndDate={reportEndDate}
                                reportStartDate={reportStartDate}
                                setReportAssetId={setReportAssetId}
                                setReportEndDate={setReportEndDate}
                                setReportStartDate={setReportStartDate}
                            />
                        )
                    }

                    {/* I. HISTORIAL */}
                    {activeTab === 'history' && (
                        <AdminHistorySection
                            assets={config.assets || []}
                            departments={config.departments || []}
                            historyError={historyError}
                            historyFilters={historyFilters}
                            historyLoading={historyLoading}
                            historyRows={historyRows}
                            locations={config.locations || []}
                            onApplyFilters={fetchMaintenanceHistory}
                            setHistoryFilters={setHistoryFilters}
                        />
                    )}

                    {/* J. INVENTARIO (REPUESTOS) */}
                    {activeTab === 'inventory' && (
                        renderLazySection(
                            <div className="center-panel" style={{ padding: 0 }}>
                                <AdminInventory assets={config.assets || []} currentUserId={config.user?.id} locations={config.locations || []} />
                            </div>
                        )
                    )}

                    <AdminAssetCalendarModal
                        asset={calendarAsset}
                        onClose={() => setCalendarAsset(null)}
                        plans={config.plans}
                    />

                    <LegalHistoryModal
                        authHeader={authHeader}
                        currentUserId={config.user?.id}
                        fetchHistory={fetchHistory}
                        historyData={historyData}
                        historyPlan={historyPlan}
                        onClose={closeHistory}
                        onRefreshConfig={refreshConfig}
                    />

                </div >
            </AdminErrorBoundary>
        </div >
    );
}

