<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a Next.js 16 app whose auth/data layer is **Supabase**. There is no automated test suite. Standard scripts live in `package.json` (`dev`, `build`, `lint`, `start`).

The update script only runs `npm install`. Docker, the Supabase CLI, and the local Supabase stack are installed in the VM image but are **not started automatically** — start them yourself each session (order matters):

1. **Start the Docker daemon** (Supabase runs in Docker). It is not running on a fresh boot:
   - Run `sudo dockerd` in a background/tmux session, then `sudo chmod 666 /var/run/docker.sock` so non-root tooling can reach it.
   - Docker is configured for this VM with the `fuse-overlayfs` storage driver and `containerd-snapshotter` disabled in `/etc/docker/daemon.json` (required because the kernel lacks full overlay2 support; do not switch back to overlay2). `iptables` is pinned to `iptables-legacy`.
2. **Start Supabase**: `supabase start` from `/workspace`. This boots Postgres/Auth/etc. and auto-applies `supabase/migrations/`. First boot pulls images (slow); later boots are fast. Use `supabase status` to check it.
3. **Create `.env.local`** (gitignored, so it must be recreated each fresh VM). Point it at the local stack — the local keys are deterministic defaults:
   - `NEXT_PUBLIC_SUPABASE_URL` = local API URL (`http://127.0.0.1:54321`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = local publishable key
   - Quick way: `supabase status -o env` prints `API_URL` and `PUBLISHABLE_KEY`.
4. **Run the app**: `npm run dev` → http://localhost:3000.

Notes:
- Local email confirmation is disabled in `supabase/config.toml` (`enable_confirmations = false`), so email/password sign-ups are auto-confirmed and log in immediately — no inbox step needed (Mailpit is at http://127.0.0.1:54324 if you do need it).
- `supabase/config.toml` was added to enable the local stack; the repo's `GETTING_STARTED.md` instead describes pointing at a hosted Supabase project, which is an alternative to the local stack.
- The app intentionally renders the full shell even when Supabase is unconfigured (a red env banner shows); a working sign-up/login requires the steps above.
- Studio UI is at http://127.0.0.1:54323.
