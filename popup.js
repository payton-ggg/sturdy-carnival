let buttonsCount = 0;
let responsesCount = 0;
let latestAnswer = "";

chrome.storage.local.get("latestAnswer", ({ latestAnswer }) => {
  if (latestAnswer) {
    window.latestAnswer = latestAnswer;
  }
});

const statusEl = document.getElementById("status");
const statusTextEl = document.getElementById("status-text");
const responsesEl = document.getElementById("responses");
const emptyStateEl = document.getElementById("empty-state");
const buttonsCountEl = document.getElementById("buttons-count");
const responsesCountEl = document.getElementById("responses-count");
const errorContainerEl = document.getElementById("error-container");

function updateStatus(status, text) {
  statusEl.className = `status ${status}`;
  statusTextEl.textContent = text;
}

function addResponse(answer) {
  const latestAnswerBox = document.getElementById("latest-answer-box");
  latestAnswerBox.textContent = answer;
  latestAnswerBox.style.display = "block";
  responsesCount++;
  responsesCountEl.textContent = responsesCount;
}

function showError(error) {
  const errorEl = document.createElement("div");
  errorEl.className = "error-message";
  errorEl.textContent = `Ошибка: ${error}`;
  errorContainerEl.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 5000);
}

function updateButtonsCount(count) {
  buttonsCount = count;
  buttonsCountEl.textContent = buttonsCount;
}

document.getElementById("ask-latest").addEventListener("click", () => {
  addResponse(latestAnswer);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "EXTENSION_ACTIVE":
      updateStatus("active", "Расширение активно на Google Meet");
      break;
    case "CAPTIONS_FOUND":
      updateButtonsCount(message.payload.count);
      break;
    case "NEW_CAPTION_FOUND":
    case "NEW_CAPTIONS_FOUND":
      const newCount = message.payload.count || 1;
      updateButtonsCount(buttonsCount + newCount);
      break;
    case "NO_CAPTIONS_FOUND":
      updateStatus("inactive", "Субтитры не найдены");
      break;
    case "BUTTON_CLICKED":
      latestPrompt = message.payload.caption;
      break;
    case "AI_RESPONSE":
      addResponse(message.payload.question, message.payload.answer);
      break;
    case "AI_ERROR":
      showError(message.payload.error);
      updateStatus("error", "Ошибка получения ответа");
      break;
  }
});

updateStatus("inactive", "Подключение к странице...");
