const db = require('../db');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { pipeline } = require('stream');
const pump = util.promisify(pipeline);
const {
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

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
    let id;
    try {
        id = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    try {
        await db.query("DELETE FROM assets WHERE id = $1", [id]);
        return { success: true };
    } catch (e) {
        if (e.code === '23503') reply.code(409).send({ error: 'No se puede borrar: tiene planes/historial asociados' });
        else reply.code(500).send({ error: e.message });
    }
};

exports.createAsset = async (req, reply) => {
    let deptId;
    let name;
    let brand;
    let model;
    try {
        const body = ensureObject(req.body, 'asset');
        deptId = ensurePositiveInteger(body.dept_id, 'dept_id');
        name = ensureString(body.name, 'name', { maxLength: 160 });
        brand = ensureString(body.brand, 'brand', { required: false, allowEmpty: true, maxLength: 120 });
        model = ensureString(body.model, 'model', { required: false, allowEmpty: true, maxLength: 120 });
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        const res = await client.query(
            "INSERT INTO assets (dept_id, name, brand, model) VALUES ($1, $2, $3, $4) RETURNING id",
            [deptId, name, brand, model]
        );
        const newId = res.rows[0].id;
        const autoQr = `CARE-ASSET-${newId.toString().padStart(5, '0')}`;
        await client.query("UPDATE assets SET qr_code = $1 WHERE id = $2", [autoQr, newId]);
        return { id: newId, dept_id: deptId, name, brand, model, qr_code: autoQr, active: true };
    } finally {
        client.release();
    }
};

exports.updateAsset = async (req, reply) => {
    let name;
    let brand;
    let model;
    let manualFilename;
    let deptId;
    let id;
    try {
        const body = ensureObject(req.body, 'asset');
        id = ensurePositiveInteger(req.params.id, 'id');
        name = ensureString(body.name, 'name', { maxLength: 160 });
        brand = ensureString(body.brand, 'brand', { required: false, allowEmpty: true, maxLength: 120 });
        model = ensureString(body.model, 'model', { required: false, allowEmpty: true, maxLength: 120 });
        manualFilename = ensureString(body.manual_filename, 'manual_filename', { required: false, allowEmpty: true, maxLength: 255 });
        deptId = ensurePositiveInteger(body.dept_id, 'dept_id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    if (manualFilename && process.env.MANUALS_PATH) {
        try {
            fs.accessSync(path.join(process.env.MANUALS_PATH, manualFilename), fs.constants.F_OK);
        } catch (err) {
            return reply.code(400).send({ error: `Manual Not Found: '${manualFilename}' does not exist.` });
        }
    }

    const res = await db.query(
        `UPDATE assets SET name=$1, brand=$2, model=$3, manual_filename=$4, dept_id=$5 WHERE id=$6 RETURNING *`,
        [name, brand, model, manualFilename, deptId, id]
    );
    return res.rows[0] || reply.code(404).send({ error: "Not found" });
};

exports.uploadManual = async (req, reply) => {
    let id;
    try {
        id = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }
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
