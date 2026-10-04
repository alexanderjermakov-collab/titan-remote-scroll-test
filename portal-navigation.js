(function () {
  "use strict";

  var MIN_SCROLL_STEP = 180;
  var VIEWPORT_STEP = 0.22;
  var SMOOTH_SCROLL = "smooth";
  var FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "select:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "[role='button']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  function commandFor(event) {
    var key = String(event.key || "");
    var code = event.keyCode || event.which || 0;
    var physical = String(event.code || "");

    if (key === "ArrowUp" || key === "Up" || physical === "ArrowUp" || code === 38 || code === 19) return "up";
    if (key === "ArrowDown" || key === "Down" || physical === "ArrowDown" || code === 40 || code === 20) return "down";
    if (key === "ArrowLeft" || key === "Left" || physical === "ArrowLeft" || code === 37 || code === 21) return "left";
    if (key === "ArrowRight" || key === "Right" || physical === "ArrowRight" || code === 39 || code === 22) return "right";
    if (key === "Enter" || key === "OK" || key === "Select" || key === "Accept" || physical === "Enter" || physical === "NumpadEnter" || code === 13 || code === 23 || code === 66) return "ok";
    if (key === "Back" || key === "BrowserBack" || key === "GoBack" || key === "Escape" || physical === "BrowserBack" || physical === "Escape" || code === 4 || code === 27 || code === 461 || code === 10009) return "back";
    if (key === "PageUp" || code === 33 || code === 92) return "page-up";
    if (key === "PageDown" || code === 34 || code === 93) return "page-down";
    if (key === "Home" || code === 36 || code === 3) return "home";
    if (key === "End" || code === 35 || code === 123) return "end";
    return "";
  }

  function isTextEditor(element) {
    if (!element || element === document.body) return false;
    var name = String(element.tagName || "").toLowerCase();
    return name === "input" || name === "textarea" || element.isContentEditable;
  }

  function isVisible(element) {
    if (!element) return false;
    var style = window.getComputedStyle(element);
    var rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0;
  }

  function activeScroller() {
    var modal = document.getElementById("modal");
    if (isVisible(modal)) {
      var modalContent = modal.querySelector(".modal-content");
      if (modalContent && modalContent.scrollHeight > modalContent.clientHeight) return modalContent;
      if (modal.scrollHeight > modal.clientHeight) return modal;
    }
    return document.scrollingElement || document.documentElement || document.body;
  }

  function scrollElement(element, delta) {
    if (element === document.scrollingElement || element === document.documentElement || element === document.body) {
      window.scrollBy({ top: delta, left: 0, behavior: SMOOTH_SCROLL });
      return;
    }
    if (typeof element.scrollBy === "function") element.scrollBy({ top: delta, left: 0, behavior: SMOOTH_SCROLL });
    else element.scrollTop += delta;
  }

  function focusableElements() {
    var nodes = document.querySelectorAll(FOCUSABLE_SELECTOR);
    var result = [];
    for (var i = 0; i < nodes.length; i += 1) {
      if (isVisible(nodes[i]) && nodes[i].getAttribute("aria-hidden") !== "true") result.push(nodes[i]);
    }
    return result;
  }

  function centerOf(element) {
    var rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function directionScore(origin, candidate, direction) {
    var from = centerOf(origin);
    var to = centerOf(candidate);
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var primary;
    var secondary;

    if (direction === "up") { if (dy >= -2) return Infinity; primary = -dy; secondary = Math.abs(dx); }
    else if (direction === "down") { if (dy <= 2) return Infinity; primary = dy; secondary = Math.abs(dx); }
    else if (direction === "left") { if (dx >= -2) return Infinity; primary = -dx; secondary = Math.abs(dy); }
    else { if (dx <= 2) return Infinity; primary = dx; secondary = Math.abs(dy); }

    return primary * 3 + secondary;
  }

  function moveFocus(direction) {
    var items = focusableElements();
    if (!items.length) return false;
    var current = document.activeElement;

    if (!current || current === document.body || items.indexOf(current) === -1) {
      items[0].focus({ preventScroll: true });
      items[0].scrollIntoView({ block: "center", behavior: SMOOTH_SCROLL });
      return true;
    }

    var best = null;
    var bestScore = Infinity;
    for (var i = 0; i < items.length; i += 1) {
      if (items[i] === current) continue;
      var score = directionScore(current, items[i], direction);
      if (score < bestScore) { best = items[i]; bestScore = score; }
    }

    if (!best) return false;
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: "center", inline: "nearest", behavior: SMOOTH_SCROLL });
    return true;
  }

  function changeSelect(select, direction) {
    var step = direction === "up" || direction === "left" ? -1 : 1;
    var next = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + step));
    if (next === select.selectedIndex) return false;
    select.selectedIndex = next;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function activateCurrent() {
    var current = document.activeElement;
    if (!current || current === document.body) {
      var items = focusableElements();
      if (!items.length) return false;
      current = document.getElementById("instructionmanual") || items[0];
      current.focus({ preventScroll: true });
    }

    var tagName = String(current.tagName || "").toLowerCase();
    var isActionable = tagName === "a" || tagName === "button" || tagName === "select" ||
      tagName === "input" || current.getAttribute("role") === "button";
    if (!isActionable && typeof current.querySelector === "function") {
      var nested = current.querySelector("a[href], button:not([disabled]), [role='button'], input:not([disabled])");
      if (nested && isVisible(nested)) current = nested;
    }

    if (String(current.tagName || "").toLowerCase() === "select") {
      var form = current.form;
      if (form) {
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
        return true;
      }
    }

    if (typeof current.click === "function") {
      current.click();
      return true;
    }
    return false;
  }

  function handleBack() {
    var modal = document.getElementById("modal");
    if (isVisible(modal)) {
      var close = modal.querySelector(".close, [data-dismiss='modal'], [aria-label*='close' i]");
      if (close && typeof close.click === "function") {
        close.click();
        return true;
      }
    }

    if (window.history.length > 1) {
      window.history.back();
      return true;
    }

    if (window.SharpLifePortalBackTarget) {
      window.location.assign(window.SharpLifePortalBackTarget);
      return true;
    }
    return false;
  }

  function handleKeydown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    var command = commandFor(event);
    if (!command || isTextEditor(event.target)) return;

    var active = document.activeElement;
    var activeName = String((active && active.tagName) || "").toLowerCase();
    var handled = false;

    if (command === "back") {
      handled = handleBack();
    } else if (activeName === "select" && (command === "up" || command === "down")) {
      handled = changeSelect(active, command);
    } else if (command === "ok") {
      handled = activateCurrent();
    } else if (command === "left" || command === "right" || command === "up" || command === "down") {
      handled = moveFocus(command);
      if (!handled && (command === "up" || command === "down")) {
        var step = Math.max(MIN_SCROLL_STEP, Math.round(window.innerHeight * VIEWPORT_STEP));
        scrollElement(activeScroller(), command === "up" ? -step : step);
        handled = true;
      }
    } else {
      var viewport = Math.max(MIN_SCROLL_STEP, Math.round(window.innerHeight * 0.8));
      if (command === "page-up") scrollElement(activeScroller(), -viewport);
      else if (command === "page-down") scrollElement(activeScroller(), viewport);
      else if (command === "home") scrollElement(activeScroller(), -Number.MAX_SAFE_INTEGER);
      else if (command === "end") scrollElement(activeScroller(), Number.MAX_SAFE_INTEGER);
      handled = true;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  document.addEventListener("keydown", handleKeydown, true);
})();
