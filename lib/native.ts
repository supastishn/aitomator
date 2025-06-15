import { NativeModules } from 'react-native';

const { AutomatorModule } = NativeModules;

if (!AutomatorModule) {
  console.warn('AutomatorModule not found in NativeModules. Falling back to mock implementation.');
}

interface AutomatorInterface {
  isAccessibilityServiceEnabled: () => Promise<boolean>;
  performTouch: (x: number, y: number) => Promise<void>;
}

const noopModule: AutomatorInterface = {
  isAccessibilityServiceEnabled: async () => false,
  performTouch: async () => {},
};

export default AutomatorModule || noopModule;
