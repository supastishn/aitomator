declare module 'native' {
  import { NativeModule } from 'react-native';

  export type ScreenDimensions = {
    width: number;
    height: number;
  };

  export interface AutomatorInterface extends NativeModule {
    takeScreenshot: () => Promise<string>;
    performTouch: (
        x: number, 
        y: number, 
        amount?: number,  // Added ?
        spacing?: number  // Added ?
    ) => Promise<{ x: number; y: number }>;
    performSwipe: (breakpoints: Array<{x: number, y: number}>) => Promise<void>;
    typeText: (text: string) => Promise<void>;
    searchApps: (query: string) => Promise<{appName: string, packageName: string}[]>;
    openApp: (packageName: string) => Promise<void>;  // Ensure return type is Promise<void>
    // Only system-level accessibility check
    isAccessibilityServiceEnabled: () => Promise<boolean>;
    requestScreenCapture: () => Promise<boolean>;
    getScreenDimensions: () => Promise<ScreenDimensions>;
    getServiceHealthStatus: () => Promise<{
      settingsEnabled: boolean;
    }>;
    stopScreenCaptureService: () => Promise<void>;
  }

  const AutomatorModule: AutomatorInterface;

  export default AutomatorModule;
}
