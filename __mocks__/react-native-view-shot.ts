export default {
  capture: jest.fn(() => Promise.resolve('data:image/jpeg;base64,mock-screenshot')), // Changed to JPEG
};
