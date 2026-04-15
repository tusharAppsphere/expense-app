// src/navigation/AppNavigator.js
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW } from '../constants/theme';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import AccountScreen from '../screens/AccountScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import TransactionDetailScreen from '../screens/TransactionDetailScreen';
import BankAccountsScreen from '../screens/BankAccountsScreen';
import AccountSetupScreen from '../screens/AccountSetupScreen';

import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_ICONS = {
  Home:       { active: 'home',             inactive: 'home-outline' },
  Expense:    { active: 'arrow-up-circle',  inactive: 'arrow-up-circle-outline' },
  Statistics: { active: 'bar-chart',        inactive: 'bar-chart-outline' },
  Account:    { active: 'person',           inactive: 'person-outline' },
};

const TAB_LABELS = {
  Home:       'Home',
  Expense:    'Expenses',
  Statistics: 'Stats',
  Account:    'Account',
};

// ─────────────────────────────────────────────────────────────
//  Single animated tab button  (icon + label)
// ─────────────────────────────────────────────────────────────
function TabButton({ route, focused, onPress }) {
  const icons = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
  const label = TAB_LABELS[route.name] || route.name;

  // animated values
  const scaleAnim    = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const iconScale    = useRef(new Animated.Value(1)).current;
  const iconTranslY  = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const labelTranslY = useRef(new Animated.Value(focused ? 0 : 6)).current;

  useEffect(() => {
    Animated.parallel([
      // Pill expand/collapse
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0,
        damping: 18,
        stiffness: 280,
        mass: 0.7,
        useNativeDriver: false, // scaleX on View for pill width
      }),
      // Icon bounce
      Animated.sequence([
        Animated.spring(iconScale, {
          toValue: focused ? 1.18 : 0.9,
          damping: 10,
          stiffness: 240,
          mass: 0.5,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: focused ? 1.05 : 1,
          damping: 12,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]),
      // Icon vertical nudge
      Animated.spring(iconTranslY, {
        toValue: focused ? -1 : 0,
        damping: 14,
        stiffness: 220,
        useNativeDriver: true,
      }),
      // Label fade + slide
      Animated.spring(labelOpacity, {
        toValue: focused ? 1 : 0,
        damping: 16,
        stiffness: 260,
        useNativeDriver: true,
      }),
      Animated.spring(labelTranslY, {
        toValue: focused ? 0 : 5,
        damping: 16,
        stiffness: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  // Interpolate pill width 0 → 1
  const pillWidth = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={tabStyles.button}
    >
      {/* Yellow pill highlight — sits below icon, overflows freely */}
      <Animated.View
        style={[
          tabStyles.pill,
          {
            transform: [{ scaleX: pillWidth }],
            opacity: scaleAnim,
          },
        ]}
      />

      {/* Icon — wrapped in its own container so transforms don't get clipped */}
      <View style={tabStyles.iconContainer}>
        <Animated.View
          style={{
            transform: [{ scale: iconScale }, { translateY: iconTranslY }],
          }}
        >
          <Ionicons
            name={focused ? icons.active : icons.inactive}
            size={22}
            color={focused ? COLORS.black : COLORS.textSecondary}
          />
        </Animated.View>
      </View>

      {/* Label */}
      <Animated.Text
        numberOfLines={1}
        style={[
          tabStyles.label,
          {
            opacity: labelOpacity,
            transform: [{ translateY: labelTranslY }],
            color: focused ? COLORS.black : COLORS.textSecondary,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
//  Custom Tab Bar
// ─────────────────────────────────────────────────────────────
function TabBar({ state, descriptors, navigation }) {
  return (
    <View style={tabStyles.bar}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        return (
          <TabButton
            key={route.key}
            route={route}
            focused={focused}
            onPress={() => {
              if (!focused) navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: 0,
    // Soft top shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  // Each tab button — needs extra vertical padding so animated icons
  // don't get clipped when they scale up
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    // overflow must be visible so the scaled icon is never clipped
    overflow: 'visible',
    position: 'relative',
    minHeight: 52,
  },
  // Highlight pill — absolutely positioned behind everything
  pill: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    width: 52,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent, // yellow
    zIndex: 0,
  },
  // A wrapper that gives the icon enough room to scale without clipping
  iconContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'visible',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
    zIndex: 1,
  },
});

// ─────────────────────────────────────────────────────────────
//  Custom Transition Configs  (use RN Animated via interpolate)
// ─────────────────────────────────────────────────────────────

/** Elegant horizontal slide + fade + scale — main app stack */
const SlideFromRightTransition = {
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: { stiffness: 280, damping: 28, mass: 0.85, overshootClamping: false },
    },
    close: {
      animation: 'spring',
      config: { stiffness: 280, damping: 28, mass: 0.85, overshootClamping: false },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width * 0.35, 0],
      extrapolate: 'clamp',
    });
    const opacity = current.progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.7, 1],
      extrapolate: 'clamp',
    });
    const scale = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.94, 1],
      extrapolate: 'clamp',
    });
    return {
      cardStyle: { transform: [{ translateX }, { scale }], opacity },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.12],
        }),
      },
    };
  },
};

