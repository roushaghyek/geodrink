import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/** Return to the existing Home screen instead of stacking a new one. */
export function useGoHome() {
  const router = useRouter();
  return useCallback(() => {
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/');
  }, [router]);
}
