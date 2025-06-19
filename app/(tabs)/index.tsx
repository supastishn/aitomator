import { Image } from 'expo-image';
import { 
  StyleSheet, 
  Alert, 
  Linking, 
  Text, 
  View, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import * as MediaLibrary from 'expo-media-library';
import AutomatorModule from '@/lib/native';
import { processScreenshot } from '@/services/aiProcessor';
import { useState, useRef, useEffect } from 'react';
import ViewShot from 'react-native-view-shot';
import useAccessibilityCheck from '@/hooks/useAccessibilityCheck';

export default function HomeScreen() {
  const viewShotRef = useRef<any>(null);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [status, requestPermission] = MediaLibrary.usePermissions();
  const { isEnabled, isReady } = useAccessibilityCheck();

  useEffect(() => {
    if (isReady) {
      checkAccessibilityOnStart();
    }
  }, [isReady]);

  const openAccessibilitySettings = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
    } else {
      // For iOS, there's no direct link to accessibility settings
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

  const captureScreen = async () => {
    if (!isReady) {
      Alert.alert("Service Initializing", "Please wait for the automation service to initialize");
      return;
    }
    if (!isEnabled) {
      promptAccessibility();
      return;
    }

    if (status !== 'granted') {
      const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert(
          "Permission required",
          "We need media permission to save screenshots"
        );
        return;
      }
    }

    try {
      const result = await viewShotRef.current.capture();
      setScreenshotUri(result);
    } catch (error) {
      console.error('Capture failed', error);
    }
  };

  const runAutomation = async () => {
    if (!screenshotUri) return;
    const coordinates = await processScreenshot(screenshotUri);
    for (const coord of coordinates) {
      await AutomatorModule.performTouch(coord.x, coord.y);
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
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', result: 'data-uri' }}
      >
        <View style={styles.automationContainer}>
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={captureScreen}>
              <Text style={styles.buttonText}>Capture Screen</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={runAutomation}
              disabled={!screenshotUri}>
              <Text style={styles.buttonText}>Run Automation</Text>
            </TouchableOpacity>
          </View>

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
});
