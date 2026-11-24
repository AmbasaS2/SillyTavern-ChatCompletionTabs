/**
 * Chat Completion Tabs extension for SillyTavern
 */

// Extension version (the original UI behavior is preserved)
const VERSION = "1.0.0";

// Enable/disable is controlled by SillyTavern's built-in extension manager.
import { OpenAITabManager } from './components/openai-tab-manager.js';
import { eventSource, event_types } from '../../../../script.js';

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
    eventSource.on(event_types.APP_READY, () => openAITabManager?.tabManager.syncPolling());
    eventSource.on(event_types.MAIN_API_CHANGED, () => openAITabManager?.tabManager.syncPolling());
}

function initializeOpenAITabs() {
    if (!openAITabManager) {
        openAITabManager = new OpenAITabManager();
    }
}

// Export for debugging purposes
window.ChatCompletionTabs = {
    openAITabManager,
    VERSION
};
