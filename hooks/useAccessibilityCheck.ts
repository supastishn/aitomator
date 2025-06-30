import { useState } from 'react';
import AutomatorModule from '@/lib/native';

export default function useAccessibilityCheck() {
  const [settingsEnabled, setSettingsEnabled] = useState(false);
  const [serviceBound, setServiceBound] = useState(false);
  const [isReady, setIsReady] = useState(true);  // Start as ready by default
  const [error, setError] = useState<string | null>(null);

  const checkAccessibility = async () => {
    setIsReady(false);
    try {
      const health = await AutomatorModule.getServiceHealthStatus();
      setSettingsEnabled(health.settingsEnabled);
      setServiceBound(health.serviceBound);
      setIsReady(true);
      return health;
    } catch (err: any) {
      setError(`Service health check failed: ${err.message}`);
      throw err;
    } finally {
      setIsReady(true);
    }
  };

  return {
    settingsEnabled,
    serviceBound,
    isReady,
    error,
    checkAccessibility,
  };
}
