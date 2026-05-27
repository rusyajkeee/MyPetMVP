import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  adminGetStats,
  adminListApplications,
  adminReviewApplication,
  fetchApiNotifications,
  markApiNotificationsRead,
} from '../lib/api';
import {
  EmptyState,
  GlassCard,
  HeroTitle,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionTitle,
} from '../ui';
import { lightPalette, radius, spacing, typography } from '../theme';

const palette = lightPalette;

// ─── AdminDashboardScreen ──────────────────────────────────────────────────

export function AdminDashboardScreen({ navigate }) {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const [stats, setStats] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [s, apps] = await Promise.all([
        adminGetStats(mode),
        adminListApplications(mode),
      ]);
      setStats(s);
      setPendingCount((apps || []).filter((a) => a.status === 'PENDING').length);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Screen>
      <HeroTitle eyebrow="Admin" title="Панель управления" />

      {loading ? (
        <View style={s.center}><ActivityIndicator color={p.brand} /></View>
      ) : (
        <>
          {stats ? (
            <View style={s.statsGrid}>
              <StatTile icon="account-group-outline" label="Клиенты" value={stats.users} color="#4ECDC4" />
              <StatTile icon="store-outline" label="Провайдеры" value={stats.providers} color="#45B7D1" />
              <StatTile icon="calendar-check-outline" label="Бронирования" value={stats.bookings} color="#96CEB4" />
              <StatTile icon="clock-alert-outline" label="Ожидают" value={pendingCount} color="#F2A93B" />
            </View>
          ) : null}

          <SectionTitle title="Быстрые действия" />
          <GlassCard>
            <NavRow
              icon="file-document-edit-outline"
              label="Заявки провайдеров"
              badge={pendingCount}
              onPress={() => navigate('adminApplications')}
              p={p}
            />
            <NavRow
              icon="bell-outline"
              label="Уведомления"
              onPress={() => navigate('notifications')}
              p={p}
            />
          </GlassCard>
        </>
      )}
    </Screen>
  );
}

// ─── AdminApplicationsScreen ───────────────────────────────────────────────

