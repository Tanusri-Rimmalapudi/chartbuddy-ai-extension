
/**
 * ChartBuddy Content Script
 * Responsible for injecting the React-based UI into the page.
 */

(function() {
  const CONTAINER_ID = 'chartbuddy-extension-root';
  
  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) return;

  // Create container
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.zIndex = '2147483647';
  container.style.pointerEvents = 'none';
  
  // Inject iframe to isolate styles and React app
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('index.html');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.background = 'transparent';
  iframe.style.pointerEvents = 'none'; // Will handle events inside the app for specific elements
  
  // Allow the app to receive pointer events for the robot
  iframe.onload = () => {
    // Communication channel if needed
  };

  // We actually want the content script to load the index.html logic directly
  // or use a Shadow DOM. For this example, we'll append the host and let the extension load index.html.
  // In a real unpacked extension, chrome-extension://<id>/index.html is what you load.
  
  document.documentElement.appendChild(container);
  container.appendChild(iframe);
  
  // Toggle visibility logic (can be triggered by background script or toolbar icon)
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'TOGGLE_UI') {
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
  });

  console.log('ChartBuddy injected.');
})();
