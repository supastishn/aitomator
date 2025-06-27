import { useEffect, useState } from 'react';
import AutomatorModule from '@/lib/native';

export default function useAccessibilityCheck() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const checkService = async () => {
      try {
        if (AutomatorModule && typeof AutomatorModule.isAccessibilityServiceEnabled === 'function') {
          const enabled = await AutomatorModule.isAccessibilityServiceEnabled();
          setIsEnabled(enabled);
          setIsActive(enabled); // Since isAccessibilityServiceEnabled now checks connection
        } else {
          console.warn('AutomatorModule not ready for accessibility check');
        }
      } catch (error) {
        console.error('Accessibility check failed', error);
      } finally {
        setIsReady(true);
      }
    };
    checkService();
  }, []);

  return { isEnabled, isReady, isActive };
}
