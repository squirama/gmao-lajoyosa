async function recalculatePartStock(client, sparePartId) {
    const totalRes = await client.query(
        'SELECT COALESCE(SUM(quantity), 0) AS total_stock FROM spare_part_stocks WHERE spare_part_id = $1',
        [sparePartId]
    );

    const totalStock = Number(totalRes.rows[0]?.total_stock || 0);

    await client.query(
        'UPDATE spare_parts SET stock_current = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [totalStock, sparePartId]
    );

    return totalStock;
}

async function getOrCreateStockEntry(client, { sparePartId, locationId = null, physicalLocation }) {
    const normalizedPhysicalLocation = (physicalLocation || '').trim() || 'Sin asignar';
    const params = [sparePartId, normalizedPhysicalLocation];

    let selectSql = `
        SELECT *
        FROM spare_part_stocks
        WHERE spare_part_id = $1
          AND physical_location = $2
          AND location_id IS NULL
        FOR UPDATE
    `;

    if (locationId) {
        params.push(locationId);
        selectSql = `
            SELECT *
            FROM spare_part_stocks
            WHERE spare_part_id = $1
              AND physical_location = $2
              AND location_id = $3
            FOR UPDATE
        `;
    }

    const existing = await client.query(selectSql, params);
    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    const inserted = await client.query(
        `INSERT INTO spare_part_stocks (spare_part_id, location_id, physical_location, quantity)
         VALUES ($1, $2, $3, 0)
         RETURNING *`,
        [sparePartId, locationId || null, normalizedPhysicalLocation]
    );

    return inserted.rows[0];
}

async function applyMovement(client, movement) {
    const {
        sparePartId,
        movementType,
        quantity,
        sourceStockId = null,
        destinationLocationId = null,
        destinationPhysicalLocation = null,
        notes = null,
        userId = null,
    } = movement;

    let sourceEntry = null;
    let destinationEntry = null;

    if (movementType === 'OUTPUT' || movementType === 'TRANSFER') {
        const sourceRes = await client.query(
            'SELECT * FROM spare_part_stocks WHERE id = $1 AND spare_part_id = $2 FOR UPDATE',
            [sourceStockId, sparePartId]
        );

        if (sourceRes.rows.length === 0) {
            throw new Error('Ubicacion de origen no encontrada para este material');
        }

        sourceEntry = sourceRes.rows[0];
        if (Number(sourceEntry.quantity) < quantity) {
            throw new Error('No hay stock suficiente en la ubicacion de origen');
        }
    }

    if (movementType === 'ENTRY' || movementType === 'TRANSFER') {
        destinationEntry = await getOrCreateStockEntry(client, {
            sparePartId,
            locationId: destinationLocationId,
            physicalLocation: destinationPhysicalLocation,
        });
    }

    if (movementType === 'OUTPUT' || movementType === 'TRANSFER') {
        await client.query(
            'UPDATE spare_part_stocks SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [quantity, sourceEntry.id]
        );
    }

    if (movementType === 'ENTRY' || movementType === 'TRANSFER') {
        await client.query(
            'UPDATE spare_part_stocks SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [quantity, destinationEntry.id]
        );
    }

    const movementRes = await client.query(
        `INSERT INTO spare_part_movements
         (spare_part_id, movement_type, quantity, source_stock_id, destination_stock_id, notes, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            sparePartId,
            movementType,
            quantity,
            sourceEntry?.id || null,
            destinationEntry?.id || null,
            notes || null,
            userId || null,
        ]
    );

    const totalStock = await recalculatePartStock(client, sparePartId);

    return {
        movement: movementRes.rows[0],
        totalStock,
    };
}

async function resolveAssetLocationId(client, references) {
    if (references.asset_id) {
        const res = await client.query(
            `SELECT d.location_id
             FROM assets a
             JOIN departments d ON d.id = a.dept_id
             WHERE a.id = $1`,
            [references.asset_id]
        );
        return res.rows[0]?.location_id || null;
    }

    if (references.history_id) {
        const res = await client.query(
            `SELECT d.location_id
             FROM maintenance_history mh
             JOIN assets a ON a.id = mh.asset_id
             JOIN departments d ON d.id = a.dept_id
             WHERE mh.id = $1`,
            [references.history_id]
        );
        return res.rows[0]?.location_id || null;
    }

    if (references.intervention_id) {
        const res = await client.query(
            `SELECT d.location_id
             FROM intervention_logs il
             JOIN assets a ON a.id = il.asset_id
             JOIN departments d ON d.id = a.dept_id
             WHERE il.id = $1`,
            [references.intervention_id]
        );
        return res.rows[0]?.location_id || null;
    }

    return null;
}

async function deductConsumedStock(client, { sparePartId, quantity, preferredLocationId = null }) {
    let remaining = quantity;

    const stockRows = await client.query(
        `SELECT *
         FROM spare_part_stocks
         WHERE spare_part_id = $1
         ORDER BY
            CASE
                WHEN $2::int IS NOT NULL AND location_id = $2 THEN 0
                WHEN location_id IS NULL THEN 2
                ELSE 1
            END,
            quantity DESC,
            id ASC
         FOR UPDATE`,
        [sparePartId, preferredLocationId]
    );

    for (const row of stockRows.rows) {
        if (remaining <= 0) {
            break;
        }

        const available = Number(row.quantity || 0);
        const deduction = Math.min(remaining, Math.max(available, 0));

        if (deduction <= 0) {
            continue;
        }

        await client.query(
            'UPDATE spare_part_stocks SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [deduction, row.id]
        );

        remaining -= deduction;
    }

    if (remaining > 0) {
        const fallbackEntry = await getOrCreateStockEntry(client, {
            sparePartId,
            locationId: preferredLocationId,
            physicalLocation: preferredLocationId ? 'Sin ubicacion detallada' : 'Sin asignar',
        });

        await client.query(
            'UPDATE spare_part_stocks SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [remaining, fallbackEntry.id]
        );
    }

    return recalculatePartStock(client, sparePartId);
}

module.exports = {
    applyMovement,
    deductConsumedStock,
    getOrCreateStockEntry,
    recalculatePartStock,
    resolveAssetLocationId,
};
