(function () {
  "use strict";

  var sdkAccessibility = null;
  var runtimeReady = null;
  var lastSpokenText = "";
  var lastScreenText = "";
  var screenReadTimer = null;
  var speechRequest = 0;
  var accessibilityScript = document.currentScript;
  var portalRoot = new URL("./", accessibilityScript && accessibilityScript.src ? accessibilityScript.src : window.location.href);
  var runtime = {
    source: "initializing",
    sdkAvailable: false,
    brand: "unknown",
    language: document.documentElement.lang || navigator.language || "en",
    country: "unknown",
    ttsSupported: false,
    ttsEnabled: false,
    ttsDriver: "off",
    speechRate: null,
    speechVolume: null,
    textMagnificationSupported: false,
    textMagnificationEnabled: false,
    textMagnificationScale: 1
  };

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isFiniteNumber(value) {
    return value !== null && value !== "" && isFinite(Number(value));
  }

  function firstNumber(object, keys) {
    if (!object) return null;
    for (var i = 0; i < keys.length; i += 1) {
      if (isFiniteNumber(object[keys[i]])) return Number(object[keys[i]]);
    }
    return null;
  }

  function localeCountry() {
    var locale = String(navigator.language || "").replace(/_/g, "-").split("-");
    return locale.length > 1 ? locale[locale.length - 1].toUpperCase() : "unknown";
  }

  function publicRuntime() {
    var copy = {};
    Object.keys(runtime).forEach(function (key) { copy[key] = runtime[key]; });
    return copy;
  }

  function applyTextMagnification() {
    var root = document.documentElement;
    var enabled = runtime.textMagnificationSupported && runtime.textMagnificationEnabled;
    var scale = isFiniteNumber(runtime.textMagnificationScale) ? Number(runtime.textMagnificationScale) : 1;
    if (scale < 1) scale = 1;
    root.setAttribute("data-sharp-tm-enabled", enabled ? "true" : "false");
    root.setAttribute("data-sharp-tm-scale", String(scale));
    root.style.fontSize = enabled ? scale + "em" : "";
  }

  function publishRuntime(patch) {
    if (patch) Object.keys(patch).forEach(function (key) { runtime[key] = patch[key]; });
    document.documentElement.setAttribute("data-sharp-tts-enabled", runtime.ttsEnabled ? "true" : "false");
    document.documentElement.setAttribute("data-sharp-tts-driver", runtime.ttsDriver);
    applyTextMagnification();
    window.SharpPortalRuntime = publicRuntime();
    window.dispatchEvent(new CustomEvent("sharp-life-portal:runtime-change", { detail: publicRuntime() }));
  }

  function applyDeviceDetail(detail) {
    if (!detail) return;
    var brand = detail.brand && String(detail.brand).toLowerCase() !== "unknown" ? detail.brand : runtime.brand;
    var language = detail.language && String(detail.language).toLowerCase() !== "unknown" ? detail.language : runtime.language;
    var country = detail.country && String(detail.country).toLowerCase() !== "unknown" ? detail.country : runtime.country;
    publishRuntime({
      brand: brand,
      language: language,
      country: country
    });
  }

  function applyTTSSettings(settings, supported) {
    settings = settings || {};
    var enabled = Boolean(supported && settings.enabled === true);
    var brand = String(runtime.brand || "").toUpperCase();
    publishRuntime({
      ttsSupported: Boolean(supported),
      ttsEnabled: enabled,
      ttsDriver: enabled ? (brand.indexOf("JVC") !== -1 ? "native" : "titan-sdk") : "off",
      speechRate: firstNumber(settings, ["rate", "speechRate", "speed"]),
      speechVolume: firstNumber(settings, ["volume", "speechVolume"])
    });
    if (!enabled) {
      lastSpokenText = "";
      try { if (sdkAccessibility && typeof sdkAccessibility.stopSpeaking === "function") sdkAccessibility.stopSpeaking(); } catch (error) {}
    }
  }

  function applyTMSettings(settings, supported) {
    settings = settings || {};
    publishRuntime({
      textMagnificationSupported: Boolean(supported),
      textMagnificationEnabled: Boolean(supported && settings.enabled),
      textMagnificationScale: firstNumber(settings, ["scale", "zoom", "magnification"]) || 1
    });
  }

  function installAccessibilityListeners(accessibility) {
    if (typeof accessibility.onTTSSettingsChange === "function") {
      accessibility.onTTSSettingsChange(function (settings) {
        applyTTSSettings(settings, runtime.ttsSupported);
        scheduleScreenRead(100);
      });
    }
    if (typeof accessibility.onTTSConfigurationChange === "function") {
      accessibility.onTTSConfigurationChange(function (configuration) {
        var rate = firstNumber(configuration, ["rate", "speechRate", "speed"]);
        var volume = firstNumber(configuration, ["volume", "speechVolume"]);
        var patch = {};
        if (rate !== null) patch.speechRate = rate;
        if (volume !== null) patch.speechVolume = volume;
        publishRuntime(patch);
      });
    }
    if (typeof accessibility.onTMSettingsChange === "function") {
      accessibility.onTMSettingsChange(function (settings) {
        applyTMSettings(settings, runtime.textMagnificationSupported);
      });
    }
    if (typeof accessibility.onTMConfigurationChange === "function") {
      accessibility.onTMConfigurationChange(function (configuration) {
        var scale = firstNumber(configuration, ["scale", "zoom", "magnification"]);
        if (scale !== null) publishRuntime({ textMagnificationScale: scale });
      });
    }
  }

  async function initializeRuntime() {
    if (runtimeReady) return runtimeReady;
    runtimeReady = (async function () {
      applyDeviceDetail(window.SharpLifePortalDevice);
      window.addEventListener("sharp-life-portal:device-ready", function (event) { applyDeviceDetail(event.detail); });

      if (!window.TitanSDK || !window.TitanSDK.accessibility) {
        var browserTTS = Boolean(window.speechSynthesis && typeof window.SpeechSynthesisUtterance === "function");
        publishRuntime({
          source: "browser",
          sdkAvailable: false,
          country: runtime.country === "unknown" ? localeCountry() : runtime.country,
          ttsSupported: browserTTS,
          ttsEnabled: browserTTS,
          ttsDriver: browserTTS ? "browser" : "off"
        });
        return runtime;
      }

      try {
        var titan = window.TitanSDK;
        sdkAccessibility = titan.accessibility;
        var info = window.SharpLifePortalDevice;
        if (!info && titan.deviceInfo && typeof titan.deviceInfo.getDeviceInfo === "function") {
          var deviceInfo = await titan.deviceInfo.getDeviceInfo();
          var product = deviceInfo.Product || {};
          var channel = deviceInfo.Channel || {};
          info = {
            brand: channel.brand || product.brand || "unknown",
            language: product.language || runtime.language,
            country: product.country || runtime.country
          };
        }
        applyDeviceDetail(info);

        var ttsSupported = typeof sdkAccessibility.isTTSSupported === "function" && await sdkAccessibility.isTTSSupported();
        var ttsSettings = ttsSupported && typeof sdkAccessibility.getTTSSettings === "function"
          ? await sdkAccessibility.getTTSSettings() : { enabled: false };
        var tmSupported = typeof sdkAccessibility.isTextMagnificationSupported === "function" && await sdkAccessibility.isTextMagnificationSupported();
        var tmSettings = tmSupported && typeof sdkAccessibility.getTMSettings === "function"
          ? await sdkAccessibility.getTMSettings() : { enabled: false, scale: 1 };

        publishRuntime({ source: "titan-sdk", sdkAvailable: true });
        applyTTSSettings(ttsSettings, ttsSupported);
        applyTMSettings(tmSettings, tmSupported);
        installAccessibilityListeners(sdkAccessibility);
      } catch (error) {
        console.warn("Sharp Life Portal: Titan accessibility initialization failed; SDK speech remains disabled.", error);
        publishRuntime({
          source: "titan-sdk-error",
          sdkAvailable: true,
          ttsSupported: false,
          ttsEnabled: false,
          ttsDriver: "off",
          textMagnificationSupported: false,
          textMagnificationEnabled: false
        });
      }
      return runtime;
    })();
    return runtimeReady;
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
      if (rectangle.width > 0 && rectangle.height > 0 && rectangle.bottom > 0 && rectangle.right > 0 &&
          rectangle.top < window.innerHeight && rectangle.left < window.innerWidth) return true;
    }
    return false;
  }

  function isVisibleElement(element) {
    if (!element) return false;
    var style = window.getComputedStyle(element);
    var rectangle = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rectangle.width > 0 && rectangle.height > 0;
  }

  function activeTextRoot() {
    var candidates = [document.getElementById("sharp-portal-about"), document.getElementById("sharp-portal-exit-confirmation"), document.getElementById("modal")];
    for (var i = 0; i < candidates.length; i += 1) if (isVisibleElement(candidates[i])) return candidates[i];
    return document.body;
  }

  function visibleTextLines() {
    if (!document.body) return [];
    var lines = [];
    var walker = document.createTreeWalker(activeTextRoot(), NodeFilter.SHOW_TEXT);
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

  function browserSpeak(text) {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") return false;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = runtime.language || document.documentElement.lang || "en";
    if (runtime.speechRate !== null) utterance.rate = runtime.speechRate;
    if (runtime.speechVolume !== null) utterance.volume = runtime.speechVolume;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  async function speak(text) {
    text = cleanText(text);
    if (!text) return;
    await initializeRuntime();
    if (!runtime.ttsEnabled || runtime.ttsDriver === "native") return;
    if (text === lastSpokenText) return;
    lastSpokenText = text;
    var request = ++speechRequest;

    if (runtime.ttsDriver === "titan-sdk" && sdkAccessibility) {
      try {
        if (typeof sdkAccessibility.stopSpeaking === "function") await sdkAccessibility.stopSpeaking();
        if (request !== speechRequest) return;
        await sdkAccessibility.startSpeaking(text);
      } catch (error) {
        console.warn("Sharp Life Portal: Titan TTS request failed.", error);
      }
      return;
    }
    if (runtime.ttsDriver === "browser") browserSpeak(text);
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
    if (!target || target === document.body || screenReadTimer !== null) return;
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
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ["aria-hidden", "class", "hidden", "open", "style"]
    });
    window.addEventListener("scroll", function () { scheduleScreenRead(240); }, { capture: true, passive: true });
    window.addEventListener("resize", function () { scheduleScreenRead(240); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") scheduleScreenRead(100);
    });
  }

  function initialize() {
    if (window.SharpPortalCardLocalization) window.SharpPortalCardLocalization.apply(document.documentElement.lang);
    if (window.SharpPortalModalLocalization) window.SharpPortalModalLocalization.apply(document.documentElement.lang);
    prepareFocusableContent();
    document.addEventListener("focusin", handleFocus, true);
    observeVisibleContent();
    initializeRuntime().then(function () { scheduleScreenRead(120); });
    window.SharpPortalTTS = {
      getVisibleTextLines: visibleTextLines,
      readVisibleScreen: function () { readVisibleScreen(true); },
      getLastScreenText: function () { return lastScreenText; },
      getLastSpokenText: function () { return lastSpokenText; },
      getRuntime: publicRuntime
    };
    document.documentElement.setAttribute("data-sharp-tts-ready", "true");
  }

  function initializeWithCardTranslations() {
    if (!document.getElementById("lifeapp")) { initialize(); return; }
    function loadModalTranslations() {
      if (window.SharpPortalModalLocalization) { initialize(); return; }
      var modalLocalization = document.createElement("script");
      modalLocalization.src = new URL("portal-modal-i18n.js", portalRoot).toString();
      modalLocalization.onload = initialize;
      modalLocalization.onerror = initialize;
      document.head.appendChild(modalLocalization);
    }
    if (window.SharpPortalCardLocalization) { loadModalTranslations(); return; }
    var cardLocalization = document.createElement("script");
    cardLocalization.src = new URL("portal-card-i18n.js", portalRoot).toString();
    cardLocalization.onload = loadModalTranslations;
    cardLocalization.onerror = loadModalTranslations;
    document.head.appendChild(cardLocalization);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeWithCardTranslations, { once: true });
  else initializeWithCardTranslations();
})();
