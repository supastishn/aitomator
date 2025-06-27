import { NativeModules } from 'react-native';

// Explicitly access the module instead of destructuring
const AutomatorModule = NativeModules.AutomatorModule;

import { NativeModule } from 'react-native';

interface AutomatorInterface extends NativeModule {
    isAccessibilityServiceEnabled: () => Promise<boolean>;
    performTouch: (x: number, y: number, amount?: number, spacing?: number) => Promise<void>;
    performSwipe: (breakpoints: {x: number, y: number}[]) => Promise<void>;
    typeText: (text: string) => Promise<void>;
    searchApps: (query: string) => Promise<{appName: string, packageName: string}[]>;
    openApp: (packageName: string) => Promise<void>;
    takeScreenshot: () => Promise<string>;
    openLink: (url: string) => Promise<void>;
    getScreenDimensions: () => Promise<{ width: number; height: number }>;
}

// Always use the real module directly
export default AutomatorModule as AutomatorInterface;
