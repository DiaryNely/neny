import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { A1C_TARGET, GAJ_MAX, GAJ_MIN, GPP_MAX, HYPO, fmtA1c, fmtG } from '../lib/glucose';
import { longDateLabel } from '../lib/dates';
import {
  SHARE_DAYS,
  createShare,
  describeShareError,
  forgetShareToken,
  loadShare,
  refreshShare,
  rememberShareToken,
  revokeShare,
  savedShareToken,
  shareUrl,
} from '../lib/share';

export function Settings({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const initial = (user.email ?? '?').charAt(0).toUpperCase();

  const [patient, setPatient] = useState(user.displayName ?? '');
  const [token, setToken] = useState<string | null>(null);
  const [linkPatient, setLinkPatient] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<'create' | 'refresh' | 'revoke' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // Le lien déjà créé est retrouvé au rechargement ; s'il a été révoqué, on l'oublie.
  useEffect(() => {
    const saved = savedShareToken(user.uid);
    if (!saved) return;

    let cancelled = false;
    loadShare(saved)
      .then((share) => {
        if (cancelled) return;
        if (!share) {
          forgetShareToken(user.uid);
          return;
        }
        setToken(saved);
        setLinkPatient(share.patient);
        if (share.patient) setPatient(share.patient);
        setUpdatedAt(share.updatedAt);
      })
      .catch(() => {
        /* hors ligne : le lien reste inconnu tant que la page ne se recharge pas */
      });

    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  async function handleCreate() {
    setBusy('create');
    setError(null);
    try {
      const created = await createShare(user.uid, patient);
      rememberShareToken(user.uid, created);
      setToken(created);
      setLinkPatient(patient.trim());
      setUpdatedAt(new Date());
    } catch (cause) {
      console.error('[shares] création du lien', cause);
      setError(describeShareError(cause, 'create'));
    } finally {
      setBusy(null);
    }
  }

  async function handleRefresh() {
    if (!token) return;
    setBusy('refresh');
    setError(null);
    try {
      await refreshShare(user.uid, token, patient);
      setLinkPatient(patient.trim());
      setUpdatedAt(new Date());
    } catch (cause) {
      console.error('[shares] mise à jour du lien', cause);
      setError(describeShareError(cause, 'refresh'));
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke() {
    if (!token) return;
    setBusy('revoke');
    setError(null);
    try {
      await revokeShare(token);
      forgetShareToken(user.uid);
      setToken(null);
      setConfirmRevoke(false);
      setUpdatedAt(null);
    } catch (cause) {
      console.error('[shares] révocation du lien', cause);
      setError(describeShareError(cause, 'revoke'));
    } finally {
      setBusy(null);
    }
  }

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Copie automatique impossible : sélectionnez le lien pour le copier.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 font-display text-[1.45rem]">Compte</h1>

      <div className="space-y-3">
        <section className="rounded-2xl border border-line bg-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[14px] font-medium text-accent ring-1 ring-inset ring-accent/15">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium">{user.email}</p>
              <p className="text-[12px] text-muted">Accès créé par l’administrateur</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card p-4 shadow-card">
          <h2 className="text-[13px] font-medium">Partage avec le médecin</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Un lien à ouvrir sans compte : le médecin voit vos relevés des {SHARE_DAYS} derniers
            jours, les statistiques, et peut enregistrer le rapport en PDF.
          </p>

          <label htmlFor="patient" className="mt-3 block text-[12px] text-muted">
            Nom affiché en haut du rapport
          </label>
          <input
            id="patient"
            value={patient}
            onChange={(event) => setPatient(event.target.value)}
            placeholder="Prénom Nom"
            autoComplete="name"
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-soft/40 px-3 text-[14px] transition-colors focus:border-accent/50"
          />

          {token ? (
            <>
              <label htmlFor="share-link" className="mt-3 block text-[12px] text-muted">
                Lien du rapport
              </label>
              <input
                id="share-link"
                readOnly
                value={shareUrl(token)}
                onFocus={(event) => event.currentTarget.select()}
                className="tnum mt-1.5 h-11 w-full rounded-xl border border-line bg-soft/40 px-3 text-[12px] text-ink-2"
              />

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="h-11 rounded-xl bg-accent text-[13px] font-medium text-on-accent transition-opacity hover:opacity-95"
                >
                  {copied ? 'Lien copié' : 'Copier le lien'}
                </button>
                <a
                  href={shareUrl(token)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center rounded-xl border border-line text-[13px] font-medium text-ink-2 transition-colors hover:bg-soft"
                >
                  Ouvrir le rapport
                </a>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={busy !== null}
                className="mt-2 h-11 w-full rounded-xl border border-line text-[13px] font-medium text-ink-2 transition-colors hover:bg-soft disabled:opacity-60"
              >
                {busy === 'refresh' ? 'Mise à jour…' : 'Mettre à jour les données du lien'}
              </button>

              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Le lien contient un instantané : appuyez sur « Mettre à jour » avant une
                consultation pour y ajouter les derniers relevés.
                {updatedAt && (
                  <>
                    {' '}
                    Dernière mise à jour le {longDateLabel(
                      `${updatedAt.getFullYear()}-${String(updatedAt.getMonth() + 1).padStart(2, '0')}-${String(updatedAt.getDate()).padStart(2, '0')}`,
                    )}
                    {linkPatient ? ` · ${linkPatient}` : ''}.
                  </>
                )}
              </p>

              {confirmRevoke ? (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleRevoke}
                    disabled={busy !== null}
                    className="h-11 flex-1 rounded-xl bg-low text-[13px] font-medium text-white disabled:opacity-60"
                  >
                    {busy === 'revoke' ? 'Révocation…' : 'Confirmer la révocation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(false)}
                    className="h-11 flex-1 rounded-xl border border-line text-[13px]"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(true)}
                  className="mt-2 h-11 w-full rounded-xl border border-low/30 bg-low/5 text-[13px] font-medium text-low transition-colors hover:bg-low/10"
                >
                  Révoquer le lien
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy !== null}
              className="mt-3 h-11 w-full rounded-xl bg-accent text-[13px] font-medium text-on-accent transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {busy === 'create' ? 'Création du lien…' : 'Créer le lien pour le médecin'}
            </button>
          )}

          {error && (
            <p role="alert" className="mt-2 text-[12px] text-low">
              {error}
            </p>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Toute personne qui possède le lien peut consulter le rapport : ne le transmettez
            qu’auprès de votre médecin. Révoquer le lien efface l’instantané partagé.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-card p-4 shadow-card">
          <h2 className="text-[13px] font-medium">Seuils de référence</h2>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                GAJ à jeun
              </dt>
              <dd className="tnum text-muted">
                {fmtG(GAJ_MIN)} – {fmtG(GAJ_MAX)} mmol/L
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                GPP après repas
              </dt>
              <dd className="tnum text-muted">&lt; {fmtG(GPP_MAX)} mmol/L</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-low" />
                Hypoglycémie
              </dt>
              <dd className="tnum text-muted">&lt; {fmtG(HYPO)} mmol/L</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-2 text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                HbA1c estimée
              </dt>
              <dd className="tnum text-muted">≤ {fmtA1c(A1C_TARGET)} %</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            L’HbA1c est la moyenne de la glycémie des 2 à 3 derniers mois, convertie en % par la
            formule ADAG. Ces seuils servent au code couleur de l’application : ils ne remplacent
            pas un avis médical.
          </p>
        </section>

        <button
          type="button"
          onClick={onSignOut}
          className="h-11 w-full rounded-xl border border-line bg-card text-[13px] font-medium text-ink-2 shadow-card transition-colors hover:bg-soft"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
