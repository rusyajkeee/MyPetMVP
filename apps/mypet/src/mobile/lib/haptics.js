import { Platform } from 'react-native';

function tryHaptic(fn) {
  if (Platform.OS === 'web') return;
  try {
    const H = require('expo-haptics');
    fn(H).catch(() => {});
  } catch {}
}

export function hapticLight() {
  tryHaptic((H) => H.impactAsync(H.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  tryHaptic((H) => H.impactAsync(H.ImpactFeedbackStyle.Medium));
}

export function hapticHeavy() {
  tryHaptic((H) => H.impactAsync(H.ImpactFeedbackStyle.Heavy));
}

export function hapticSuccess() {
  tryHaptic((H) => H.notificationAsync(H.NotificationFeedbackType.Success));
}

export function hapticError() {
  tryHaptic((H) => H.notificationAsync(H.NotificationFeedbackType.Error));
}

export function hapticSelection() {
  tryHaptic((H) => H.selectionAsync());
}
