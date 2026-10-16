# Deploy ClinicNote AI to Vercel

The Vercel deployment serves the Vite frontend as static files and runs the
Express API as a serverless function. Local development continues to use
`npm run dev` and SQLite.

## Configure Neon

1. Create a Neon PostgreSQL project and copy its pooled connection string.
2. In Vercel, open the project’s **Settings → Environment Variables** and add:
   - `DATABASE_URL` — the Neon connection string
   - `GEMINI_API_KEY` — the server-side Gemini API key
3. Keep both variables server-only. Do not prefix them with `VITE_`, add them
   to source control, or paste them into chat.

The API creates the `encrypted_consultations` table and its expiry index when it
first connects. The Neon database role in `DATABASE_URL` must be allowed to
create these objects.

## Deploy

From the project root, authenticate and deploy the current working tree:

```powershell
npx vercel login
npx vercel
npx vercel --prod
```

The first command links the local project and creates a preview deployment. The
second publishes a production deployment. Alternatively, import the GitHub
repository in Vercel; that method deploys committed and pushed changes.

## Notes

- Vercel serverless requests have a small body-size ceiling. The API parser is
  limited to 4 MB on Vercel, so large audio or image uploads may need to be
  reduced or uploaded directly to object storage.
- The vault sends client-encrypted records to the API. Keep the Neon connection
  string private and review the app’s authentication, authorization, and
  regulatory requirements before using it with real patient information.
