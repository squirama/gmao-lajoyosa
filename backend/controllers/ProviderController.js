const fs = require('fs');
const path = require('path');
const util = require('util');
const { pipeline } = require('stream');

const db = require('../db');
const { getScopedAccess } = require('../services/accessService');
const {
    ensureBoolean,
    ensureDateOnlyString,
    ensureEmail,
    ensureIntegerArray,
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
} = require('../utils/validation');

async function getAccess(client, req, reply) {
    const access = await getScopedAccess(client, req.headers.authorization);
    if (!access) {
        reply.code(401).send({ error: 'Autenticacion requerida' });
        return null;
    }
    return access;
}

function buildProviderScopeClause(access, params) {
    if (access.isSuperAdmin) {
        return '1=1';
    }

    if (access.allowedDeptIds.length > 0) {
        params.push(access.allowedDeptIds);
        return `(
            EXISTS (
                SELECT 1
                FROM provider_departments spd
                WHERE spd.provider_id = p.id
                  AND spd.department_id = ANY($${params.length}::int[])
            )
            OR EXISTS (
                SELECT 1
                FROM provider_assets spa
                JOIN assets sa ON sa.id = spa.asset_id
                WHERE spa.provider_id = p.id
                  AND sa.dept_id = ANY($${params.length}::int[])
            )
        )`;
    }

    if (access.isAdmin && access.locationId) {
        params.push(access.locationId);
        return `(
            EXISTS (
                SELECT 1
                FROM provider_departments spd
                JOIN departments sd ON sd.id = spd.department_id
                WHERE spd.provider_id = p.id
                  AND sd.location_id = $${params.length}
            )
            OR EXISTS (
                SELECT 1
                FROM provider_assets spa
                JOIN assets sa ON sa.id = spa.asset_id
                JOIN departments sd ON sd.id = sa.dept_id
                WHERE spa.provider_id = p.id
                  AND sd.location_id = $${params.length}
            )
        )`;
    }

    return '1=0';
}

async function canManageDepartments(client, access, departmentIds) {
    if (!Array.isArray(departmentIds) || departmentIds.length === 0) return true;
    if (access.isSuperAdmin) return true;

    if (access.allowedDeptIds.length > 0) {
        return departmentIds.every((id) => access.allowedDeptIds.includes(Number(id)));
    }

    if (access.isAdmin && access.locationId) {
        const res = await client.query(
            'SELECT id FROM departments WHERE id = ANY($1::int[]) AND location_id = $2',
            [departmentIds, access.locationId]
        );
        return res.rows.length === departmentIds.length;
    }

    return false;
}

async function canManageAssets(client, access, assetIds) {
    if (!Array.isArray(assetIds) || assetIds.length === 0) return true;
    if (access.isSuperAdmin) return true;

    if (access.allowedDeptIds.length > 0) {
        const res = await client.query(
            'SELECT id FROM assets WHERE id = ANY($1::int[]) AND dept_id = ANY($2::int[])',
            [assetIds, access.allowedDeptIds]
        );
        return res.rows.length === assetIds.length;
    }

    if (access.isAdmin && access.locationId) {
        const res = await client.query(
            `SELECT a.id
             FROM assets a
             JOIN departments d ON d.id = a.dept_id
             WHERE a.id = ANY($1::int[]) AND d.location_id = $2`,
            [assetIds, access.locationId]
        );
        return res.rows.length === assetIds.length;
    }

    return false;
}

async function getScopedProvider(client, access, providerId) {
    const params = [];
    const scopeClause = buildProviderScopeClause(access, params);
    params.push(providerId);
    const res = await client.query(
        `SELECT p.*
         FROM providers p
         WHERE ${scopeClause}
           AND p.id = $${params.length}
         LIMIT 1`,
        params
    );
    return res.rows[0] || null;
}

