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
import * as LinkingExpo from 'expo-linking';
import AutomatorModule from '@/lib/native';
import { useState, useEffect } from 'react';
import useAccessibilityCheck from '@/hooks/useAccessibilityCheck';
import { runAutomationWorkflow } from '@/services/aiProcessor';
import { Modal, DeviceEventEmitter } from 'react-native';

export default function HomeScreen() {
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [task, setTask] = useState('');
  const [status, setStatus] = useState('Idle');
  const [isRunning, setIsRunning] = useState(false);
  const [showAccessibilityWarning, setShowAccessibilityWarning] = useState(false);
  const [ignoreWarning, setIgnoreWarning] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Accessibility hook setup
  const { 
    isAccessibilityEnabled,
    checkAccessibility,
  } = useAccessibilityCheck();

  // Automatically start automation after user ignores warning
  useEffect(() => {
    if (ignoreWarning) {
      startAutomationAfterCheck();
    }
  }, [ignoreWarning]);

  // Cleanup overlay on unmount
  useEffect(() => {
    return () => {
      if (showOverlay) {
        AutomatorModule.hideOverlay();
      }
    };
  }, [showOverlay]);

  // Update overlay status when status changes
  useEffect(() => {
    if (showOverlay && status) {
      AutomatorModule.updateOverlayStatus(status);
    }
  }, [status, showOverlay]);

  // Handle stop from overlay
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "automationStopRequested",
      () => {
        setIsRunning(false);
        setShowOverlay(false);
        setStatus("Stopped by user");
        // If you have a stopAutomation method, call it here
        // AutomatorModule.stopAutomation();
        AutomatorModule.hideOverlay();
      }
    );

    return () => subscription.remove();
  }, []);

  const openAccessibilitySettings = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
    } else {
      Linking.openSettings();
    }
  };

  const startAutomationAfterCheck = async () => {
    // Check accessibility status unless user ignored warning
    if (!ignoreWarning && !isAccessibilityEnabled) {
      setShowAccessibilityWarning(true);
      return;
    }

    // Request overlay permission
    if (Platform.OS === 'android') {
      const hasOverlayPerm = await AutomatorModule.hasOverlayPermission();
      if (!hasOverlayPerm) {
        Alert.alert(
          "Permission Needed",
          "AutoMate needs display over other apps permission to show automation status",
          [{ 
            text: "Grant Permission", 
            onPress: () => AutomatorModule.requestOverlayPermission()
          }]
        );
      }
    }

    setShowOverlay(true);
    AutomatorModule.showOverlay("Starting automation...");

    setIsRunning(true);
    setStatus('Starting automation...');

    try {
      // Request screen capture permission on Android before proceeding
      if (Platform.OS === 'android') await AutomatorModule.requestScreenCapture();

      // Normal automation workflow
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
      if (error.code === 'SCREEN_SIZE_ERROR') {
        Alert.alert(
          "Accessibility malfunction detected",
          "A malfunction in accessibility service has been detected. This commonly happens on Chinese phones (e.g Xiaomi, Huawei) as they do not follow Android's rules of services.\n\nTo fix this, force stop the app, open accessibility settings, turn off the accessibility for AutoMate, then open the app again.",
          [
            {
              text: "OPEN ACCESSIBILITY SETTINGS",
              onPress: openAccessibilitySettings
            },
            {
              text: "OPEN APP SETTINGS",
              onPress: () => LinkingExpo.openSettings()
            },
            {
              text: "CLOSE",
              style: "cancel"
            }
          ]
        );
        setStatus('Automation failed: Accessibility service malfunction');
        return;
      }
      let effectiveError = error.message || 'Unknown error';
      try {
        const enabled = await checkAccessibility();
        if (!enabled) {
          setShowAccessibilityWarning(true);
        } else {
          effectiveError += '\n({tech_details})';
        }
      } catch (healthErr: any) {
        effectiveError += `\nAccessibility check also failed: ${healthErr.message}`;
      }
      setStatus(`Automation error: ${effectiveError}`);
    } finally {
      setIsRunning(false);
      if (Platform.OS === 'android') {
        try {
          await AutomatorModule.stopScreenCaptureService();
        } catch (e) {
          console.error("Failed to stop screen capture service", e);
        }
      }
      AutomatorModule.hideOverlay();
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
            onPress={startAutomationAfterCheck}
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
      <Modal
        visible={showAccessibilityWarning}
        onRequestClose={() => setShowAccessibilityWarning(false)}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Important!</Text>
            <Text style={styles.modalText}>
              Make sure you have accessibility service enabled before continuing!
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowAccessibilityWarning(false);
                openAccessibilitySettings();
              }}
            >
              <Text style={styles.modalButtonText}>Open Accessibility Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={async () => {
                setShowAccessibilityWarning(false);
                await checkAccessibility();
              }}
            >
              <Text style={styles.modalButtonText}>Retry Check</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonDanger]}
              onPress={() => {
                // Only close the popup
                setShowAccessibilityWarning(false);
                // Prevent future warnings in this session
                setIgnoreWarning(true);
              }}
            >
              <Text style={[styles.modalButtonText, { color: '#ef4444' }]}>Continue Anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 32, // Increased from 0
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
    marginBottom: 32, // Increased from 0
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center'
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center'
  },
  modalButtonDanger: {
    backgroundColor: '#f8fafc',
    borderColor: '#ef4444',
    borderWidth: 1
  },
  modalButtonText: {
    color: 'white',
  },
});
