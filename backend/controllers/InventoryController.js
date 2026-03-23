const { Pool } = require('pg');
const {
    ensureBoolean,
    ensureIntegerArray,
    ensureNonNegativeInteger,
    ensureNonNegativeNumber,
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bodega_maintenance',
    password: process.env.DB_PASSWORD || 'Sesamo00',
    port: process.env.DB_PORT || 5432,
});

exports.getAllStock = async (request, reply) => {
    try {
        const result = await pool.query(`
            SELECT sp.*, array_remove(array_agg(asp.asset_id), NULL) as compatible_assets
            FROM spare_parts sp
            LEFT JOIN asset_spare_parts asp ON sp.id = asp.spare_part_id
            GROUP BY sp.id
            ORDER BY sp.active DESC, sp.name ASC
        `);
        reply.send(result.rows);
    } catch (e) {
        console.error(e);
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
        const result = await pool.query(
            `
            SELECT sp.*, array_remove(array_agg(asp.asset_id), NULL) as compatible_assets
            FROM spare_parts sp
            LEFT JOIN asset_spare_parts asp ON sp.id = asp.spare_part_id
            WHERE sp.id = $1
            GROUP BY sp.id
        `,
            [stockItemId]
        );
        if (result.rows.length === 0) return reply.code(404).send({ error: 'Repuesto no encontrado' });
        reply.send(result.rows[0]);
    } catch (e) {
        console.error(e);
        reply.code(500).send({ error: 'Error al obtener repuesto' });
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO spare_parts
            (part_number, name, description, stock_current, stock_min, cost_price, location, supplier_name, supplier_contact)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [partNumber, name, description, stockCurrent, stockMin, costPrice, location, supplierName, supplierContact]
        );

        const newPartId = result.rows[0].id;

        for (const assetId of compatibleAssets) {
            await client.query(
                'INSERT INTO asset_spare_parts (asset_id, spare_part_id) VALUES ($1, $2)',
                [assetId, newPartId]
            );
        }

        await client.query('COMMIT');

        const finalObj = result.rows[0];
        finalObj.compatible_assets = compatibleAssets;
        reply.code(201).send(finalObj);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE spare_parts
             SET part_number = $1, name = $2, description = $3, stock_current = $4, stock_min = $5,
                 cost_price = $6, location = $7, supplier_name = $8, supplier_contact = $9, active = $10, updated_at = CURRENT_TIMESTAMP
             WHERE id = $11 RETURNING *`,
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

        await client.query('COMMIT');

        const finalObj = result.rows[0];
        finalObj.compatible_assets = compatibleAssets;
        reply.send(finalObj);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
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
            await pool.query('DELETE FROM spare_parts WHERE id = $1', [id]);
        } catch (fkError) {
            await pool.query('UPDATE spare_parts SET active = false WHERE id = $1', [id]);
        }
        reply.send({ message: 'Repuesto eliminado/desactivado correctamente' });
    } catch (e) {
        console.error(e);
        reply.code(500).send({ error: 'Error al eliminar repuesto' });
    }
};
