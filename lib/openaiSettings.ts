import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface OpenAISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const SETTINGS_KEY = 'openai_settings';

const defaultSettings: OpenAISettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',  // Added /v1
  model: 'gpt-4o',
};

export async function saveOpenAISettings(settings: OpenAISettings): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // For web, use localStorage as fallback
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } else {
      await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch (error) {
    console.error('Failed to save OpenAI settings:', error);
    throw new Error('Failed to save settings');
  }
}

export async function loadOpenAISettings(): Promise<OpenAISettings> {
  try {
    let settingsJson: string | null = null;
    
    if (Platform.OS === 'web') {
      // For web, use localStorage as fallback
      settingsJson = localStorage.getItem(SETTINGS_KEY);
    } else {
      settingsJson = await SecureStore.getItemAsync(SETTINGS_KEY);
    }
    
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      return { ...defaultSettings, ...settings };
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('Failed to load OpenAI settings:', error);
    return defaultSettings;
  }
}

export async function clearOpenAISettings(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(SETTINGS_KEY);
    } else {
      await SecureStore.deleteItemAsync(SETTINGS_KEY);
    }
  } catch (error) {
    console.error('Failed to clear OpenAI settings:', error);
  }
}
