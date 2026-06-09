# Phase 6 — Rôles, Offline, Abonnements & Admin

Travail en 4 sous-blocs livrables successivement. Je commence par 1 + 2 (rôles + offline) dans ce tour, puis 3 (Stripe) après activation des paiements, puis 4 (admin) sur confirmation.

## 1) Rôles staff & PIN scanner

**Base de données**
- `app_role` enum : `admin`, `organizer`, `scanner`.
- Table `user_roles(user_id, role)` + fonction `has_role()` SECURITY DEFINER (pattern Lovable).
- Table `event_staff(event_id, user_id, role, pin_hash, created_at)` — staff invité à un événement, avec rôle et **PIN haché** (bcrypt-like via `crypt()` + `pgcrypto`).
- Fonctions :
  - `add_event_staff(_event, _email, _role, _pin)` — propriétaire ajoute un staff (lookup user via `auth.users` admin → côté serverFn).
  - `verify_staff_pin(_event, _pin)` returns boolean — vérifie le PIN du staff connecté pour cet event.
  - `checkin_guest(_token, _event)` mis à jour : autorise si `events.user_id = auth.uid()` OU si staff de l'event ET PIN validé dans la session (flag `staff_verified_at` côté client → on passe un jeton court signé). Simplification : on vérifie le PIN via RPC qui renvoie un jeton court (random UUID) stocké dans `event_staff_session(token, expires_at)`, et `checkin_guest` accepte un `_session_token`.
- RLS : owners gèrent `event_staff` ; staff lit ses propres lignes.

**Frontend**
- Page `/events/$id` : section "Équipe" pour ajouter staff (email + rôle + PIN initial).
- Scanner : si l'utilisateur n'est pas propriétaire d'au moins un event, demander **PIN** + sélection d'event au démarrage → stocke session token (expire 8h en localStorage).

## 2) Scanner offline (PWA)

- Service worker `vite-plugin-pwa` (`generateSW`, NetworkFirst nav) avec guards Lovable preview (skill PWA).
- File d'attente locale `IndexedDB` (via `idb-keyval`) : chaque scan → push `{token, scanned_at}` dans queue.
- Worker de sync : à chaque scan, tenter `checkin_guest` ; si offline ou erreur réseau, garder en queue.
- Bouton "Synchroniser" + auto-sync sur `online` event.
- Indicateur de statut connexion + nombre en attente.

## 3) Abonnements Stripe (après ton accord)

J'appellerai `payments--recommend_payment_provider` puis `enable_stripe_payments`. Plans suggérés :
- **Essai** : 1 event, 30 invités, scan basique.
- **Pro** (9 900 FCFA/mois) : 5 events, 300 invités, scan illimité, staff.
- **Premium** (29 000 FCFA/mois) : events illimités, 2 000 invités, multi-staff, templates premium.

Gating côté frontend + serverFn : table `subscriptions(user_id, plan, status, current_period_end)` mise à jour par webhook Stripe. Helper `getPlanLimits(userId)` utilisé sur création d'event et d'invité.

## 4) Back-office admin

- Route `/_authenticated/admin` gated par `has_role('admin')`.
- Vues :
  - Liste globale des utilisateurs (count events, plan, dernier login).
  - Liste globale des events (statut, invités, scans).
  - Recherche/filtre invitation par token, reset check-in, regénérer token.
  - Stats temps réel (total events, RSVP, scans aujourd'hui).
- Server functions admin via `supabaseAdmin` (RLS bypass) — middleware `requireSupabaseAuth` + check `has_role(userId, 'admin')`.

## Détails techniques

- `pgcrypto.crypt(pin, gen_salt('bf'))` pour stocker les PIN.
- Session staff : table `event_staff_sessions(token uuid pk, staff_id, expires_at)`.
- Offline queue : `idb-keyval` (léger, pas de dépendance lourde).
- PWA : suivre le skill PWA strict (registration uniquement en prod, guards iframe/preview hostnames, `/sw.js`, kill switch `?sw=off`).
- Stripe : webhook sur `/api/public/webhooks/stripe`, signature vérifiée.

## Ordre d'exécution proposé

1. **Maintenant** : bloc 1 (rôles + PIN) + bloc 2 (offline) — migrations + UI.
2. **Sur "go"** : bloc 3 Stripe (nécessite ton input pour activer paiements).
3. **Sur "go"** : bloc 4 admin.

OK pour démarrer 1+2 dans ce tour ?
