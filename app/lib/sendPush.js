import webpush from 'web-push';

export function sendPush(subscription, message) {
    return webpush.sendNotification(subscription, JSON.stringify(message), {
        vapidDetails: { subject: 'https://www.cyclingcalendar.pt/contacto',
            publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY },
        TTL: 86400, timeout: 10000, urgency: 'normal', topic: message.tag?.startsWith('push-test') ? 'push-test' : 'favorite-editions',
    });
}
