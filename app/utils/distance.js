// Haversine formula to calculate distance between two lat/lng points in km
export function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!validCoordinates({ lat: lat1, lng: lon1 }) || !validCoordinates({ lat: lat2, lng: lon2 })) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
    return Math.round(R * c);
}

export function validCoordinates(point) {
    return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
        && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180;
}

export function routeKey(origin, destination) {
    if (!validCoordinates(origin) || !validCoordinates(destination)) return null;
    return [origin.lat, origin.lng, destination.lat, destination.lng].map(n => n.toFixed(5)).join(',');
}

export function drivingMapUrl(origin, destination) {
    if (!validCoordinates(destination)) return null;
    const params = new URLSearchParams({ api: '1', destination: `${destination.lat},${destination.lng}`, travelmode: 'driving' });
    if (validCoordinates(origin)) params.set('origin', `${origin.lat},${origin.lng}`);
    return `https://www.google.com/maps/dir/?${params}`;
}
