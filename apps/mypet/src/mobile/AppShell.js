import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Keyboard, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { useT } from './context/LocaleContext';
import { fetchApiUnreadCount, pollProviderNotifications } from './lib/api';

import { getUnreadCount } from './lib/notifications';
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
  NotificationsScreen,
  PetDetailsScreen,
  PetsScreen,
  ProfileScreen,
} from './screens/CareScreens';
import {
  ProviderAnalyticsScreen,
  ProviderDashboardScreen,
  ProviderInboxScreen,
  ProviderServicesScreen,
  ProviderProfileScreen,
  VetMedicalCardScreen,
} from './screens/ProviderScreens';
import { LoginScreen, RegisterScreen, WelcomeScreen } from './screens/AuthScreens';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AdminDashboardScreen, AdminApplicationsScreen } from './screens/AdminScreens';

function makeRoute(name, params = {}) {
  return { name, params };
}

// ─── URL sync helpers ─────────────────────────────────────────────────────────

const SCREEN_PATHS = {
  home:              '/',
  welcome:           '/',
  login:             '/login',
  register:          '/register',
  discover:          '/discover',
  nearby:            '/nearby',
  bookings:          '/bookings',
  pets:              '/pets',
  profile:           '/profile',
  notifications:     '/notifications',
  providerDashboard:  '/dashboard',
  providerInbox:      '/inbox',
  providerServices:   '/my-services',
  providerAnalytics:  '/analytics',
  providerProfile:    '/provider-profile',
  provider:  (p) => `/provider/${p?.id || ''}`,
  booking:   (p) => `/booking/${p?.providerId || ''}`,
  petDetails:(p) => `/pets/${p?.petId || ''}`,
  medical:   (p) => `/pets/${p?.petId || ''}/medical`,
};

const PATH_TO_SCREEN = {
  '/login':           'login',
  '/register':        'register',
  '/discover':        'discover',
  '/nearby':          'nearby',
  '/bookings':        'bookings',
  '/pets':            'pets',
  '/profile':         'profile',
  '/notifications':   'notifications',
  '/dashboard':        'providerDashboard',
  '/inbox':            'providerInbox',
  '/my-services':      'providerServices',
  '/analytics':        'providerAnalytics',
  '/provider-profile': 'providerProfile',
};

function getScreenPath(name, params) {
  const p = SCREEN_PATHS[name];
  if (!p) return null;
  return typeof p === 'function' ? p(params) : p;
}

function pushHistoryState(name, params) {
  if (typeof window === 'undefined') return;
  const path = getScreenPath(name, params);
  if (path) window.history.pushState({ name, params }, '', path);
}

function getInitialRouteFromUrl() {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  if (PATH_TO_SCREEN[path]) return makeRoute(PATH_TO_SCREEN[path]);
  const providerMatch = path.match(/^\/provider\/(.+)$/);
  if (providerMatch) return makeRoute('provider', { id: providerMatch[1] });
  return null;
}

