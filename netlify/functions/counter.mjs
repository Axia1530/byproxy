import { getStore } from "@netlify/blobs";

export default async (request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const store = getStore("pca");
  let count = parseInt((await store.get("signatures")) || "0");

  if (action === "increment") {
    count += 1;
    await store.set("signatures", String(count));
  }

  return new Response(JSON.stringify({ count }), { headers });
};

export const config = {
  path: "/api/counter",
};
