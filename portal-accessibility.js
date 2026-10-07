(function () {
  "use strict";

  var sdkAccessibility = null;
  var sdkReady = null;
  var lastSpokenText = "";
  var speechRequest = 0;
  var unsubscribeTTS = null;
  var unsubscribeTM = null;
  var portalRoot = new URL("./", document.currentScript && document.currentScript.src ? document.currentScript.src : window.location.href);
  var state = {
    brand: "unknown",
    mode: "none",
    ttsSupported: false,
    ttsEnabled: false,
    ttsSettings: { available: false, enabled: false, rate: null, pitch: null, volume: null },
    tmSupported: false,
    tmEnabled: false,
    tmSettings: { available: false, enabled: false, scale: null }
  };

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

  function mergeSettings(previous, next) {
    var result = {};
    var key;
    for (key in previous) if (Object.prototype.hasOwnProperty.call(previous, key)) result[key] = previous[key];
    if (next) for (key in next) if (Object.prototype.hasOwnProperty.call(next, key)) result[key] = next[key];
    return result;
  }

  function localTestSettings() {
    if (window.location.protocol !== "file:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return null;
    var params = new URLSearchParams(window.location.search);
    if (!params.has("titan_test_tts") && !params.has("titan_test_tm")) return null;
    return {
      tts: {
        available: true,
        enabled: params.get("titan_test_tts") === "on",
        rate: Number(params.get("titan_test_rate") || 1),
        volume: Number(params.get("titan_test_volume") || 0.8)
      },
      tm: {
        available: true,
        enabled: params.get("titan_test_tm") === "on",
        scale: Number(params.get("titan_test_scale") || 1.25)
      }
    };
  }

  function publishState() {
    var ttsState = state.ttsSupported ? (state.ttsEnabled ? "enabled" : "disabled") : "unavailable";
    document.documentElement.setAttribute("data-sharp-tts-state", ttsState);
    document.documentElement.setAttribute("data-sharp-tts-mode", state.mode);
    document.documentElement.setAttribute("data-sharp-tm-state", state.tmSupported ? (state.tmEnabled ? "enabled" : "disabled") : "unavailable");
    window.SharpLifePortalAccessibility = state;
    window.dispatchEvent(new CustomEvent("sharp-life-portal:accessibility-ready", { detail: state }));
  }

  function updateTTSSettings(settings) {
    state.ttsSettings = mergeSettings(state.ttsSettings, settings);
    state.ttsEnabled = Boolean(state.ttsSupported && state.ttsSettings.enabled);
    state.mode = String(state.brand).toUpperCase().indexOf("JVC") !== -1 ? "native" : (state.ttsEnabled ? "sdk" : "none");
    if (!state.ttsEnabled && sdkAccessibility && typeof sdkAccessibility.stopSpeaking === "function") {
      Promise.resolve(sdkAccessibility.stopSpeaking()).catch(function () {});
    }
    publishState();
  }

  function updateTMSettings(settings) {
    state.tmSettings = mergeSettings(state.tmSettings, settings);
    state.tmEnabled = Boolean(state.tmSupported && state.tmSettings.enabled);
    publishState();
  }

  async function getDeviceBrand() {
    if (window.SharpLifePortalDevice && window.SharpLifePortalDevice.brand) return window.SharpLifePortalDevice.brand;
    if (!window.TitanSDK || !window.TitanSDK.deviceInfo) return "unknown";
    try {
      var info = await window.TitanSDK.deviceInfo.getDeviceInfo();
      return (info.Channel && info.Channel.brand) || (info.Product && info.Product.brand) || "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  async function initializeSdkAccessibility() {
    if (sdkReady) return sdkReady;
    sdkReady = (async function () {
      if (!window.TitanSDK || !window.TitanSDK.accessibility) return null;
      if (window.TitanSDK.isReady && typeof window.TitanSDK.isReady.then === "function") await window.TitanSDK.isReady;
      sdkAccessibility = window.TitanSDK.accessibility;
      state.brand = await getDeviceBrand();

      try { state.ttsSupported = Boolean(await sdkAccessibility.isTTSSupported()); }
      catch (error) { state.ttsSupported = false; }
      try { state.ttsSettings = mergeSettings(state.ttsSettings, await sdkAccessibility.getTTSSettings()); }
      catch (error) {}
      state.ttsEnabled = Boolean(state.ttsSupported && state.ttsSettings.enabled);
      state.mode = String(state.brand).toUpperCase().indexOf("JVC") !== -1 ? "native" : (state.ttsEnabled ? "sdk" : "none");

      try { state.tmSupported = Boolean(await sdkAccessibility.isTextMagnificationSupported()); }
      catch (error) { state.tmSupported = false; }
      try { state.tmSettings = mergeSettings(state.tmSettings, await sdkAccessibility.getTMSettings()); }
      catch (error) {}
      state.tmEnabled = Boolean(state.tmSupported && state.tmSettings.enabled);

      var testSettings = localTestSettings();
      if (testSettings) {
        state.ttsSupported = true;
        state.ttsSettings = mergeSettings(state.ttsSettings, testSettings.tts);
        state.ttsEnabled = Boolean(state.ttsSettings.enabled);
        state.tmSupported = true;
        state.tmSettings = mergeSettings(state.tmSettings, testSettings.tm);
        state.tmEnabled = Boolean(state.tmSettings.enabled);
        state.mode = String(state.brand).toUpperCase().indexOf("JVC") !== -1 ? "native" : (state.ttsEnabled ? "sdk" : "none");
      }

      if (typeof sdkAccessibility.onTTSSettingsChange === "function") unsubscribeTTS = sdkAccessibility.onTTSSettingsChange(updateTTSSettings);
      if (typeof sdkAccessibility.onTMSettingsChange === "function") unsubscribeTM = sdkAccessibility.onTMSettingsChange(updateTMSettings);
      publishState();
      return sdkAccessibility;
    })().catch(function (error) {
      console.warn("Sharp Life Portal: Titan accessibility initialization failed.", error);
      state.mode = "none";
      publishState();
      return null;
    });
    return sdkReady;
  }

  async function speak(text) {
    text = cleanText(text);
    if (!text || text === lastSpokenText || state.mode !== "sdk" || !state.ttsEnabled) return false;
    lastSpokenText = text;
    var request = ++speechRequest;
    var accessibility = await initializeSdkAccessibility();
    if (!accessibility || request !== speechRequest || state.mode !== "sdk" || !state.ttsEnabled) return false;
    try {
      await accessibility.stopSpeaking();
      if (request !== speechRequest) return false;
      return await accessibility.startSpeaking(text);
    } catch (error) {
      console.warn("Sharp Life Portal: Titan TTS request failed.", error);
      return false;
    }
  }

  function handleFocus(event) {
    var target = event.target;
    if (!target || target === document.body) return;
    speak(target.getAttribute("aria-label") || labelFor(target));
  }

  function initialize() {
    if (window.SharpPortalCardLocalization) window.SharpPortalCardLocalization.apply(document.documentElement.lang);
    if (window.SharpPortalModalLocalization) window.SharpPortalModalLocalization.apply(document.documentElement.lang);
    prepareFocusableContent();
    document.addEventListener("focusin", handleFocus, true);
    initializeSdkAccessibility();
    window.addEventListener("sharp-life-portal:device-ready", function (event) {
      if (event.detail && event.detail.brand) state.brand = event.detail.brand;
      state.mode = String(state.brand).toUpperCase().indexOf("JVC") !== -1 ? "native" : (state.ttsEnabled ? "sdk" : "none");
      publishState();
    });
    window.addEventListener("beforeunload", function () {
      if (typeof unsubscribeTTS === "function") unsubscribeTTS();
      if (typeof unsubscribeTM === "function") unsubscribeTM();
    });
    window.SharpPortalTTS = {
      getState: function () { return state; },
      refresh: initializeSdkAccessibility,
      speak: speak,
      getLastSpokenText: function () { return lastSpokenText; }
    };
    document.documentElement.setAttribute("data-sharp-tts-ready", "true");
  }

  function initializeWithTranslations() {
    if (!document.getElementById("lifeapp")) { initialize(); return; }
    function loadModalTranslations() {
      if (window.SharpPortalModalLocalization) { initialize(); return; }
      var modalScript = document.createElement("script");
      modalScript.src = new URL("portal-modal-i18n.js", portalRoot).toString();
      modalScript.onload = initialize;
      modalScript.onerror = initialize;
      document.head.appendChild(modalScript);
    }
    if (window.SharpPortalCardLocalization) { loadModalTranslations(); return; }
    var cardScript = document.createElement("script");
    cardScript.src = new URL("portal-card-i18n.js", portalRoot).toString();
    cardScript.onload = loadModalTranslations;
    cardScript.onerror = loadModalTranslations;
    document.head.appendChild(cardScript);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeWithTranslations, { once: true });
  else initializeWithTranslations();
})();
