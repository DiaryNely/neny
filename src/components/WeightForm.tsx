import { useEffect, useRef, useState, type FormEvent } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useDayWeight } from '../hooks/useWeights';
import { longDateLabel, todayISO } from '../lib/dates';
import { IconArrowLeft } from './icons';
import { ObservationField } from './ObservationField';

/**
 * Saisie du poids : un relevé par jour, identifié par la date
 * (`users/{uid}/weights/{AAAA-MM-JJ}`).
 */
interface Props {
  uid: string;
  initialDate?: string;
  onSaved: (date: string) => void;
  onDeleted: (date: string) => void;
  onCancel: () => void;
}

const card = 'rounded-2xl border border-line bg-card p-4 shadow-card';
const field =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-soft/40 px-2.5 tnum transition-colors focus:border-accent/50';
const dateField = `${field} max-[359px]:[&::-webkit-calendar-picker-indicator]:hidden`;

export function WeightForm({ uid, initialDate, onSaved, onDeleted, onCancel }: Props) {
  const startDate = initialDate ?? todayISO();

  const [date, setDate] = useState(startDate);
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const { weight, loading } = useDayWeight(uid, date);
  const editing = Boolean(weight);

  /* Une création démarre vide : le jour de départ est déjà « appliqué ». */
  const appliedKey = useRef(startDate);

  const parsed = Number(raw.replace(',', '.'));
  const value = raw.trim() !== '' && Number.isFinite(parsed) ? parsed : null;

  useEffect(() => {
    if (loading) return;
    if (appliedKey.current === date) return;
    appliedKey.current = date;

    if (weight) {
      setRaw(String(weight.value).replace('.', ','));
      setNote(weight.note);
    } else {
      setRaw('');
      setNote('');
    }
  }, [date, weight, loading]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!date) {
      setError('Choisissez une date.');
      return;
    }
    if (value == null) {
      setError('Entrez le poids mesuré.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await setDoc(doc(db, 'users', uid, 'weights', date), {
        date,
        value: Math.round(value * 10) / 10,
        note: note.trim(),
        updatedAt: serverTimestamp(),
      });
      onSaved(date);
    } catch {
      setError("L'enregistrement a échoué. Vérifiez votre connexion et réessayez.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', uid, 'weights', date));
      onDeleted(date);
    } catch {
      setError('La suppression a échoué. Vérifiez votre connexion et réessayez.');
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-start gap-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Retour au mois"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <IconArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div>
          <h1 className="font-display text-[1.3rem] leading-none">
            {editing ? 'Modifier le poids' : 'Nouveau poids'}
          </h1>
          <p className="mt-1 text-[12px] text-muted">Poids du jour · {longDateLabel(date)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-muted">Jour</span>
            <button
              type="button"
              onClick={() => setDate(todayISO())}
              className="h-11 rounded-full border border-line px-3.5 text-[12px] text-ink-2 transition-colors hover:bg-soft"
            >
              Aujourd'hui
            </button>
          </div>
          <div className="mt-1.5">
            <label htmlFor="weight-date" className="sr-only">
              Date
            </label>
            <input
              id="weight-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={dateField}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Un seul poids par jour : enregistrer à nouveau la même date remplace la valeur.
          </p>
        </section>

        <section className={card}>
          <label htmlFor="weight-value" className="text-[12px] text-muted">
            Poids
          </label>
          <div className="mt-1.5 flex items-baseline gap-2 rounded-xl border border-line bg-soft/40 px-3 py-2 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15">
            <input
              id="weight-value"
              inputMode="decimal"
              autoComplete="off"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setError(null);
              }}
              className="tnum min-w-0 flex-1 bg-transparent font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.03em] outline-none placeholder:text-muted/35 focus-visible:outline-none"
            />
            <span className="shrink-0 text-[13px] text-muted">kg</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Pesez-vous dans les mêmes conditions (matin, à jeun) pour suivre une tendance.
          </p>
        </section>

        <ObservationField id="weight-note" value={note} onChange={setNote} />

        {error && (
          <p role="alert" className="text-[13px] text-low">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className={`h-12 w-full rounded-xl text-[15px] font-medium transition-opacity hover:opacity-95 disabled:opacity-60 ${
            editing ? 'bg-edit text-ink' : 'bg-accent text-on-accent'
          }`}
        >
          {saving ? 'Enregistrement…' : editing ? 'Valider la modification' : 'Enregistrer le poids'}
        </button>

        {weight &&
          (confirm ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="h-11 flex-1 rounded-xl bg-low text-[13px] font-medium text-white disabled:opacity-60"
              >
                Confirmer la suppression
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="h-11 flex-1 rounded-xl border border-line text-[13px]"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="h-11 w-full rounded-xl border border-low/30 bg-low/5 text-[13px] font-medium text-low transition-colors hover:bg-low/10"
            >
              Supprimer ce poids
            </button>
          ))}
      </form>
    </div>
  );
}
