import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Keyboard, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from './context/AuthContext';
import { palette, radius, shadows, spacing } from './theme';
import { BottomTabs, LoadingState } from './ui';
import {
  DiscoverScreen,
  HomeScreen,
  NearbyServicesScreen,
  BookingScreen,
  ProviderScreen,
} from './screens/MarketplaceScreens';
import {
  BookingsScreen,
  MedicalCardScreen,
  PetDetailsScreen,
  PetsScreen,
  ProfileScreen,
} from './screens/CareScreens';
import { LoginScreen, RegisterScreen, WelcomeScreen } from './screens/AuthScreens';

const ROOT_TABS = [
  { key: 'home', label: 'Home', icon: 'home-variant-outline' },
  { key: 'discover', label: 'Discover', icon: 'magnify' },
  { key: 'nearby', label: 'Nearby', icon: 'map-search-outline' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-blank-outline' },
  { key: 'pets', label: 'Pets', icon: 'paw-outline' },
  { key: 'profile', label: 'Profile', icon: 'account-circle-outline' },
];

function makeRoute(name, params = {}) {
  return { name, params };
}

export function AppShell() {
  const { ready, user } = useAuth();
  const [stack, setStack] = useState([makeRoute('welcome')]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;

    setStack((currentStack) => {
      const currentRoute = currentStack[currentStack.length - 1];
      const authRoutes = new Set(['welcome', 'login', 'register']);

      if (user && authRoutes.has(currentRoute?.name)) {
        return [makeRoute('home')];
      }

      if (!user && !authRoutes.has(currentRoute?.name)) {
        return [makeRoute('welcome')];
      }

      return currentStack;
    });
  }, [ready, user]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function navigate(name, params = {}) {
    setStack((currentStack) => [...currentStack, makeRoute(name, params)]);
  }

  function resetTo(name, params = {}) {
    setStack([makeRoute(name, params)]);
  }

  function goBack() {
    setStack((currentStack) => (currentStack.length > 1 ? currentStack.slice(0, -1) : currentStack));
  }

  const route = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) {
        return false;
      }

      goBack();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [canGoBack]);

  if (!ready) {
    return <LoadingState />;
  }

  const content = renderRoute(route, {
    navigate,
    resetTo,
  });

  const showTabs = user && ROOT_TABS.some((item) => item.key === route.name) && !keyboardVisible;

  return (
    <View style={styles.shell}>
      <SwipeBackView enabled={canGoBack} onBack={goBack}>
        {content}
      </SwipeBackView>
      {canGoBack ? (
        <Pressable onPress={goBack} style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={palette.ink} />
        </Pressable>
      ) : null}
      {showTabs ? <BottomTabs items={ROOT_TABS} current={route.name} onSelect={resetTo} /> : null}
    </View>
  );
}

function SwipeBackView({ children, enabled, onBack }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeWidth = 320;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (_, gestureState) => enabled && gestureState.x0 <= 28,
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        enabled &&
        gestureState.x0 <= 36 &&
        gestureState.dx > 10 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onMoveShouldSetPanResponder: (_, gestureState) =>
        enabled &&
        gestureState.x0 <= 36 &&
        gestureState.dx > 10 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(Math.max(0, gestureState.dx));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 84 || gestureState.vx > 0.9) {
          Animated.timing(translateX, {
            toValue: swipeWidth,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            onBack();
          });
          return;
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    }),
  ).current;

  if (!enabled) {
    return children;
  }

  return (
    <Animated.View
      style={[
        styles.swipeScreen,
        {
          transform: [{ translateX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

function renderRoute(route, nav) {
  switch (route.name) {
    case 'login':
      return <LoginScreen navigate={nav.navigate} />;
    case 'register':
      return <RegisterScreen navigate={nav.navigate} />;
    case 'home':
      return <HomeScreen navigate={nav.navigate} />;
    case 'discover':
      return <DiscoverScreen navigate={nav.navigate} route={route} />;
    case 'provider':
      return <ProviderScreen navigate={nav.navigate} route={route} />;
    case 'nearby':
      return <NearbyServicesScreen navigate={nav.navigate} route={route} />;
    case 'booking':
      return <BookingScreen navigate={nav.resetTo} route={route} />;
    case 'bookings':
      return <BookingsScreen navigate={nav.navigate} route={route} />;
    case 'pets':
      return <PetsScreen navigate={nav.navigate} route={route} />;
    case 'petDetails':
      return <PetDetailsScreen navigate={nav.navigate} route={route} />;
    case 'medical':
      return <MedicalCardScreen navigate={nav.navigate} route={route} />;
    case 'profile':
      return <ProfileScreen navigate={nav.navigate} route={route} />;
    case 'welcome':
    default:
      return <WelcomeScreen navigate={nav.navigate} />;
  }
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  swipeScreen: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  backButtonPressed: {
    opacity: 0.85,
  },
});
