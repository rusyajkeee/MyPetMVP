import { AuthProvider } from './src/mobile/context/AuthContext';
import { LocaleProvider } from './src/mobile/context/LocaleContext';
import { ThemeProvider } from './src/mobile/context/ThemeContext';
import { AppShell } from './src/mobile/AppShell';

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
