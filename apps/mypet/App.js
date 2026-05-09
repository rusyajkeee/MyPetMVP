import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/mobile/context/AuthContext';
import { AppShell } from './src/mobile/AppShell';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppShell />
    </AuthProvider>
  );
}
