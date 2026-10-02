import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const temaNavegacaoDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#FF6B00',
    background: '#0f172a',
    card: '#0f172a',
    text: '#ffffff',
    border: '#1e293b',
    notification: '#FF6B00',
  },
};

export default function App() {
  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.container}>
        <AuthProvider>
          <NavigationContainer theme={temaNavegacaoDark}>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    ...Platform.select({
      web: {
        height: '100vh' as any,
        width: '100vw' as any,
        overflow: 'hidden',
      },
    }),
  },
});
