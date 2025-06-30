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
import { useWindowDimensions } from 'react-native';
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

  // Screen dimensions
  const { width, height } = useWindowDimensions();

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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Configure your AI automation settings
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenAI Configuration</Text>

          <Text style={styles.label}>API Key *</Text>
          <View style={[styles.inputContainer]}>
            <TextInput
              style={styles.input}
              value={settings.apiKey}
              onChangeText={(text) => setSettings({ ...settings, apiKey: text })}
              placeholder="sk-..."
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
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

          <Text style={styles.label}>Base URL *</Text>
          <TextInput
            style={styles.input}
            value={settings.baseUrl}
            onChangeText={(text) => setSettings({ ...settings, baseUrl: text })}
            placeholder="https://api.openai.com"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!saving}
          />
          <Text style={styles.helpText}>
            OpenAI API base URL. Use custom endpoints for other providers.
          </Text>

          <Text style={styles.label}>Model *</Text>
          <TextInput
            style={styles.input}
            value={settings.model}
            onChangeText={(text) => setSettings({ ...settings, model: text })}
            placeholder="gpt-4o"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />
          <Text style={styles.helpText}>
            Model to use for AI automation. Recommended: gpt-4o or gpt-4-vision-preview
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              saving && styles.primaryButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Settings</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              saving && styles.primaryButtonDisabled,
            ]}
            onPress={testConnection}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { color: '#3b82f6' }]}>
              Test Connection
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, styles.dangerButtonText]}>
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

        <View style={styles.section}>
          <Collapsible
            title="LLM Function Debugger"
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          >
            <View style={styles.debugInfoContainer}>
              <Text style={styles.debugLabel}>Screen Dimensions:</Text>
              <Text style={styles.debugText}>
                {width} x {height} px
              </Text>
            </View>

            <Text style={styles.debugTitle}>Test LLM Functions</Text>

            <Text style={styles.debugHint}>
              TIP: You can test touch gestures in the home screen debug mode
            </Text>
            <Text style={styles.debugHint}>
              - Tap to generate touch coordinates{"\n"}
              - Swipe to generate swipe breakpoints
            </Text>

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
                    case "open_link":
                    case "open_url":
                      // Get the URL argument (either 'link' or 'url')
                      const urlArg = args.url || args.link;

                      if (!urlArg) {
                        throw new Error('Must provide "url" or "link" parameter');
                      }

                      // Add URL protocol if missing
                      const fullUrl = urlArg.startsWith('http')
                        ? urlArg
                        : `https://${urlArg}`;

                      await import('expo-web-browser').then(
                        WebBrowser => WebBrowser.openBrowserAsync(fullUrl)
                      );

                      result = "Browser opened successfully";
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
              <Text style={styles.primaryButtonText}>Test Function</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  mainContent: {
    flex: 1,
    // padding removed since header is now inside
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    marginBottom: 0,
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
    marginBottom: 16,
  },
  link: {
    color: '#0a7ea4',
    textDecorationLine: 'underline',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  dangerButton: {
    backgroundColor: '#ff4444',
  },
  dangerButtonText: {
    color: 'white',
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    marginBottom: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    opacity: 0.8,
    color: '#475569',
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
  debugInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    color: '#11181C',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 14,
    color: '#687076',
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
