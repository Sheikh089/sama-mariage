# Sama_Mariage — Plan de construction

Le projet est très large. Je vais le livrer en **6 phases** pour garder de la qualité à chaque étape. Vous validerez chaque phase avant de passer à la suivante.

## Stack
- Frontend : React + TypeScript + Tailwind (déjà en place)
- Backend : Lovable Cloud (base + auth + storage + fonctions serveur)
- Logo Sama_Mariage intégré (votre image uploadée)
- Palette : Or `#D4AF37`, blanc, noir élégant
- Typo : serif élégante (Cormorant / Playfair) + sans-serif (Inter)

---

## Phase 1 — Identité, landing & auth (LIVRAISON IMMÉDIATE)
- Intégration du logo + design system or/noir/blanc
- Landing page premium : hero, fonctionnalités, modèles d'invitation, tarifs, footer
- Auth complète : inscription email/mot de passe, connexion, reset password, **Google** (Facebook non supporté nativement → remplacé par Google uniquement, voir note)
- Page `/auth` + redirections
- Tableau de bord vide protégé

## Phase 2 — Événements & invités
- Tables : `profiles`, `events`, `guests` (avec RLS)
- CRUD événements (mariage, baptême, fiançailles, anniversaire, custom)
- Upload photo de couverture + galerie (storage)
- Gestion invités : ajout manuel + import CSV (Excel via CSV export)
- Statistiques temps réel sur dashboard

## Phase 3 — Cartes d'invitation & QR Codes
- 5 modèles de cartes (Traditionnel sénégalais, Moderne, Luxe, Minimaliste, Gold Premium)
- Personnalisation (noms, date, photo couple, message)
- Génération QR Code unique par invité (lib `qrcode`)
- Page publique d'invitation `/i/:token` avec QR

## Phase 4 — RSVP & envoi
- Page RSVP publique : confirmer / refuser / nb accompagnants
- Envoi par **Email** (via fonction serveur + Resend)
- WhatsApp / SMS : liens `wa.me` et `sms:` (envoi automatique nécessite compte Twilio/Meta — je vous indiquerai les clés à fournir)
- Bouton "envoyer à tous"

## Phase 5 — Scan QR & contrôle entrée
- Page scanner (caméra mobile, lib `html5-qrcode`)
- Vérification validité, affichage invité, marquage présent, anti-doublon
- PWA installable + mode hors ligne basique pour le scanner

## Phase 6 — Abonnements, paiements & admin
- Plans Gratuit / Standard / Premium avec limites (50 invités / 500 / illimité)
- Stripe pour carte bancaire (intégration Lovable Payments)
- **Wave / Orange Money / Free Money** : ces APIs ne sont pas intégrables sans comptes marchands Sénégal — je préparerai les hooks et vous fournirez les credentials API quand disponibles
- Back-office admin (rôle `admin` via table `user_roles` sécurisée) : utilisateurs, événements, paiements, stats globales

---

## Notes techniques importantes
- **Facebook login** n'est pas supporté nativement par Lovable Cloud. Je propose Google + email/mot de passe. Si Facebook est indispensable, il faudra une configuration Supabase externe.
- **WhatsApp / SMS automatique** nécessite Twilio ou Meta Business — frais externes. Par défaut je mets des liens "click to send".
- **Wave/Orange/Free Money** : pas d'API publique standard ; intégration sur mesure quand vous aurez les accès marchand.
- Le compte admin `contact@samamariage.com` sera créé et promu admin via migration en Phase 6.

---

## Démarrage
Je commence **maintenant la Phase 1** (identité + landing + auth). Dites-moi simplement "go phase 2" quand vous voulez passer à la suite, ou demandez des ajustements sur la phase en cours.
