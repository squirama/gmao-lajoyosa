const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gmao',
    password: process.env.DB_PASSWORD || 'change_me',
    port: process.env.DB_PORT || 5432,
});

// GET all inventory (including compatible assets)
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

// GET single item
exports.getStockItem = async (request, reply) => {
    try {
        const result = await pool.query(`
            SELECT sp.*, array_remove(array_agg(asp.asset_id), NULL) as compatible_assets 
            FROM spare_parts sp
            LEFT JOIN asset_spare_parts asp ON sp.id = asp.spare_part_id
            WHERE sp.id = $1
            GROUP BY sp.id
        `, [request.params.id]);
        if (result.rows.length === 0) return reply.code(404).send({ error: 'Repuesto no encontrado' });
        reply.send(result.rows[0]);
    } catch (e) {
        console.error(e);
        reply.code(500).send({ error: 'Error al obtener repuesto' });
    }
};

// CREATE new item
exports.createStockItem = async (request, reply) => {
    const { part_number, name, description, stock_current, stock_min, cost_price, location, supplier_name, supplier_contact, compatible_assets } = request.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Insert into spare_parts
        const result = await client.query(
            `INSERT INTO spare_parts 
            (part_number, name, description, stock_current, stock_min, cost_price, location, supplier_name, supplier_contact) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [part_number, name, description, stock_current || 0, stock_min || 0, cost_price || 0.00, location, supplier_name, supplier_contact]
        );

        const newPartId = result.rows[0].id;

        // 2. Insert compatible assets if any
        if (Array.isArray(compatible_assets) && compatible_assets.length > 0) {
            for (let assetId of compatible_assets) {
                await client.query(
                    `INSERT INTO asset_spare_parts (asset_id, spare_part_id) VALUES ($1, $2)`,
                    [assetId, newPartId]
                );
            }
        }

        await client.query('COMMIT');

        const finalObj = result.rows[0];
        finalObj.compatible_assets = compatible_assets || [];
        reply.code(201).send(finalObj);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        reply.code(500).send({ error: 'Error al crear repuesto' });
    } finally {
        client.release();
    }
};

// UPDATE item
exports.updateStockItem = async (request, reply) => {
    const { id } = request.params;
    const { part_number, name, description, stock_current, stock_min, cost_price, location, supplier_name, supplier_contact, active, compatible_assets } = request.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update basic info
        const result = await client.query(
            `UPDATE spare_parts 
             SET part_number = $1, name = $2, description = $3, stock_current = $4, stock_min = $5, 
                 cost_price = $6, location = $7, supplier_name = $8, supplier_contact = $9, active = $10, updated_at = CURRENT_TIMESTAMP
             WHERE id = $11 RETURNING *`,
            [part_number, name, description, stock_current, stock_min, cost_price, location, supplier_name, supplier_contact, active, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return reply.code(404).send({ error: 'Repuesto no encontrado' });
        }

        // 2. Update compatible assets (Delete existing and re-insert)
        if (Array.isArray(compatible_assets)) {
            await client.query('DELETE FROM asset_spare_parts WHERE spare_part_id = $1', [id]);
            for (let assetId of compatible_assets) {
                await client.query(
                    `INSERT INTO asset_spare_parts (asset_id, spare_part_id) VALUES ($1, $2)`,
                    [assetId, id]
                );
            }
        }

        await client.query('COMMIT');

        const finalObj = result.rows[0];
        finalObj.compatible_assets = compatible_assets || [];
        reply.send(finalObj);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        reply.code(500).send({ error: 'Error al actualizar repuesto' });
    } finally {
        client.release();
    }
};

// DELETE item
exports.deleteStockItem = async (request, reply) => {
    const { id } = request.params;
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
