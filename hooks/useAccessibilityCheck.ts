import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import AutomatorModule from '@/native';

export default function useAccessibilityCheck() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkService = async () => {
      try {
        const enabled = await AutomatorModule.isAccessibilityServiceEnabled();
        setIsEnabled(enabled);
      } catch (error) {
        console.error('Accessibility check failed', error);
      }
    };
    checkService();
  }, []);

  return isEnabled;
}
