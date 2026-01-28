import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

const FIRST_TIME_STORAGE_KEY = 'has_seen_guide';

function useCreateFirstTimeContext() {
    const queryClient = useQueryClient();
    const [hasSeenGuide, setHasSeenGuide] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const guideQuery = useQuery({
        queryKey: ['firstTime'],
        queryFn: async () => {
            try {
                const stored = await AsyncStorage.getItem(FIRST_TIME_STORAGE_KEY);
                const hasSeen = stored === 'true';
                console.log('Has seen guide:', hasSeen);
                return hasSeen;
            } catch (error) {
                console.error('Error loading first time status:', error);
                return false;
            }
        },
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
    });

    const saveGuideMutation = useMutation({
        mutationFn: async (seen: boolean) => {
            try {
                await AsyncStorage.setItem(FIRST_TIME_STORAGE_KEY, seen ? 'true' : 'false');
                console.log('Saved guide status:', seen);
                return seen;
            } catch (error) {
                console.error('Failed to save guide status:', error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firstTime'] });
        },
        onError: (error) => {
            console.error('Guide status save mutation failed:', error);
        }
    });

    useEffect(() => {
        if (guideQuery.data !== undefined) {
            setHasSeenGuide(guideQuery.data);
            setIsLoading(false);
        } else if (!guideQuery.isLoading) {
            setIsLoading(false);
        }
    }, [guideQuery.data, guideQuery.isLoading]);

    const { mutate: saveGuideStatus } = saveGuideMutation;

    const markGuideAsSeen = useCallback(() => {
        setHasSeenGuide(true);
        saveGuideStatus(true);
    }, [saveGuideStatus]);

    const resetGuideStatus = useCallback(() => {
        setHasSeenGuide(false);
        saveGuideStatus(false);
    }, [saveGuideStatus]);

    return {
        hasSeenGuide,
        isFirstTime: !hasSeenGuide && !isLoading,
        markGuideAsSeen,
        resetGuideStatus,
        isLoading,
    };
}

export const [FirstTimeProvider, useFirstTime] = createContextHook(useCreateFirstTimeContext);
