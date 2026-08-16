# Changelog — AI Alignment Refactor

Refactored the AI stack to exactly two models, completed Google OAuth, and
simplified SMS/configuration. Every pre-existing feature (OCR, reminders,
scheduler, medicines, dashboard, reports, roles, refills) is preserved and
covered by the passing test suite.

## New file(s)

| File | Purpose |
| --- | --- |
| `backend/services/ai_config.py` | Two-model config + OpenRouter client (Gemma for OCR, Nemotron for everything else) |
| `frontend/src/pages/OAuthCallback.jsx` | Landing page for the Google OAuth redirect; stores the JWT and enters the app |

## Deleted file(s)

| File | Reason |
| --- | --- |
| `backend/services/ai_router.py` | Multi-model routing for DeepSeek / Qwen / Mistral / Llama removed |
| `frontend/.env.example` | No frontend AI/Google environment variables are needed anymore |

## Modified file(s)

| File | Change |
| --- | --- |
| `backend/auth.py` | Replaced the ID-token `POST /auth/google` with a complete authorization-code OAuth flow: `GET /auth/google/status`, `GET /auth/google/authorize` (consent URL with signed CSRF state), `GET /auth/google/callback` (server-side code exchange using `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, find-or-create user, redirect back to the app with a JWT). Email/password login unchanged. |
| `backend/services/ai_service.py` | All non-OCR tasks (chat, lifestyle, interactions, health summaries) now use the Nemotron assistant task; imports updated to `ai_config`. |
| `backend/assistant.py` | Single assistant model (Nemotron) for medicine questions, side effects, timing, food interactions, lifestyle, exercise, water intake, diet, and health tips; lifestyle intent only selects the system prompt. Disclaimers unchanged. |
| `backend/ai.py` | `is_configured` now imported from `ai_config`. |
| `backend/reports.py` | `is_configured` now imported from `ai_config`. |
| `backend/services/ocr.py` | Imports updated to `ai_config`; Gemma OCR workflow, prompts, and image handling unchanged. |
| `backend/services/sms.py` | Removed Twilio. Providers: Fast2SMS and MSG91 only. Fully inert (auto-disabled, never throws) when unconfigured. |
| `backend/tests/test_ai.py` | Tests rewritten for the two-model config, Fast2SMS/MSG91, and the new Google OAuth flow (authorize → callback → user creation). |
| `frontend/src/pages/Login.jsx` | Removed Google Identity Services script + `VITE_GOOGLE_CLIENT_ID`. Custom "Continue with Google" button shown only when `GET /auth/google/status` reports enabled; shows the failure message from `?google=error`. |
| `frontend/src/components/AuthContext.jsx` | Removed the now-obsolete `googleLogin` (ID-token) method. |
| `frontend/src/App.jsx` | Registered the `/oauth-callback` route. |

## Updated `.env.example`

`backend/.env.example` now documents only the required configuration:

```
OPENROUTER_API_KEY=                # shared by both models
AI_MODEL_OCR=google/gemma-4-26b-a4b-it:free
AI_MODEL_ASSISTANT=nvidia/nemotron-3.5-lightning:free
```

Removed variables: `OPENROUTER_MODEL`, `AI_ROUTER_API_KEY`,
`AI_MODEL_MEDICINE`, `AI_MODEL_LIFESTYLE`, `AI_MODEL_REPORT`,
`AI_MODEL_GENERAL`, and all `TWILIO_*` entries. Added `GOOGLE_CLIENT_SECRET`.
FCM, SMS (MSG91/Fast2SMS), JWT, and app settings remain.

## Updated actual `.env` (`backend/.env`)

Merged without touching existing values (your API keys/secrets were preserved):

- Added `AI_MODEL_OCR=google/gemma-4-26b-a4b-it:free`
- Added `AI_MODEL_ASSISTANT=nvidia/nemotron-3.5-lightning:free`
- Added `GOOGLE_CLIENT_ID=`
- Added `GOOGLE_CLIENT_SECRET=`

Note: the file is gitignored and was never committed.

## Dependencies

No new dependencies were added in this refactor. `google-auth`
(`google-auth>=2.35.0`) in `backend/requirements.txt` is used by the Google
OAuth callback to verify the ID token. `httpx` was already a dependency.

## Manual setup steps

1. **Install**: `pip install -r backend/requirements.txt`
2. **AI**: ensure `OPENROUTER_API_KEY` is set in `backend/.env`
   (already present). Model overrides are optional.
3. **Google Sign-In (optional)**:
   - Google Cloud Console → APIs & Services → Credentials → OAuth client
     (Application type: Web application).
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URI: `http://localhost:8000/auth/google/callback`
   - Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`.
   - Email/password login continues to work; the Google button appears on
     the login page automatically once configured.
4. **SMS (optional)**: set `SMS_PROVIDER=fast2sms` (or `msg91`) plus the
   matching `FAST2SMS_API_KEY`/`FAST2SMS_SENDER_ID` or
   `MSG91_AUTH_KEY`/`MSG91_SENDER_ID`. When unset, SMS is disabled silently
   and browser/Firebase notifications are unaffected.
5. **Run**: `uvicorn app:app` (from `backend/`) and `npm run dev` in
   `frontend/`. No frontend environment variables are required anymore.

## Test status

`48 passed` (backend full suite, including the 26 AI/OAuth/SMS tests).
Frontend production build passes (`npm run build`).
