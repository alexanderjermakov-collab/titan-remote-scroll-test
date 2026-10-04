(function () {
  "use strict";

  var MIN_SCROLL_STEP = 180;
  var VIEWPORT_STEP = 0.22;
  var SMOOTH_SCROLL = "smooth";

  function isEditable(element) {
    if (!element || element === document.body) return false;
    var name = String(element.tagName || "").toLowerCase();
    return name === "input" || name === "textarea" || name === "select" || element.isContentEditable;
  }

  function isVisible(element) {
    if (!element) return false;
    var style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
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
    if (typeof element.scrollBy === "function") {
      element.scrollBy({ top: delta, left: 0, behavior: SMOOTH_SCROLL });
    } else {
      element.scrollTop += delta;
    }
  }

  function handleKeydown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (isEditable(event.target)) return;

    var key = event.key || "";
    var code = event.keyCode || event.which || 0;
    var viewport = Math.max(MIN_SCROLL_STEP, Math.round(window.innerHeight * VIEWPORT_STEP));
    var delta = 0;

    if (key === "ArrowUp" || code === 38) delta = -viewport;
    else if (key === "ArrowDown" || code === 40) delta = viewport;
    else if (key === "PageUp" || code === 33) delta = -Math.max(viewport, Math.round(window.innerHeight * 0.8));
    else if (key === "PageDown" || code === 34) delta = Math.max(viewport, Math.round(window.innerHeight * 0.8));
    else if (key === "Home" || code === 36) delta = -Number.MAX_SAFE_INTEGER;
    else if (key === "End" || code === 35) delta = Number.MAX_SAFE_INTEGER;
    else return;

    event.preventDefault();
    event.stopPropagation();
    scrollElement(activeScroller(), delta);
  }

  document.addEventListener("keydown", handleKeydown, true);
})();
