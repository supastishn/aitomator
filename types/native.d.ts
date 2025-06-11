declare module 'native' {
  import { NativeModule } from 'react-native';

  export interface AutomatorInterface extends NativeModule {
    takeScreenshot: () => Promise<string>;
    performTouch: (x: number, y: number) => Promise<void>;
  }

  const AutomatorModule: AutomatorInterface;

  export default AutomatorModule;
}