export function AppShell() {
  const { ready, user, mode } = useAuth();
  const { dark, palette: p } = useTheme();
  const t = useT();
  const isProvider = user?.role === 'PROVIDER';
  const isAdmin = user?.role === 'ADMIN';

  const ADMIN_TABS = [
    { key: 'adminDashboard',     label: 'Главная',   icon: 'view-dashboard-outline' },
    { key: 'adminApplications',  label: 'Заявки',    icon: 'file-document-edit-outline' },
    { key: 'notifications',      label: 'Уведомления', icon: 'bell-outline' },
  ];

  const USER_TABS = [
    { key: 'home',     label: t('tab_home'),      icon: 'home-variant-outline' },
    { key: 'discover', label: t('tab_discover'),  icon: 'magnify' },
    { key: 'bookings', label: t('tab_bookings'),  icon: 'calendar-blank-outline' },
    { key: 'pets',     label: t('tab_pets'),      icon: 'paw-outline' },
    { key: 'profile',  label: t('tab_profile'),   icon: 'account-circle-outline' },
  ];

  const PROVIDER_TABS = [
    { key: 'providerDashboard',  label: t('tab_dashboard'), icon: 'view-dashboard-outline' },
    { key: 'providerInbox',      label: t('tab_inbox'),     icon: 'inbox-multiple-outline' },
    { key: 'providerServices',   label: t('tab_services'),  icon: 'toolbox-outline' },
    { key: 'providerAnalytics',  label: 'Аналитика',        icon: 'chart-bar' },
    { key: 'providerProfile',    label: t('tab_profile'),   icon: 'account-circle-outline' },
  ];

  const activeTabs = isAdmin ? ADMIN_TABS : isProvider ? PROVIDER_TABS : USER_TABS;
  const rootTabKeys = new Set(activeTabs.map((t) => t.key));
  const defaultRoot = isAdmin ? 'adminDashboard' : isProvider ? 'providerDashboard' : 'home';

  const [stack, setStack] = useState(() => {
    const fromUrl = getInitialRouteFromUrl();
    return [fromUrl || makeRoute('welcome')];
  });
  const [navDir, setNavDir] = useState('forward');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const toastAnim = useRef(new Animated.Value(-120)).current;
  const seenNotifIds = useRef(null);
  const toastTimerRef = useRef(null);

  // Check if user has seen onboarding
  useEffect(() => {
    AsyncStorage.getItem('@mypet_onboarded')
      .then((v) => {
        setShowOnboarding(v !== 'yes');
        setOnboardingChecked(true);
      })
      .catch(() => {
        setShowOnboarding(false);
        setOnboardingChecked(true);
      });
  }, []);

  function handleOnboardingDone() {
    AsyncStorage.setItem('@mypet_onboarded', 'yes').catch(() => {});
    setShowOnboarding(false);
  }

  useEffect(() => {
    if (!ready) return;
    setStack((currentStack) => {
      const currentRoute = currentStack[currentStack.length - 1];
      const authRoutes = new Set(['welcome', 'login', 'register']);
      if (user && authRoutes.has(currentRoute?.name)) return [makeRoute(defaultRoot)];
      if (!user && !authRoutes.has(currentRoute?.name)) return [makeRoute('welcome')];
      return currentStack;
    });
  }, [ready, user]);

  useEffect(() => {
    let active = true;
    fetchApiUnreadCount(mode)
      .then((n) => (n !== null ? n : getUnreadCount()))
      .then((n) => { if (active) setUnreadCount(n); })
      .catch(() => getUnreadCount().then((n) => { if (active) setUnreadCount(n); }).catch(() => {}));
    return () => { active = false; };
  }, [stack]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  function showToast(title, body) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, body });
    toastAnim.setValue(-120);
    Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    toastTimerRef.current = setTimeout(dismissToast, 5000);
  }

  function dismissToast() {
    Animated.timing(toastAnim, { toValue: -120, duration: 220, useNativeDriver: true }).start(() => {
      setToast(null);
    });
  }

  useEffect(() => {
    if (mode !== 'live' || (!isProvider && !isAdmin)) return;
    let active = true;
    seenNotifIds.current = null;

    async function poll() {
      if (!active) return;
      const unread = await pollProviderNotifications(mode);
      if (!active || unread === null) return;
      if (seenNotifIds.current === null) {
        seenNotifIds.current = new Set(unread.map((n) => n.id));
        return;
      }
      const newNotifs = unread.filter((n) => !seenNotifIds.current.has(n.id));
      if (newNotifs.length > 0) {
        const latest = newNotifs[0];
        newNotifs.forEach((n) => seenNotifIds.current.add(n.id));
        showToast(latest.title || 'New booking request', latest.body || '');
        setUnreadCount((prev) => prev + newNotifs.length);
      }
    }

    poll();
    const interval = setInterval(poll, 8000);
    return () => {
      active = false;
      clearInterval(interval);
      seenNotifIds.current = null;
    };
  }, [mode, isProvider]);

  // Sync browser URL with screen changes (web only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function handlePopState(e) {
      if (e.state?.name) {
        setStack([makeRoute(e.state.name, e.state.params || {})]);
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigate(name, params = {}) {
    setNavDir('forward');
    setStack((s) => [...s, makeRoute(name, params)]);
    pushHistoryState(name, params);
  }

  function resetTo(name, params = {}) {
    setNavDir('tab');
    setStack([makeRoute(name, params)]);
    pushHistoryState(name, params);
  }

  function goBack() {
    setNavDir('back');
    setStack((s) => {
      if (s.length <= 1) return s;
      const prev = s[s.length - 2];
      pushHistoryState(prev.name, prev.params);
      return s.slice(0, -1);
    });
  }

  const route = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [canGoBack]);

  if (!ready || !onboardingChecked) return <LoadingState />;

  if (showOnboarding) {
    return (
      <>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <OnboardingScreen onDone={handleOnboardingDone} />
      </>
    );
  }

  const content = renderRoute(route, { navigate, resetTo }, unreadCount);
  const routeKey = `${route.name}:${route.params?.id || route.params?.providerId || ''}`;

  const tabsWithBadge = activeTabs.map((tab) =>
    tab.key === 'notifications' ? { ...tab, badge: unreadCount } : tab
  );
  const showTabs = user && rootTabKeys.has(route.name) && !keyboardVisible;

  return (
    <View style={[styles.shell, { backgroundColor: p.bg }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <SwipeBackView enabled={canGoBack} onBack={goBack}>
        <ScreenTransition routeKey={routeKey} direction={navDir}>
          {content}
        </ScreenTransition>
      </SwipeBackView>
      {canGoBack ? (
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: p.surface, borderColor: p.line },
            pressed ? styles.backButtonPressed : null,
          ]}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={p.ink} />
        </Pressable>
      ) : null}
      {showTabs ? (
        <BottomTabs items={tabsWithBadge} current={route.name} onSelect={resetTo} />
      ) : null}

      {toast ? (
        <ToastPopup
          title={toast.title}
          body={toast.body}
          anim={toastAnim}
          onDismiss={dismissToast}
        />
      ) : null}
    </View>
  );
}

