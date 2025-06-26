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
import { Collapsible } from '@/components/Collapsible';
import AutomatorModule from '@/lib/native';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<OpenAISettings>({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',  // Added /v1
    model: 'gpt-4o',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Debug panel state
  const [functionName, setFunctionName] = useState("");
  const [functionArgs, setFunctionArgs] = useState("");
  const [functionResult, setFunctionResult] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

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
                baseUrl: 'https://api.openai.com/v1',  // Added /v1
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
      const response = await fetch(`${settings.baseUrl}/models`, {
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
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              AutoMate Settings
            </Text>
            <Text style={styles.subtitle}>
              Configure your OpenAI API settings for AutoMate
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { fontWeight: '600' }]}>
              API Key *
            </Text>
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
                <Text style={styles.toggleText}>
                  {showApiKey ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helpText}>
              Your OpenAI API key. Get one from{' '}
              <Text style={styles.link}>platform.openai.com</Text>
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { fontWeight: '600' }]}>
              Base URL *
            </Text>
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
            <Text style={styles.helpText}>
              OpenAI API base URL. Use custom endpoints for other providers.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { fontWeight: '600' }]}>
              Model *
            </Text>
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
            <Text style={styles.helpText}>
              Model to use for AI automation. Recommended: gpt-4o or gpt-4-vision-preview
            </Text>
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
            <Text style={[styles.infoTitle, { fontWeight: '600' }]}>
              How it works
            </Text>
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

          <Collapsible
            title="LLM Function Debugger"
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          >
            <Text style={styles.debugTitle}>Test LLM Functions</Text>
            
            <View style={styles.debugInputContainer}>
              <Text style={styles.debugLabel}>Function Name:</Text>
              <TextInput
                style={styles.debugInput}
                value={functionName}
                onChangeText={setFunctionName}
                placeholder="touch, search_apps, etc."
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={styles.debugInputContainer}>
              <Text style={styles.debugLabel}>Arguments (JSON):</Text>
              <TextInput
                style={[styles.debugInput, { height: 100 }]}
                multiline
                value={functionArgs}
                onChangeText={setFunctionArgs}
                placeholder={`{\n  "x": 0.5,\n  "y": 0.5\n}`}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.button, styles.debugButton]}
              onPress={async () => {
                setFunctionResult("");
                try {
                  const args = functionArgs.trim() ? JSON.parse(functionArgs) : {};

                  // ADD LOGGING HERE
                  console.log(`Testing function: ${functionName} with arguments`, args);

                  let result;
                  switch (functionName) {
                    case "touch":
                      result = await AutomatorModule.performTouch(
                        args.x, 
                        args.y, 
                        args.amount || 1,
                        args.spacing || 0
                      );
                      break;
                    case "swipe":
                      result = await AutomatorModule.performSwipe(args.breakpoints);
                      break;
                    case "search_apps":
                      result = await AutomatorModule.searchApps(args.query);
                      break;
                    case "open_app":
                      result = await AutomatorModule.openApp(args.packageName);
                      break;
                    case "typeText":
                    case "type_text":
                    case "type":
                      result = await AutomatorModule.typeText(args.text);
                      break;
                    case "takeScreenshot":
                    case "take_screenshot":
                      result = await AutomatorModule.takeScreenshot();
                      break;
                    case "isAccessibilityServiceEnabled":
                    case "is_accessibility_service_enabled":
                      result = await AutomatorModule.isAccessibilityServiceEnabled();
                      break;
                    default:
                      throw new Error(`Unknown function: ${functionName}`);
                  }

                  // LOG THE RESULT BEFORE SETTING STATE
                  console.log(`Function ${functionName} result:`, result);

                  setFunctionResult(
                    typeof result === "object" 
                      ? JSON.stringify(result, null, 2)
                      : String(result),
                  );
                } catch (error: any) {
                  const errorMsg = `Error: ${error.message}`;
                  // LOG ERROR TOO
                  console.error(`Function ${functionName} error:`, error);
                  setFunctionResult(errorMsg);
                }
              }}
            >
              <Text style={styles.buttonText}>Test Function</Text>
            </TouchableOpacity>
            
            {functionResult ? (
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Result:</Text>
                <TextInput
                  style={[styles.debugInput, { height: 200 }]}
                  multiline
                  editable={false}
                  value={functionResult}
                />
              </View>
            ) : null}
          </Collapsible>
        </View>
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
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#11181C',
  },
  debugInputContainer: {
    marginVertical: 8,
  },
  debugLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#11181C',
  },
  debugInput: {
    borderWidth: 1,
    borderColor: '#687076',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    fontSize: 14,
    color: '#11181C',
  },
  debugButton: {
    backgroundColor: '#3a0ca3',
    marginVertical: 16,
  },
  resultContainer: {
    marginTop: 16,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#11181C',
  },
});
