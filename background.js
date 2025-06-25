chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_LLM") {
    const { prompt } = message.payload;

    fetch("https://api.intelligence.io.solutions/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6ImYxYjcwNmE2LWRlYTEtNDA3MC1iMDAyLTRmMzkwNTQ4YjIxOSIsImV4cCI6NDkwNDMwNjc2Mn0.JVq1YYvGtUy7bYowhCrEywpD-87y97VDbCP9F_AV5DTPcvmJKhe-VtccjRrFXmcOetuwceohiN0NSi71_JWCow`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct",
        messages: [{ role: "user", content: prompt }],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const answer = data?.choices?.[0]?.message?.content ?? "🤖 Нет ответа";
        sendResponse({ success: true, answer });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    ``;
    return true;
  }
});
