import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, firebaseConfigured } from './lib/firebase';
import { useAuth } from './hooks/useAuth';
import { useMonthReadings, useRecentReadings } from './hooks/useReadings';
import { currentMonthKey, monthKeyOf } from './lib/dates';
import type { Slot } from './lib/dates';
import type { Reading } from './lib/types';
import { AppShell, type ViewName } from './components/AppShell';
import { AuthScreen } from './components/AuthScreen';
import { Brand } from './components/Brand';
import { EntryForm } from './components/EntryForm';
import { MonthDashboard } from './components/MonthDashboard';
import { Settings } from './components/Settings';

type View =
  | { name: 'mois' }
  | { name: 'ajouter'; initial?: Reading; date?: string; slot?: Slot }
  | { name: 'compte' };

export default function App() {
  return firebaseConfigured ? <Root /> : <ConfigNotice />;
}

function Root() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>({ name: 'mois' });
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [toast, setToast] = useState<string | null>(null);

  const {
    readings,
    previous,
    loading: dataLoading,
    error,
  } = useMonthReadings(user?.uid ?? null, monthKey);

  // 90 jours : la période de l'HbA1c estimée.
  const { readings: recent } = useRecentReadings(user?.uid ?? null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  if (loading) return <Splash />;
  if (!user) return <AuthScreen />;

  const navigate = (name: ViewName) => setView({ name } as View);

  const handleSaved = (date: string) => {
    setMonthKey(monthKeyOf(date));
    setView({ name: 'mois' });
    setToast('Relevé enregistré.');
  };

  const handleDeleted = (date: string) => {
    setMonthKey(monthKeyOf(date));
    setView({ name: 'mois' });
    setToast('Relevé supprimé.');
  };

  return (
    <AppShell user={user} view={view.name} onNavigate={navigate} toast={toast}>
      {view.name === 'mois' && (
        <MonthDashboard
          readings={readings}
          previous={previous}
          recent={recent}
          loading={dataLoading}
          error={error}
          monthKey={monthKey}
          onMonthChange={setMonthKey}
          onAdd={() => setView({ name: 'ajouter' })}
          onEdit={(reading) => setView({ name: 'ajouter', initial: reading })}
        />
      )}

      {view.name === 'ajouter' && (
        <EntryForm
          uid={user.uid}
          initial={view.initial}
          initialDate={view.date}
          initialSlot={view.slot}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCancel={() => setView({ name: 'mois' })}
        />
      )}

      {view.name === 'compte' && (
        <Settings
          user={user}
          onSignOut={() => {
            void signOut(auth);
            setView({ name: 'mois' });
          }}
        />
      )}
    </AppShell>
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <Brand />
      <div className="h-1 w-24 animate-pulse rounded-full bg-line-strong" />
    </div>
  );
}

function ConfigNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-card">
        <Brand />
        <h1 className="mt-5 font-display text-[1.25rem]">Firebase n’est pas configuré</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          Renseignez les identifiants du projet dans un fichier <code>.env</code> à la racine :
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-soft p-3 text-[12px] leading-relaxed text-ink-2">
          {`VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_APP_ID=…`}
        </pre>
        <p className="mt-3 text-[12px] text-muted">
          Le modèle complet se trouve dans <code>.env.example</code>. Redémarrez ensuite le serveur
          de développement.
        </p>
      </div>
    </div>
  );
}
