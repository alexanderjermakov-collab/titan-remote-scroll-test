(function () {
  "use strict";

  var sdkAccessibility = null;
  var sdkReady = null;
  var lastSpokenText = "";
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

    var accessibility = await getSdkAccessibility();
    if (accessibility) {
      try {
        await accessibility.stopSpeaking();
        await accessibility.startSpeaking(text);
        return;
      } catch (error) {
        console.warn("Sharp Life Portal: Titan TTS request failed.", error);
      }
    }

    browserSpeak(text);
  }

  function handleFocus(event) {
    var target = event.target;
    if (!target || target === document.body) return;
    speak(target.getAttribute("aria-label") || labelFor(target));
  }

  function initialize() {
    if (window.SharpPortalCardLocalization) {
      window.SharpPortalCardLocalization.apply(document.documentElement.lang);
    }
    prepareFocusableContent();
    document.addEventListener("focusin", handleFocus, true);
    getSdkAccessibility();
  }

  function initializeWithCardTranslations() {
    if (!document.getElementById("lifeapp") || window.SharpPortalCardLocalization) {
      initialize();
      return;
    }

    var localization = document.createElement("script");
    localization.src = new URL("portal-card-i18n.js", portalRoot).toString();
    localization.onload = initialize;
    localization.onerror = initialize;
    document.head.appendChild(localization);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWithCardTranslations, { once: true });
  } else {
    initializeWithCardTranslations();
  }
})();
