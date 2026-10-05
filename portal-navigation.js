(function () {
  "use strict";

  var DEFAULT_LINE_SCROLL_STEP = 40;
  var SMOOTH_SCROLL = "smooth";
  var FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "select:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "[role='button']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  var EXIT_COPY = {
    bg: ["Да затворите ли Sharp Life Portal?", "Отказ", "Затвори"],
    ca: ["Voleu tancar Sharp Life Portal?", "Cancel·la", "Tanca"],
    cs: ["Chcete zavřít Sharp Life Portal?", "Zrušit", "Zavřít"],
    da: ["Vil du lukke Sharp Life Portal?", "Annuller", "Luk"],
    de: ["Möchten Sie Sharp Life Portal schließen?", "Abbrechen", "Schließen"],
    el: ["Θέλετε να κλείσετε το Sharp Life Portal;", "Ακύρωση", "Κλείσιμο"],
    en: ["Close Sharp Life Portal?", "Cancel", "Close"],
    es: ["¿Desea cerrar Sharp Life Portal?", "Cancelar", "Cerrar"],
    et: ["Kas sulgeda Sharp Life Portal?", "Loobu", "Sulge"],
    fi: ["Suljetaanko Sharp Life Portal?", "Peruuta", "Sulje"],
    fr: ["Fermer Sharp Life Portal ?", "Annuler", "Fermer"],
    hr: ["Želite li zatvoriti Sharp Life Portal?", "Odustani", "Zatvori"],
    hu: ["Bezárja a Sharp Life Portalt?", "Mégse", "Bezárás"],
    it: ["Chiudere Sharp Life Portal?", "Annulla", "Chiudi"],
    lt: ["Uždaryti „Sharp Life Portal“?", "Atšaukti", "Uždaryti"],
    lv: ["Vai aizvērt Sharp Life Portal?", "Atcelt", "Aizvērt"],
    nl: ["Sharp Life Portal sluiten?", "Annuleren", "Sluiten"],
    no: ["Vil du lukke Sharp Life Portal?", "Avbryt", "Lukk"],
    pl: ["Zamknąć Sharp Life Portal?", "Anuluj", "Zamknij"],
    pt: ["Fechar o Sharp Life Portal?", "Cancelar", "Fechar"],
    "pt-pt": ["Fechar o Sharp Life Portal?", "Cancelar", "Fechar"],
    ro: ["Închideți Sharp Life Portal?", "Anulați", "Închideți"],
    ru: ["Закрыть Sharp Life Portal?", "Отмена", "Закрыть"],
    sk: ["Zavrieť Sharp Life Portal?", "Zrušiť", "Zavrieť"],
    sl: ["Želite zapreti Sharp Life Portal?", "Prekliči", "Zapri"],
    sr: ["Želite li da zatvorite Sharp Life Portal?", "Otkaži", "Zatvori"],
    sv: ["Vill du stänga Sharp Life Portal?", "Avbryt", "Stäng"],
    uk: ["Закрити Sharp Life Portal?", "Скасувати", "Закрити"]
  };
  var focusBeforeExitDialog = null;

  function normalizedLanguage() {
    var value = String(document.documentElement.lang || "en").toLowerCase().replace(/_/g, "-");
    if (EXIT_COPY[value]) return value;
    value = value.split("-")[0];
    return EXIT_COPY[value] ? value : "en";
  }

  function addPortalUiStyles() {
    if (document.getElementById("sharp-portal-ui-style")) return;
    var style = document.createElement("style");
    style.id = "sharp-portal-ui-style";
    style.textContent = [
      "html:not([data-sharp-manual]) .homepage-large #instructionmanual h3,",
      "html:not([data-sharp-manual]) .homepage-large #lifeapp h2,",
      "html:not([data-sharp-manual]) .homepage-large #some h2 {",
      "  font-size: 1.28em !important;",
      "  line-height: 1.12 !important;",
      "  font-weight: 700 !important;",
      "  margin: 0 !important;",
      "}",
      "html:not([data-sharp-manual]) .homepage-app .content:focus,",
      "html:not([data-sharp-manual]) #modal .close:focus,",
      "html:not([data-sharp-manual]) button:focus,",
      "html:not([data-sharp-manual]) select:focus,",
      "html:not([data-sharp-manual]) [role='button']:focus {",
      "  outline: 3px solid #baff35 !important;",
      "  outline-offset: -7px !important;",
      "  box-shadow: inset 0 0 0 7px #baff35, inset 0 0 0 999px rgba(247, 48, 157, 0.28), 0 0 0 4px #f7309d, 0 0 18px rgba(247, 48, 157, 0.9) !important;",
      "  transform: scale(1.018) !important;",
      "  transition: transform 120ms ease, box-shadow 120ms ease !important;",
      "}",
      "#sharp-portal-exit-confirmation { position: fixed; inset: 0; z-index: 2147483646; display: none; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.72); font-family: Roboto, Arial, sans-serif; }",
      "#sharp-portal-exit-confirmation.sharp-dialog-open { display: flex; }",
      "#sharp-portal-exit-confirmation .sharp-exit-panel { width: min(680px, 82vw); padding: 36px; border: 2px solid #69727a; border-radius: 8px; background: #30373c; color: #fff; text-align: center; box-shadow: 0 18px 55px rgba(0,0,0,.7); }",
      "#sharp-portal-exit-confirmation .sharp-exit-message { margin: 0 0 32px; font-size: 30px; line-height: 1.25; font-weight: 600; }",
      "#sharp-portal-exit-confirmation .sharp-exit-actions { display: flex; justify-content: center; gap: 24px; }",
      "#sharp-portal-exit-confirmation button { min-width: 190px; padding: 15px 24px; border: 2px solid #75808a; border-radius: 4px; background: #424b52; color: #fff; font-size: 23px; font-weight: 600; }",
      "#sharp-portal-exit-confirmation button:focus { background: #f7309d !important; color: #fff !important; }",
      "@media (max-width: 700px) {",
      "  html:not([data-sharp-manual]) .homepage-large #instructionmanual h3, html:not([data-sharp-manual]) .homepage-large #lifeapp h2, html:not([data-sharp-manual]) .homepage-large #some h2 { font-size: 18px !important; }",
      "  #sharp-portal-exit-confirmation .sharp-exit-message { font-size: 23px; }",
      "  #sharp-portal-exit-confirmation button { min-width: 125px; font-size: 18px; }",
      "}"
    ].join("\n");
    document.head.appendChild(style);
    document.documentElement.setAttribute("data-portal-ui", "true");
  }

  function closeExitConfirmation() {
    var dialog = document.getElementById("sharp-portal-exit-confirmation");
    if (!dialog) return false;
    dialog.classList.remove("sharp-dialog-open");
    dialog.setAttribute("aria-hidden", "true");
    if (focusBeforeExitDialog && typeof focusBeforeExitDialog.focus === "function") {
      focusBeforeExitDialog.focus({ preventScroll: true });
    }
    return true;
  }

  function showExitConfirmation() {
    var language = normalizedLanguage();
    var text = EXIT_COPY[language] || EXIT_COPY.en;
    var dialog = document.getElementById("sharp-portal-exit-confirmation");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "sharp-portal-exit-confirmation";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.innerHTML = '<div class="sharp-exit-panel"><p class="sharp-exit-message"></p><div class="sharp-exit-actions"><button type="button" data-exit-action="cancel"></button><button type="button" data-exit-action="close"></button></div></div>';
      document.body.appendChild(dialog);
      dialog.querySelector('[data-exit-action="cancel"]').addEventListener("click", closeExitConfirmation);
      dialog.querySelector('[data-exit-action="close"]').addEventListener("click", function () {
        closeExitConfirmation();
        exitPortal();
      });
    }
    dialog.querySelector(".sharp-exit-message").textContent = text[0];
    dialog.querySelector('[data-exit-action="cancel"]').textContent = text[1];
    dialog.querySelector('[data-exit-action="close"]').textContent = text[2];
    dialog.setAttribute("aria-label", text[0]);
    dialog.setAttribute("aria-hidden", "false");
    focusBeforeExitDialog = document.activeElement;
    dialog.classList.add("sharp-dialog-open");
    dialog.querySelector('[data-exit-action="cancel"]').focus({ preventScroll: true });
    return true;
  }

  function commandFor(event) {
    var key = String(event.key || "");
    var code = event.keyCode || event.which || 0;
    var physical = String(event.code || "");

    if (key === "ArrowUp" || key === "Up" || physical === "ArrowUp" || code === 38 || code === 19) return "up";
    if (key === "ArrowDown" || key === "Down" || physical === "ArrowDown" || code === 40 || code === 20) return "down";
    if (key === "ArrowLeft" || key === "Left" || physical === "ArrowLeft" || code === 37 || code === 21) return "left";
    if (key === "ArrowRight" || key === "Right" || physical === "ArrowRight" || code === 39 || code === 22) return "right";
    if (key === "Enter" || key === "OK" || key === "Select" || key === "Accept" || physical === "Enter" || physical === "NumpadEnter" || code === 13 || code === 23 || code === 66) return "ok";
    if (key === "Back" || key === "Backspace" || key === "BrowserBack" || key === "GoBack" || key === "Escape" || physical === "BrowserBack" || physical === "Escape" || code === 4 || code === 8 || code === 27 || code === 461 || code === 10009) return "back";
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

  function lineScrollStep() {
    var target = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
    var style = window.getComputedStyle(target);
    var lineHeight = parseFloat(style.lineHeight);
    if (!isFinite(lineHeight)) lineHeight = parseFloat(style.fontSize) * 1.35;
    if (!isFinite(lineHeight) || lineHeight < 16) lineHeight = DEFAULT_LINE_SCROLL_STEP;
    return Math.round(Math.min(64, Math.max(24, lineHeight)));
  }

  function focusableElements() {
    var dialog = document.getElementById("sharp-portal-exit-confirmation");
    var root = dialog && isVisible(dialog) ? dialog : document;
    var nodes = root.querySelectorAll(FOCUSABLE_SELECTOR);
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
    var exitDialog = document.getElementById("sharp-portal-exit-confirmation");
    if (isVisible(exitDialog)) return closeExitConfirmation();

    var modal = document.getElementById("modal");
    if (isVisible(modal)) {
      var close = modal.querySelector(".close, [data-dismiss='modal'], [aria-label*='close' i]");
      if (close && typeof close.click === "function") {
        close.click();
        return true;
      }
    }

    if (document.documentElement.hasAttribute("data-sharp-manual") && window.SharpLifePortalBackTarget) {
      window.location.assign(window.SharpLifePortalBackTarget);
      return true;
    }

    if (document.documentElement.hasAttribute("data-language-selector") || document.getElementById("instructionmanual")) {
      return showExitConfirmation();
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

  function exitPortal() {
    try {
      if (typeof window.SmartTvA_API !== "undefined" && typeof window.SmartTvA_API.exit === "function") {
        window.SmartTvA_API.exit();
        return true;
      }
    } catch (error) {
      console.warn("Sharp Life Portal: native exit failed.", error);
    }

    try { window.close(); } catch (error) {}
    window.setTimeout(function () {
      if (!document.hidden && window.history.length > 1) window.history.go(-1);
    }, 80);
    return true;
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
        var step = lineScrollStep();
        scrollElement(activeScroller(), command === "up" ? -step : step);
        handled = true;
      }
    } else {
      var viewport = Math.max(DEFAULT_LINE_SCROLL_STEP, Math.round(window.innerHeight * 0.8));
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

  addPortalUiStyles();
  document.addEventListener("keydown", handleKeydown, true);
})();
