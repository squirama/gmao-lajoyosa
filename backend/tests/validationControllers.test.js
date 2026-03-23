const test = require('node:test');
const assert = require('node:assert/strict');

const AssetController = require('../controllers/AssetController');
const InventoryController = require('../controllers/InventoryController');
const PlanController = require('../controllers/PlanController');
const RequestController = require('../controllers/RequestController');
const UserController = require('../controllers/UserController');
const { createReply } = require('./helpers');

test('createPlan devuelve 400 si asset_id no es valido', async () => {
    const reply = createReply();
    const result = await PlanController.createPlan({
        body: {
            asset_id: 'abc',
            task_description: 'Revision',
            frequency_days: 30,
        },
    }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'asset_id debe ser un entero positivo' });
});

test('createAsset devuelve 400 si faltan campos obligatorios', async () => {
    const reply = createReply();
    const result = await AssetController.createAsset({
        body: {
            dept_id: '',
            name: '',
        },
    }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'dept_id es obligatorio' });
});

test('createUser devuelve 400 si department_ids no es una lista', async () => {
    const reply = createReply();
    const result = await UserController.createUser({
        body: {
            full_name: 'Operario Uno',
            username: 'operario1',
            role: 'OPERATOR',
            department_ids: '1,2',
        },
    }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'department_ids debe ser una lista' });
});

test('createRequest devuelve 400 si urgency no es valida', async () => {
    const reply = createReply();
    const result = await RequestController.createRequest({
        body: {
            operator_name: 'Juan',
            reason: 'Parada de linea',
            urgency: 'Critica',
        },
    }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'urgency tiene un valor invalido' });
});

test('createStockItem devuelve 400 si stock_current es negativo', async () => {
    const reply = createReply();
    const result = await InventoryController.createStockItem({
        body: {
            part_number: 'REP-001',
            name: 'Rodamiento',
            stock_current: -1,
        },
    }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'stock_current debe ser un entero no negativo' });
});

test('upsertStockDistribution devuelve 400 si falta la sede', async () => {
    const reply = createReply();
    const result = await InventoryController.upsertStockDistribution({
        body: {
            spare_part_id: 1,
            physical_location: 'Almacen central',
            quantity: 5,
        },
    }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'location_id es obligatorio' });
});

test('createStockMovement devuelve 400 si falta destino en una entrada', async () => {
    const reply = createReply();
    const result = await InventoryController.createStockMovement({
        body: {
            spare_part_id: 1,
            movement_type: 'ENTRY',
            quantity: 2,
        },
    }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'Debes indicar sede y ubicacion de destino' });
});
