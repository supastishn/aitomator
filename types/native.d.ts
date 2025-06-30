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
        amount?: number, 
        spacing?: number
    ) => Promise<{ x: number; y: number }>;
    performSwipe: (breakpoints: Array<{x: number, y: number}>) => Promise<void>;
    typeText: (text: string) => Promise<void>;
    searchApps: (query: string) => Promise<{appName: string, packageName: string}[]>;
    openApp: (packageName: string) => Promise<void>;
    isAccessibilityServiceEnabled: () => Promise<boolean>;
    getScreenDimensions: () => Promise<ScreenDimensions>;
    openLink: (url: string) => Promise<void>; // Add this line
  }

  const AutomatorModule: AutomatorInterface;

  export default AutomatorModule;
}