/** Spring slide-up modal — AddExpense */
const ModalSlideUpTransition = {
  gestureDirection: 'vertical',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: { stiffness: 300, damping: 30, mass: 0.9, overshootClamping: false },
    },
    close: {
      animation: 'spring',
      config: { stiffness: 320, damping: 32, mass: 0.9, overshootClamping: true },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    const translateY = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.height, 0],
      extrapolate: 'clamp',
    });
    const borderRadius = current.progress.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [32, 24, 20],
      extrapolate: 'clamp',
    });
    const opacity = current.progress.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.85, 1],
      extrapolate: 'clamp',
    });
    return {
      cardStyle: {
        transform: [{ translateY }],
        borderTopLeftRadius: borderRadius,
        borderTopRightRadius: borderRadius,
        overflow: 'hidden',
        opacity,
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.45],
        }),
      },
    };
  },
};

/** Fade + scale rise — TransactionDetail & AccountSetup */
const FadeScaleTransition = {
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: { stiffness: 300, damping: 30, mass: 0.8 },
    },
    close: {
      animation: 'timing',
      config: { duration: 220 },
    },
  },
  cardStyleInterpolator: ({ current }) => {
    const scale = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.93, 1],
      extrapolate: 'clamp',
    });
    const opacity = current.progress.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });
    const translateY = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
      extrapolate: 'clamp',
    });
    return {
      cardStyle: { transform: [{ scale }, { translateY }], opacity },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.15],
        }),
      },
    };
  },
};

/** Auth screens — full-width slide + fade + scale */
const AuthTransition = {
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: {
      animation: 'spring',
      config: { stiffness: 260, damping: 28, mass: 0.9 },
    },
    close: {
      animation: 'spring',
      config: { stiffness: 260, damping: 28, mass: 0.9 },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    const translateX = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [layouts.screen.width, 0],
      extrapolate: 'clamp',
    });
    const opacity = current.progress.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0, 0.85, 1],
      extrapolate: 'clamp',
    });
    const scale = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.96, 1],
      extrapolate: 'clamp',
    });
    return {
      cardStyle: { transform: [{ translateX }, { scale }], opacity },
    };
  },
};

// ─────────────────────────────────────────────────────────────
//  Navigators
// ─────────────────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Expense" component={ExpenseScreen} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardOverlayEnabled: true,
        ...AuthTransition,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardOverlayEnabled: true,
        ...SlideFromRightTransition,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="BankAccounts"
        component={BankAccountsScreen}
        options={{ ...SlideFromRightTransition }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{
          presentation: 'transparentModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          cardOverlayEnabled: true,
          ...ModalSlideUpTransition,
        }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{
          gestureEnabled: true,
          cardOverlayEnabled: true,
          ...FadeScaleTransition,
        }}
      />
    </Stack.Navigator>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthStack />
      ) : user?.has_setup_completed ? (
        <AppStack />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            cardOverlayEnabled: true,
            ...FadeScaleTransition,
          }}
        >
          <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
