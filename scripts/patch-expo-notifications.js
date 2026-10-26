const fs = require('fs');
const path = require('path');

// 1. Patch warnOfExpoGoPushUsage.js
const warnFile = path.join(
    __dirname,
    '..',
    'node_modules',
    'expo-notifications',
    'build',
    'warnOfExpoGoPushUsage.js'
);

if (fs.existsSync(warnFile)) {
    let content = fs.readFileSync(warnFile, 'utf8');
    if (content.includes("throw new Error(message);")) {
        content = content.replace(
            /if\s*\(\s*Platform\.OS\s*===\s*'android'\s*\)\s*\{\s*throw new Error\(message\);\s*\}\s*else if\s*\(__DEV__\)\s*\{\s*didWarn\s*=\s*true;\s*console\.warn\(message\);\s*\}/,
            "didWarn = true; console.warn(message);"
        );
        fs.writeFileSync(warnFile, content, 'utf8');
        console.log('[patch-expo-notifications] Successfully patched warnOfExpoGoPushUsage.js');
    }
}

// 2. Patch TopicSubscriptionModule.android.js
const topicFile = path.join(
    __dirname,
    '..',
    'node_modules',
    'expo-notifications',
    'build',
    'TopicSubscriptionModule.android.js'
);

if (fs.existsSync(topicFile)) {
    let content = fs.readFileSync(topicFile, 'utf8');
    if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
        const replacement = `import { requireOptionalNativeModule } from 'expo-modules-core';

const fallback = {
    addListener: () => { },
    removeListeners: () => { },
    subscribeToTopicAsync: () => Promise.resolve(null),
    unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

let nativeModule = null;
try {
    nativeModule = typeof requireOptionalNativeModule === 'function'
        ? requireOptionalNativeModule('ExpoTopicSubscriptionModule')
        : null;
} catch (e) {
    nativeModule = null;
}

export default nativeModule || fallback;
`;
        fs.writeFileSync(topicFile, replacement, 'utf8');
        console.log('[patch-expo-notifications] Successfully patched TopicSubscriptionModule.android.js');
    }
}
