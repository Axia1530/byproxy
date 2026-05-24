const POSTS_KEY = "forum:posts";

export default async (request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  const UPSTASH_URL = process.env.UPSTASH_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return new Response(JSON.stringify({ error: "Not configured" }), { headers, status: 500 });
  }

  const pipeline = async (commands) => {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });
    return res.json();
  };

  const single = async (...args) => {
    const res = await fetch(`${UPSTASH_URL}/${args.map(encodeURIComponent).join("/")}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    return res.json();
  };

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // ── GET POSTS ──────────────────────────────────────────
  if (request.method === "GET" && !action) {
    const idsResult = await single("ZREVRANGE", POSTS_KEY, "0", "49");
    const ids = idsResult.result || [];

    if (ids.length === 0) {
      return new Response(JSON.stringify({ posts: [] }), { headers });
    }

    const results = await pipeline(ids.map((id) => ["GET", `forum:post:${id}`]));
    const posts = results
      .map((r) => { try { return JSON.parse(r.result); } catch { return null; } })
      .filter(Boolean);

    return new Response(JSON.stringify({ posts }), { headers });
  }

  // ── GET IMAGE ──────────────────────────────────────────
  if (request.method === "GET" && action === "image") {
    const postId = url.searchParams.get("postId");
    if (!postId) return new Response(JSON.stringify({ error: "Missing postId" }), { headers, status: 400 });

    const result = await single("GET", `forum:image:${postId}`);
    const imageData = result.result;
    if (!imageData) return new Response(JSON.stringify({ error: "Not found" }), { headers, status: 404 });

    return new Response(JSON.stringify({ imageData }), { headers });
  }

  // ── CREATE POST ────────────────────────────────────────
  if (request.method === "POST" && action === "post") {
    const body = await request.json();
    const { twinId, text, imageData } = body;

    if (!twinId || !text?.trim()) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { headers, status: 400 });
    }

    const postId = Math.random().toString(36).slice(2, 10).toUpperCase();
    const timestamp = Date.now();

    const post = {
      id: postId,
      twinId,
      text: text.trim().slice(0, 1000),
      hasImage: !!imageData,
      timestamp,
    };

    const cmds = [
      ["SET", `forum:post:${postId}`, JSON.stringify(post)],
      ["ZADD", POSTS_KEY, String(timestamp), postId],
    ];

    if (imageData) {
      cmds.push(["SET", `forum:image:${postId}`, imageData]);
    }

    await pipeline(cmds);
    return new Response(JSON.stringify({ success: true, post }), { headers });
  }

  // ── DELETE POST ────────────────────────────────────────
  if (request.method === "POST" && action === "delete") {
    const body = await request.json();
    const { postId, twinId } = body;

    const result = await single("GET", `forum:post:${postId}`);
    if (!result.result) {
      return new Response(JSON.stringify({ error: "Post not found" }), { headers, status: 404 });
    }

    const post = JSON.parse(result.result);
    if (post.twinId !== twinId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers, status: 403 });
    }

    await pipeline([
      ["DEL", `forum:post:${postId}`],
      ["DEL", `forum:image:${postId}`],
      ["ZREM", POSTS_KEY, postId],
    ]);

    return new Response(JSON.stringify({ success: true }), { headers });
  }

  return new Response(JSON.stringify({ error: "Invalid request" }), { headers, status: 400 });
};

export const config = { path: "/api/forum" };
