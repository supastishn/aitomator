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
  Clipboard,
  PanResponder,
} from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import AutomatorModule from '@/lib/native';
import { useState, useEffect, useRef } from 'react';
import ViewShot from 'react-native-view-shot';
import useAccessibilityCheck from '@/hooks/useAccessibilityCheck';
import { runAutomationWorkflow } from '@/services/aiProcessor';
import Svg, { Polyline } from 'react-native-svg';

interface Point {
  x: number;
  y: number;
}

export default function HomeScreen() {
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const { isEnabled, isReady } = useAccessibilityCheck();
  const [task, setTask] = useState('');
  const [status, setStatus] = useState('Idle');
  const [isRunning, setIsRunning] = useState(false);

  // Debug mode states
  const [debugMode, setDebugMode] = useState(false);
  const [swipePoints, setSwipePoints] = useState<Point[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const previewLayout = useRef({ x: 0, y: 0, width: 1, height: 1 });

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
        "This app requires accessibility permissions for automation features. Please enable AutoMate in accessibility settings.",
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
      "Please enable AutoMate in accessibility settings for touch automation",
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

  // Debug helpers
  const calculateNormalizedPosition = (event: any) => {
    const tx = event.nativeEvent.pageX - previewLayout.current.x;
    const ty = event.nativeEvent.pageY - previewLayout.current.y;
    return {
      x: Math.max(0, Math.min(1, tx / previewLayout.current.width)),
      y: Math.max(0, Math.min(1, ty / previewLayout.current.height)),
    };
  };

  const handleTap = (pt: Point) => {
    setCurrentCommand(
      `touch({ x: ${pt.x.toFixed(3)}, y: ${pt.y.toFixed(3)}, num: 1 })`
    );
  };

  const handleSwipe = (points: Point[]) => {
    const formatted = points.map(p => `{
  x: ${p.x.toFixed(3)},
  y: ${p.y.toFixed(3)}
}`).join(',');
    setCurrentCommand(`swipe({ breakpoints: [${formatted}] })`);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => debugMode,
    onMoveShouldSetPanResponder: () => debugMode,
    onPanResponderGrant: (e) => {
      setSwipePoints([calculateNormalizedPosition(e)]);
    },
    onPanResponderMove: (e) => {
      setSwipePoints(prev => [...prev, calculateNormalizedPosition(e)]);
    },
    onPanResponderRelease: () => {
      if (swipePoints.length < 2) {
        if (swipePoints[0]) handleTap(swipePoints[0]);
      } else {
        handleSwipe(swipePoints);
      }
      setSwipePoints([]);
    },
  });

  return (
    <ParallaxScrollView>
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

        <View style={styles.debugButtons}>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => setDebugMode(!debugMode)}
          >
            <Text style={styles.debugButtonText}>
              {debugMode ? 'Exit Debug' : 'Debug Mode'}
            </Text>
          </TouchableOpacity>
          {debugMode && (
            <Text style={styles.debugHint}>
              Tap/swipe on screenshot to generate commands
            </Text>
          )}
        </View>

        {screenshotUri && (
          <View
            style={styles.previewContainer}
            onLayout={e => previewLayout.current = e.nativeEvent.layout}
            {...(debugMode ? panResponder.panHandlers : {})}
          >
            {debugMode && swipePoints.length > 0 && (
              <Svg style={StyleSheet.absoluteFill}>
                <Polyline
                  points={swipePoints.map(p =>
                    `${p.x * previewLayout.current.width},${p.y * previewLayout.current.height}`
                  ).join(' ')}
                  stroke="red"
                  strokeWidth="3"
                  fill="none"
                />
              </Svg>
            )}
            <Image
              source={{ uri: screenshotUri }}
              style={styles.preview}
            />
          </View>
        )}

        {currentCommand && (
          <View style={styles.commandContainer}>
            <TextInput
              value={currentCommand}
              style={styles.commandInput}
              multiline
              onFocus={e => e.currentTarget.select && e.currentTarget.select()}
            />
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => Clipboard.setString(currentCommand)}
            >
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
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
  debugButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  debugButton: {
    backgroundColor: '#3a0ca3',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  debugButtonText: {
    color: 'white',
  },
  debugHint: {
    color: '#666',
    fontStyle: 'italic',
  },
  previewContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  commandContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
    flexDirection: 'row',
  },
  commandInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 15,
    justifyContent: 'center',
    marginLeft: 10,
    borderRadius: 4,
  },
  copyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
