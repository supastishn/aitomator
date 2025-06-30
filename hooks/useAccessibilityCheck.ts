import { useEffect, useState } from 'react';
import AutomatorModule from '@/lib/native';

export default function useAccessibilityCheck() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAccessibility = async () => {
    setIsReady(false);
    setError(null);

    try {
      // Add service connection check
      const [enabled, connected] = await Promise.all([
        AutomatorModule.isAccessibilityServiceEnabled(),
        AutomatorModule.isServiceConnected()
      ]);
      setIsEnabled(enabled && connected);
    } catch (err: any) {
      setError(`Accessibility check failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    checkAccessibility();
  }, []);

  const retry = () => {
    checkAccessibility();
  };

  return {
    isEnabled,
    isReady,
    error,
    retry,
  };
}
