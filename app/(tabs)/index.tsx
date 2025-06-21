import { Image } from 'expo-image';
import { 
  StyleSheet, 
  Alert, 
  Linking, 
  Text, 
  View, 
  TouchableOpacity, 
  Platform,
  TextInput
} from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import AutomatorModule from '@/lib/native';
import { useState, useEffect } from 'react';
import ViewShot from 'react-native-view-shot';
import useAccessibilityCheck from '@/hooks/useAccessibilityCheck';
import { runAutomationWorkflow } from '@/services/aiProcessor';

export default function HomeScreen() {
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const { isEnabled, isReady } = useAccessibilityCheck();
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
      Alert.alert(
        "Accessibility Service Required",
        "This app requires accessibility permissions for automation features. Please enable AI Automator in accessibility settings.",
        [
          {
            text: "Open Accessibility Settings",
            onPress: () => openAccessibilitySettings()
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    }
  };

  const promptAccessibility = () => {
    Alert.alert(
      "Accessibility Permission Required",
      "Please enable AI Automator in accessibility settings for touch automation",
      [
        {
          text: "Open Settings",
          onPress: () => Linking.openSettings()
        },
        { text: "Cancel" }
      ]
    );
  };

  const startAutomation = async () => {
    if (!isReady) {
      Alert.alert("Service Initializing", "Please wait for the automation service to initialize");
      return;
    }
    if (!isEnabled) {
      promptAccessibility();
      return;
    }
    setIsRunning(true);
    setStatus('Generating plan...');
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
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ViewShot>
        <View style={styles.automationContainer}>
          <TextInput
            style={[styles.textInput]}
            placeholder="Enter your automation task"
            value={task}
            onChangeText={setTask}
            editable={!isRunning}
          />
          <View style={styles.controls}>
            <TouchableOpacity 
              style={[styles.button, isRunning && styles.disabledButton]} 
              onPress={startAutomation}
              disabled={isRunning || !task}
            >
              <Text style={styles.buttonText}>Run Automation</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusText}>{status}</Text>
          {screenshotUri && (
            <Image 
              source={{ uri: screenshotUri }} 
              style={styles.preview} 
            />
          )}
        </View>
      </ViewShot>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  automationContainer: {
    flex: 1,
    padding: 20,
  },
  controls: {
    flexDirection: 'row', 
    justifyContent: 'space-evenly',
    marginBottom: 20,
  },
  button: {
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#11181C',
    fontSize: 16,
  },
  preview: {
    width: '100%',
    height: 400,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  textInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  statusText: {
    marginVertical: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
