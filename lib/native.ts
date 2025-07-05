import { NativeModules } from 'react-native';

// Explicitly access the module instead of destructuring
const AutomatorModule = NativeModules.AutomatorModule;

import { NativeModule } from 'react-native';

interface AutomatorInterface extends NativeModule {
    isAccessibilityServiceEnabled: () => Promise<boolean>;
    isServiceConnected: () => Promise<boolean>;
    requestScreenCapture: () => Promise<boolean>;
    performTouch: (x: number, y: number, amount?: number, spacing?: number) => Promise<{ x: number; y: number }>;
    performSwipe: (breakpoints: {x: number, y: number}[]) => Promise<void>;
    typeText: (text: string) => Promise<void>;
    searchApps: (query: string) => Promise<{appName: string, packageName: string}[]>;
    openApp: (packageName: string) => Promise<void>;
    takeScreenshot: () => Promise<string>;
    getScreenDimensions: () => Promise<{ width: number; height: number }>;
    stopScreenCaptureService: () => Promise<void>;
}

// Add proper error handling for native commands
const NativeBridge: AutomatorInterface = {
    ...AutomatorModule,
    // Add these explicit assignments:
    searchApps: AutomatorModule.searchApps,
    openApp: AutomatorModule.openApp,

    // Explicitly bind these methods to ensure they're present
    isAccessibilityServiceEnabled: AutomatorModule.isAccessibilityServiceEnabled,
    // Add explicit method binding for isServiceConnected
    isServiceConnected: AutomatorModule.isServiceConnected,
    requestScreenCapture: AutomatorModule.requestScreenCapture,
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
    takeScreenshot: async () => {
        try {
            return await AutomatorModule.takeScreenshot();
        } catch (error) {
            console.error('takeScreenshot failed:', error);
            throw new Error('takeScreenshot execution failed');
        }
    },
    stopScreenCaptureService: AutomatorModule.stopScreenCaptureService,
    // You can add similar wrappers for other methods as needed
};

if (!NativeBridge.searchApps) {
    NativeBridge.searchApps = async (query: string) => {
        console.error("Native searchApps not available - using fallback");
        return [];
    };
}

if (!NativeBridge.openApp) {
    NativeBridge.openApp = async () => {
        console.error("Native openApp fallback enabled");
        return false;
    };
}

// Add fallback proxy for isAccessibilityServiceEnabled if missing
if (!AutomatorModule.isAccessibilityServiceEnabled) {
    // @ts-ignore
    NativeBridge.isAccessibilityServiceEnabled = async () => {
        // Fallback to a possible alternative method
        if (AutomatorModule.isServiceEnabled) {
            const result = await AutomatorModule.isServiceEnabled();
            return result;
        }
        throw new Error('isAccessibilityServiceEnabled is not available on AutomatorModule');
    };
}

// Add fallback for isServiceConnected if it's missing
if (!AutomatorModule.isServiceConnected) {
    // @ts-ignore
    NativeBridge.isServiceConnected = async () => false; // Safe default
}

if (!AutomatorModule.requestScreenCapture) {
    // @ts-ignore
    NativeBridge.requestScreenCapture = async () => {
        console.warn("requestScreenCapture is not available on this platform.");
        return false;
    };
}

if (!AutomatorModule.stopScreenCaptureService) {
    // @ts-ignore
    NativeBridge.stopScreenCaptureService = async () => {
        console.warn("stopScreenCaptureService is not available on this platform.");
    };
}

if (!AutomatorModule.stopScreenCaptureService) {
    // @ts-ignore
    NativeBridge.stopScreenCaptureService = async () => {
        console.warn("stopScreenCaptureService is not available on this platform.");
    };
}

export default NativeBridge;
