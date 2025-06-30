import { NativeModules } from 'react-native';

// Explicitly access the module instead of destructuring
const AutomatorModule = NativeModules.AutomatorModule;

import { NativeModule } from 'react-native';

interface AutomatorInterface extends NativeModule {
    isAccessibilityServiceEnabled: () => Promise<boolean>;
    performTouch: (x: number, y: number, amount?: number, spacing?: number) => Promise<{ x: number; y: number }>;
    performSwipe: (breakpoints: {x: number, y: number}[]) => Promise<void>;
    typeText: (text: string) => Promise<void>;
    searchApps: (query: string) => Promise<{appName: string, packageName: string}[]>;
    openApp: (packageName: string) => Promise<void>;
    takeScreenshot: () => Promise<string>;
    getScreenDimensions: () => Promise<{ width: number; height: number }>;
}

// Add proper error handling for native commands
const NativeBridge: AutomatorInterface = {
    ...AutomatorModule,
    performTouch: async (
        x: number,
        y: number,
        amount = 1,
        spacing = 0
    ) => {
        try {
            return await AutomatorModule.performTouch(x, y, amount, spacing);
        } catch (error) {
            console.error('Touch failed:', error);
            throw new Error('Touch execution failed');
        }
    },
    // You can add similar wrappers for other methods as needed
};

export default NativeBridge;
