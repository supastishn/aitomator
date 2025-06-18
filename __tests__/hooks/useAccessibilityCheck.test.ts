import { renderHook, waitFor } from '@testing-library/react-native';
import useAccessibilityCheck from '@/hooks/useAccessibilityCheck';
import AutomatorModule from '@/lib/native'; // Mock this

jest.mock('@/native', () => ({
  isAccessibilityServiceEnabled: jest.fn(),
}));

describe('useAccessibilityCheck', () => {
  it('returns true when accessibility is enabled', async () => {
    (AutomatorModule.isAccessibilityServiceEnabled as jest.Mock)
      .mockResolvedValue(true);

    const { result } = renderHook(() => useAccessibilityCheck());
    
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('returns false when accessibility is disabled', async () => {
    (AutomatorModule.isAccessibilityServiceEnabled as jest.Mock)
      .mockResolvedValue(false);

    const { result } = renderHook(() => useAccessibilityCheck());
    
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
