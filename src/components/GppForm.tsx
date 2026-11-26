import { useEffect, useRef, useState, type FormEvent } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useDayReadings } from '../hooks/useReadings';
import type { Reading } from '../lib/types';
import { readingKey } from '../lib/types';
import { SLOTS, longDateLabel, slotDefaultTime, slotLabel, todayISO } from '../lib/dates';
import type { Slot } from '../lib/dates';
import { fmtG, statusLabel, statusOf, statusTone } from '../lib/glucose';
import { CorridorScale } from './CorridorScale';
import { IconArrowLeft } from './icons';
import { ObservationField } from './ObservationField';

/**
 * Saisie du GPP seul : un relevé par moment de la journée.
 * Le GAJ a son propre formulaire (`GajForm`), les deux ne se mélangent plus.
 */
interface Props {
  uid: string;
  initial?: Reading;
  initialDate?: string;
  initialSlot?: Slot;
  onSaved: (date: string) => void;
  onDeleted: (date: string) => void;
  onCancel: () => void;
}

const card = 'rounded-2xl border border-line bg-card p-4 shadow-card';
const field =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-soft/40 px-2.5 tnum transition-colors focus:border-accent/50';
const dateTimeField = `${field} max-[359px]:[&::-webkit-calendar-picker-indicator]:hidden`;

export function GppForm({
  uid,
  initial,
  initialDate,
  initialSlot,
  onSaved,
  onDeleted,
  onCancel,
}: Props) {
  const startDate = initial?.date ?? initialDate ?? todayISO();
  const startSlot: Slot = initial?.slot ?? initialSlot ?? 'matin';

  const [date, setDate] = useState(startDate);
  const [slot, setSlot] = useState<Slot>(startSlot);
  const [time, setTime] = useState(initial?.time || slotDefaultTime[startSlot]);
  const [raw, setRaw] = useState(initial ? String(initial.value).replace('.', ',') : '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const { readings, loading } = useDayReadings(uid, date);
  const savedGpp = readings.filter((reading) => reading.kind === 'gpp');
  const saved = savedGpp.find((reading) => reading.slot === slot) ?? null;
  const editing = Boolean(initial) || Boolean(saved);

  /* Une création démarre vide : le jour et le moment de départ sont déjà « appliqués ». */
  const appliedKey = useRef(`${startDate}|${startSlot}`);

  const parsed = Number(raw.replace(',', '.'));
  const value = raw.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
  const status = value != null ? statusOf(value, 'gpp') : null;
  const tone = status ? statusTone[status] : null;

  useEffect(() => {
    if (loading) return;
    const key = `${date}|${slot}`;
    if (appliedKey.current === key) return;
    appliedKey.current = key;

    const existing = readings.find((reading) => reading.kind === 'gpp' && reading.slot === slot);
    if (existing) {
      setRaw(String(existing.value).replace('.', ','));
      setTime(existing.time || slotDefaultTime[slot]);
      setNote(existing.note);
    } else {
      setRaw('');
      setTime(slotDefaultTime[slot]);
      setNote('');
    }
  }, [date, slot, readings, loading]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!date) {
      setError('Choisissez une date.');
      return;
    }
    if (value == null) {
      setError('Entrez la valeur mesurée.');
      return;
    }

    setSaving(true);
    setError(null);

    const id = readingKey(date, 'gpp', slot);

    try {
      await setDoc(doc(db, 'users', uid, 'readings', id), {
        date,
        kind: 'gpp',
        slot,
        time: time || slotDefaultTime[slot],
        value: Math.round(value * 10) / 10,
        note: note.trim(),
        updatedAt: serverTimestamp(),
      });

      if (initial && initial.id !== id) {
        try {
          await deleteDoc(doc(db, 'users', uid, 'readings', initial.id));
        } catch {
          /* l'ancien document reste, sans bloquer l'enregistrement */
        }
      }

      onSaved(date);
    } catch {
      setError("L'enregistrement a échoué. Vérifiez votre connexion et réessayez.");
      setSaving(false);
    }
  }

  async function handleDelete(reading: Reading) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', uid, 'readings', reading.id));
      onDeleted(reading.date);
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
            {editing ? 'Modifier le GPP' : 'Nouveau GPP'}
          </h1>
          <p className="mt-1 text-[12px] text-muted">
            Après repas · {slotLabel[slot]} · {longDateLabel(date)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-muted">Date et heure</span>
            <button
              type="button"
              onClick={() => setDate(todayISO())}
              className="h-11 rounded-full border border-line px-3.5 text-[12px] text-ink-2 transition-colors hover:bg-soft"
            >
              Aujourd'hui
            </button>
          </div>
          <div className="mt-1.5 grid grid-cols-[1.4fr_1fr] gap-2.5">
            <div className="min-w-0">
              <label htmlFor="gpp-date" className="sr-only">
                Date
              </label>
              <input
                id="gpp-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={dateTimeField}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="gpp-time" className="sr-only">
                Heure
              </label>
              <input
                id="gpp-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={dateTimeField}
              />
            </div>
          </div>
        </section>

        <section className={card}>
          <span className="text-[12px] text-muted">Moment du repas</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SLOTS.map((option) => {
              const existing = savedGpp.find((reading) => reading.slot === option);
              const active = slot === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSlot(option)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors ${
                    active
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-line bg-soft/40 text-ink hover:bg-soft'
                  }`}
                >
                  <span className="text-[13px] font-medium">{slotLabel[option]}</span>
                  <span className={`tnum text-[11px] ${active ? 'text-white/70' : 'text-muted'}`}>
                    {existing ? fmtG(existing.value) : '—'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Un GPP par moment : matin, midi ou soir. Chaque moment se remplit séparément.
          </p>
        </section>

        <section className={card}>
          <label htmlFor="gpp-value" className="text-[12px] text-muted">
            Glycémie post-prandiale
          </label>
          <div className="mt-1.5 flex items-baseline gap-2 rounded-xl border border-line bg-soft/40 px-3 py-2 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15">
            <input
              id="gpp-value"
              inputMode="decimal"
              autoComplete="off"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setError(null);
              }}
              className="tnum min-w-0 flex-1 bg-transparent font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.03em] outline-none placeholder:text-muted/35 focus-visible:outline-none"
            />
            <span className="shrink-0 text-[13px] text-muted">mmol/L</span>
          </div>

          <CorridorScale value={value} kind="gpp" />

          <p
            className={`mt-1 flex items-center gap-1.5 text-[12px] ${tone ? tone.text : 'text-muted'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${tone ? tone.dot : 'bg-muted/50'}`} />
            {status ? statusLabel(status, 'gpp') : 'Saisissez la valeur mesurée'}
          </p>
        </section>

        <ObservationField id="gpp-note" value={note} onChange={setNote} />

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
          {saving ? 'Enregistrement…' : editing ? 'Valider la modification' : 'Enregistrer le GPP'}
        </button>

        {saved &&
          (confirm ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDelete(saved)}
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
              Supprimer ce GPP
            </button>
          ))}
      </form>
    </div>
  );
}
