import { useEffect, useState } from 'react';
import AutomatorModule from '@/lib/native';

export default function useAccessibilityCheck() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAccessibility = async () => {
    setIsReady(false);
    setError(null);

    console.debug("[Service] Starting accessibility check");

    try {
      // Add full status object with separate flags
      const [settingsEnabled, connected] = await Promise.all([
        AutomatorModule.isAccessibilityServiceEnabled(),
        AutomatorModule.isServiceConnected()
      ]);

      const serviceReady = settingsEnabled && connected;
      setIsEnabled(serviceReady);

      console.debug(
        `[Service] Status - Config: ${settingsEnabled}, ` +
        `Connection: ${connected}, Service Ready: ${serviceReady}`
      );
    } catch (err: any) {
      console.error(`[Service] Check failed: ${err.message || 'Unknown error'}`);
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
