
# ChartBuddy Installation Instructions

To run this Chrome Extension locally:

1.  **Prepare the Folder**: Create a new folder named `chartbuddy-extension`.
2.  **Copy Files**: Save all the provided files (`manifest.json`, `background.js`, `contentScript.js`, `index.html`, `index.tsx`, `App.tsx`, `geminiService.ts`, `types.ts`, `metadata.json`) into that folder.
3.  **Note on Build**: In a production environment, you would use a bundler like Vite or Webpack to compile the `.tsx` files into a single `bundle.js` and update the `manifest.json` and `index.html` to point to the compiled code. 
4.  **Load Unpacked Extension**:
    *   Open Chrome and navigate to `chrome://extensions/`.
    *   Enable **Developer mode** (toggle in top-right).
    *   Click **Load unpacked**.
    *   Select the `chartbuddy-extension` folder.
5.  **Use It**:
    *   Navigate to any website with a chart (e.g., Google Finance, Yahoo Finance, or any site with an SVG/Canvas graph).
    *   You should see a small robot icon 🤖 at the bottom-right.
    *   Drag the robot onto a chart element and release.
    *   Wait for the analysis to appear in the side panel!

## Technical Note
This code assumes the environment supports ES modules in content scripts/extension pages. For a seamless experience across all sites, a bundling step is recommended to handle the React imports.
