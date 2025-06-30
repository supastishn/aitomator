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
    openApp: (packageName: string) => Promise<void>;
    // Ensure both accessibility methods are declared
    isAccessibilityServiceEnabled: () => Promise<boolean>;
    isServiceConnected: () => Promise<boolean>;
    getScreenDimensions: () => Promise<ScreenDimensions>;
  }

  const AutomatorModule: AutomatorInterface;

  export default AutomatorModule;
}
