import { Image } from 'expo-image';
import { StyleSheet, Alert, Linking } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { View, TouchableOpacity } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AutomatorModule from '@/native';
import { processScreenshot } from '@/services/aiProcessor';
import { useEffect, useState, useRef } from 'react';
import ViewShot from 'react-native-view-shot';

export default function HomeScreen() {
  const viewShotRef = useRef<any>(null);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [status, requestPermission] = MediaLibrary.usePermissions();
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

  useEffect(() => {
    const checkAccessibility = async () => {
      try {
        const enabled = await AutomatorModule.isAccessibilityServiceEnabled();
        setIsAccessibilityEnabled(enabled);
      } catch (error) {
        console.error('Accessibility check failed', error);
      }
    };
    checkAccessibility();
  }, []);

  const promptAccessibility = () => {
    Alert.alert(
      "Accessibility Permission Required",
      "Please enable AI Automator in accessibility settings for touch automation",
      [
        {
          text: "Open Settings",
          onPress: () => Linking.openSettings()
        },
        { text: "Cancel", onPress: () => {} }
      ]
    );
  };

  const captureScreen = async () => {
    // Ensure accessibility is enabled
    if (!isAccessibilityEnabled) {
      promptAccessibility();
      return;
    }

    // Ensure permissions are granted
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
        style={StyleSheet.absoluteFillObject}
      >
        <View style={styles.automationContainer}>
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={captureScreen}>
              <ThemedText>Capture Screen</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={runAutomation}
              disabled={!screenshotUri}>
              <ThemedText>Run Automation</ThemedText>
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
