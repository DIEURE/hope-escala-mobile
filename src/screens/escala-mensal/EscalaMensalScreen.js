import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EscalaMensalScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Escala Mensal</Text>
      <Text style={styles.subtitle}>Em breve: grade dos domingos do mês.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 6, textAlign: 'center' },
});
