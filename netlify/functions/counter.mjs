export default async (request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const UPSTASH_URL = process.env.UPSTASH_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return new Response(JSON.stringify({ count: 0, error: "Not configured" }), { headers });
  }

  let count = 0;

  if (action === "increment") {
    const res = await fetch(`${UPSTASH_URL}/incr/pca-signatures`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const data = await res.json();
    count = data.result || 0;
  } else {
    const res = await fetch(`${UPSTASH_URL}/get/pca-signatures`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const data = await res.json();
    count = data.result ? parseInt(data.result) : 0;
  }

  return new Response(JSON.stringify({ count }), { headers });
};

export const config = {
  path: "/api/counter",
};
