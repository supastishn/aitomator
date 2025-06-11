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
  controls: { flexDirection: 'row', justifyContent: 'space-evenly' },
  preview: { width: 200, height: 300 },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
