// Vercel Edge Function — thin proxy to Pollinations.ai for vocab illustrations.
//
// Pollinations is keyless and free, so we could fetch from the client directly,
// but routing through here gives us one place to swap providers later (Imagen,
// Replicate Flux, etc.) without touching call sites.
//
// Request:  POST /api/generate-image  { word: string, english: string }
// Response: { dataUrl: "data:image/jpeg;base64,..." }   on success
//           { error: string }                            on failure (4xx/5xx)

export const config = { runtime: 'edge' };

const POLLINATIONS_URL = 'https://image.pollinations.ai/prompt';

function buildPrompt(english: string): string {
  // Anti-text negatives matter — image models love to add labels to anything
  // framed as "vocabulary". Repeat the no-text rule a few ways for emphasis.
  return (
    `Minimal flat illustration of ${english}, simple vector art, ` +
    `bright colors, white background, centered subject, ` +
    `no Korean text, no English text, no labels, no captions, no watermarks`
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: { word?: unknown; english?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const english = typeof body.english === 'string' ? body.english.trim() : '';
  if (!english) {
    return jsonResponse({ error: 'Missing or empty `english` field' }, 400);
  }

  const prompt = buildPrompt(english);
  const url =
    `${POLLINATIONS_URL}/${encodeURIComponent(prompt)}` +
    `?width=512&height=512&nologo=true&model=flux`;

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch (e) {
    return jsonResponse({ error: 'Upstream fetch failed', detail: String(e) }, 502);
  }

  if (!upstream.ok) {
    return jsonResponse(
      { error: `Upstream returned ${upstream.status}` },
      502,
    );
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  const buffer = await upstream.arrayBuffer();
  const dataUrl = `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;

  return new Response(JSON.stringify({ dataUrl }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Edge cache for a year — generated images are deterministic enough that
      // any same-prompt repeat hit can serve the cached version.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
