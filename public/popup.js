document.getElementById("analyzeBtn").addEventListener("click", () => {
  const status = document.getElementById("status");
  status.textContent = "Sending chart for analysis...";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]?.id) {
      status.textContent = "No active tab found";
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "START_ANALYSIS" },
      response => {
        if (chrome.runtime.lastError) {
          status.textContent = "Content script not available on this page";
          return;
        }

        status.textContent = "Chart analysis started ✔";
      }
    );
  });
});
