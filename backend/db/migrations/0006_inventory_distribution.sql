CREATE TABLE IF NOT EXISTS spare_part_stocks (
    id SERIAL PRIMARY KEY,
    spare_part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    physical_location VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (spare_part_id, location_id, physical_location)
);

CREATE INDEX IF NOT EXISTS idx_spare_part_stocks_part_id
    ON spare_part_stocks(spare_part_id);

CREATE INDEX IF NOT EXISTS idx_spare_part_stocks_location_id
    ON spare_part_stocks(location_id);

CREATE TABLE IF NOT EXISTS spare_part_movements (
    id SERIAL PRIMARY KEY,
    spare_part_id INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    source_stock_id INTEGER REFERENCES spare_part_stocks(id) ON DELETE SET NULL,
    destination_stock_id INTEGER REFERENCES spare_part_stocks(id) ON DELETE SET NULL,
    notes TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spare_part_movements_part_id
    ON spare_part_movements(spare_part_id);

CREATE INDEX IF NOT EXISTS idx_spare_part_movements_created_at
    ON spare_part_movements(created_at DESC);

INSERT INTO spare_part_stocks (spare_part_id, location_id, physical_location, quantity)
SELECT
    sp.id,
    NULL,
    COALESCE(NULLIF(sp.location, ''), 'Sin asignar'),
    sp.stock_current
FROM spare_parts sp
WHERE sp.stock_current <> 0
AND NOT EXISTS (
    SELECT 1
    FROM spare_part_stocks sps
    WHERE sps.spare_part_id = sp.id
);
