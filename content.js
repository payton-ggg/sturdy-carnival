let lastCaption;
let streamAnswer = "";

(() => {
  function askLLM(prompt) {
    streamAnswer = "";
    updateOverlay("⌛ Генерация ответа...");
    chrome.runtime.sendMessage({
      type: "FETCH_LLM_STREAM",
      payload: { prompt },
    });
  }

  function updateOverlay(content, isError = false) {
    const overlay = getOrCreateOverlay();
    overlay.textContent = content;
    overlay.style.background = isError ? "#fce8e6" : "#e8f0fe";
    overlay.style.borderLeft = `4px solid ${isError ? "#b00020" : "#1a73e8"}`;
    overlay.style.color = isError ? "#b00020" : "#202124";
    overlay.style.opacity = "1";
  }

  function getOrCreateOverlay() {
    let el = document.getElementById("ai-response-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "ai-response-overlay";
      el.style.cssText = `
      position: fixed;
      top: 20px;
      right: 400px;
      z-index: 100000;
      max-width: 350px;
      padding: 12px 16px 12px 16px;
      background: #e8f0fe;
      color: #202124;
      border-left: 4px solid #1a73e8;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      border-radius: 8px;
      font-size: 14px;
      font-family: "Segoe UI", sans-serif;
      white-space: pre-wrap;
      opacity: 0;
      transition: opacity 0.3s ease;
      cursor: move;
    `;

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "×";
      closeBtn.style.cssText = `
      position: absolute;
      top: 6px;
      right: 8px;
      background: none;
      border: none;
      font-size: 18px;
      font-weight: bold;
      color: #5f6368;
      cursor: pointer;
    `;

      closeBtn.addEventListener("click", () => {
        el.style.display = "none";
      });

      el.appendChild(closeBtn);
      document.body.appendChild(el);

      // Добавим перетаскивание
      let isDragging = false;
      let offsetX, offsetY;

      el.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - el.getBoundingClientRect().left;
        offsetY = e.clientY - el.getBoundingClientRect().top;
        document.body.style.userSelect = "none";
      });

      document.addEventListener("mousemove", (e) => {
        if (isDragging) {
          el.style.left = `${e.clientX - offsetX}px`;
          el.style.top = `${e.clientY - offsetY}px`;
          el.style.right = "auto"; // убираем привязку к правому краю
        }
      });

      document.addEventListener("mouseup", () => {
        isDragging = false;
        document.body.style.userSelect = "";
      });
    }

    return el;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "LLM_STREAM_PART") {
      streamAnswer += message.payload;
      updateOverlay(streamAnswer);
    }
    if (message.type === "LLM_STREAM_END") {
      updateOverlay(streamAnswer + "\n✓ Готово");
      setTimeout(() => {
        const overlay = document.getElementById("ai-response-overlay");
        if (overlay) overlay.style.opacity = "0";
      }, 15000);
    }
    if (message.type === "LLM_STREAM_ERROR") {
      updateOverlay("💥 Ошибка: " + message.payload, true);
    }
  });

  const addButtonToCaption = (captionElement) => {
    const stableParent =
      captionElement.closest(".nMcdL") || captionElement.parentElement;
    if (!stableParent) return;
    if (stableParent.querySelector(".new-answer-btn")) return;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "ai-button-container";
    buttonContainer.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10000;
    `;

    const newBtn = document.createElement("button");
    newBtn.textContent = "AI";
    newBtn.className = "new-answer-btn";
    newBtn.style.cssText = `
      padding: 12px 24px;
      font-size: 10px;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      z-index: 10001;
      font-weight: 500;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      min-width: 28px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    newBtn.addEventListener("mouseenter", () => {
      newBtn.style.backgroundColor = "#3367d6";
      newBtn.style.transform = "scale(1.1)";
    });
    newBtn.addEventListener("mouseleave", () => {
      newBtn.style.backgroundColor = "#4285f4";
      newBtn.style.transform = "scale(1)";
    });

    buttonContainer.appendChild(newBtn);
    if (getComputedStyle(stableParent).position === "static") {
      stableParent.style.position = "relative";
    }
    stableParent.appendChild(buttonContainer);

    newBtn.addEventListener("click", async () => {
      const textContainer =
        stableParent.querySelector(".ygicle.VbkSUe") ||
        stableParent.querySelector(".ygicle") ||
        captionElement;
      const captionText = textContainer
        ? textContainer.textContent || textContainer.innerText
        : "";
      if (!captionText.trim()) return;

      const originalText = newBtn.textContent;
      newBtn.textContent = "...";
      newBtn.disabled = true;
      newBtn.style.backgroundColor = "#9aa0a6";

      chrome.runtime.sendMessage({
        type: "BUTTON_CLICKED",
        payload: { caption: captionText },
      });

      try {
        const answer = await askLLM(captionText);
        newBtn.textContent = "✓";
        newBtn.style.backgroundColor = "#34a853";
        setTimeout(() => {
          newBtn.textContent = originalText;
          newBtn.style.backgroundColor = "#4285f4";
        }, 1000);
      } catch (error) {
        console.error("Error getting AI response:", error);
        chrome.runtime.sendMessage({
          type: "AI_ERROR",
          payload: { error: error.message },
        });
        newBtn.textContent = "!";
        newBtn.style.backgroundColor = "#ea4335";
        setTimeout(() => {
          newBtn.textContent = originalText;
          newBtn.style.backgroundColor = "#4285f4";
        }, 2000);
      } finally {
        newBtn.disabled = false;
      }
    });
  };

  const processAllCaptions = () => {
    const captionElements = document.querySelectorAll(
      ".nMcdL.bj4p3b.gBdnfe, .nMcdL.bj4p3b.gBwdBb, .nMcdL.bj4p3b"
    );
    captionElements.forEach((captionElement) => {
      addButtonToCaption(captionElement);
    });
  };

  const observer = new MutationObserver(() => {
    processAllCaptions();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Инициализация
  processAllCaptions();

  chrome.runtime.sendMessage({ type: "EXTENSION_ACTIVE" });
  console.log("Button observer initialized");
})();
