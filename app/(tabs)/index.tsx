import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { View, TouchableOpacity } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AutomatorModule from '@/native';
import { processScreenshot } from '@/services/aiProcessor';

import { useState } from 'react';
import { View, Button, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { AutomatorModule } from '../native';
import { processScreenshot } from '@/services/aiProcessor';

export default function HomeScreen() {
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [status, requestPermission] = MediaLibrary.usePermissions();

  const captureScreen = async () => {
    if (!status?.granted) await requestPermission();
    try {
      const filePath = await AutomatorModule.takeScreenshot();
      setScreenshotUri(filePath);
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
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [status, requestPermission] = MediaLibrary.usePermissions();

  const captureScreen = async () => {
    if (!status?.granted) await requestPermission();
    try {
      const uri = await MediaLibrary.createAssetAsync('path/to/screenshot');
      setScreenshotUri(uri);
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
      <View style={styles.controls}>
        <TouchableOpacity onPress={captureScreen}>
          <ThemedText>Capture Screen</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={runAutomation}>
          <ThemedText>Run Automation</ThemedText> 
        </TouchableOpacity>
      </View>

      {screenshotUri && (
        <Image source={{uri: screenshotUri}} style={styles.preview} />
      )}
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
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
            source={{ uri: `file://${screenshotUri}` }} 
            style={styles.preview} 
          />
        )}
      </View>
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