function SwipeBackView({ children, enabled, onBack }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeWidth = 320;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (_, g) => enabled && g.x0 <= 28,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        enabled && g.x0 <= 36 && g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponder: (_, g) =>
        enabled && g.x0 <= 36 && g.dx > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => translateX.setValue(Math.max(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 84 || g.vx > 0.9) {
          Animated.timing(translateX, { toValue: swipeWidth, duration: 180, useNativeDriver: true }).start(() => {
            translateX.setValue(0);
            onBack();
          });
          return;
        }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  if (!enabled) return children;

  return (
    <Animated.View style={[styles.swipeScreen, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
}

const SCREEN_W = Dimensions.get('window').width;

function ScreenTransition({ routeKey, direction, children }) {
  const slideX  = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (direction === 'tab') {
      // Tab switch: simple fade
      opacity.setValue(0);
      slideX.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else if (direction === 'back') {
      // Go back: new screen slides in from left
      slideX.setValue(-SCREEN_W * 0.35);
      opacity.setValue(0.5);
      Animated.parallel([
        Animated.spring(slideX, { toValue: 0, tension: 240, friction: 30, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      // Navigate forward: new screen slides in from right
      slideX.setValue(SCREEN_W);
      opacity.setValue(1);
      Animated.spring(slideX, { toValue: 0, tension: 240, friction: 30, useNativeDriver: true }).start();
    }
  }, [routeKey]);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateX: slideX }] }}>
      {children}
    </Animated.View>
  );
}

function ToastPopup({ title, body, anim, onDismiss }) {
  return (
    <Animated.View style={[toastStyles.container, { transform: [{ translateY: anim }] }]}>
      <Pressable onPress={onDismiss} style={toastStyles.inner}>
        <MaterialCommunityIcons name="bell-ring" size={20} color="#fff" />
        <View style={toastStyles.copy}>
          <Text style={toastStyles.title}>{title}</Text>
          {body ? <Text style={toastStyles.body} numberOfLines={2}>{body}</Text> : null}
        </View>
        <MaterialCommunityIcons name="close" size={16} color="rgba(255,255,255,0.55)" />
      </Pressable>
    </Animated.View>
  );
}

function renderRoute(route, nav, unreadCount) {
  switch (route.name) {
    case 'login':    return <LoginScreen    navigate={nav.navigate} />;
    case 'register': return <RegisterScreen navigate={nav.navigate} />;
    case 'welcome':  return <WelcomeScreen  navigate={nav.navigate} />;

    case 'home':          return <HomeScreen     navigate={nav.navigate} unreadCount={unreadCount} />;
    case 'discover':      return <DiscoverScreen  navigate={nav.navigate} route={route} />;
    case 'nearby':        return <NearbyServicesScreen navigate={nav.navigate} route={route} />;
    case 'bookings':      return <BookingsScreen  navigate={nav.navigate} route={route} />;
    case 'pets':          return <PetsScreen      navigate={nav.navigate} route={route} />;
    case 'profile':       return <ProfileScreen   navigate={nav.navigate} route={route} />;
    case 'notifications': return <NotificationsScreen navigate={nav.navigate} route={route} />;

    case 'provider':  return <ProviderScreen navigate={nav.navigate} route={route} />;
    case 'booking':   return <BookingScreen  navigate={nav.resetTo}  route={route} />;
    case 'petDetails':return <PetDetailsScreen navigate={nav.navigate} route={route} />;
    case 'medical':   return <MedicalCardScreen navigate={nav.navigate} route={route} />;

    case 'providerDashboard':  return <ProviderDashboardScreen  navigate={nav.navigate} />;
    case 'providerInbox':      return <ProviderInboxScreen      navigate={nav.navigate} />;
    case 'providerServices':   return <ProviderServicesScreen   navigate={nav.navigate} />;
    case 'providerAnalytics':  return <ProviderAnalyticsScreen  navigate={nav.navigate} />;
    case 'providerProfile':    return <ProviderProfileScreen    navigate={nav.navigate} />;
    case 'vetMedical':         return <VetMedicalCardScreen     navigate={nav.navigate} route={route} />;

    case 'adminDashboard':    return <AdminDashboardScreen    navigate={nav.navigate} />;
    case 'adminApplications': return <AdminApplicationsScreen navigate={nav.navigate} />;

    default: return <WelcomeScreen navigate={nav.navigate} />;
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

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    borderRadius: 14,
    backgroundColor: '#0f3d2e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
  },
});
