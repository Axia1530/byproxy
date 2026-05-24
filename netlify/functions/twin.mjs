export default async (request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const UPSTASH_URL = process.env.UPSTASH_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return new Response(JSON.stringify({ error: "Not configured" }), { headers, status: 500 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const id = url.searchParams.get("id");

  // Register a new twin activation
  if (action === "register" && request.method === "POST") {
    const body = await request.json();
    const { twinId, timestamp } = body;

    await fetch(`${UPSTASH_URL}/set/twin:${twinId}/${timestamp}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });

    return new Response(JSON.stringify({ success: true }), { headers });
  }

  // Look up a twin by ID
  if (action === "lookup" && id) {
    const res = await fetch(`${UPSTASH_URL}/get/twin:${id}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const data = await res.json();
    const timestamp = data.result;

    if (!timestamp) {
      return new Response(JSON.stringify({ found: false }), { headers });
    }

    return new Response(JSON.stringify({ found: true, timestamp: parseInt(timestamp) }), { headers });
  }

  return new Response(JSON.stringify({ error: "Invalid request" }), { headers, status: 400 });
};

export const config = {
  path: "/api/twin",
};
