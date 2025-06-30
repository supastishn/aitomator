import { Image } from 'expo-image';
import {
  StyleSheet,
  Alert,
  Linking,
  Text,
  View,
  TouchableOpacity,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import AutomatorModule from '@/lib/native';
import { useState, useEffect } from 'react';
import useAccessibilityCheck from '@/hooks/useAccessibilityCheck';
import { runAutomationWorkflow } from '@/services/aiProcessor';

export default function HomeScreen() {
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const { isEnabled, isReady, error, retry } = useAccessibilityCheck();
  const [task, setTask] = useState('');
  const [status, setStatus] = useState('Idle');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isReady) {
      checkAccessibilityOnStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const openAccessibilitySettings = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
    } else {
      Linking.openSettings();
    }
  };

  const checkAccessibilityOnStart = () => {
    if (!isEnabled) {
      promptAccessibility();
    }
  };

  // Improved accessibility prompt and retry logic
  const promptAccessibility = () => {
    Alert.alert(
      "Permission Required",
      "AutoMate needs accessibility permissions to work. You MUST manually enable it in system settings:",
      [
        {
          text: "Open Accessibility Settings",
          onPress: openAccessibilitySettings
        },
        {
          text: "I've Enabled It, Run Now",
          onPress: retryAccessibilityCheck
        }
      ]
    );
  };

  const retryAccessibilityCheck = async () => {
    const isEnabled = await AutomatorModule.isAccessibilityServiceEnabled();
    if (isEnabled) {
      startAutomation();
    } else {
      Alert.alert('Not Enabled', 'AutoMate accessibility service still disabled.');
    }
  };

  // Updated startAutomation to require accessibility service before running
  const startAutomation = async (force = false) => {
    try {
      const isServiceReady = await AutomatorModule.isAccessibilityServiceEnabled();
      console.log('Accessibility service ready:', isServiceReady);
      if (!isServiceReady) {
        promptAccessibility();
        return;
      }
    } catch (err) {
      promptAccessibility();
      return;
    }

    setIsRunning(true);
    setStatus('Starting automation...');

    try {
      const screenshot = await AutomatorModule.takeScreenshot();
      setStatus('Captured initial screenshot');
      setScreenshotUri(screenshot);

      await runAutomationWorkflow(
        task,
        screenshot,
        (newStatus) => setStatus(newStatus),
        (newScreenshot) => {
          setScreenshotUri(newScreenshot);
          setStatus('Updated screenshot after action');
        }
      );
      setStatus('Automation complete!');
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>AutoMate</Text>
          <Text style={styles.headerSubtitle}>
            AI-powered automation for your device
          </Text>
        </View>

        <View style={styles.taskSection}>
          <Text style={styles.sectionTitle}>Automation Task</Text>
          <TextInput
            style={[styles.taskInput]}
            placeholder="What would you like to automate? (e.g., 'Open YouTube and search for cats')"
            placeholderTextColor="#94a3b8"
            value={task}
            onChangeText={setTask}
            editable={!isRunning}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isRunning || !task) && styles.primaryButtonDisabled
            ]}
            onPress={() => startAutomation()}
            disabled={isRunning || !task}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isRunning ? 'Running...' : 'Start Automation'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={[
            styles.statusText,
            isRunning && styles.statusTextActive
          ]}>
            {status}
          </Text>
        </View>

        {screenshotUri && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Screen Preview</Text>
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: screenshotUri }}
                style={styles.preview}
                contentFit="contain"
              />
            </View>
          </View>
        )}
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
  taskSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
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
  taskInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    marginBottom: 20,
    minHeight: 56,
  },
  taskInputFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  statusSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    textAlign: 'center',
  },
  statusTextActive: {
    color: '#059669',
    fontWeight: '500',
  },
  previewSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
  },
  preview: {
    width: '100%',
    height: 400,
  },
});
