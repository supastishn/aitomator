import { processScreenshot } from '@/services/aiProcessor';
import { Dimensions } from 'react-native';

jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 400, height: 800 })),
  },
}));

global.fetch = jest.fn();

describe('aiProcessor', () => {
  it('transforms coordinates correctly', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        tool_calls: [
          { position: { x: 0.5, y: 0.5 } },
          { position: { x: 0.25, y: 0.75 } }
        ]
      })
    });

    const results = await processScreenshot('test-uri');
    
    expect(results).toEqual([
      { x: 200, y: 400 },
      { x: 100, y: 600 }
    ]);
  });

  it('handles API errors', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API down'));
    
    await expect(processScreenshot('test-uri'))
      .rejects
      .toThrow('API down');
  });
});
