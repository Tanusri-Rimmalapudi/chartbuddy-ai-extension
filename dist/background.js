const GEMINI_API_KEY ="AIzaSyCeoDWJxGC3ayrlgSWr4dnWk_-A-Vo9phY";

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "CAPTURE_SNIPPET_IMAGE") {
    captureAndAnalyze(sender.tab.windowId, msg.payload.rect);
  }
});

/* ---------------- SCREENSHOT ---------------- */

function captureAndAnalyze(windowId, rect) {
  chrome.tabs.captureVisibleTab(
    windowId,
    { format: "png" },
    dataUrl => {
      cropImage(dataUrl, rect).then(base64 => {
        callGeminiVision(base64);
      });
    }
  );
}

/* ---------------- CROP ---------------- */

function cropImage(dataUrl, rect) {
  return new Promise(resolve => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      const scale = rect.dpr || 1;

      const canvas = new OffscreenCanvas(
        rect.width * scale,
        rect.height * scale
      );
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        img,
        rect.x * scale,
        rect.y * scale,
        rect.width * scale,
        rect.height * scale,
        0,
        0,
        rect.width * scale,
        rect.height * scale
      );

      canvas.convertToBlob().then(blob => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
      });
    };
  });
}

/* ---------------- GEMINI VISION ---------------- */

async function callGeminiVision(imageBase64) {
  console.log("🔥 Gemini Vision API CALLED");

  const prompt = `
You are an expert data analyst.

Analyze the chart shown in the image.
Explain:
- What the chart represents
- Trends, comparisons, or patterns
- Any insights visible from axes, labels, or shapes
`;

  await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=" +
      GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: imageBase64
                }
              }
            ]
          }
        ]
      })
    }
  );
}
