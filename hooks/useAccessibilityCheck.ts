import { useState } from 'react';
import AutomatorModule from '@/lib/native';

export default function useAccessibilityCheck() {
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

  const checkAccessibility = async () => {
    try {
      const enabled = await AutomatorModule.isAccessibilityServiceEnabled();
      setIsAccessibilityEnabled(enabled);
      return enabled;
    } catch (error) {
      console.error('Accessibility check failed:', error);
      return false;
    }
  };

  return {
    isAccessibilityEnabled,
    checkAccessibility,
  };
}
