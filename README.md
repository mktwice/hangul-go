# 한글 Go

A mobile-first Korean learning app. Hangul drills, a vocab bank, lesson notes,
and an AI-powered conversation simulator calibrated to absolute-beginner level.

## Setup

```
npm install
npm run dev
```

Build for production:

```
npm run build
```

Tests:

```
npm test
```

## Practice tab — Gemini API setup

The Practice tab uses Google's Gemini API for the conversation simulator.
The free tier is generous and does not require a credit card.

### Get an API key

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with a Google account.
3. Click **Create API key** and copy the value.

### Set the key on Vercel

The key lives server-side only. The client never sees it.

1. Open the Vercel project at
   [vercel.com](https://vercel.com) → your `hangul-go` project → **Settings** → **Environment Variables**.
2. Add a new variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: the key you copied from AI Studio
   - **Environments**: check Production, Preview, and Development
3. Redeploy (Vercel auto-redeploys when you push, or trigger manually from the
   Deployments tab).

For local development, create `.env.local` in the project root:

```
GEMINI_API_KEY=your-key-here
```

`.env.local` is git-ignored — never commit your key.

### Free tier limits (gemini-2.5-flash)

- **10 requests per minute**
- **250 requests per day**

The app's daily client-side cap is **200** to leave headroom. When you hit the
daily cap, the chat input disables and the picker shows a friendly message.
The cap resets at local midnight.

If you hit the per-minute rate limit (rapid-fire sending), the API returns a
429 and the chat shows a "slow down a sec" message. Wait a few seconds and
retry.

### A note on data

Google's [free-tier terms](https://ai.google.dev/pricing) allow Google to use
free-tier inputs to improve their models. Don't paste anything sensitive into
the chat. The paid tier excludes inputs from training. For a personal language
learner this is fine; calling it out for completeness.

### Swapping providers later

The Edge function at `api/practice-chat.ts` is a thin proxy. To move to
Anthropic Claude / OpenAI / a self-hosted model, edit just that file. The
client-side request shape (`{scenarioId, history, userMessage, userVocab,
hintRequest?}`) stays the same.
