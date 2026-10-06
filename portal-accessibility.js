(function () {
  "use strict";

  var sdkAccessibility = null;
  var sdkReady = null;
  var lastSpokenText = "";
  var lastScreenText = "";
  var screenReadTimer = null;
  var speechRequest = 0;
  var accessibilityScript = document.currentScript;
  var portalRoot = new URL("./", accessibilityScript && accessibilityScript.src ? accessibilityScript.src : window.location.href);

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function labelFor(element) {
    var explicit = cleanText(element.getAttribute("aria-label"));
    if (explicit) return explicit;

    var parts = [];
    var nodes = element.querySelectorAll("h1, h2, h3, h4, h5, h6, .btn-link, .text-link-modal, .modelname");
    for (var i = 0; i < nodes.length; i += 1) {
      var text = cleanText(nodes[i].textContent);
      if (text && parts.indexOf(text) === -1) parts.push(text);
    }

    return cleanText(parts.join(". ") || element.textContent);
  }

  function isVisibleTextNode(node) {
    var element = node.parentElement;
    if (!element || !cleanText(node.nodeValue)) return false;
    if (element.closest("script, style, noscript, template, [hidden], [aria-hidden='true'], [data-tts-ignore='true']")) return false;

    var style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;

    var range = document.createRange();
    range.selectNodeContents(node);
    var rectangles = range.getClientRects();
    for (var i = 0; i < rectangles.length; i += 1) {
      var rectangle = rectangles[i];
      if (rectangle.width > 0 && rectangle.height > 0 &&
          rectangle.bottom > 0 && rectangle.right > 0 &&
          rectangle.top < window.innerHeight && rectangle.left < window.innerWidth) return true;
    }
    return false;
  }

  function visibleTextLines() {
    if (!document.body) return [];
    var lines = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (!isVisibleTextNode(node)) continue;
      var text = cleanText(node.nodeValue);
      if (text) lines.push(text);
    }
    return lines;
  }

  function prepareFocusableContent() {
    var items = document.querySelectorAll(".content, .modal-content, a, button, [role='button'], .close");
    for (var i = 0; i < items.length; i += 1) {
      var element = items[i];
      if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "0");
      var label = labelFor(element);
      if (label && !element.hasAttribute("aria-label")) element.setAttribute("aria-label", label);
    }
  }

  async function getSdkAccessibility() {
    if (sdkReady) return sdkReady;

    sdkReady = (async function () {
      if (!window.TitanSDK || !window.TitanSDK.accessibility) return null;

      var accessibility = window.TitanSDK.accessibility;
      var supported = await accessibility.isTTSSupported();
      if (!supported) return null;

      if (typeof accessibility.getTTSSettings === "function") {
        var settings = await accessibility.getTTSSettings();
        if (settings && settings.enabled === false) return null;
      }

      sdkAccessibility = accessibility;
      return accessibility;
    })().catch(function (error) {
      console.warn("Sharp Life Portal: Titan TTS initialization failed.", error);
      return null;
    });

    return sdkReady;
  }

  function browserSpeak(text) {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") return false;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document.documentElement.lang || "de-DE";
    window.speechSynthesis.speak(utterance);
    return true;
  }

  async function speak(text) {
    text = cleanText(text);
    if (!text || text === lastSpokenText) return;
    lastSpokenText = text;
    var request = ++speechRequest;

    var accessibility = await getSdkAccessibility();
    if (request !== speechRequest) return;
    if (accessibility) {
      try {
        await accessibility.stopSpeaking();
        if (request !== speechRequest) return;
        await accessibility.startSpeaking(text);
        return;
      } catch (error) {
        console.warn("Sharp Life Portal: Titan TTS request failed.", error);
      }
    }

    browserSpeak(text);
  }

  function readVisibleScreen(force) {
    var lines = visibleTextLines();
    var screenText = cleanText(lines.join(". "));
    document.documentElement.setAttribute("data-sharp-tts-screen-lines", String(lines.length));
    document.documentElement.setAttribute("data-sharp-tts-screen-characters", String(screenText.length));
    if (!screenText || (!force && screenText === lastScreenText)) return;
    lastScreenText = screenText;
    document.documentElement.setAttribute("data-sharp-tts-mode", "screen");
    speak(screenText);
  }

  function scheduleScreenRead(delay) {
    if (screenReadTimer !== null) window.clearTimeout(screenReadTimer);
    screenReadTimer = window.setTimeout(function () {
      screenReadTimer = null;
      if (document.visibilityState !== "hidden") readVisibleScreen(false);
    }, typeof delay === "number" ? delay : 180);
  }

  function handleFocus(event) {
    var target = event.target;
    if (!target || target === document.body) return;
    if (screenReadTimer !== null) return;
    document.documentElement.setAttribute("data-sharp-tts-mode", "focus");
    speak(target.getAttribute("aria-label") || labelFor(target));
  }

  function observeVisibleContent() {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i += 1) {
        var mutation = mutations[i];
        if (mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes") {
          scheduleScreenRead(180);
          return;
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "class", "hidden", "open", "style"]
    });

    window.addEventListener("scroll", function () { scheduleScreenRead(240); }, { capture: true, passive: true });
    window.addEventListener("resize", function () { scheduleScreenRead(240); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") scheduleScreenRead(100);
    });
  }

  function initialize() {
    if (window.SharpPortalCardLocalization) {
      window.SharpPortalCardLocalization.apply(document.documentElement.lang);
    }
    if (window.SharpPortalModalLocalization) {
      window.SharpPortalModalLocalization.apply(document.documentElement.lang);
    }
    prepareFocusableContent();
    document.addEventListener("focusin", handleFocus, true);
    observeVisibleContent();
    getSdkAccessibility();
    scheduleScreenRead(120);

    window.SharpPortalTTS = {
      getVisibleTextLines: visibleTextLines,
      readVisibleScreen: function () { readVisibleScreen(true); },
      getLastScreenText: function () { return lastScreenText; },
      getLastSpokenText: function () { return lastSpokenText; }
    };
    document.documentElement.setAttribute("data-sharp-tts-ready", "true");
  }

  function initializeWithCardTranslations() {
    if (!document.getElementById("lifeapp")) {
      initialize();
      return;
    }

    function loadModalTranslations() {
      if (window.SharpPortalModalLocalization) {
        initialize();
        return;
      }
      var modalLocalization = document.createElement("script");
      modalLocalization.src = new URL("portal-modal-i18n.js", portalRoot).toString();
      modalLocalization.onload = initialize;
      modalLocalization.onerror = initialize;
      document.head.appendChild(modalLocalization);
    }

    if (window.SharpPortalCardLocalization) {
      loadModalTranslations();
      return;
    }

    var cardLocalization = document.createElement("script");
    cardLocalization.src = new URL("portal-card-i18n.js", portalRoot).toString();
    cardLocalization.onload = loadModalTranslations;
    cardLocalization.onerror = loadModalTranslations;
    document.head.appendChild(cardLocalization);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWithCardTranslations, { once: true });
  } else {
    initializeWithCardTranslations();
  }
})();
