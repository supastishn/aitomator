import { NativeModules } from 'react-native';

// Explicitly access the module instead of destructuring
const AutomatorModule = NativeModules.AutomatorModule;

interface AutomatorInterface {
    isAccessibilityServiceEnabled: () => Promise<boolean>;
    performTouch: (x: number, y: number, amount?: number, spacing?: number) => Promise<void>;
    performSwipe: (breakpoints: {x: number, y: number}[]) => Promise<void>;
    typeText: (text: string) => Promise<void>;
    searchApps: (query: string) => Promise<{appName: string, packageName: string}[]>;
    openApp: (packageName: string) => Promise<void>;
    takeScreenshot: () => Promise<string>;
}

const noopModule: AutomatorInterface = {
    isAccessibilityServiceEnabled: async () => false,
    performTouch: async () => {},
    performSwipe: async () => {},
    typeText: async () => {},
    searchApps: async () => [],
    openApp: async () => {},
    takeScreenshot: async () => 'mock-uri',
};

// Check if all required methods are present
const isValidModule = AutomatorModule && 
    typeof AutomatorModule.isAccessibilityServiceEnabled === 'function' &&
    typeof AutomatorModule.performTouch === 'function' &&
    typeof AutomatorModule.takeScreenshot === 'function';

// Export either the real module or fallback
export default isValidModule ? AutomatorModule as AutomatorInterface : noopModule;
