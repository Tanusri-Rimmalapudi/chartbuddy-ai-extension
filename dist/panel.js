chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "GEMINI_RESULT") {
    document.getElementById("result").textContent = msg.text;
  }
});
