export function parseDocumentPaths(documentPath) {
    if (!documentPath) return [];

    try {
        if (typeof documentPath === 'string' && documentPath.startsWith('[')) {
            const parsed = JSON.parse(documentPath);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        }
    } catch (error) {
        console.error(error);
    }

    return [documentPath].filter(Boolean);
}
