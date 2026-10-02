import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  CalendarDays,
  CheckSquare,
  Music2,
  Users,
  User,
} from "lucide-react-native";

import MinhasEscalasScreen from "../screens/escalas/MinhasEscalasScreen";
import DisponibilidadeScreen from "../screens/disponibilidade/DisponibilidadeScreen";
import RepertorioScreen from "../screens/repertorio/RepertorioScreen";
import PerfilScreen from "../screens/perfil/PerfilScreen";
import SalaEnsaioScreen from "../screens/ensaio/SalaEnsaioScreen";

// Telas placeholder seguras para teste
const Placeholder = ({ name }: { name: string }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: "#0f172a",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text style={{ color: "#fff", fontSize: 16 }}>{name} em construção</Text>
  </View>
);

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Escalas"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#FF6B00",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Escalas"
        component={MinhasEscalasScreen}
        options={{
          tabBarLabel: "Escalas",
          tabBarIcon: ({ color }) => <CalendarDays size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Mensal"
        children={() => <Placeholder name="Mensal" />}
        options={{
          tabBarLabel: "Equipe",
          tabBarIcon: ({ color }) => <Users size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Disponibilidade"
        component={DisponibilidadeScreen}
        options={{
          tabBarLabel: "Disponibilidade",
          tabBarIcon: ({ color }) => <CheckSquare size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Repertorio"
        component={RepertorioScreen}
        options={{
          tabBarLabel: "Repertório",
          tabBarIcon: ({ color }) => <Music2 size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Ensaio"
        component={SalaEnsaioScreen}
        options={{ title: "Sala de Ensaio" }}
      />
      
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
       options={{
    tabBarLabel: 'Ensaio',
    headerShown: false,
  }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#0f172a",
    borderTopColor: "#1e293b",
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});
