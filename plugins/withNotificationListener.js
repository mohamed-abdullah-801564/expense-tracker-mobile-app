const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to add Android NotificationListenerService
 * for automatically capturing UPI & Bank payment notifications (GPay, PhonePe, Paytm).
 */
const withNotificationListener = (config) => {
    // 1. Register service in AndroidManifest.xml
    config = withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults.manifest;

        if (!androidManifest.application) {
            return config;
        }

        const app = androidManifest.application[0];
        app.service = app.service || [];

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

    // 2. Generate native UpiNotificationListener.kt file so Gradle compilation and binding succeed
    config = withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const targetDir = path.join(
                projectRoot,
                'android',
                'app',
                'src',
                'main',
                'java',
                'com',
                'mohamedabdullah',
                'expensetracker'
            );

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const kotlinFile = path.join(targetDir, 'UpiNotificationListener.kt');
            const kotlinContent = `package com.mohamedabdullah.expensetracker

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class UpiNotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        try {
            val packageName = sbn.packageName ?: ""
            val extras = sbn.notification?.extras ?: return
            val title = extras.getCharSequence("android.title")?.toString() ?: ""
            val text = extras.getCharSequence("android.text")?.toString() ?: ""

            Log.d("UpiNotificationListener", "Notification received from $packageName: $title - $text")
        } catch (e: Exception) {
            Log.e("UpiNotificationListener", "Error in onNotificationPosted", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
`;
            fs.writeFileSync(kotlinFile, kotlinContent, 'utf8');
            return config;
        },
    ]);

    return config;
};

module.exports = withNotificationListener;
