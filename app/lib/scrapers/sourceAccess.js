// Access refusals are not empty calendars and must not cause immediate retries.
export const SOURCE_USER_AGENT = 'CyclingCalendar/2.0 (+https://www.cyclingcalendar.pt/contacto)';

export function assertSourceAccess(response, source) {
    if (![401,403,429].includes(response.status)) return;
    throw Object.assign(new Error(`${source}: acesso recusado (HTTP ${response.status})`), {
        code:'SOURCE_ACCESS_DENIED', retryable:false, status:response.status,
    });
}
