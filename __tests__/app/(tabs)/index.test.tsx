import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/index';
import AutomatorModule from '@/lib/native';
import { processScreenshot } from '@/services/aiProcessor';

jest.mock('@/native', () => ({
  isAccessibilityServiceEnabled: jest.fn(),
  performTouch: jest.fn(),
}));

jest.mock('@/services/aiProcessor', () => ({
  processScreenshot: jest.fn(),
}));

jest.mock('expo-media-library', () => ({
  usePermissions: jest.fn(() => ['granted', jest.fn()]),
}));

jest.mock('react-native-view-shot', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(({ children }) => children),
  capture: jest.fn(),
}));

describe('HomeScreen', () => {
  beforeAll(() => {
    (AutomatorModule.isAccessibilityServiceEnabled as jest.Mock)
      .mockResolvedValue(true);
    
    (processScreenshot as jest.Mock).mockResolvedValue([
      { x: 100, y: 200 },
      { x: 300, y: 400 }
    ]);
  });

  it('calls capture on button press', async () => {
    const { getByText } = render(<HomeScreen />);
    
    await act(async () => {
      fireEvent.press(getByText('Capture Screen'));
    });

    await waitFor(() => {
      expect(require('react-native-view-shot').capture)
        .toHaveBeenCalled();
    });
  });

  it('runs automation with coordinates', async () => {
    const { getByText } = render(<HomeScreen />);
    
    await act(async () => {
      fireEvent.press(getByText('Run Automation'));
    });

    await waitFor(() => {
      expect(AutomatorModule.performTouch)
        .toHaveBeenCalledWith(100, 200);
      expect(AutomatorModule.performTouch)
        .toHaveBeenCalledWith(300, 400);
    });
  });
});
