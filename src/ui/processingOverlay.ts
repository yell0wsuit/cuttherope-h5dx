/**
 * Helpers for the shared #processingOverlay spinner defined in index.html.
 * The overlay is used as a generic blocker while async work runs (language
 * font swaps, deferred resource loading during box open).
 */

export const showProcessingOverlay = (): void => {
    const overlay = document.getElementById("processingOverlay");
    if (overlay) {
        overlay.style.display = "block";
    }
};

export const hideProcessingOverlay = (): void => {
    const overlay = document.getElementById("processingOverlay");
    if (overlay) {
        overlay.style.display = "none";
    }
};
