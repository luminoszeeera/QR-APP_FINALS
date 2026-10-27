import { router } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { Badge } from '@/components/StatusBadge';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

const ROLE_LABEL = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Administrator',
} as const;

export default function Index() {
  const { profile, role } = useAuth();
  const firstName = profile?.full_name?.trim().split(' ')[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <Header title='QR Attendance' />
          <Text style={styles.credit}>by:Philip Jhon Ares</Text>
        </View>

        <View style={styles.bodyContainer}>
          <Text style={styles.mainTitle}>
            {firstName ? `Welcome, ${firstName}!` : 'School Event Attendance'}
          </Text>
          {role ? <Badge label={ROLE_LABEL[role]} tone='info' /> : null}
          <Text style={styles.subtitle}>
            {role === 'student'
              ? 'Scan QR codes to record attendance during school activities.'
              : role === 'teacher'
              ? 'Create events, share their QR codes and monitor attendance.'
              : 'Manage users, events and attendance records across the school.'}
          </Text>
        </View>

        <View style={styles.footerContainer}>
          {role === 'student' && (
            <>
              <AppButton
                theme='primary'
                title='Scan QR Code'
                icon='qr-code-outline'
                onPress={() => router.push('/scan')}
              />
              <AppButton
                title='Available Events'
                icon='calendar-outline'
                onPress={() => router.push('/events')}
              />
              <AppButton
                title='Attendance History'
                icon='time-outline'
                onPress={() => router.push('/history')}
              />
            </>
          )}

          {role === 'teacher' && (
            <>
              <AppButton
                theme='primary'
                title='Create Event'
                icon='add-circle-outline'
                onPress={() => router.push('/event/form')}
              />
              <AppButton
                title='My Events'
                icon='calendar-outline'
                onPress={() => router.push('/events')}
              />
              <AppButton
                title='Attendance Summaries'
                icon='stats-chart-outline'
                onPress={() => router.push('/history')}
              />
            </>
          )}

          {role === 'admin' && (
            <>
              <AppButton
                theme='primary'
                title='Manage Users'
                icon='people-outline'
                onPress={() => router.push('/admin')}
              />
              <AppButton
                title='All Events'
                icon='calendar-outline'
                onPress={() => router.push('/events')}
              />
              <AppButton
                title='Overall Attendance'
                icon='stats-chart-outline'
                onPress={() => router.push('/history')}
              />
            </>
          )}

          <AppButton
            title='Profile'
            icon='person-outline'
            onPress={() => router.push('/profile')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { alignItems: 'center', paddingBottom: 32 },
  headerContainer: { alignItems: 'center', justifyContent: 'center' },
  credit: { color: COLORS.textSecondary },
  bodyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginVertical: 16,
    gap: 8,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  footerContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    marginTop: 8,
  },
});
