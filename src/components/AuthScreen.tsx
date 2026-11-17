import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Brand } from './Brand';

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Cette adresse e-mail n’est pas valide.',
  'auth/missing-password': 'Entrez votre mot de passe.',
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte pour cette adresse.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/user-disabled': 'Cet accès est désactivé.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/network-request-failed': 'Connexion impossible. Vérifiez votre réseau.',
};

function authMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  return AUTH_MESSAGES[code] ?? 'La connexion a échoué. Réessayez.';
}

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!email.trim()) {
      setError('Entrez votre adresse e-mail.');
      return;
    }
    if (!password) {
      setError('Entrez votre mot de passe.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-accent p-10 text-white md:flex lg:p-14">
        <Brand inverted />

        <div className="max-w-[24ch]">
          <h2 className="font-display text-[2.3rem] font-semibold leading-[1.05] text-white lg:text-[2.7rem]">
            Un relevé le matin, à midi, le soir.
          </h2>
          <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-white/70">
            Neny garde la trace de chaque mesure et de ce qui l’accompagne, mois après mois.
          </p>
        </div>

        <svg viewBox="0 0 400 240" className="w-full" aria-hidden="true">
          <rect x="0" y="143" width="400" height="56" fill="#ffffff" fillOpacity="0.09" />
          <line
            x1="0"
            x2="400"
            y1="143"
            y2="143"
            stroke="#ffffff"
            strokeOpacity="0.3"
            strokeDasharray="3 4"
          />
          <line
            x1="0"
            x2="400"
            y1="199"
            y2="199"
            stroke="#ffffff"
            strokeOpacity="0.3"
            strokeDasharray="3 4"
          />
          <path
            d="M40,164 L78,188 L116,133 L154,174 L192,100 L230,151 L268,193 L306,127 L344,163 L380,147"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.9"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {[
            [40, 164],
            [78, 188],
            [116, 133],
            [154, 174],
            [192, 100],
            [230, 151],
            [268, 193],
            [306, 127],
            [344, 163],
            [380, 147],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#ffffff" fillOpacity="0.95" />
          ))}
        </svg>
      </aside>

      <main className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-8 md:min-h-0 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="md:hidden">
            <Brand />
          </div>

          <h1 className="mt-7 font-display text-[1.7rem] md:mt-0">Se connecter</h1>
          <p className="mt-1 text-[13px] text-muted">Suivi de glycémie</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
            <label className="block">
              <span className="text-[12px] text-muted">E-mail</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-card px-3.5 shadow-card transition-colors focus:border-accent/50"
              />
            </label>

            <label className="block">
              <span className="text-[12px] text-muted">Mot de passe</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-card px-3.5 shadow-card transition-colors focus:border-accent/50"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-low/10 px-3 py-2 text-[13px] text-low">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-xl bg-accent text-[15px] font-medium text-on-accent transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-5 text-[12px] leading-relaxed text-muted">
            Votre accès est créé par un administrateur : demandez la création de votre compte pour
            recevoir vos identifiants.
          </p>
        </div>
      </main>
    </div>
  );
}
