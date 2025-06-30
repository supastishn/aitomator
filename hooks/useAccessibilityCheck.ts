import { useState } from 'react';
import AutomatorModule from '@/lib/native';

export default function useAccessibilityCheck() {
  const [settingsEnabled, setSettingsEnabled] = useState(false);

  const checkAccessibility = async () => {
    const health = await AutomatorModule.getServiceHealthStatus();
    setSettingsEnabled(health.settingsEnabled);
    return health;
  };

  return {
    settingsEnabled,
    checkAccessibility,
  };
}
