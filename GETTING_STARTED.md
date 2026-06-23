# Getting Started (non-coder friendly)

Follow these steps **in order**. If something fails, stop and read the error message.

---

## Step 1 — Find your project folder

The folder is **not always named `LessonPlanner`**. It might be named whatever you chose when cloning.

### On Mac

1. Open the **Terminal** app (search Spotlight for "Terminal")
2. Type this and press **Enter**:

```bash
find ~ -maxdepth 4 -name "package.json" -path "*/microschool-lesson-planner/*" 2>/dev/null
```

If that finds nothing, try:

```bash
find ~ -maxdepth 4 -name "package.json" 2>/dev/null | head -20
```

3. Look for a path that ends with something like `LessonPlanner/package.json`
4. The folder you need is the one **containing** `package.json` (not the file itself)

### In Cursor

1. Look at the **folder name at the top-left** of the file sidebar
2. That is your project folder — you do **not** need `cd LessonPlanner` if you're already inside it

### Go into the folder

Replace the path below with **your** actual path:

```bash
cd ~/Documents/LessonPlanner
```

**What `cd` does:** "change directory" — moves you into the project folder so commands run in the right place.

Check you're in the right place:

```bash
ls
```

You should see files like `package.json`, `app`, `components`, and `README.md`.

---

## Step 2 — Get the latest code (Phase 1 branch)

```bash
git fetch origin
git checkout cursor/phase-1-auth-shell-bf0b
git pull origin cursor/phase-1-auth-shell-bf0b
```

| Command | What it does |
|---|---|
| `git fetch origin` | Downloads branch info from GitHub |
| `git checkout ...` | Switches to the Phase 1 code |
| `git pull ...` | Downloads the latest files |

---

## Step 3 — Install dependencies

```bash
npm install
```

Downloads everything the app needs. Takes 1–2 minutes the first time.

---

## Step 4 — Add your Supabase keys

1. In Cursor's file list, find **`.env.example`**
2. Right-click → **Copy**
3. Right-click in the file list → **Paste**
4. Rename the copy to **`.env.local`**
5. Open `.env.local` and paste your real values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xydvrblzjddsgelzyuxy.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Le-SU-hAChQVFdxOoOhNqg_f0fbof9w
```

6. Save the file

---

## Step 5 — Run the SQL in Supabase (one-time)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project
3. Click **SQL Editor** → **+ New query**
4. Open `supabase/migrations/001_phase1_auth_schema.sql` in your project
5. Copy all of it, paste into Supabase, click **Run**

---

## Step 6 — Start the app

```bash
npm run dev
```

When you see `Local: http://localhost:3000`:

1. Open your browser
2. Go to **http://localhost:3000**

**To stop the server:** press **Ctrl+C** in the terminal (Mac: **Cmd+C**).

### `.env.local` looks greyed out in Cursor?

That is normal — the file is gitignored for security. Next.js still reads it at runtime (you should see `Environments: .env.local` when the dev server starts).

If you cannot save in the editor, edit from the terminal:

```bash
nano .env.local
```

Required keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=sk-...
```

Restart after any change: **Ctrl+C**, then `npm run dev`.

### Dev won't open / `ERR_CONNECTION_REFUSED` / "Another next dev server is already running"

A stuck process often blocks port 3000. In the workspace terminal:

```bash
npm run dev:clean
```

Then open the app via **Cursor → Ports → 3000 → Open in Browser** (do not rely on an external browser unless port forwarding is active).

---

## What you should see

Even **before** logging in:

- **Header** at the top (logo + "Sign up / Log in")
- **Menu** pane on the left (~33% width) with a **‹** collapse button
- **Calendar** pane on the top right with an **▲** collapse button
- **Main pane** in the bottom right with Sign up / Log in buttons

Click **Sign up** or **Sign up / Log in** in the header — a **popup modal** should appear.

---

## If sign-up / log-in does nothing

1. **Red banner at top?** → `.env.local` is missing or wrong. Fix Step 4 and restart `npm run dev`.
2. **No Menu or Calendar panes?** → You're on old code. Repeat Step 2.
3. **Modal opens but sign-up fails?** → Run the SQL in Step 5.
4. **Still stuck?** → In the browser press **F12** → **Console** tab → screenshot any red errors and send them.

---

## Disable email confirmation (recommended for testing)

1. Supabase → **Authentication** → **Providers** → **Email**
2. Turn off **Confirm email** → **Save**
