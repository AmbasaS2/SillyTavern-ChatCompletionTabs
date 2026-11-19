/**
 * Chat Completion Tabs extension for SillyTavern
 */

// Extension version (the original UI behavior is preserved)
const VERSION = "1.0.0";

// Enable/disable is controlled by SillyTavern's built-in extension manager.
import { OpenAITabManager } from './components/openai-tab-manager.js';

let openAITabManager = null;

(function initExtension() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExtensionUI);
    } else {
        initExtensionUI();
    }
})();

function initExtensionUI() {
    initializeOpenAITabs();
}

function initializeOpenAITabs() {
    if (!openAITabManager) {
        openAITabManager = new OpenAITabManager();
    }
}

// Additional initialization calls with delays to ensure proper loading
setTimeout(() => {
    if (openAITabManager) {
        openAITabManager.refreshTabs();
    }
}, 1000);

setTimeout(() => {
    if (openAITabManager) {
        openAITabManager.refreshTabs();
    }
}, 3000);

// Export for debugging purposes
window.ChatCompletionTabs = {
    openAITabManager,
    VERSION
};
