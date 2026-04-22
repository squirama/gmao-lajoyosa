const db = require('../db');
const {
    applyMovement,
    getOrCreateStockEntry,
    recalculatePartStock,
} = require('../services/inventoryService');
const {
    ensureBoolean,
    ensureEnum,
    ensureIntegerArray,
    ensureNonNegativeInteger,
    ensureNonNegativeNumber,
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

const MOVEMENT_TYPES = ['ENTRY', 'OUTPUT', 'TRANSFER'];

async function loadCompatibleAssets(client, sparePartIds) {
    if (sparePartIds.length === 0) {
        return new Map();
    }

    const compatibleRes = await client.query(
        `SELECT spare_part_id, array_agg(asset_id ORDER BY asset_id) AS compatible_assets
         FROM asset_spare_parts
         WHERE spare_part_id = ANY($1::int[])
         GROUP BY spare_part_id`,
        [sparePartIds]
    );

    return new Map(
        compatibleRes.rows.map((row) => [row.spare_part_id, row.compatible_assets || []])
    );
}

async function loadStockEntries(client, sparePartIds) {
    if (sparePartIds.length === 0) {
        return new Map();
    }

    const stockRes = await client.query(
        `SELECT
            sps.id,
            sps.spare_part_id,
            sps.location_id,
            sps.physical_location,
            sps.quantity,
            sps.updated_at,
            l.name AS location_name
         FROM spare_part_stocks sps
         LEFT JOIN locations l ON l.id = sps.location_id
         WHERE sps.spare_part_id = ANY($1::int[])
         ORDER BY COALESCE(l.name, 'Sin asignar'), sps.physical_location`,
        [sparePartIds]
    );

    const map = new Map();
    for (const row of stockRes.rows) {
        const current = map.get(row.spare_part_id) || [];
        current.push({
            id: row.id,
            location_id: row.location_id,
            location_name: row.location_name || 'Sin asignar',
            physical_location: row.physical_location,
            quantity: Number(row.quantity || 0),
            updated_at: row.updated_at,
        });
        map.set(row.spare_part_id, current);
    }

    return map;
}

async function enrichInventoryRows(client, rows) {
    const sparePartIds = rows.map((row) => row.id);
    const compatibleMap = await loadCompatibleAssets(client, sparePartIds);
    const stockMap = await loadStockEntries(client, sparePartIds);

    return rows.map((row) => ({
        ...row,
        compatible_assets: compatibleMap.get(row.id) || [],
        stock_locations: stockMap.get(row.id) || [],
    }));
}

async function getInventoryItemById(client, stockItemId) {
    const result = await client.query(
        'SELECT * FROM spare_parts WHERE id = $1',
        [stockItemId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    const [item] = await enrichInventoryRows(client, result.rows);
    return item;
}

exports.getAllStock = async (request, reply) => {
    try {
        const partsRes = await db.query(
            'SELECT * FROM spare_parts ORDER BY active DESC, name ASC'
        );

        const rows = await enrichInventoryRows(db, partsRes.rows);
        reply.send(rows);
    } catch (error) {
        console.error(error);
        reply.code(500).send({ error: 'Error al obtener inventario' });
    }
};

exports.getStockItem = async (request, reply) => {
    let stockItemId;
    try {
        stockItemId = ensurePositiveInteger(request.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    try {
        const item = await getInventoryItemById(db, stockItemId);
        if (!item) {
            return reply.code(404).send({ error: 'Repuesto no encontrado' });
        }

        reply.send(item);
    } catch (error) {
        console.error(error);
        reply.code(500).send({ error: 'Error al obtener repuesto' });
    }
};

exports.getStockDistribution = async (request, reply) => {
    let locationId = null;
    const query = String(request.query?.q || '').trim().toLowerCase();

    try {
        if (request.query?.location_id) {
            locationId = ensurePositiveInteger(request.query.location_id, 'location_id');
        }
    } catch (error) {
        return sendValidationError(reply, error);
    }

    try {
        const filters = [];
        const params = [];

        if (locationId) {
            params.push(locationId);
            filters.push(`sps.location_id = $${params.length}`);
        }

        if (query) {
            params.push(`%${query}%`);
            const position = params.length;
            filters.push(`(
                LOWER(sp.part_number) LIKE $${position}
                OR LOWER(sp.name) LIKE $${position}
                OR LOWER(COALESCE(sps.physical_location, '')) LIKE $${position}
                OR LOWER(COALESCE(l.name, 'sin asignar')) LIKE $${position}
            )`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const distributionRes = await db.query(
            `SELECT
                sps.id,
                sps.spare_part_id,
                sp.part_number,
                sp.name,
                sp.active,
                sps.location_id,
                COALESCE(l.name, 'Sin asignar') AS location_name,
                sps.physical_location,
                sps.quantity,
                sps.updated_at
             FROM spare_part_stocks sps
             JOIN spare_parts sp ON sp.id = sps.spare_part_id
             LEFT JOIN locations l ON l.id = sps.location_id
             ${whereClause}
             ORDER BY COALESCE(l.name, 'Sin asignar'), sp.name, sps.physical_location`,
            params
        );

        reply.send(distributionRes.rows);
    } catch (error) {
        console.error(error);
        reply.code(500).send({ error: 'Error al obtener el stock por sede' });
    }
};

exports.getStockMovements = async (request, reply) => {
    try {
        const movementRes = await db.query(
            `SELECT
                m.id,
                m.spare_part_id,
                m.movement_type,
                m.quantity,
                m.notes,
                m.created_at,
                sp.part_number,
                sp.name AS part_name,
                src.location_id AS source_location_id,
                COALESCE(srcLoc.name, 'Sin asignar') AS source_location_name,
                src.physical_location AS source_physical_location,
                dst.location_id AS destination_location_id,
                COALESCE(dstLoc.name, 'Sin asignar') AS destination_location_name,
                dst.physical_location AS destination_physical_location,
                u.full_name AS user_name
             FROM spare_part_movements m
             JOIN spare_parts sp ON sp.id = m.spare_part_id
             LEFT JOIN spare_part_stocks src ON src.id = m.source_stock_id
             LEFT JOIN locations srcLoc ON srcLoc.id = src.location_id
             LEFT JOIN spare_part_stocks dst ON dst.id = m.destination_stock_id
             LEFT JOIN locations dstLoc ON dstLoc.id = dst.location_id
             LEFT JOIN users u ON u.id = m.user_id
             ORDER BY m.created_at DESC
             LIMIT 200`
        );

        reply.send(movementRes.rows);
    } catch (error) {
        console.error(error);
        reply.code(500).send({ error: 'Error al obtener movimientos de stock' });
    }
};

exports.createStockItem = async (request, reply) => {
    let partNumber;
    let name;
    let description;
    let stockCurrent;
    let stockMin;
    let costPrice;
    let location;
    let supplierName;
    let supplierContact;
    let compatibleAssets;

    try {
        const body = ensureObject(request.body, 'inventory');
        partNumber = ensureString(body.part_number, 'part_number', { maxLength: 80 });
        name = ensureString(body.name, 'name', { maxLength: 160 });
        description = ensureString(body.description, 'description', { required: false, allowEmpty: true, maxLength: 2000 });
        stockCurrent = ensureNonNegativeInteger(body.stock_current, 'stock_current', { required: false, defaultValue: 0 });
        stockMin = ensureNonNegativeInteger(body.stock_min, 'stock_min', { required: false, defaultValue: 0 });
        costPrice = ensureNonNegativeNumber(body.cost_price, 'cost_price', { required: false, defaultValue: 0 });
        location = ensureString(body.location, 'location', { required: false, allowEmpty: true, maxLength: 160 });
        supplierName = ensureString(body.supplier_name, 'supplier_name', { required: false, allowEmpty: true, maxLength: 160 });
        supplierContact = ensureString(body.supplier_contact, 'supplier_contact', { required: false, allowEmpty: true, maxLength: 160 });
        compatibleAssets = ensureIntegerArray(body.compatible_assets, 'compatible_assets');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO spare_parts
             (part_number, name, description, stock_current, stock_min, cost_price, location, supplier_name, supplier_contact)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [partNumber, name, description, stockCurrent, stockMin, costPrice, location, supplierName, supplierContact]
        );

        const newPartId = result.rows[0].id;

        for (const assetId of compatibleAssets) {
            await client.query(
                'INSERT INTO asset_spare_parts (asset_id, spare_part_id) VALUES ($1, $2)',
                [assetId, newPartId]
            );
        }

        if (stockCurrent > 0 || location) {
            const stockEntry = await getOrCreateStockEntry(client, {
                sparePartId: newPartId,
                physicalLocation: location || 'Sin asignar',
            });

            await client.query(
                'UPDATE spare_part_stocks SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [stockCurrent, stockEntry.id]
            );
        }

        await recalculatePartStock(client, newPartId);
        await client.query('COMMIT');

        const finalItem = await getInventoryItemById(client, newPartId);
        reply.code(201).send(finalItem);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        reply.code(500).send({ error: 'Error al crear repuesto' });
    } finally {
        client.release();
    }
};

exports.updateStockItem = async (request, reply) => {
    let id;
    let partNumber;
    let name;
    let description;
    let stockCurrent;
    let stockMin;
    let costPrice;
    let location;
    let supplierName;
    let supplierContact;
    let active;
    let compatibleAssets;

    try {
        const body = ensureObject(request.body, 'inventory');
        id = ensurePositiveInteger(request.params.id, 'id');
        partNumber = ensureString(body.part_number, 'part_number', { maxLength: 80 });
        name = ensureString(body.name, 'name', { maxLength: 160 });
        description = ensureString(body.description, 'description', { required: false, allowEmpty: true, maxLength: 2000 });
        stockCurrent = ensureNonNegativeInteger(body.stock_current, 'stock_current', { required: false, defaultValue: 0 });
        stockMin = ensureNonNegativeInteger(body.stock_min, 'stock_min', { required: false, defaultValue: 0 });
        costPrice = ensureNonNegativeNumber(body.cost_price, 'cost_price', { required: false, defaultValue: 0 });
        location = ensureString(body.location, 'location', { required: false, allowEmpty: true, maxLength: 160 });
        supplierName = ensureString(body.supplier_name, 'supplier_name', { required: false, allowEmpty: true, maxLength: 160 });
        supplierContact = ensureString(body.supplier_contact, 'supplier_contact', { required: false, allowEmpty: true, maxLength: 160 });
        active = ensureBoolean(body.active, 'active', { defaultValue: true });
        compatibleAssets = ensureIntegerArray(body.compatible_assets, 'compatible_assets');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE spare_parts
             SET part_number = $1,
                 name = $2,
                 description = $3,
                 stock_current = $4,
                 stock_min = $5,
                 cost_price = $6,
                 location = $7,
                 supplier_name = $8,
                 supplier_contact = $9,
                 active = $10,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $11
             RETURNING *`,
            [partNumber, name, description, stockCurrent, stockMin, costPrice, location, supplierName, supplierContact, active, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return reply.code(404).send({ error: 'Repuesto no encontrado' });
        }

        await client.query('DELETE FROM asset_spare_parts WHERE spare_part_id = $1', [id]);
        for (const assetId of compatibleAssets) {
            await client.query(
                'INSERT INTO asset_spare_parts (asset_id, spare_part_id) VALUES ($1, $2)',
                [assetId, id]
            );
        }

        await recalculatePartStock(client, id);
        await client.query('COMMIT');

        const finalItem = await getInventoryItemById(client, id);
        reply.send(finalItem);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        reply.code(500).send({ error: 'Error al actualizar repuesto' });
    } finally {
        client.release();
    }
};

exports.deleteStockItem = async (request, reply) => {
    let id;
    try {
        id = ensurePositiveInteger(request.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    try {
        try {
            await db.query('DELETE FROM spare_parts WHERE id = $1', [id]);
        } catch (fkError) {
            await db.query('UPDATE spare_parts SET active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
        }
        reply.send({ message: 'Repuesto eliminado/desactivado correctamente' });
    } catch (error) {
        console.error(error);
        reply.code(500).send({ error: 'Error al eliminar repuesto' });
    }
};

exports.upsertStockDistribution = async (request, reply) => {
    let sparePartId;
    let locationId;
    let physicalLocation;
    let quantity;

    try {
        const body = ensureObject(request.body, 'stockDistribution');
        sparePartId = ensurePositiveInteger(body.spare_part_id, 'spare_part_id');
        locationId = ensurePositiveInteger(body.location_id, 'location_id');
        physicalLocation = ensureString(body.physical_location, 'physical_location', { maxLength: 255 });
        quantity = ensureNonNegativeInteger(body.quantity, 'quantity');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const partRes = await client.query('SELECT id FROM spare_parts WHERE id = $1', [sparePartId]);
        if (partRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return reply.code(404).send({ error: 'Repuesto no encontrado' });
        }

        const entry = await getOrCreateStockEntry(client, {
            sparePartId,
            locationId,
            physicalLocation,
        });

        await client.query(
            'UPDATE spare_part_stocks SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [quantity, entry.id]
        );

        await recalculatePartStock(client, sparePartId);
        await client.query('COMMIT');

        return reply.send({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return reply.code(500).send({ error: 'Error al guardar el stock por sede' });
    } finally {
        client.release();
    }
};

exports.createStockMovement = async (request, reply) => {
    let sparePartId;
    let movementType;
    let quantity;
    let sourceStockId;
    let destinationLocationId;
    let destinationPhysicalLocation;
    let notes;
    let userId;

    try {
        const body = ensureObject(request.body, 'stockMovement');
        sparePartId = ensurePositiveInteger(body.spare_part_id, 'spare_part_id');
        movementType = ensureEnum(body.movement_type, 'movement_type', MOVEMENT_TYPES);
        quantity = ensurePositiveInteger(body.quantity, 'quantity');
        sourceStockId = ensurePositiveInteger(body.source_stock_id, 'source_stock_id', { required: false });
        destinationLocationId = ensurePositiveInteger(body.destination_location_id, 'destination_location_id', { required: false });
        destinationPhysicalLocation = ensureString(body.destination_physical_location, 'destination_physical_location', { required: false, allowEmpty: true, maxLength: 255 });
        notes = ensureString(body.notes, 'notes', { required: false, allowEmpty: true, maxLength: 2000 });
        userId = ensurePositiveInteger(body.user_id, 'user_id', { required: false });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    if ((movementType === 'OUTPUT' || movementType === 'TRANSFER') && !sourceStockId) {
        return reply.code(400).send({ error: 'source_stock_id es obligatorio para este movimiento' });
    }

    if ((movementType === 'ENTRY' || movementType === 'TRANSFER') && (!destinationLocationId || !destinationPhysicalLocation)) {
        return reply.code(400).send({ error: 'Debes indicar sede y ubicacion de destino' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const partRes = await client.query('SELECT id FROM spare_parts WHERE id = $1', [sparePartId]);
        if (partRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return reply.code(404).send({ error: 'Repuesto no encontrado' });
        }

        const result = await applyMovement(client, {
            sparePartId,
            movementType,
            quantity,
            sourceStockId,
            destinationLocationId,
            destinationPhysicalLocation,
            notes,
            userId,
        });

        await client.query('COMMIT');
        reply.code(201).send(result);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        const statusCode = /no encontrada|no encontrado|No hay stock suficiente/i.test(error.message || '') ? 400 : 500;
        reply.code(statusCode).send({ error: error.message || 'Error al registrar movimiento' });
    } finally {
        client.release();
    }
};

const path = require('path');
const fs = require('fs');
const util = require('util');
const { pipeline } = require('stream');

// POST /admin/inventory/:id/documents
exports.uploadStockDocument = async (request, reply) => {
    let id;
    try {
        id = parseInt(request.params.id, 10);
    } catch (e) {
        return reply.code(400).send({ error: 'ID invalido' });
    }
    const documentsPath = process.env.DOCUMENTS_PATH || path.join(__dirname, '..', 'uploads', 'documents');
    if (!fs.existsSync(documentsPath)) fs.mkdirSync(documentsPath, { recursive: true });

    const parts = request.parts();
    const files = [];
    for await (const part of parts) {
        if (!part.file) continue;
        const safeFilename = `inv_${id}_${Date.now()}_${part.filename.replace(/[^a-zA-Z0-9._-]/g, '')}`;
        const targetPath = path.join(documentsPath, safeFilename);
        await util.promisify(pipeline)(part.file, fs.createWriteStream(targetPath));
        files.push({ filename: safeFilename, url: `/documents/${safeFilename}` });
    }
    return { success: true, files };
};

// DELETE /admin/inventory/:id/documents/:kind
exports.deleteStockDocument = async (request, reply) => {
    return { success: true };
};
