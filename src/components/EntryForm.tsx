import { useEffect, useRef, useState, type FormEvent } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useDayReadings } from '../hooks/useReadings';
import type { Reading } from '../lib/types';
import {
  KINDS,
  kindDefaultTime,
  kindLabel,
  kindLongLabel,
  readingKey,
  readingMatches,
  type Kind,
} from '../lib/types';
import { SLOTS, longDateLabel, slotDefaultTime, slotLabel, todayISO } from '../lib/dates';
import type { Slot } from '../lib/dates';
import { fmtG, statusOf, statusTone } from '../lib/glucose';
import { CorridorScale } from './CorridorScale';
import { IconArrowLeft } from './icons';

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

function defaultTimeFor(kind: Kind, slot: Slot): string {
  return kind === 'gaj' ? kindDefaultTime.gaj : slotDefaultTime[slot];
}

export function EntryForm({
  uid,
  initial,
  initialDate,
  initialSlot,
  onSaved,
  onDeleted,
  onCancel,
}: Props) {
  const startKind: Kind = initial?.kind ?? (initialSlot ? 'gpp' : 'gaj');

  const [date, setDate] = useState(initial?.date ?? initialDate ?? todayISO());
  const [kind, setKind] = useState<Kind>(startKind);
  const [slot, setSlot] = useState<Slot>(initial?.slot ?? initialSlot ?? 'matin');
  const [time, setTime] = useState(initial?.time ?? defaultTimeFor(startKind, initialSlot ?? 'matin'));
  const [raw, setRaw] = useState(initial ? String(initial.value).replace('.', ',') : '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { readings: dayReadings, loading: dayLoading } = useDayReadings(uid, date);
  const appliedKey = useRef(initial ? `${initial.date}|${initial.kind}|${initial.slot ?? ''}` : '');

  const existing = dayReadings.find((reading) => readingMatches(reading, kind, slot));
  const gajSaved = dayReadings.find((reading) => reading.kind === 'gaj');
  const gppSaved = dayReadings.filter((reading) => reading.kind === 'gpp');

  const parsed = Number(raw.replace(',', '.'));
  const value = raw.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
  const tone = value != null ? statusTone[statusOf(value)] : null;

  /*
   * Changer de date, de type ou de moment recharge ce qui est déjà enregistré :
   * le GAJ et chaque moment du GPP sont des relevés indépendants.
   */
  useEffect(() => {
    if (dayLoading) return;
    const key = `${date}|${kind}|${slot}`;
    if (appliedKey.current === key) return;
    appliedKey.current = key;

    const saved = dayReadings.find((reading) => readingMatches(reading, kind, slot));
    if (saved) {
      setRaw(String(saved.value).replace('.', ','));
      setTime(saved.time || defaultTimeFor(kind, slot));
      setNote(saved.note);
    } else {
      setRaw('');
      setTime(defaultTimeFor(kind, slot));
      setNote('');
    }
  }, [date, kind, slot, dayReadings, dayLoading]);

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

    const targetSlot = kind === 'gaj' ? null : slot;
    const id = readingKey(date, kind, targetSlot);

    try {
      await setDoc(doc(db, 'users', uid, 'readings', id), {
        date,
        kind,
        slot: targetSlot,
        time: time || defaultTimeFor(kind, slot),
        value: Math.round(value * 100) / 100,
        note: note.trim(),
        updatedAt: serverTimestamp(),
      });

      // Un relevé déplacé (autre date, autre type, autre moment) ne doit pas rester en double.
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
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-soft hover:text-ink"
        >
          <IconArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div>
          <h1 className="font-display text-[1.3rem] leading-none">
            {existing ? 'Modifier le relevé' : 'Nouveau relevé'}
          </h1>
          <p className="mt-1 text-[12px] text-muted">{longDateLabel(date)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-muted">Date et heure</span>
            <button
              type="button"
              onClick={() => setDate(todayISO())}
              className="h-7 rounded-full border border-line px-2.5 text-[12px] text-ink-2 transition-colors hover:bg-soft"
            >
              Aujourd'hui
            </button>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-2.5">
            <div className="min-w-0">
              <label htmlFor="date" className="sr-only">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={field}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="time" className="sr-only">
                Heure
              </label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={field}
              />
            </div>
          </div>
        </section>

        <section className={card}>
          <span className="text-[12px] text-muted">Type de mesure</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {KINDS.map((option) => {
              const active = kind === option;
              const count = gppSaved.length;
              const countLabel =
                count > 0 ? `${count} relevé${count > 1 ? 's' : ''}` : '—';

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  aria-pressed={active}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-line bg-soft/40 text-ink hover:bg-soft'
                  }`}
                >
                  <span className="text-[13px] font-medium">{kindLabel[option]}</span>
                  <span className={`text-[11px] ${active ? 'text-white/75' : 'text-muted'}`}>
                    {kindLongLabel[option]}
                  </span>
                  <span className={`tnum text-[12px] ${active ? 'text-white' : 'text-ink-2'}`}>
                    {option === 'gaj'
                      ? gajSaved
                        ? fmtG(gajSaved.value)
                        : '—'
                      : countLabel}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            {kind === 'gaj'
              ? 'Un seul GAJ par jour, le matin au réveil.'
              : 'Après un repas : indiquez le moment de la journée.'}
          </p>
        </section>

        {kind === 'gpp' && (
          <section className={card}>
            <span className="text-[12px] text-muted">Moment</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SLOTS.map((option) => {
                const saved = gppSaved.find((reading) => reading.slot === option);
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
                      {saved ? fmtG(saved.value) : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className={card}>
          <label htmlFor="gaj" className="text-[12px] text-muted">
            Glycémie {kind === 'gaj' ? '— GAJ' : '— GPP'}
          </label>
          <div className="mt-1.5 flex items-baseline gap-2 rounded-xl border border-line bg-soft/40 px-3 py-2 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15">
            <input
              id="gaj"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1,05"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setError(null);
              }}
              className="tnum min-w-0 flex-1 bg-transparent font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.03em] outline-none placeholder:text-muted/35 focus-visible:outline-none"
            />
            <span className="shrink-0 text-[13px] text-muted">g/L</span>
          </div>

          <CorridorScale value={value} />

          <p
            className={`mt-1 flex items-center gap-1.5 text-[12px] ${tone ? tone.text : 'text-muted'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${tone ? tone.dot : 'bg-muted/50'}`} />
            {tone ? tone.label : 'Saisissez la valeur mesurée'}
          </p>
        </section>

        <section className={card}>
          <label htmlFor="note" className="flex items-baseline justify-between">
            <span className="text-[12px] text-muted">Observation</span>
            <span className="text-[11px] text-muted">facultatif</span>
          </label>
          <textarea
            id="note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Repas, activité, stress, sommeil…"
            className="mt-1.5 w-full resize-none rounded-xl border border-line bg-soft/40 px-3 py-2.5 leading-relaxed transition-colors focus:border-accent/50"
          />
        </section>

        {error && (
          <p role="alert" className="text-[13px] text-low">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-12 w-full rounded-xl bg-accent text-[15px] font-medium text-on-accent transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer le relevé'}
        </button>

        {existing &&
          (confirmId === existing.id ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDelete(existing)}
                className="h-11 flex-1 rounded-xl bg-low/10 text-[13px] font-medium text-low disabled:opacity-60"
              >
                Confirmer la suppression
              </button>
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="h-11 flex-1 rounded-xl border border-line text-[13px]"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmId(existing.id)}
              className="h-11 w-full rounded-xl text-[13px] text-muted transition-colors hover:bg-soft hover:text-low"
            >
              Supprimer ce relevé
            </button>
          ))}
      </form>
    </div>
  );
}
