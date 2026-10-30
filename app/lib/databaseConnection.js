// Keep TLS policy in the application: pg URL parameters can otherwise replace it.
export function databasePoolOptions(raw = '') {
    let connectionString = raw;
    if (raw) {
        let url;
        try { url = new URL(raw); } catch { throw new Error('Invalid database connection configuration'); }
        if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database connection configuration');
        for (const key of ['sslmode', 'ssl', 'uselibpqcompat']) url.searchParams.delete(key);
        connectionString = url.href;
    }
    return { connectionString, ssl: { rejectUnauthorized: true }, max: 10, idleTimeoutMillis: 30000 };
}