async function replaceProviderRelations(client, providerId, departmentIds, assetIds) {
    await client.query('DELETE FROM provider_departments WHERE provider_id = $1', [providerId]);
    await client.query('DELETE FROM provider_assets WHERE provider_id = $1', [providerId]);

    for (const departmentId of departmentIds) {
        await client.query(
            'INSERT INTO provider_departments (provider_id, department_id) VALUES ($1, $2)',
            [providerId, departmentId]
        );
    }

    for (const assetId of assetIds) {
        await client.query(
            'INSERT INTO provider_assets (provider_id, asset_id) VALUES ($1, $2)',
            [providerId, assetId]
        );
    }
}

function mapProviderRow(row) {
    return {
        ...row,
        department_ids: Array.isArray(row.department_ids) ? row.department_ids.filter(Boolean).map(Number) : [],
        asset_ids: Array.isArray(row.asset_ids) ? row.asset_ids.filter(Boolean).map(Number) : [],
        document_count: Number(row.document_count || 0),
        expired_documents: Number(row.expired_documents || 0),
        expiring_documents: Number(row.expiring_documents || 0),
    };
}

exports.getProviders = async (req, reply) => {
    const client = await db.connect();
    try {
        const access = await getAccess(client, req, reply);
        if (!access) return reply;

        const params = [];
        const scopeClause = buildProviderScopeClause(access, params);
        const res = await client.query(
            `SELECT
                p.*,
                COALESCE(array_agg(DISTINCT pd.department_id) FILTER (WHERE pd.department_id IS NOT NULL), '{}') AS department_ids,
                COALESCE(array_agg(DISTINCT pa.asset_id) FILTER (WHERE pa.asset_id IS NOT NULL), '{}') AS asset_ids,
                COUNT(DISTINCT doc.id) AS document_count,
                COUNT(DISTINCT CASE WHEN doc.expires_on IS NOT NULL AND doc.expires_on < CURRENT_DATE THEN doc.id END) AS expired_documents,
                COUNT(DISTINCT CASE WHEN doc.expires_on IS NOT NULL AND doc.expires_on >= CURRENT_DATE AND doc.expires_on <= CURRENT_DATE + INTERVAL '30 days' THEN doc.id END) AS expiring_documents
             FROM providers p
             LEFT JOIN provider_departments pd ON pd.provider_id = p.id
             LEFT JOIN provider_assets pa ON pa.provider_id = p.id
             LEFT JOIN provider_documents doc ON doc.provider_id = p.id
             WHERE ${scopeClause}
             GROUP BY p.id
             ORDER BY p.active DESC, p.company_name ASC`,
            params
        );
        return res.rows.map(mapProviderRow);
    } catch (error) {
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.createProvider = async (req, reply) => {
    let body;
    try {
        body = ensureObject(req.body, 'provider');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        const access = await getAccess(client, req, reply);
        if (!access) return reply;

        const provider = {
            companyName: ensureString(body.company_name, 'company_name', { maxLength: 160 }),
            serviceType: ensureString(body.service_type, 'service_type', { required: false, allowEmpty: true, maxLength: 160 }),
            contactName: ensureString(body.contact_name, 'contact_name', { required: false, allowEmpty: true, maxLength: 160 }),
            phone: ensureString(body.phone, 'phone', { required: false, allowEmpty: true, maxLength: 80 }),
            email: body.email ? ensureEmail(body.email, 'email', { required: false }) : null,
            notes: ensureString(body.notes, 'notes', { required: false, allowEmpty: true, maxLength: 4000 }),
            contractExpiresOn: ensureDateOnlyString(body.contract_expires_on, 'contract_expires_on', { required: false }),
            active: ensureBoolean(body.active, 'active', { defaultValue: true }),
            departmentIds: ensureIntegerArray(body.department_ids, 'department_ids', { required: false }),
            assetIds: ensureIntegerArray(body.asset_ids, 'asset_ids', { required: false }),
        };

        if (provider.departmentIds.length === 0 && provider.assetIds.length === 0) {
            return reply.code(400).send({ error: 'Asocia al menos un area o una maquina al proveedor' });
        }

        if (!(await canManageDepartments(client, access, provider.departmentIds)) || !(await canManageAssets(client, access, provider.assetIds))) {
            return reply.code(403).send({ error: 'No autorizado para asociar esos departamentos o maquinas' });
        }

        await client.query('BEGIN');
        const res = await client.query(
            `INSERT INTO providers (
                company_name,
                service_type,
                contact_name,
                phone,
                email,
                notes,
                contract_expires_on,
                active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                provider.companyName,
                provider.serviceType || null,
                provider.contactName || null,
                provider.phone || null,
                provider.email || null,
                provider.notes || null,
                provider.contractExpiresOn || null,
                provider.active,
            ]
        );
        await replaceProviderRelations(client, res.rows[0].id, provider.departmentIds, provider.assetIds);
        await client.query('COMMIT');
        return { ...res.rows[0], department_ids: provider.departmentIds, asset_ids: provider.assetIds };
    } catch (error) {
        await client.query('ROLLBACK');
        if (error?.name === 'ValidationError') {
            return sendValidationError(reply, error);
        }
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.updateProvider = async (req, reply) => {
    let providerId;
    let body;
    try {
        providerId = ensurePositiveInteger(req.params.id, 'id');
        body = ensureObject(req.body, 'provider');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        const access = await getAccess(client, req, reply);
        if (!access) return reply;

        const existing = await getScopedProvider(client, access, providerId);
        if (!existing) {
            return reply.code(403).send({ error: 'No autorizado para editar este proveedor' });
        }

        const provider = {
            companyName: ensureString(body.company_name, 'company_name', { maxLength: 160 }),
            serviceType: ensureString(body.service_type, 'service_type', { required: false, allowEmpty: true, maxLength: 160 }),
            contactName: ensureString(body.contact_name, 'contact_name', { required: false, allowEmpty: true, maxLength: 160 }),
            phone: ensureString(body.phone, 'phone', { required: false, allowEmpty: true, maxLength: 80 }),
            email: body.email ? ensureEmail(body.email, 'email', { required: false }) : null,
            notes: ensureString(body.notes, 'notes', { required: false, allowEmpty: true, maxLength: 4000 }),
            contractExpiresOn: ensureDateOnlyString(body.contract_expires_on, 'contract_expires_on', { required: false }),
            active: ensureBoolean(body.active, 'active', { defaultValue: true }),
            departmentIds: ensureIntegerArray(body.department_ids, 'department_ids', { required: false }),
            assetIds: ensureIntegerArray(body.asset_ids, 'asset_ids', { required: false }),
        };

        if (provider.departmentIds.length === 0 && provider.assetIds.length === 0) {
            return reply.code(400).send({ error: 'Asocia al menos un area o una maquina al proveedor' });
        }

        if (!(await canManageDepartments(client, access, provider.departmentIds)) || !(await canManageAssets(client, access, provider.assetIds))) {
            return reply.code(403).send({ error: 'No autorizado para asociar esos departamentos o maquinas' });
        }

        await client.query('BEGIN');
        const res = await client.query(
            `UPDATE providers
             SET company_name = $1,
                 service_type = $2,
                 contact_name = $3,
                 phone = $4,
                 email = $5,
                 notes = $6,
                 contract_expires_on = $7,
                 active = $8
             WHERE id = $9
             RETURNING *`,
            [
                provider.companyName,
                provider.serviceType || null,
                provider.contactName || null,
                provider.phone || null,
                provider.email || null,
                provider.notes || null,
                provider.contractExpiresOn || null,
                provider.active,
                providerId,
            ]
        );
        await replaceProviderRelations(client, providerId, provider.departmentIds, provider.assetIds);
        await client.query('COMMIT');
        return { ...res.rows[0], department_ids: provider.departmentIds, asset_ids: provider.assetIds };
    } catch (error) {
        await client.query('ROLLBACK');
        if (error?.name === 'ValidationError') {
            return sendValidationError(reply, error);
        }
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.deleteProvider = async (req, reply) => {
    let providerId;
    try {
        providerId = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        const access = await getAccess(client, req, reply);
        if (!access) return reply;

        const existing = await getScopedProvider(client, access, providerId);
        if (!existing) {
            return reply.code(403).send({ error: 'No autorizado para dar de baja este proveedor' });
        }

        await client.query('UPDATE providers SET active = false WHERE id = $1', [providerId]);
        return { success: true };
    } catch (error) {
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.getProviderDocuments = async (req, reply) => {
    let providerId;
    try {
        providerId = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        const access = await getAccess(client, req, reply);
        if (!access) return reply;

        const existing = await getScopedProvider(client, access, providerId);
        if (!existing) {
            return reply.code(403).send({ error: 'No autorizado para ver este proveedor' });
        }

        const res = await client.query(
            `SELECT *
             FROM provider_documents
             WHERE provider_id = $1
             ORDER BY uploaded_at DESC, id DESC`,
            [providerId]
        );
        return res.rows;
    } catch (error) {
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.uploadProviderDocument = async (req, reply) => {
    let providerId;
    try {
        providerId = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        const access = await getAccess(client, req, reply);
        if (!access) return reply;

        const existing = await getScopedProvider(client, access, providerId);
        if (!existing) {
            return reply.code(403).send({ error: 'No autorizado para subir documentos a este proveedor' });
        }

        const parts = req.parts();
        const documentsPath = process.env.DOCUMENTS_PATH || path.join(__dirname, '..', 'uploads', 'documents');
        if (!fs.existsSync(documentsPath)) {
            fs.mkdirSync(documentsPath, { recursive: true });
        }

        let fileUrl = null;
        let documentType = '';
        let documentName = '';
        let expiresOn = null;
        let notes = '';

        for await (const part of parts) {
            if (part.file) {
                const safeFilename = `provider_${providerId}_${Date.now()}_${part.filename.replace(/[^a-zA-Z0-9._-]/g, '')}`;
                const targetPath = path.join(documentsPath, safeFilename);
                await util.promisify(pipeline)(part.file, fs.createWriteStream(targetPath));
                fileUrl = `/documents/${safeFilename}`;
                continue;
            }

            if (part.fieldname === 'document_type') {
                documentType = part.value;
            } else if (part.fieldname === 'document_name') {
                documentName = part.value;
            } else if (part.fieldname === 'expires_on') {
                expiresOn = part.value;
            } else if (part.fieldname === 'notes') {
                notes = part.value;
            }
        }

        try {
            documentType = ensureString(documentType, 'document_type', { maxLength: 120 });
            documentName = ensureString(documentName, 'document_name', { required: false, allowEmpty: true, maxLength: 160 });
            expiresOn = ensureDateOnlyString(expiresOn, 'expires_on', { required: false });
            notes = ensureString(notes, 'notes', { required: false, allowEmpty: true, maxLength: 1000 });
        } catch (error) {
            return sendValidationError(reply, error);
        }

        if (!fileUrl) {
            return reply.code(400).send({ error: 'Debes adjuntar un archivo' });
        }

        const res = await client.query(
            `INSERT INTO provider_documents (
                provider_id,
                document_type,
                document_name,
                document_path,
                expires_on,
                notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [providerId, documentType, documentName || null, fileUrl, expiresOn || null, notes || null]
        );
        return res.rows[0];
    } catch (error) {
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};

exports.deleteProviderDocument = async (req, reply) => {
    let documentId;
    try {
        documentId = ensurePositiveInteger(req.params.id, 'id');
    } catch (error) {
        return sendValidationError(reply, error);
    }

    const client = await db.connect();
    try {
        const access = await getAccess(client, req, reply);
        if (!access) return reply;

        const docRes = await client.query(
            `SELECT doc.*, p.id AS provider_id
             FROM provider_documents doc
             JOIN providers p ON p.id = doc.provider_id
             WHERE doc.id = $1`,
            [documentId]
        );
        const document = docRes.rows[0];
        if (!document) {
            return reply.code(404).send({ error: 'Documento no encontrado' });
        }

        const existing = await getScopedProvider(client, access, document.provider_id);
        if (!existing) {
            return reply.code(403).send({ error: 'No autorizado para borrar este documento' });
        }

        await client.query('DELETE FROM provider_documents WHERE id = $1', [documentId]);
        return { success: true };
    } catch (error) {
        return reply.code(500).send({ error: error.message });
    } finally {
        client.release();
    }
};
