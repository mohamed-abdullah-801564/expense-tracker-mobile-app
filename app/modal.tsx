import { View, Text, StyleSheet, Button, Platform } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ModalScreen() {
    const isPresented = router.canGoBack();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Modal Screen</Text>
            <View style={styles.separator} />

            <Text style={styles.description}>
                This is a placeholder modal screen.
            </Text>

            <View style={styles.buttonContainer}>
                {isPresented && <Button onPress={() => router.back()} title="Dismiss" />}
            </View>

            {/* Use a light status bar on iOS to account for the black space above the modal */}
            <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
        backgroundColor: '#eee',
    },
    description: {
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
    },
    buttonContainer: {
        marginTop: 10,
    }
});
