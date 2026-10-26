const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo Config Plugin to add Android NotificationListenerService
 * for automatically capturing UPI & Bank payment notifications (GPay, PhonePe, Paytm).
 */
const withNotificationListener = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults.manifest;

        if (!androidManifest.application) {
            return config;
        }

        const app = androidManifest.application[0];
        app.service = app.service || [];

        // Check if the service is already added
        const serviceName = 'com.mohamedabdullah.expensetracker.UpiNotificationListener';
        const exists = app.service.some((s) => s.$ && s.$['android:name'] === serviceName);

        if (!exists) {
            app.service.push({
                $: {
                    'android:name': serviceName,
                    'android:label': 'Expense Tracker Payment Reader',
                    'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
                    'android:exported': 'true',
                },
                'intent-filter': [
                    {
                        action: [
                            {
                                $: {
                                    'android:name': 'android.service.notification.NotificationListenerService',
                                },
                            },
                        ],
                    },
                ],
            });
        }

        return config;
    });
};

module.exports = withNotificationListener;
