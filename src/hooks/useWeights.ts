import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { monthRange } from '../lib/dates';
import type { Weight } from '../lib/weight';

function toWeight(id: string, data: DocumentData): Weight {
  return {
    id,
    date: String(data.date ?? ''),
    value: Number(data.value ?? 0),
    note: String(data.note ?? ''),
  };
}

function readMessage(error: { code?: string }): string {
  if (error.code === 'permission-denied') {
    return 'Accès refusé par Firestore. Vérifiez que vos règles autorisent cet utilisateur.';
  }
  return 'Impossible de charger les poids. Vérifiez votre connexion.';
}

/** Poids du mois affiché, dans l'ordre chronologique. */
export function useMonthWeights(uid: string | null, monthKey: string) {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setWeights([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [from, to] = monthRange(monthKey);
    const source = query(
      collection(db, 'users', uid, 'weights'),
      where('date', '>=', from),
      where('date', '<=', to),
    );

    return onSnapshot(
      source,
      (snapshot) => {
        setWeights(
          snapshot.docs
            .map((entry) => toWeight(entry.id, entry.data()))
            .sort((a, b) => (a.date < b.date ? -1 : 1)),
        );
        setLoading(false);
      },
      (err) => {
        setError(readMessage(err));
        setLoading(false);
      },
    );
  }, [uid, monthKey]);

  return { weights, loading, error };
}

/** Poids d'une journée : sert au formulaire, pour savoir s'il crée ou modifie. */
export function useDayWeight(uid: string | null, date: string) {
  const [weight, setWeight] = useState<Weight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !date) {
      setWeight(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      doc(db, 'users', uid, 'weights', date),
      (snapshot) => {
        setWeight(snapshot.exists() ? toWeight(snapshot.id, snapshot.data()) : null);
        setLoading(false);
      },
      () => {
        setWeight(null);
        setLoading(false);
      },
    );
  }, [uid, date]);

  return { weight, loading };
}
