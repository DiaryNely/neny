import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, firebaseConfigured } from './lib/firebase';
import { useAuth } from './hooks/useAuth';
import { useMonthReadings, useRecentReadings } from './hooks/useReadings';
import { useMonthWeights } from './hooks/useWeights';
import { currentMonthKey, monthKeyOf } from './lib/dates';
import type { Slot } from './lib/dates';
import type { Reading } from './lib/types';
import { AppShell, type ViewName } from './components/AppShell';
import { AddChooser } from './components/AddChooser';
import { AuthScreen } from './components/AuthScreen';
import { Brand } from './components/Brand';
import { DoctorReport } from './components/DoctorReport';
import { GajForm } from './components/GajForm';
import { GppForm } from './components/GppForm';
import { MonthDashboard } from './components/MonthDashboard';
import { Settings } from './components/Settings';
import { WeightForm } from './components/WeightForm';

type View =
  | { name: 'mois' }
  | { name: 'ajouter' }
  | { name: 'gaj'; initial?: Reading; date?: string }
  | { name: 'gpp'; initial?: Reading; date?: string; slot?: Slot }
  | { name: 'poids' }
  | { name: 'compte' };

export default function App() {
  if (!firebaseConfigured) return <ConfigNotice />;

  // Lien du médecin : `?d=<jeton>`, consultable sans connexion.
  const token = new URLSearchParams(window.location.search).get('d');
  if (token) return <DoctorReport token={token} />;

  return <Root />;
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

  const { weights, loading: weightsLoading } = useMonthWeights(user?.uid ?? null, monthKey);

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

  /** Retour au mois affiché, sur le mois de la date enregistrée, avec un message. */
  const backToMonth = (date: string, message: string) => {
    setMonthKey(monthKeyOf(date));
    setView({ name: 'mois' });
    setToast(message);
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
          weights={weights}
          weightsLoading={weightsLoading}
          onAddGaj={() => setView({ name: 'gaj' })}
          onAddGpp={() => setView({ name: 'gpp' })}
          onAddWeight={() => setView({ name: 'poids' })}
          onEdit={(reading) =>
            setView(
              reading.kind === 'gaj'
                ? { name: 'gaj', initial: reading }
                : { name: 'gpp', initial: reading },
            )
          }
        />
      )}

      {view.name === 'ajouter' && (
        <AddChooser
          onPick={(target) => {
            if (target === 'gaj') setView({ name: 'gaj' });
            else if (target === 'gpp') setView({ name: 'gpp' });
            else setView({ name: 'poids' });
          }}
        />
      )}

      {view.name === 'gaj' && (
        <GajForm
          uid={user.uid}
          initial={view.initial}
          initialDate={view.date}
          onSaved={(date) => backToMonth(date, 'GAJ enregistré.')}
          onDeleted={(date) => backToMonth(date, 'GAJ supprimé.')}
          onCancel={() => setView({ name: 'mois' })}
        />
      )}

      {view.name === 'gpp' && (
        <GppForm
          uid={user.uid}
          initial={view.initial}
          initialDate={view.date}
          initialSlot={view.slot}
          onSaved={(date) => backToMonth(date, 'GPP enregistré.')}
          onDeleted={(date) => backToMonth(date, 'GPP supprimé.')}
          onCancel={() => setView({ name: 'mois' })}
        />
      )}

      {view.name === 'poids' && (
        <WeightForm
          uid={user.uid}
          onSaved={(date) => backToMonth(date, 'Poids enregistré.')}
          onDeleted={(date) => backToMonth(date, 'Poids supprimé.')}
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
          {`VITE_FIREBASE_API_KEY=…\nVITE_FIREBASE_AUTH_DOMAIN=…\nVITE_FIREBASE_PROJECT_ID=…\nVITE_FIREBASE_APP_ID=…`}
        </pre>
        <p className="mt-3 text-[12px] text-muted">
          Le modèle complet se trouve dans <code>.env.example</code>. Redémarrez ensuite le serveur
          de développement.
        </p>
      </div>
    </div>
  );
}
