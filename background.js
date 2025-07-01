chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_LLM_STREAM") {
    const { prompt } = message.payload;

    fetch("https://api.intelligence.io.solutions/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6ImYxYjcwNmE2LWRlYTEtNDA3MC1iMDAyLTRmMzkwNTQ4YjIxOSIsImV4cCI6NDkwNDMwNjc2Mn0.JVq1YYvGtUy7bYowhCrEywpD-87y97VDbCP9F_AV5DTPcvmJKhe-VtccjRrFXmcOetuwceohiN0NSi71_JWCow`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stream: true,
        model: "Qwen/Qwen2.5-Coder-32B-Instruct",
        messages: [
          {
            role: "Ти зараз знаходишся на інтерв'ю. Питання будуть на теми Javascript, Typescript, React.js, Next.js, Node.js, Express.js. Найважливіше для тебе розбирати що це за слова і як вони відносяться до програмування. Відповідь має бути відносно короткою та з прикладами",
            content: prompt,
          },
        ],
      }),
    })
      .then((res) => {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        function readChunk() {
          if (!reader) return;

          reader.read().then(({ done, value }) => {
            if (done) {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: "LLM_STREAM_END",
              });
              return;
            }

            buffer += decoder.decode(value, { stream: true });

            let lines = buffer.split("\n");
            buffer = lines.pop() || ""; // возможная незавершённая строка

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data:")) {
                const json = trimmed.replace(/^data:\s*/, "");

                if (json === "[DONE]") {
                  chrome.tabs.sendMessage(sender.tab.id, {
                    type: "LLM_STREAM_END",
                  });
                  return;
                }

                try {
                  const parsed = JSON.parse(json);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                      type: "LLM_STREAM_PART",
                      payload: delta,
                    });
                  }
                } catch (err) {
                  console.warn("Ошибка JSON-парсинга:", json, err);
                }
              }
            }

            readChunk();
          });
        }

        readChunk();
      })

      .catch((err) => {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "LLM_STREAM_ERROR",
          payload: err.message,
        });
      });

    return true; // async response
  }
});
