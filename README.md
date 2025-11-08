## Getting Started

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to explore the marketing page, dashboard, and devices center.

## Terra ingestion

- `src/app/api/terra/webhook/route.ts` handles incoming Terra webhooks. Set `TERRA_WEBHOOK_SECRET` plus the standard Terra API credentials in `.env.local` (and Supabase Edge function env) before enabling in production.
- `supabase/functions/poll-terra/index.ts` is a Supabase Edge Function that polls Terra every 30 days/since last sync for each `user_devices` row with `status='linked'`. It upserts `workouts`, refreshes `last_synced_at`, and records ingestion logs.

### Scheduling the poller

1. Deploy the function with the Supabase CLI (from the project root):

   ```bash
   supabase functions deploy poll-terra
   ```

2. Schedule it to run every two hours:

   ```bash
   supabase cron schedule create poll-terra --schedule "0 */2 * * *" --function poll-terra
   ```

   Adjust the cron expression as needed; the above fires at the top of every second hour.

3. To run locally with your `.env.local` values mirrored into Supabase, use:

   ```bash
   supabase functions serve poll-terra --env-file .env.local
   ```

## Tech stack

- Next.js 15 App Router, React 19
- Tailwind CSS 3, shadcn/ui, lucide-icons
- Supabase Auth, database, edge functions
- Terra API integration via webhooks + polling
