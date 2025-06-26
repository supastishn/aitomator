declare module 'native' {
  import { NativeModule } from 'react-native';

  export interface AutomatorInterface extends NativeModule {
    takeScreenshot: () => Promise<string>;
    performTouch: (x: number, y: number, amount?: number, spacing?: number) => Promise<void>;
    performSwipe: (breakpoints: Array<{x: number, y: number}>) => Promise<void>;
    typeText: (text: string) => Promise<void>;
    searchApps: (query: string) => Promise<{appName: string, packageName: string}[]>;
    openApp: (packageName: string) => Promise<void>;
    isAccessibilityServiceEnabled: () => Promise<boolean>;
  }

  const AutomatorModule: AutomatorInterface;

  export default AutomatorModule;
}
