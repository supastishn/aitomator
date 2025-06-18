import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveOpenAISettings, loadOpenAISettings, clearOpenAISettings, OpenAISettings } from '@/lib/openaiSettings';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<OpenAISettings>({
    apiKey: '',
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await loadOpenAISettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.apiKey.trim()) {
      Alert.alert('Error', 'API Key is required');
      return;
    }

    if (!settings.baseUrl.trim()) {
      Alert.alert('Error', 'Base URL is required');
      return;
    }

    if (!settings.model.trim()) {
      Alert.alert('Error', 'Model is required');
      return;
    }

    setSaving(true);
    try {
      await saveOpenAISettings(settings);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Settings',
      'Are you sure you want to clear all OpenAI settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearOpenAISettings();
              setSettings({
                apiKey: '',
                baseUrl: 'https://api.openai.com',
                model: 'gpt-4o',
              });
              Alert.alert('Success', 'Settings cleared successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear settings.');
            }
          },
        },
      ]
    );
  };

  const testConnection = async () => {
    if (!settings.apiKey.trim() || !settings.baseUrl.trim()) {
      Alert.alert('Error', 'Please fill in API Key and Base URL first');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${settings.baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Connection test successful!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', `Connection failed: ${errorData.error?.message || response.statusText}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Connection test failed. Please check your settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              OpenAI Settings
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Configure your OpenAI API settings for AI automation
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              API Key *
            </ThemedText>
            <View style={[styles.inputContainer, { borderColor: '#687076' }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: '#11181C', // Fixed dark gray text
                  },
                  {
                    borderColor: '#687076', // Fixed gray border
                  },
                ]}
                value={settings.apiKey}
                onChangeText={(text) => setSettings({ ...settings, apiKey: text })}
                placeholder="sk-..."
                placeholderTextColor="#687076"
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <ThemedText style={styles.toggleText}>
                  {showApiKey ? 'Hide' : 'Show'}
                </ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.helpText}>
              Your OpenAI API key. Get one from{' '}
              <Text style={styles.link}>platform.openai.com</Text>
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Base URL *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: '#11181C',
                },
                { borderColor: '#687076' },
              ]}
              value={settings.baseUrl}
              onChangeText={(text) => setSettings({ ...settings, baseUrl: text })}
              placeholder="https://api.openai.com"
              placeholderTextColor="#687076"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <ThemedText style={styles.helpText}>
              OpenAI API base URL. Use custom endpoints for other providers.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Model *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: '#11181C',
                },
                { borderColor: '#687076' },
              ]}
              value={settings.model}
              onChangeText={(text) => setSettings({ ...settings, model: text })}
              placeholder="gpt-4o"
              placeholderTextColor="#687076"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ThemedText style={styles.helpText}>
              Model to use for AI automation. Recommended: gpt-4o or gpt-4-vision-preview
            </ThemedText>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: '#0a7ea4' }, // Solid blue color
                saving && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>Save Settings</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                {
                  borderColor: '#0a7ea4',
                },
                saving && styles.disabledButton,
              ]}
              onPress={testConnection}
              disabled={saving}
            >
              <Text style={[styles.buttonText, { color: '#0a7ea4' }]}>
                Test Connection
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleClear}
            >
              <Text style={[styles.buttonText, styles.dangerButtonText]}>
                Clear Settings
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
              How it works
            </ThemedText>
            <Text style={styles.infoText}>
              • The app captures screenshots of your device
            </Text>
            <Text style={styles.infoText}>
              • Screenshots are sent to your configured AI model
            </Text>
            <Text style={styles.infoText}>
              • AI analyzes the image and returns touch coordinates
            </Text>
            <Text style={styles.infoText}>
              • The app performs automated touches based on AI instructions
            </Text>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  toggleButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.6,
    lineHeight: 20,
  },
  link: {
    color: '#0a7ea4',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    marginTop: 32,
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  dangerButton: {
    backgroundColor: '#ff4444',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  dangerButtonText: {
    color: 'white',
  },
  infoSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  infoTitle: {
    marginBottom: 12,
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    opacity: 0.8,
  },
});
