
/**
 * ChartBuddy Content Script
 * Responsible for injecting the React-based UI and tracking chart interaction.
 */

(function() {
  const CONTAINER_ID = 'chartbuddy-extension-root';
  const HIGHLIGHT_ID = 'chartbuddy-selection-highlight';
  let activeChartElement = null;
  
  if (document.getElementById(CONTAINER_ID)) return;

  // Inject Pulsing Styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes chartbuddy-pulse {
      0% { box-shadow: 0 0 0 0px rgba(34, 211, 238, 0.7); border-color: rgba(34, 211, 238, 1); }
      70% { box-shadow: 0 0 0 15px rgba(34, 211, 238, 0); border-color: rgba(34, 211, 238, 0.5); }
      100% { box-shadow: 0 0 0 0px rgba(34, 211, 238, 0); border-color: rgba(34, 211, 238, 1); }
    }
    #${HIGHLIGHT_ID} {
      position: absolute;
      z-index: 2147483646;
      pointer-events: none;
      border: 2px solid #22d3ee;
      border-radius: 8px;
      transition: all 0.3s ease;
      animation: chartbuddy-pulse 1.5s infinite;
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647',
    pointerEvents: 'none'
  });
  
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('index.html');
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'transparent',
    pointerEvents: 'none'
  });
  
  document.documentElement.appendChild(container);
  container.appendChild(iframe);

  /**
   * Selection Highlight Helper
   */
  const showChartHighlight = (el) => {
    let highlight = document.getElementById(HIGHLIGHT_ID);
    if (!highlight) {
      highlight = document.createElement('div');
      highlight.id = HIGHLIGHT_ID;
      document.body.appendChild(highlight);
    }

    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    Object.assign(highlight.style, {
      top: `${rect.top + scrollY - 4}px`,
      left: `${rect.left + scrollX - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
      display: 'block',
      opacity: '1'
    });

    // Automatically hide after a few seconds or when analysis finishes
    // For now, we'll keep it visible until the user interacts again or closing
  };

  const hideChartHighlight = () => {
    const highlight = document.getElementById(HIGHLIGHT_ID);
    if (highlight) {
      highlight.style.opacity = '0';
      setTimeout(() => { highlight.style.display = 'none'; }, 300);
    }
  };

  /**
   * Enhanced SVG Data Extractor
   */
  const extractSvgMetadata = (svg) => {
    if (!svg || svg.tagName.toLowerCase() !== 'svg') return null;

    const metadata = {
      labels: [],
      values: [],
      seriesNames: [],
      axisScales: [],
      shapeCount: 0,
      title: svg.querySelector('title')?.textContent || ''
    };

    const textNodes = Array.from(svg.querySelectorAll('text, tspan'));
    textNodes.forEach(node => {
      const content = node.textContent.trim();
      if (!content) return;
      if (/^-?\d+(\.\d+)?%?$/.test(content)) {
        metadata.axisScales.push(content);
      } else if (content.length < 30) {
        metadata.labels.push(content);
      }
    });

    metadata.shapeCount = svg.querySelectorAll('path, rect, circle, line').length;
    const potentialSeries = svg.querySelectorAll('.legend-item, .series-label, .chart-legend text');
    potentialSeries.forEach(s => metadata.seriesNames.push(s.textContent.trim()));

    return metadata;
  };

  const getHoverData = (el) => {
    if (!el) return null;
    const value = el.getAttribute('aria-label') || 
                  el.getAttribute('title') || 
                  el.getAttribute('data-value') ||
                  el.textContent?.trim();

    if (!value || value.length > 50) return null;
    const parentGroup = el.closest('g');
    const series = parentGroup?.getAttribute('aria-label') || parentGroup?.getAttribute('class');
    return { value, series };
  };

  document.addEventListener('mousemove', (e) => {
    if (!activeChartElement) return;
    const rect = activeChartElement.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && 
        e.clientY >= rect.top && e.clientY <= rect.bottom) {
      const hovered = document.elementFromPoint(e.clientX, e.clientY);
      const data = getHoverData(hovered);
      if (data) {
        iframe.contentWindow.postMessage({
          type: 'CHART_HOVER',
          payload: { ...data, mouseX: e.clientX, mouseY: e.clientY }
        }, '*');
      } else {
        iframe.contentWindow.postMessage({ type: 'CHART_HOVER_CLEAR' }, '*');
      }
    }
  });

  window.addEventListener('message', (event) => {
    if (event.data.type === 'SET_ACTIVE_CHART') {
      const { x, y } = event.data.payload;
      container.style.display = 'none';
      const target = document.elementFromPoint(x, y);
      activeChartElement = target?.closest('svg, canvas, .chart-container');
      container.style.display = 'block';

      if (activeChartElement) {
        // Visual Feedback
        showChartHighlight(activeChartElement);

        const svgData = extractSvgMetadata(activeChartElement);
        iframe.contentWindow.postMessage({
          type: 'CHART_DATA_EXTRACTED',
          payload: {
            title: svgData?.title || document.title,
            url: window.location.href,
            chartType: activeChartElement.tagName.toUpperCase(),
            x, y,
            extractedText: [
              ...(svgData?.seriesNames || []),
              ...(svgData?.axisScales || []),
              `Structural Elements: ${svgData?.shapeCount || 0}`
            ],
            labels: svgData?.labels || []
          }
        }, '*');
      }
    } else if (event.data.type === 'CLOSE_OVERLAY') {
      hideChartHighlight();
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'TOGGLE_UI') {
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
  });

  console.log('ChartBuddy injected.');
})();
