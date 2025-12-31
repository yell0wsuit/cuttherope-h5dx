/**
 * @fileoverview Native DOM manipulation utilities.
 * Provides lightweight helper functions using native browser APIs.
 */

/**
 * Gets a single DOM element from a selector or element.
 */
export const getElement = (
    selector: string | Element | Window | Document | null | undefined
): Element | Window | Document | null => {
    if (!selector) {
        return null;
    }
    if (typeof selector === "string") {
        return selector[0] === "#" && selector.indexOf(" ") === -1
            ? document.getElementById(selector.slice(1))
            : document.querySelector(selector);
    }
    if (selector instanceof Element || selector === window || selector === document) {
        return selector;
    }
    return null;
};

/**
 * Adds one or more CSS classes to an element.
 */
export const addClass = (selector: string | Element | null | undefined, className: string) => {
    const el = getElement(selector);
    if (!el || !(el instanceof Element)) {
        return;
    }
    className
        .split(/\s+/)
        .filter(Boolean)
        .forEach((name) => el.classList.add(name));
};

/**
 * Removes one or more CSS classes from an element.
 */
export const removeClass = (selector: string | Element | null | undefined, className: string) => {
    const el = getElement(selector);
    if (!el || !className || !(el instanceof Element)) {
        return;
    }
    className
        .split(/\s+/)
        .filter(Boolean)
        .forEach((name) => el.classList.remove(name));
};

/**
 * Toggles a CSS class on an element.
 */
export const toggleClass = (
    selector: string | Element | null | undefined,
    className: string,
    force: boolean
) => {
    const el = getElement(selector);
    if (!el || !(el instanceof Element)) {
        return;
    }
    if (force === undefined) {
        el.classList.toggle(className);
    } else {
        el.classList.toggle(className, !!force);
    }
};

/**
 * Sets a CSS style property on an element.
 */
export const setStyle = (
    selector: string | Element | null | undefined,
    property: string,
    value: string
) => {
    const el = getElement(selector);
    if (!el || !(el instanceof HTMLElement)) {
        return;
    }
    el.style.setProperty(property, value);
};

/**
 * Track active timers per element so we can cancel animations when needed.
 */
const elementTimers = new WeakMap<HTMLElement, Set<number>>();

/**
 * Registers a timeout/interval id with an element for later cleanup.
 */
const trackTimer = (element: HTMLElement, timerId: number) => {
    let timers = elementTimers.get(element);

    if (!timers) {
        timers = new Set<number>();
        elementTimers.set(element, timers);
    }

    timers.add(timerId);
};

/**
 * Clears a tracked timer and removes it from the element registry.
 */
const clearTrackedTimer = (element: HTMLElement, timerId: number) => {
    const timers = elementTimers.get(element);
    if (!timers) {
        return;
    }
    if (timers.has(timerId)) {
        timers.delete(timerId);
        clearTimeout(timerId);
    }
    if (timers.size === 0) {
        elementTimers.delete(element);
    }
};

/**
 * Clears all timers registered for an element.
 */
const clearAllTimers = (element: HTMLElement) => {
    const timers = elementTimers.get(element);
    if (!timers) {
        return;
    }
    timers.forEach((timerId) => clearTimeout(timerId));
    timers.clear();
    elementTimers.delete(element);
};

/**
 * Cache for default display values by tag name.
 */
const defaultDisplayCache = new Map<string, string>();

/**
 * Computes the default display value for a given element tag.
 */
const getDefaultDisplay = (nodeName: string): string => {
    const tagName = nodeName.toLowerCase();
    if (defaultDisplayCache.has(tagName)) {
        const cached = defaultDisplayCache.get(tagName);
        if (cached !== undefined) {
            return cached;
        }
    }
    if (!document.body) {
        return "block";
    }
    const temp = document.createElement(tagName);
    document.body.appendChild(temp);
    let display = window.getComputedStyle(temp).display;
    document.body.removeChild(temp);
    if (!display || display === "none") {
        display = "block";
    }
    defaultDisplayCache.set(tagName, display);
    return display;
};

/**
 * Shows an element by setting its display property.
 */
export const show = (selector: string | Element | null | undefined, displayValue?: string) => {
    const el = getElement(selector);
    if (!el || !(el instanceof HTMLElement)) {
        return;
    }
    el.style.removeProperty("display");
    const computedDisplay = window.getComputedStyle(el).display;
    if (computedDisplay === "none") {
        el.style.display = displayValue ?? getDefaultDisplay(el.nodeName);
    }
};

/**
 * Hides an element by setting its display to "none".
 */
export const hide = (selector: string | Element | null | undefined) => {
    const el = getElement(selector);
    if (!el || !(el instanceof HTMLElement)) {
        return;
    }
    el.style.display = "none";
};

/**
 * Removes all child nodes from an element.
 */
export const empty = (selector: string | Element | null | undefined) => {
    const el = getElement(selector);
    if (!el || !(el instanceof Element)) {
        return;
    }
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
};

