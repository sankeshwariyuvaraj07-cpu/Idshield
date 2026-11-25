# IDShield

IDShield is a React/Vite frontend with an Express API, Supabase Auth/Postgres/private Storage, and a separately hosted FastAPI OCR service.

The signed-in workspace includes an account- or institution-scoped screening dashboard. It reads document metadata through existing Supabase row-level security, shows an exact total and recent activity for up to 500 records, and surfaces saved repeat-file or unavailable-OCR signals as review prompts only. Analysis summaries store status metadata only; OCR text and identity values are not persisted for dashboard history.

## Local setup

1. Apply the SQL migrations in `supabase/migrations/` to a Supabase project, in filename order.
2. `frontend/.env.local` is preconfigured for the connected project and is ignored by Git. For another project, copy `frontend/.env.example` to `frontend/.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`).
3. In Supabase Auth, enable email confirmations and configure the site URL and redirect allowlist for the local frontend and deployed frontend. To enable the Google button, configure the Google OAuth provider in Supabase and add Supabase's callback URL to the Google OAuth client.
4. Copy `backend/.env.example` to `backend/.env` and set the **server-only** `SUPABASE_SERVICE_ROLE_KEY`. The browser publishable/anon key cannot replace this privileged key. Keep the service-role key out of frontend variables and source control.
5. Set the same long random `FASTAPI_AUTH_TOKEN` in both `backend/.env` and `backend/python/.env`.
6. Install Ollama and download the local vision model:

   ```powershell
   ollama pull qwen2.5vl:3b
   ```

   This uses a pretrained model for local inference; it does not fine-tune or train on your data. The API accepts only loopback model URLs, and image review is limited to fixed, non-authenticating observations.
7. From the project root, install and start the API:

   ```powershell
   npm --prefix backend install
   npm run dev:backend
   ```

8. Install Tesseract OCR on the machine running the Python service. If it is not on `PATH`, set `TESSERACT_CMD` to its executable path in `backend/python/.env`. Then install and run the OCR service:

   ```powershell
   cd backend/python
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app:app --host 127.0.0.1 --port 8000 --env-file .env
   ```

9. Install frontend dependencies and run Vite from the project root:

   ```powershell
   npm --prefix frontend install
   npm run dev
   ```

Email/password registration requires a name, email, password, and phone number in international E.164 format. Email confirmation must be enabled in Supabase Auth. Google sign-in is optional and requires Google OAuth configuration; Google users are prompted to add a phone number before continuing. Phone numbers are stored in the account profile but are not OTP-verified. Aadhaar is not collected because no authorized Aadhaar verification provider is configured.

The first user signup receives the `member` role. An institution and its first administrator must be provisioned by a trusted operator in Supabase; client signup cannot grant administrator access. For initial setup, create an institution and promote a verified account using the Supabase SQL editor:

```sql
insert into public.institutions (name) values ('Example Institution') returning id;
-- Use the returned institution UUID and the verified user's auth UUID:
update public.profiles
set role = 'institution_admin', institution_id = 'INSTITUTION_UUID'
where id = 'VERIFIED_USER_UUID';
```

The Express admin endpoints only let an administrator manage accounts assigned to that administrator's institution. Role changes are server-side and users cannot update their own profile roles.

