function createReply() {
    let statusCode = 200;
    let payload;
    const headers = {};

    return {
        code(code) {
            statusCode = code;
            return this;
        },
        header(name, value) {
            headers[String(name).toLowerCase()] = value;
            return this;
        },
        send(body) {
            payload = body;
            return body;
        },
        getStatusCode() {
            return statusCode;
        },
        getPayload() {
            return payload;
        },
        getHeaders() {
            return headers;
        },
    };
}

function normalizeSql(sql) {
    return String(sql).replace(/\s+/g, ' ').trim();
}

function createFakeClient(handler) {
    let released = false;
    const queries = [];

    return {
        async query(sql, params) {
            const normalized = normalizeSql(sql);
            queries.push({ sql: normalized, params });
            return handler(normalized, params, queries);
        },
        release() {
            released = true;
        },
        wasReleased() {
            return released;
        },
        getQueries() {
            return queries;
        },
    };
}

module.exports = {
    createFakeClient,
    createReply,
    normalizeSql,
};
