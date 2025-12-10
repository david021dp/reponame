# Provera Service Role Key-a

## Brza Provera

Otvorite terminal u `my-app` folderu i pokrenite:

```bash
npm run dev
```

Zatim u drugom terminalu:

```bash
curl http://localhost:3000/api/security/test-logging
```

Ili otvorite u browseru:
```
http://localhost:3000/api/security/test-logging
```

Ovaj endpoint će vam reći:
- Da li je `SUPABASE_SERVICE_ROLE_KEY` podešen
- Da li je `NEXT_PUBLIC_SUPABASE_URL` podešen
- Da li je logging uspešan

## Kako Dodati Service Role Key

1. **Idite u Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Izaberite vaš projekat

2. **Pronađite Service Role Key:**
   - Project Settings → API
   - Pronađite **"service_role"** key (NE anon key!)
   - Kliknite "Reveal" da vidite key

3. **Dodajte u `.env.local`:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Restartujte dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

## Provera da li radi

Nakon što dodate key i restartujete server:

1. Pokušajte da se ulogujete sa **pogrešnom šifrom**
2. Proverite server console (gde je `npm run dev`) - trebalo bi da vidite:
   - `[Security Log API] Received request to log event`
   - `[Security Logger] Attempting to log event: failed_login`
   - `[Security Logger] Successfully logged security event`

3. Proverite bazu:
   ```sql
   SELECT * FROM security_logs 
   WHERE event_type = 'failed_login' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

## Ako i dalje ne radi

Proverite server console za greške:
- `SUPABASE_SERVICE_ROLE_KEY is not configured` → Key nije podešen
- `Failed to create admin client` → Key je pogrešan ili nedostaje
- `Failed to insert security log` → Proverite RLS policies

