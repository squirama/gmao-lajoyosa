const AssetController = require('../controllers/AssetController');
const PlanController = require('../controllers/PlanController');
const AlertController = require('../controllers/AlertController');
const UserController = require('../controllers/UserController');
const LogController = require('../controllers/LogController');
const ConfigController = require('../controllers/ConfigController');
const HistoryController = require('../controllers/HistoryController');
const ActivityController = require('../controllers/ActivityController');
const CorrectiveActionController = require('../controllers/CorrectiveActionController');
const ProviderController = require('../controllers/ProviderController');

async function routes(fastify, options) {

    // --- Auth ---
    const AuthController = require('../controllers/AuthController');
    fastify.post('/login', AuthController.login);
    fastify.post('/logout', AuthController.logout);
    fastify.get('/me', AuthController.me);
    fastify.get('/admin/me', AuthController.me); // Alias for Admin Panel

    // --- Config, Departments & Locations ---
    fastify.get('/config', ConfigController.getConfig);
    fastify.get('/config/locations', ConfigController.getLocations);
    fastify.get('/config/departments', ConfigController.getDepartments);
    fastify.get('/config/assets', ConfigController.getAssets);
    fastify.get('/config/plans', ConfigController.getPlans);
    fastify.post('/admin/departments', ConfigController.createDepartment);
    fastify.put('/admin/departments/:id', ConfigController.updateDepartment);
    fastify.delete('/admin/departments/:id', ConfigController.deleteDepartment);

    // NUEVA RUTA: Permite al administrador crear sedes desde el panel central
    fastify.post('/admin/locations', ConfigController.createLocation);
    fastify.put('/admin/locations/:id', ConfigController.updateLocation);
    fastify.delete('/admin/locations/:id', ConfigController.deleteLocation);

    fastify.get('/admin/calendar/export', ConfigController.exportCalendar);
    fastify.get('/calendar/events', ConfigController.getCalendarEvents); // JSON para FullCalendar (PUBLICO para Operarios)

    // --- Assets ---
    fastify.get('/admin/assets', AssetController.getAllAssets); // Para el selector de maquinas al crear plan
    fastify.post('/admin/assets', AssetController.createAsset);
    fastify.delete('/admin/assets/:id', AssetController.deleteAsset);

    // --- Operators (Managed via UserController) ---
    // const OperatorController = require('../controllers/OperatorController'); // Deprecated
    fastify.get('/admin/operators', UserController.getUsers);
    fastify.post('/admin/operators', UserController.createUser);
    fastify.put('/admin/operators/:id', UserController.updateUser);
    fastify.delete('/admin/operators/:id', UserController.deleteUser);

    // --- Plans ---
    fastify.put('/admin/asset/:id', AssetController.updateAsset);
    fastify.post('/admin/asset/:id/manual', AssetController.uploadManual);

    // --- Users ---
    fastify.get('/users', UserController.getUsers);
    fastify.get('/users/all', UserController.getAllUsers);
    fastify.post('/users', UserController.createUser);
    fastify.put('/users/:id', UserController.updateUser);
    fastify.delete('/users/:id', UserController.deleteUser);

    // --- Maintenance Requests ---
    const RequestController = require('../controllers/RequestController');
    fastify.post('/requests', RequestController.createRequest);
    fastify.get('/admin/requests', RequestController.getAllRequests);
    fastify.get('/admin/history', HistoryController.getMaintenanceHistory);
    fastify.put('/admin/history/:entry_type/:id/review', HistoryController.reviewHistoryEntry);
    fastify.get('/admin/activity', ActivityController.getOverview);
    fastify.get('/admin/corrective-actions', CorrectiveActionController.getCorrectiveActions);
    fastify.put('/admin/corrective-actions/:id', CorrectiveActionController.updateCorrectiveAction);
    fastify.get('/admin/providers', ProviderController.getProviders);
    fastify.post('/admin/providers', ProviderController.createProvider);
    fastify.put('/admin/providers/:id', ProviderController.updateProvider);
    fastify.delete('/admin/providers/:id', ProviderController.deleteProvider);
    fastify.get('/admin/providers/:id/documents', ProviderController.getProviderDocuments);
    fastify.post('/admin/providers/:id/documents', ProviderController.uploadProviderDocument);
    fastify.delete('/admin/provider-documents/:id', ProviderController.deleteProviderDocument);

    // --- Maintenance Plans ---
    fastify.post('/admin/plans', PlanController.createPlan);
    fastify.put('/admin/plans/:id', PlanController.updatePlan);
    fastify.delete('/admin/plans/:id', PlanController.deletePlan);
    fastify.put('/admin/maintenance-plans/:id/reschedule', PlanController.reschedulePlan);
    fastify.post('/admin/maintenance-plans/:id/skip', PlanController.skipPlan);
    fastify.post('/admin/maintenance-plans/:id/complete', PlanController.completePlan);
    fastify.post('/admin/maintenance-plans/:id/exception', PlanController.createException);
    fastify.get('/admin/plans/:id/history', PlanController.getPlanHistory);
    fastify.get('/admin/plans/:id/documents', PlanController.getPlanDocuments);
    fastify.post('/admin/plans/:id/upload', PlanController.uploadDocument);
    fastify.delete('/admin/plan-documents/:id', PlanController.deletePlanDocument);

    // --- Alerts ---
    fastify.post('/cron/generate', AlertController.generateAlerts);
    fastify.get('/alerts/pending', AlertController.getPendingAlerts);
    fastify.post('/alerts/postpone', AlertController.postponeAlert);

    // --- Logs ---
    fastify.post('/log', LogController.createLog);

    // --- Inventory / Spare Parts ---
    const InventoryController = require('../controllers/InventoryController');
    fastify.get('/inventory', InventoryController.getAllStock);
    fastify.get('/inventory/:id', InventoryController.getStockItem);
    fastify.post('/admin/inventory', InventoryController.createStockItem);
    fastify.post('/admin/inventory/:id/documents', InventoryController.uploadStockDocument);
    fastify.delete('/admin/inventory/:id/documents/:kind', InventoryController.deleteStockDocument);
    fastify.get('/admin/inventory/distribution', InventoryController.getStockDistribution);
    fastify.get('/admin/inventory/movements', InventoryController.getStockMovements);
    fastify.post('/admin/inventory/distribution', InventoryController.upsertStockDistribution);
    fastify.post('/admin/inventory/movements', InventoryController.createStockMovement);
    fastify.put('/admin/inventory/:id', InventoryController.updateStockItem);
    fastify.delete('/admin/inventory/:id', InventoryController.deleteStockItem);

    // --- Reports ---
    const ReportController = require('../controllers/ReportController');
    fastify.get('/reports/history', ReportController.exportHistory);
    fastify.get('/reports/interventions', ReportController.exportInterventions);
    fastify.get('/reports/requests', ReportController.exportRequests);
    fastify.get('/reports/audit-correctives', ReportController.exportAuditCorrectives);
}

module.exports = routes;