export function AdminApplicationsScreen() {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState('');

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await adminListApplications(mode);
      setApps(data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleReview(id, status) {
    setError('');
    try {
      const updated = await adminReviewApplication(mode, id, status, noteText.trim() || undefined);
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setReviewingId(null);
      setNoteText('');
    } catch (e) {
      setError(e?.message || 'Ошибка');
    }
  }

  const pending = apps.filter((a) => a.status === 'PENDING');
  const reviewed = apps.filter((a) => a.status !== 'PENDING');

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <HeroTitle eyebrow="Admin" title="Заявки провайдеров" />

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      {loading ? (
        <View style={s.center}><ActivityIndicator color={p.brand} /></View>
      ) : pending.length === 0 && reviewed.length === 0 ? (
        <EmptyState icon="file-document-outline" title="Заявок нет" subtitle="Новые заявки будут появляться здесь" />
      ) : (
        <>
          {pending.length > 0 ? (
            <>
              <SectionTitle title={`На рассмотрении (${pending.length})`} />
              {pending.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  isReviewing={reviewingId === app.id}
                  noteText={noteText}
                  onNoteChange={setNoteText}
                  onOpenReview={() => { setReviewingId(app.id); setNoteText(''); }}
                  onApprove={() => handleReview(app.id, 'APPROVED')}
                  onReject={() => handleReview(app.id, 'REJECTED')}
                  onCancel={() => { setReviewingId(null); setNoteText(''); }}
                  p={p}
                />
              ))}
            </>
          ) : null}

          {reviewed.length > 0 ? (
            <>
              <SectionTitle title="Рассмотренные" />
              {reviewed.map((app) => (
                <ApplicationCard key={app.id} app={app} p={p} />
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

// ─── ApplicationCard ───────────────────────────────────────────────────────

function ApplicationCard({ app, isReviewing, noteText, onNoteChange, onOpenReview, onApprove, onReject, onCancel, p }) {
  const isPending = app.status === 'PENDING';
  const statusColor = app.status === 'APPROVED' ? '#22C55E' : app.status === 'REJECTED' ? palette.danger : '#F2A93B';
  const statusLabel = app.status === 'APPROVED' ? 'Одобрено' : app.status === 'REJECTED' ? 'Отклонено' : 'На рассмотрении';

  return (
    <GlassCard style={s.appCard}>
      <View style={s.appHeader}>
        <View style={s.appTitleRow}>
          <MaterialCommunityIcons name="store-outline" size={20} color={p.brand} />
          <Text style={[s.appBiz, { color: p.ink }]}>{app.businessName}</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={s.appMeta}>
        <MetaRow icon="map-marker-outline" value={app.address} p={p} />
        {app.phone ? <MetaRow icon="phone-outline" value={app.phone} p={p} /> : null}
        {app.user?.email ? <MetaRow icon="account-outline" value={`${app.user.firstName || ''} ${app.user.lastName || ''}`.trim() || app.user.email} p={p} /> : null}
        {app.description ? <MetaRow icon="text-box-outline" value={app.description} p={p} /> : null}
        {app.adminNote ? <MetaRow icon="message-text-outline" value={`Примечание: ${app.adminNote}`} p={p} /> : null}
      </View>

      <Text style={[s.appDate, { color: p.inkSoft }]}>
        {new Date(app.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>

      {isPending && !isReviewing ? (
        <View style={s.actionRow}>
          <PrimaryButton label="Одобрить" icon="check-circle-outline" onPress={onOpenReview} compact style={{ flex: 1, backgroundColor: '#22C55E' }} />
          <SecondaryButton label="Отклонить" icon="close-circle-outline" onPress={onOpenReview} style={{ flex: 1 }} />
        </View>
      ) : null}

      {isPending && isReviewing ? (
        <View style={s.reviewPanel}>
          <TextInput
            style={[s.noteInput, { borderColor: p.line, color: p.ink, backgroundColor: p.surfaceMuted }]}
            placeholder="Примечание для пользователя (необязательно)"
            placeholderTextColor={p.inkSoft}
            value={noteText}
            onChangeText={onNoteChange}
            multiline
          />
          <View style={s.actionRow}>
            <PrimaryButton label="Одобрить" icon="check" onPress={onApprove} compact style={{ flex: 1, backgroundColor: '#22C55E' }} />
            <SecondaryButton label="Отклонить" icon="close" onPress={onReject} style={{ flex: 1 }} />
          </View>
          <SecondaryButton label="Отмена" onPress={onCancel} />
        </View>
      ) : null}
    </GlassCard>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function StatTile({ icon, label, value, color }) {
  const { palette: p } = useTheme();
  return (
    <GlassCard style={s.statTile}>
      <View style={[s.statIcon, { backgroundColor: color + '22' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[s.statValue, { color: p.ink }]}>{value ?? '—'}</Text>
      <Text style={[s.statLabel, { color: p.inkSoft }]}>{label}</Text>
    </GlassCard>
  );
}

function NavRow({ icon, label, badge, onPress, p }) {
  const { palette: pp } = useTheme();
  return (
    <View
      style={[s.navRow, { borderBottomColor: pp.line }]}
      onStartShouldSetResponder={() => true}
      onResponderRelease={onPress}
    >
      <View style={[s.navIcon, { backgroundColor: pp.surfaceMuted }]}>
        <MaterialCommunityIcons name={icon} size={18} color={pp.brand} />
      </View>
      <Text style={[s.navLabel, { color: pp.ink }]}>{label}</Text>
      {badge > 0 ? (
        <View style={s.navBadge}><Text style={s.navBadgeText}>{badge}</Text></View>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={20} color={pp.inkSoft} />
    </View>
  );
}

function MetaRow({ icon, value, p }) {
  return (
    <View style={s.metaRow}>
      <MaterialCommunityIcons name={icon} size={14} color={p.inkSoft} />
      <Text style={[s.metaText, { color: p.inkSoft }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statTile: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: typography.body,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  navBadge: {
    backgroundColor: palette.danger,
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  navBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  appCard: {
    gap: spacing.sm,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  appTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  appBiz: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
    flex: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  appMeta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
    flex: 1,
  },
  appDate: {
    fontSize: 11,
    fontFamily: typography.body,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  reviewPanel: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    fontFamily: typography.body,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
