import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface Particle {
    id: number;
    type: 'emoji' | 'confetti';
    content?: string;
    color?: string;
    x: number;
    size: number;
    duration: number;
    delay: number;
    drift: number;
    rotation: number;
}

interface CelebrationRainProps {
    active: boolean;
    onComplete?: () => void;
    duration?: number;
}

const EMOJIS = ['🎁', '⭐', '🎉', '💰', '👑', '💎', '✨', '🎈'];
const CONFETTI_COLORS = [
    '#F59E0B', // Gold
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#F97316', // Orange
];

export function CelebrationRain({ active, onComplete }: CelebrationRainProps) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const animValues = useRef<Animated.Value[]>([]).current;
    const window = Dimensions.get('window');

    useEffect(() => {
        if (!active) {
            setParticles([]);
            return;
        }

        // Trigger celebratory haptics
        try {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
        } catch (_) {}

        // Generate 45 varied celebration particles
        const newParticles: Particle[] = [];
        const count = 45;

        for (let i = 0; i < count; i++) {
            const isEmoji = i % 2 === 0;
            newParticles.push({
                id: i,
                type: isEmoji ? 'emoji' : 'confetti',
                content: isEmoji ? EMOJIS[i % EMOJIS.length] : undefined,
                color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                x: Math.random() * (window.width - 30),
                size: isEmoji ? Math.floor(Math.random() * 12) + 20 : Math.floor(Math.random() * 6) + 8,
                duration: Math.floor(Math.random() * 1200) + 2000, // 2.0s - 3.2s
                delay: Math.floor(Math.random() * 600), // 0 - 600ms
                drift: (Math.random() - 0.5) * 80,
                rotation: Math.floor(Math.random() * 720) - 360,
            });
        }

        // Initialize anim values
        while (animValues.length < count) {
            animValues.push(new Animated.Value(0));
        }

        // Reset all anim values
        animValues.forEach(val => val.setValue(0));
        setParticles(newParticles);

        // Run animations in parallel
        const animations = newParticles.map((p, index) => {
            return Animated.sequence([
                Animated.delay(p.delay),
                Animated.timing(animValues[index], {
                    toValue: 1,
                    duration: p.duration,
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                    useNativeDriver: true,
                }),
            ]);
        });

        Animated.parallel(animations).start(() => {
            if (onComplete) {
                onComplete();
            }
        });
    }, [active]);

    if (!active || particles.length === 0) {
        return null;
    }

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((p, index) => {
                const anim = animValues[index];
                if (!anim) return null;

                const translateY = anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, window.height + 60],
                });

                const translateX = anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [p.x, p.x + p.drift, p.x + p.drift * 1.5],
                });

                const rotate = anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${p.rotation}deg`],
                });

                const opacity = anim.interpolate({
                    inputRange: [0, 0.1, 0.8, 1],
                    outputRange: [0, 1, 1, 0],
                });

                return (
                    <Animated.View
                        key={p.id}
                        style={[
                            styles.particle,
                            {
                                opacity,
                                transform: [
                                    { translateX },
                                    { translateY },
                                    { rotate },
                                ],
                            },
                        ]}
                    >
                        {p.type === 'emoji' ? (
                            <Text style={{ fontSize: p.size }}>{p.content}</Text>
                        ) : (
                            <View
                                style={[
                                    styles.confettiPiece,
                                    {
                                        width: p.size,
                                        height: p.size * 1.6,
                                        backgroundColor: p.color,
                                        borderRadius: 2,
                                    },
                                ]}
                            />
                        )}
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    particle: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    confettiPiece: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
});

export default CelebrationRain;