The document bucket is private. Before a real file is uploaded, the signed-in user must confirm authorization and consent to private storage and OCR; this confirmation is enforced in the frontend and upload-intent API, but is not retained as a consent audit record. The API issues short-lived upload URLs, checks ownership and SHA-256 before analysis, and does not store extracted OCR text in the database. OCR text is returned only to the signed-in browser for the active report. Image reports also include a JPEG recompression heuristic, pattern-based PAN/Aadhaar type detection with a masked identifier, and QR destination classification; QR payloads are not returned or opened. OCR language selection uses Tesseract traineddata configured by `TESSERACT_LANGUAGES` (`eng`, `hin`, and/or `kan`). The Render OCR image includes English, Hindi, and Kannada traineddata and enables all three; local deployments retain English-only behavior unless the additional language packs are installed and `TESSERACT_LANGUAGES=eng+hin+kan` is configured. OCR text remains an unverified extraction and can be inaccurate across languages. The report presents 12 safety and risk categories, exact-file duplicate checks against the signed-in account's prior uploads, evidence, and recommended actions. When the local assistant is available, it generates concise category explanations from status labels only; document images and OCR text are not sent for that step. The report labels unsupported checks as unable to verify and can be downloaded as a PDF. These are review signals only; the verdict remains manual review, and issuer verification is unavailable until an official provider endpoint and contract are configured. Scanned PDFs are stored but OCR is currently reported as unsupported. No trained forgery model is connected, and available analysis does not provide pixel coordinates for highlighting suspicious regions. The API does not produce a synthetic or genuine forgery score for cloud analyses. Configure the Supabase Auth email provider before using the institution-admin invitation endpoint. Keep the inference service on a private network accessible only to the API, use HTTPS for public traffic, and keep `FASTAPI_AUTH_TOKEN` secret.

The screening page supports browser camera capture through the existing upload and consent flow. Its optional photo-consistency panel is a local, consent-gated side-by-side comparison only; it performs no face detection or identity matching. Browser speech recognition accepts camera-control commands only, is not voice biometrics, and may be processed by the browser vendor even though IDShield does not upload the audio. QR checks classify destinations without displaying or opening payloads. PDF signature-marker inspection is not cryptographic verification; signer trust, certificate validity, revocation, and issuer checks require a separately authorized verifier and trusted keys.

## IDShield Transit prototype

The frontend includes an IDShield Transit conductor dashboard with camera capture, image upload, a fictional sample workflow, session-only history, and illustrative analytics. Real image analysis is available only to signed-in accounts explicitly authorized by an operator: apply `supabase/migrations/202611130002_transit_conductor_access.sql`, then set `profiles.transit_conductor = true` for approved accounts. Do not grant this flag through public signup or client-controlled profile updates.

Transit uploads are sent to the authenticated Express endpoint and proxied to FastAPI for in-memory OpenCV boundary candidates, QR decoding, and a Tesseract OCR summary. The Transit endpoint does not store images, QR payloads, OCR text, scan history, or passenger names. YOLOv8 and a calibrated fraud model are not configured. QR decoding is not digital-signature verification; cryptographic Aadhaar Secure QR verification and scheme eligibility are unavailable and always require the applicable official process and human review. Demo records and charts are fictional. The simulated ticket control is demo-only; no real ticket or eligibility decision is issued.

## Deployment

The deployment files are prepared for Netlify (frontend) and Render (Express API and FastAPI OCR):

1. Push this project to a Git provider. This workspace is not currently a Git repository, so create or connect a repository before deploying.
2. On Render, create a Blueprint from the repository root using `render.yaml`. The Blueprint creates a private OCR service and a public API service. Supply the same `FASTAPI_AUTH_TOKEN` to both services, plus `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the exact Netlify origin (for example, `https://your-site.netlify.app`) when prompted. Keep the Supabase service-role key server-side; never configure it in Netlify.
3. On Netlify, create a site from the same repository and set its base directory to `frontend`. The included `frontend/netlify.toml` supplies the Vite build and SPA fallback. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`), `VITE_API_URL` as `https://YOUR_RENDER_API_HOST/api`, and `VITE_ENABLE_GOOGLE_AUTH=true`.
4. Configure Google OAuth in Supabase and Google Cloud. Add the deployed Netlify site and its authentication callback URL to the Supabase Auth URL configuration, and configure the Supabase callback URL in the Google OAuth client.
5. If using a custom Netlify domain, update `FRONTEND_ORIGINS` in Render to that exact origin. Use HTTPS for the public API URL.

The Render services use paid compute plans; review the service plan and expected costs before creating the Blueprint. The Blueprint does not deploy automatically from this local workspace. Hosting requires a connected repository, provider accounts, the secrets above, Supabase setup, and a successful provider build. The hosted app's document analysis remains limited to the configured OCR and heuristics; it does not determine authenticity. The local Ollama assistant is not included in the Render setup and hosted explanations use the existing fallback.
