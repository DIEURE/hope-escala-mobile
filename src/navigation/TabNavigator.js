import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CalendarCheck2,
  CalendarDays,
  Clock,
  Music2,
  Vote,
} from 'lucide-react-native';

import MinhasEscalasScreen from '../screens/minhas-escalas/MinhasEscalasScreen';
import EscalaMensalScreen from '../screens/escala-mensal/EscalaMensalScreen';
import DisponibilidadeScreen from '../screens/disponibilidade/DisponibilidadeScreen';
import RepertorioScreen from '../screens/repertorio/RepertorioScreen';
import AtasVotacoesScreen from '../screens/atas/AtasVotacoesScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="MinhasEscalas"
        component={MinhasEscalasScreen}
        options={{
          tabBarLabel: 'Minhas',
          tabBarIcon: ({ color, size }) => <CalendarCheck2 color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="EscalaMensal"
        component={EscalaMensalScreen}
        options={{
          tabBarLabel: 'Mensal',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Disponibilidade"
        component={DisponibilidadeScreen}
        options={{
          tabBarLabel: 'Agenda',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Repertorio"
        component={RepertorioScreen}
        options={{
          tabBarLabel: 'Músicas',
          tabBarIcon: ({ color, size }) => <Music2 color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AtasVotacoes"
        component={AtasVotacoesScreen}
        options={{
          tabBarLabel: 'Votações',
          tabBarIcon: ({ color, size }) => <Vote color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
