class ValidationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.details = details;
    }
}

function sendValidationError(reply, error) {
    if (!(error instanceof ValidationError)) {
        throw error;
    }

    const payload = { error: error.message };
    if (error.details) {
        payload.details = error.details;
    }

    return reply.code(400).send(payload);
}

function ensureObject(value, label = 'payload') {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
        throw new ValidationError(`${label} invalido`);
    }

    return value;
}

function ensureString(value, field, options = {}) {
    const {
        required = true,
        allowEmpty = false,
        minLength = 1,
        maxLength = 255,
        pattern = null,
    } = options;

    if (value === undefined || value === null) {
        if (required) {
            throw new ValidationError(`${field} es obligatorio`);
        }

        return null;
    }

    if (typeof value !== 'string') {
        throw new ValidationError(`${field} debe ser texto`);
    }

    const normalized = value.trim();
    if (!allowEmpty && normalized.length === 0) {
        throw new ValidationError(`${field} no puede estar vacio`);
    }

    if (normalized.length < minLength) {
        throw new ValidationError(`${field} es demasiado corto`);
    }

    if (normalized.length > maxLength) {
        throw new ValidationError(`${field} supera la longitud maxima`);
    }

    if (pattern && !pattern.test(normalized)) {
        throw new ValidationError(`${field} tiene un formato invalido`);
    }

    return normalized;
}

function ensurePositiveInteger(value, field, options = {}) {
    const { required = true } = options;

    if (value === undefined || value === null || value === '') {
        if (required) {
            throw new ValidationError(`${field} es obligatorio`);
        }

        return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ValidationError(`${field} debe ser un entero positivo`);
    }

    return parsed;
}

function ensureNonNegativeInteger(value, field, options = {}) {
    const { required = true, defaultValue = null } = options;

    if (value === undefined || value === null || value === '') {
        if (required) {
            throw new ValidationError(`${field} es obligatorio`);
        }

        return defaultValue;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new ValidationError(`${field} debe ser un entero no negativo`);
    }

    return parsed;
}

function ensureNonNegativeNumber(value, field, options = {}) {
    const { required = true, defaultValue = null } = options;

    if (value === undefined || value === null || value === '') {
        if (required) {
            throw new ValidationError(`${field} es obligatorio`);
        }

        return defaultValue;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        throw new ValidationError(`${field} debe ser un numero no negativo`);
    }

    return parsed;
}

function ensureBoolean(value, field, options = {}) {
    const { defaultValue = false } = options;

    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (value === 'true' || value === '1') {
        return true;
    }

    if (value === 'false' || value === '0') {
        return false;
    }

    throw new ValidationError(`${field} debe ser booleano`);
}

function ensureEnum(value, field, allowedValues, options = {}) {
    const { required = true, defaultValue = null } = options;

    if (value === undefined || value === null || value === '') {
        if (required) {
            throw new ValidationError(`${field} es obligatorio`);
        }

        return defaultValue;
    }

    if (!allowedValues.includes(value)) {
        throw new ValidationError(`${field} tiene un valor invalido`);
    }

    return value;
}

function ensureDateOnlyString(value, field, options = {}) {
    const { required = true } = options;

    if (value === undefined || value === null || value === '') {
        if (required) {
            throw new ValidationError(`${field} es obligatorio`);
        }

        return null;
    }

    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new ValidationError(`${field} debe tener formato YYYY-MM-DD`);
    }

    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw new ValidationError(`${field} no es una fecha valida`);
    }

    return value;
}

function ensureEmail(value, field, options = {}) {
    const { required = false } = options;

    const normalized = ensureString(value, field, {
        required,
        allowEmpty: false,
        maxLength: 160,
    });

    if (normalized === null) {
        return null;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        throw new ValidationError(`${field} no es un email valido`);
    }

    return normalized;
}

function ensureIntegerArray(value, field, options = {}) {
    const { required = false } = options;

    if (value === undefined || value === null) {
        if (required) {
            throw new ValidationError(`${field} es obligatorio`);
        }

        return [];
    }

    if (!Array.isArray(value)) {
        throw new ValidationError(`${field} debe ser una lista`);
    }

    return [...new Set(value.map((item) => ensurePositiveInteger(item, `${field}[]`)))];
}

function ensureConsumedParts(value) {
    if (value === undefined || value === null) {
        return [];
    }

    if (!Array.isArray(value)) {
        throw new ValidationError('consumed_parts debe ser una lista');
    }

    return value.map((item, index) => {
        ensureObject(item, `consumed_parts[${index}]`);
        return {
            spare_part_id: ensurePositiveInteger(item.spare_part_id, `consumed_parts[${index}].spare_part_id`),
            quantity: ensurePositiveInteger(item.quantity, `consumed_parts[${index}].quantity`),
        };
    });
}

module.exports = {
    ValidationError,
    ensureBoolean,
    ensureConsumedParts,
    ensureDateOnlyString,
    ensureEmail,
    ensureEnum,
    ensureIntegerArray,
    ensureNonNegativeInteger,
    ensureNonNegativeNumber,
    ensureObject,
    ensurePositiveInteger,
    ensureString,
    sendValidationError,
};
