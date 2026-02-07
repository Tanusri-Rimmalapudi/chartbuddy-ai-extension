window.addEventListener("message", e => {
  if (e.data?.type === "CHARTBUDDY_RESULT") {
    document.getElementById("root").innerText = e.data.text;
  }
});
