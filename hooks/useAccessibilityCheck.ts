import { useEffect, useState } from 'react';
import AutomatorModule from '@/lib/native';

export default function useAccessibilityCheck() {
  const [settingsEnabled, setSettingsEnabled] = useState(false);
  const [serviceBound, setServiceBound] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAccessibility = async () => {
    setIsReady(false);
    setError(null);
    try {
      const health = await AutomatorModule.getServiceHealthStatus();
      setSettingsEnabled(health.settingsEnabled);
      setServiceBound(health.serviceBound);
    } catch (err: any) {
      setError(`Service health check failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    checkAccessibility();
  }, []);

  return {
    settingsEnabled,
    serviceBound,
    isReady,
    error,
    retry: checkAccessibility,
  };
}
