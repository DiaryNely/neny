# Neny — suivi de glycémie

Application web mobile-first (React + Vite + TypeScript + Tailwind CSS) pour enregistrer
sa glycémie (composition en mmol/L) matin, midi et soir, et suivre le mois.

## Démarrer

```bash
npm install
npm run dev
```

La configuration Firebase vit dans `.env` (modèle dans `.env.example`) et reprend le projet
`neny-2cf61` déjà présent dans le dossier.

## Firebase — à faire une fois

1. **Authentication → Sign-in method → E-mail/Mot de passe : activé.**
2. **Authentication → Users → Add user** : un e-mail et un mot de passe par personne.
   Il n'y a pas d'inscription dans l'application, chaque accès est créé à la main ici.
3. **Firestore Database** : créer la base, puis coller le contenu de `firestore.rules`
   dans l'onglet *Rules* et publier. Chaque personne ne peut lire et écrire que
   `users/{sonUid}/readings/*` ; la collection `shares` sert au lien du médecin (voir
   plus bas) et reste lisible sans authentification.

## Données

Deux mesures indépendantes, déclarables séparément :

- **GAJ** — glycémie à jeun, une seule fois par jour, au réveil (toujours le matin).
- **GPP** — glycémie post-prandiale, avec le moment de la journée (matin, midi, soir) :
  une même journée peut en porter plusieurs.

Chaque relevé est un document `users/{uid}/readings/{id}` :

| mesure | id du document |
| --- | --- |
| GAJ du 17/11 | `2026-11-17_gaj` |
| GPP du 17/11 midi | `2026-11-17_gpp_midi` |

Réenregistrer le même créneau met à jour l'existant au lieu de le dupliquer.

```ts
{
  date: 'AAAA-MM-JJ',
  kind: 'gaj' | 'gpp',
  slot: 'matin' | 'midi' | 'soir' | null, // null pour un GAJ
  time: 'HH:mm',
  value: 5.6, // mmol/L
  note: '',
}
```

Les relevés enregistrés avant l'arrivée du GAJ (sans champ `kind`) sont lus comme des GPP.

## Lien pour le médecin

Dans **Compte → Partage avec le médecin**, l'application crée un lien
`…/?d=<jeton>` qui ouvre un rapport **sans aucune identification** : statistiques de la
période, moyennes par moment, graphiques GAJ et GPP mois par mois, relevés jour par jour,
et un bouton **Imprimer / Enregistrer en PDF** (mise en page A4, couleurs conservées).

Le lien ne donne pas accès au compte. À sa création, un **instantané** des relevés des
90 derniers jours est copié dans `shares/{jeton}` : ce document est lisible publiquement
par qui connaît le jeton (16 octets aléatoires), et seul le propriétaire peut le créer,
le mettre à jour ou le supprimer. « Mettre à jour » réécrit l'instantané avec les relevés
du jour ; « Révoquer » le supprime et rend le lien inutilisable.

## Seuils

Toutes les valeurs sont en **mmol/L**. Codés dans `src/lib/glucose.ts` :

| mesure | cible |
| --- | --- |
| GAJ (à jeun) | 4,4 – 7,2 mmol/L |
| GPP (après repas) | < 10 mmol/L |
| Hypoglycémie | < 3,9 mmol/L |
| HbA1c estimée | ≤ 6,5 % |

Ils pilotent le code couleur, le couloir du graphique et la jauge de saisie.

L'**HbA1c estimée** est la moyenne des glycémies des 90 derniers jours (tous mois
confondus), convertie en % par la formule ADAG :
`A1c = (mmol/L × 18,0182 + 46,7) / 28,7`. Elle est indicative : seule une prise de sang
la mesure réellement.
