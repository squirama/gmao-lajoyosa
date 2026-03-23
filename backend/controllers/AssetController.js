const db = require('../db');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { pipeline } = require('stream');
const pump = util.promisify(pipeline);

exports.getAllAssets = async (req, reply) => {
    const query = `
        SELECT a.*, d.name as dept_name, l.name as loc_name 
        FROM assets a
        LEFT JOIN departments d ON a.dept_id = d.id
        LEFT JOIN locations l ON d.location_id = l.id
        ORDER BY a.id DESC
    `;
    const res = await db.query(query);
    return res.rows;
};

exports.deleteAsset = async (req, reply) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM assets WHERE id = $1", [id]);
        return { success: true };
    } catch (e) {
        if (e.code === '23503') reply.code(409).send({ error: 'No se puede borrar: tiene planes/historial asociados' });
        else reply.code(500).send({ error: e.message });
    }
};

exports.createAsset = async (req, reply) => {
    console.log("createAsset called with body:", req.body);
    const { dept_id, name, brand, model } = req.body;
    const client = await db.connect();
    try {
        const res = await client.query(
            "INSERT INTO assets (dept_id, name, brand, model) VALUES ($1, $2, $3, $4) RETURNING id",
            [dept_id, name, brand, model]
        );
        const newId = res.rows[0].id;
        const autoQr = `CARE-ASSET-${newId.toString().padStart(5, '0')}`;
        await client.query("UPDATE assets SET qr_code = $1 WHERE id = $2", [autoQr, newId]);
        return { id: newId, dept_id, name, brand, model, qr_code: autoQr, active: true };
    } finally {
        client.release();
    }
};

exports.updateAsset = async (req, reply) => {
    const { name, brand, model, manual_filename, dept_id } = req.body;
    const id = req.params.id;

    if (manual_filename && process.env.MANUALS_PATH) {
        try {
            fs.accessSync(path.join(process.env.MANUALS_PATH, manual_filename), fs.constants.F_OK);
        } catch (err) {
            return reply.code(400).send({ error: `Manual Not Found: '${manual_filename}' does not exist.` });
        }
    }

    const res = await db.query(
        `UPDATE assets SET name=$1, brand=$2, model=$3, manual_filename=$4, dept_id=$5 WHERE id=$6 RETURNING *`,
        [name, brand, model, manual_filename, dept_id, id]
    );
    return res.rows[0] || reply.code(404).send({ error: "Not found" });
};

exports.uploadManual = async (req, reply) => {
    const id = req.params.id;
    const parts = req.parts();
    let filename = '';
    for await (const part of parts) {
        if (part.file) {
            const manualsPath = process.env.MANUALS_PATH;
            if (!manualsPath) throw new Error('MANUALS_PATH not configured');
            const safeFilename = `asset_${id}_${part.filename}`;
            await pump(part.file, fs.createWriteStream(path.join(manualsPath, safeFilename)));
            filename = safeFilename;
        }
    }
    if (filename) await db.query('UPDATE assets SET manual_filename = $1 WHERE id = $2', [filename, id]);
    return { success: true, filename };
};
