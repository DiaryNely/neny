import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SLOTS, isoDaysAgo, monthRange, shiftMonth, todayISO } from '../lib/dates';
import type { Slot } from '../lib/dates';
import type { Kind, Reading } from '../lib/types';

function toSlot(raw: unknown): Slot | null {
  return raw === 'matin' || raw === 'midi' || raw === 'soir' ? raw : null;
}

function toReading(id: string, data: DocumentData): Reading {
  // Les relevés enregistrés avant l'arrivée du GAJ n'ont pas de `kind` : ce sont des GPP.
  const kind: Kind = data.kind === 'gaj' ? 'gaj' : 'gpp';
  const slot = toSlot(data.slot);

  return {
    id,
    date: String(data.date ?? ''),
    kind,
    slot: kind === 'gaj' ? null : slot,
    time: String(data.time ?? ''),
    value: Number(data.value ?? 0),
    note: String(data.note ?? ''),
  };
}

function slotIndex(slot: Slot | null): number {
  return slot ? SLOTS.indexOf(slot) : -1;
}

function sortReadings(list: Reading[]): Reading[] {
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === 'gaj' ? -1 : 1;
    return slotIndex(a.slot) - slotIndex(b.slot);
  });
}

function readMessage(error: { code?: string }): string {
  if (error.code === 'permission-denied') {
    return 'Accès refusé par Firestore. Vérifiez que vos règles autorisent cet utilisateur.';
  }
  return 'Impossible de charger les relevés. Vérifiez votre connexion.';
}

function listen(
  uid: string,
  from: string,
  to: string,
  onData: (readings: Reading[]) => void,
  onError: (message: string) => void,
) {
  const source = query(
    collection(db, 'users', uid, 'readings'),
    where('date', '>=', from),
    where('date', '<=', to),
  );
  return onSnapshot(
    source,
    (snapshot) => onData(sortReadings(snapshot.docs.map((doc) => toReading(doc.id, doc.data())))),
    (error) => onError(readMessage(error)),
  );
}

/** Relevés du mois affiché + ceux du mois précédent, pour la comparaison. */
export function useMonthReadings(uid: string | null, monthKey: string) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [previous, setPrevious] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setReadings([]);
      setPrevious([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let settled = 0;
    let cancelled = false;
    const settle = () => {
      settled += 1;
      if (settled >= 2 && !cancelled) setLoading(false);
    };
    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      setLoading(false);
    };

    const [from, to] = monthRange(monthKey);
    const [prevFrom, prevTo] = monthRange(shiftMonth(monthKey, -1));

    const stopCurrent = listen(
      uid,
      from,
      to,
      (list) => {
        if (cancelled) return;
        setReadings(list);
        settle();
      },
      fail,
    );

    const stopPrevious = listen(
      uid,
      prevFrom,
      prevTo,
      (list) => {
        if (cancelled) return;
        setPrevious(list);
        settle();
      },
      () => {
        if (cancelled) return;
        setPrevious([]);
        settle();
      },
    );

    return () => {
      cancelled = true;
      stopCurrent();
      stopPrevious();
    };
  }, [uid, monthKey]);

  return { readings, previous, loading, error };
}

/**
 * Relevés des derniers jours (90 par défaut) : sert à l'HbA1c estimée,
 * qui est la moyenne glycémique des deux à trois derniers mois.
 */
export function useRecentReadings(uid: string | null, days = 90) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setReadings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const stop = listen(
      uid,
      isoDaysAgo(days - 1),
      todayISO(),
      (list) => {
        setReadings(list);
        setLoading(false);
      },
      () => {
        setReadings([]);
        setLoading(false);
      },
    );

    return stop;
  }, [uid, days]);

  return { readings, loading };
}

/** Relevés d'une seule journée : sert à savoir quels créneaux sont déjà saisis. */
export function useDayReadings(uid: string | null, date: string) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !date) {
      setReadings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const source = query(collection(db, 'users', uid, 'readings'), where('date', '==', date));
    return onSnapshot(
      source,
      (snapshot) => {
        setReadings(sortReadings(snapshot.docs.map((doc) => toReading(doc.id, doc.data()))));
        setLoading(false);
      },
      (err) => {
        setError(readMessage(err));
        setLoading(false);
      },
    );
  }, [uid, date]);

  return { readings, loading, error };
}
