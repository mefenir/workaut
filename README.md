# Workaut

Playful, non-fitness-niche workout app. Static site (HTML/CSS/JS), Firebase
for auth + data, deployed on GitHub Pages.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it
   (e.g. "Workaut"). Disable Google Analytics if you don't need it.
2. **Build → Authentication → Get started.** Enable:
   - **Email/Password**
   - **Google** (set a support email — this can be `theworkautapp@gmail.com`)
3. **Build → Firestore Database → Create database.** Choose a region close to
   your users (e.g. `europe-west3` for Germany). Start in **production mode**.
4. **Project settings (gear icon) → General → Your apps → Add app → Web
   (`</>`).** Register the app (nickname can be "Workaut Web"). Copy the
   `firebaseConfig` object it gives you.
5. Open `app.js` in this repo and replace the placeholder `firebaseConfig`
   near the top of the file with the one you copied.
6. **Firestore → Rules** tab → paste the contents of `firestore.rules` from
   this repo → **Publish**.

## 2. Admin account

The admin email is hardcoded in `app.js` as `ADMIN_EMAIL` (currently
`theworkautapp@gmail.com`). Sign up in the app with that exact email/password
(or Google account using that address) and you'll skip the beta-approval
gate automatically and see the **Admin panel** button on the home screen.

To change the admin email, edit the `ADMIN_EMAIL` constant near the top of
`app.js` before deploying.

## 3. Publish to GitHub Pages

```bash
# from inside this folder
git init
git add .
git commit -m "Initial Workaut app"
git branch -M main
git remote add origin https://github.com/<your-username>/Workaut.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch:
main / (root)**. Your app will be live at
`https://<your-username>.github.io/Workaut/` within a minute or two.

## 4. How beta approval works

- A new user signs up → verifies their email → a Firestore doc is created at
  `approvals/{uid}` with `approved: false` → they see a "You're on the list"
  waiting screen.
- Sign in as the admin, open the **Admin panel** from the home screen, and
  approve or revoke access per user.
- From the admin panel you can also **Enter account** for any approved user
  — this loads their data into your session so you can see exactly what they
  see and make changes on their behalf. **Exit** in the floating badge at the
  bottom returns you to your own account.

## 5. What's ported from the old app

- The full exercise library and portion-balancing logic (curated from
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db), public
  domain), used by the automated generator.
- The Rookie / Normal / Expert (formerly "Advanced") / God Mode generator
  templates, with the same day-count gating (Expert needs 5+ days/week, God
  Mode needs 6+).
- The email/password + Google auth flow, email verification requirement,
  beta-approval gate, and full admin account-impersonation.

Everything else — the profile (name + interests only), the circular
collectible gallery, the wallet-style workout cards, the giant-number
calendar, and the IP specials with the sneak-peek blur — is the new design
direction, all in English per the product requirement.

## Notes on `SPECIAL_PACKS`

The four IP packs in `app.js` (`SPECIAL_PACKS`) are placeholders — swap in
real partner names, art (replace the emoji + gradient with real brand
assets), descriptions and prices once partnerships are signed. Each pack's
`groups` array picks which muscle groups each day trains; the actual
exercises for a pack's day are drawn live from the same curated library
using `specialExercisesFor()`, so you don't have to hand-pick exercises for
every partner pack.

