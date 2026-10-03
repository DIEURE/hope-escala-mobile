import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Home,
  CalendarDays,
  CheckSquare,
  Users,
  User,
  Headphones,
} from "lucide-react-native";

import HomeScreen from "../screens/home/HomeScreen";
import MinhasEscalasScreen from "../screens/escalas/MinhasEscalasScreen";
import DisponibilidadeScreen from "../screens/disponibilidade/DisponibilidadeScreen";
import RepertorioScreen from "../screens/repertorio/RepertorioScreen";
import PerfilScreen from "../screens/perfil/PerfilScreen";
import SalaEnsaioScreen from "../screens/ensaio/SalaEnsaioScreen";
import EscalaMensalScreen from "../screens/escalas/EscalaMensalScreen";


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
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#FF6B00",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* 1. ABA HOME (Tela inicial) */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Início",
          tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        }}
      />

      {/* 2. ABA MINHAS ESCALAS */}
      <Tab.Screen
        name="Escalas"
        component={MinhasEscalasScreen}
        options={{
          tabBarLabel: "Escalas",
          tabBarIcon: ({ color }) => <CalendarDays size={20} color={color} />,
        }}
      />

      {/* 3. ABA EQUIPE / MENSAL */}
      <Tab.Screen
        name="Mensal"
        component={EscalaMensalScreen}
        options={{
          tabBarLabel: "Equipe",
          tabBarIcon: ({ color }) => <Users size={20} color={color} />,
        }}
      />

      {/* 4. ABA DISPONIBILIDADE */}
      <Tab.Screen
        name="Disponibilidade"
        component={DisponibilidadeScreen}
        options={{
          tabBarLabel: "Disponível",
          tabBarIcon: ({ color }) => <CheckSquare size={20} color={color} />,
        }}
      />

      {/* 5. ABA ENSAIO / REPERTÓRIO */}
      <Tab.Screen
        name="Ensaio"
        component={SalaEnsaioScreen}
        options={{
          tabBarLabel: "PlayList",
          tabBarIcon: ({ color }) => <Headphones size={20} color={color} />,
        }}
      />

      {/* 6. ABA PERFIL */}
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{
          tabBarLabel: "Perfil",
          tabBarIcon: ({ color }) => <User size={20} color={color} />,
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