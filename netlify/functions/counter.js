const { getStore } = require("@netlify/blobs");

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const store = getStore("pca");
    const action = event.queryStringParameters && event.queryStringParameters.action;

    let count = parseInt((await store.get("signatures")) || "0");

    if (action === "increment") {
      count += 1;
      await store.set("signatures", String(count));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ count }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ count: 0, error: err.message }),
    };
  }
};