/**
 * Appends a child element or HTML string to a target element.
 */
export const append = (
    selector: string | Element | null | undefined,
    child: string | Element
): Element | null => {
    const el = getElement(selector);
    if (!el || child == null || !(el instanceof Element)) {
        return null;
    }
    if (typeof child === "string") {
        el.insertAdjacentHTML("beforeend", child);
        return el.lastElementChild;
    }
    const childElement = child instanceof Element ? child : null;
    if (childElement) {
        el.appendChild(childElement);
        return childElement;
    }
    return null;
};

/**
 * Stops all running animations on an element by clearing transitions.
 */
export const stopAnimations = (selector: string | Element | null | undefined) => {
    const el = getElement(selector);
    if (!el || !(el instanceof HTMLElement)) {
        return;
    }
    clearAllTimers(el);
    const computedOpacity = window.getComputedStyle(el).opacity;
    el.style.transition = "";
    el.style.opacity = computedOpacity;
};

/**
 * Fades in an element by animating opacity from 0 to 1.
 */
export const fadeIn = (
    selector: string | Element | null | undefined,
    duration?: number,
    displayValue?: string
): Promise<void> => {
    const el = getElement(selector);
    if (!el || !(el instanceof HTMLElement)) {
        return Promise.resolve();
    }

    const ms = typeof duration === "number" ? duration : 400;

    stopAnimations(el);

    // Show the element first
    if (displayValue) {
        show(el, displayValue);
    } else {
        show(el);
    }

    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = "0";
    el.getBoundingClientRect(); // force reflow
    el.style.opacity = "1";

    return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
            clearTrackedTimer(el, timer);
            el.style.transition = "";
            resolve();
        }, ms);
        trackTimer(el, timer);
    });
};

/**
 * Fades out an element by animating opacity from 1 to 0.
 */
export const fadeOut = (
    selector: string | Element | null | undefined,
    duration?: number
): Promise<void> => {
    const el = getElement(selector);
    if (!el || !(el instanceof HTMLElement)) {
        return Promise.resolve();
    }

    const ms = typeof duration === "number" ? duration : 400;

    stopAnimations(el);

    el.style.transition = `opacity ${ms}ms ease`;
    el.style.opacity = "1";
    el.getBoundingClientRect(); // force reflow
    el.style.opacity = "0";

    return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
            clearTrackedTimer(el, timer);
            el.style.transition = "";
            el.style.display = "none";
            resolve();
        }, ms);
        trackTimer(el, timer);
    });
};

/**
 * Creates a delay associated with an element.
 */
export const delay = (selector: string | Element, duration: number): Promise<void> => {
    const el = getElement(selector);
    if (!el || !(el instanceof HTMLElement)) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, duration);
        });
    }
    stopAnimations(el);
    return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
            clearTrackedTimer(el, timer);
            resolve();
        }, duration);
        trackTimer(el, timer);
    });
};

/**
 * Adds an event listener to an element and returns a cleanup function.
 */
export const on = (
    selector: string | Element | Window | Document,
    event: string,
    handler: EventListener,
    options: AddEventListenerOptions | boolean = false
): (() => void) => {
    const el = getElement(selector);
    if (!el) {
        return () => undefined;
    }
    el.addEventListener(event, handler, options);
    return () => {
        el.removeEventListener(event, handler, options);
    };
};

/**
 * Attaches mouseenter and mouseleave event handlers to an element.
 */
export const hover = (
    selector: string | Element,
    enter: EventListener,
    leave: EventListener
): (() => void) => {
    const el = getElement(selector);
    if (!el) {
        return () => undefined;
    }
    const enterHandler = typeof enter === "function" ? enter : () => undefined;
    const leaveHandler = typeof leave === "function" ? leave : () => undefined;
    el.addEventListener("mouseenter", enterHandler);
    el.addEventListener("mouseleave", leaveHandler);
    return () => {
        el.removeEventListener("mouseenter", enterHandler);
        el.removeEventListener("mouseleave", leaveHandler);
    };
};

/**
 * Gets or sets the text content of an element.
 */
export const text = (
    selector: string | Element | null | undefined,
    value: string
): string | null | undefined => {
    const el = getElement(selector);
    if (!el || !(el instanceof Element)) {
        return undefined;
    }
    if (value === undefined) {
        return el.textContent;
    }
    el.textContent = value;
    return value;
};

/**
 * Gets the width of an element or window.
 */
export const width = (selector: string | Element | Window): number => {
    const el = getElement(selector);
    if (!el) {
        return 0;
    }
    if (el === window) {
        return window.innerWidth;
    }
    if (el instanceof Element) {
        return el.getBoundingClientRect().width;
    }
    return 0;
};

export default {
    getElement,
    addClass,
    removeClass,
    toggleClass,
    setStyle,
    show,
    hide,
    empty,
    append,
    stopAnimations,
    fadeIn,
    fadeOut,
    delay,
    on,
    hover,
    text,
    width,
};
