import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { SLOTS, isoDaysAgo, todayISO, type Slot } from './dates';
import type { Kind } from './types';

/**
 * Partage avec le médecin
 * -----------------------
 * Le lien n'exige aucune connexion : il porte un jeton aléatoire (`?d=…`) qui désigne
 * un document `shares/{token}`. Ce document contient un **instantané** des relevés,
 * pas un accès à la collection de l'utilisateur : révoquer le lien supprime l'instantané,
 * et le compte reste illisible sans authentification.
 */
export const SHARE_DAYS = 90;

export interface SharedReading {
  date: string;
  kind: Kind;
  slot: Slot | null;
  time: string;
  value: number;
  note: string;
}

export interface Share {
  token: string;
  /** Nom affiché en haut du rapport. */
  patient: string;
  from: string;
  to: string;
  updatedAt: Date | null;
  readings: SharedReading[];
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toSlot(raw: unknown): Slot | null {
  return raw === 'matin' || raw === 'midi' || raw === 'soir' ? raw : null;
}

function slotIndex(slot: Slot | null): number {
  return slot ? SLOTS.indexOf(slot) : -1;
}

function toSharedReading(data: Record<string, unknown>): SharedReading {
  const kind: Kind = data.kind === 'gaj' ? 'gaj' : 'gpp';
  return {
    date: String(data.date ?? ''),
    kind,
    slot: kind === 'gaj' ? null : (toSlot(data.slot) ?? 'matin'),
    time: String(data.time ?? ''),
    value: Number(data.value ?? 0),
    note: String(data.note ?? ''),
  };
}

/** Lien à transmettre : même page, avec le jeton en paramètre. */
export function shareUrl(token: string): string {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('d', token);
  return url.toString();
}

const storageKey = (uid: string) => `neny.share.${uid}`;

export function savedShareToken(uid: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(uid));
  } catch {
    return null;
  }
}

export function rememberShareToken(uid: string, token: string) {
  try {
    window.localStorage.setItem(storageKey(uid), token);
  } catch {
    /* navigation privée : le lien reste affiché jusqu'au rechargement */
  }
}

export function forgetShareToken(uid: string) {
  try {
    window.localStorage.removeItem(storageKey(uid));
  } catch {
    /* rien à faire */
  }
}

export type ShareAction = 'create' | 'refresh' | 'revoke';

/**
 * Traduit l'erreur Firestore en message actionnable : sans le code, un refus de
 * règles (`permission-denied`) ressemblerait à une simple coupure réseau.
 */
export function describeShareError(error: unknown, action: ShareAction): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  const step =
    action === 'create'
      ? 'la création du lien'
      : action === 'refresh'
        ? 'la mise à jour du lien'
        : 'la révocation du lien';

  switch (code) {
    case 'permission-denied':
      return `Firestore a refusé ${step} : les règles du projet n’autorisent pas encore la collection « shares ». Copiez le contenu de firestore.rules dans Firebase → Firestore Database → Règles, puis cliquez sur Publier.`;
    case 'unauthenticated':
      return `Session expirée : reconnectez-vous, puis relancez ${step}.`;
    case 'unavailable':
      return `Firestore est injoignable (réseau ou bloqueur de pub). Réessayez une fois la connexion revenue.`;
    case 'failed-precondition':
      return `Firestore demande une configuration supplémentaire (index) pour ${step}.`;
    case 'resource-exhausted':
      return `Quota Firestore atteint : ${step} a échoué. Réessayez plus tard.`;
    case 'not-found':
      return `Le document partagé est introuvable : ${step} a échoué.`;
    default:
      return `Échec de ${step}${code ? ` (${code})` : ''}. Vérifiez votre connexion et réessayez.`;
  }
}

async function writeShare(token: string, uid: string, patient: string) {
  const from = isoDaysAgo(SHARE_DAYS - 1);
  const to = todayISO();

  const snapshot = await getDocs(
    query(
      collection(db, 'users', uid, 'readings'),
      where('date', '>=', from),
      where('date', '<=', to),
    ),
  );

  const readings = snapshot.docs
    .map((document) => toSharedReading(document.data()))
    .filter((reading) => reading.date !== '')
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.kind !== b.kind) return a.kind === 'gaj' ? -1 : 1;
      return slotIndex(a.slot) - slotIndex(b.slot);
    });

  await setDoc(doc(db, 'shares', token), {
    uid,
    patient: patient.trim(),
    from,
    to,
    updatedAt: serverTimestamp(),
    readings,
  });
}

/** Crée un nouvel instantané et renvoie son jeton. */
export async function createShare(uid: string, patient: string): Promise<string> {
  const token = randomToken();
  await writeShare(token, uid, patient);
  return token;
}

/** Remplace l'instantané d'un lien existant par les relevés du jour. */
export async function refreshShare(uid: string, token: string, patient: string): Promise<void> {
  await writeShare(token, uid, patient);
}

/** Supprime l'instantané : le lien devient inutilisable. */
export async function revokeShare(token: string): Promise<void> {
  await deleteDoc(doc(db, 'shares', token));
}

export async function loadShare(token: string): Promise<Share | null> {
  const snapshot = await getDoc(doc(db, 'shares', token));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  const updated = data.updatedAt as { toDate?: () => Date } | null;

  return {
    token,
    patient: String(data.patient ?? ''),
    from: String(data.from ?? ''),
    to: String(data.to ?? ''),
    updatedAt: updated?.toDate?.() ?? null,
    readings: Array.isArray(data.readings)
      ? data.readings.map((reading: Record<string, unknown>) => toSharedReading(reading))
      : [],
  };
}
