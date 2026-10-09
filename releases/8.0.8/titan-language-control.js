(function () {
  "use strict";

  var DEFAULT_LANGUAGE = "en";
  var SUPPORTED_LANGUAGES = {
    bg: true, ca: true, cs: true, da: true, de: true, el: true, en: true,
    es: true, et: true, fi: true, fr: true, hr: true, hu: true, it: true,
    lt: true, lv: true, nl: true, no: true, pl: true, pt: true, "pt-pt": true,
    ro: true, ru: true, sk: true, sl: true, sr: true, sv: true, uk: true
  };
  var refreshInProgress = false;
  var refreshQueued = false;

  function supportedLanguage(value) {
    var raw = String(value || "").trim().toLowerCase().replace(/_/g, "-");
    var aliases = { cz: "cs", dk: "da", gr: "el", nb: "no", nn: "no", sp: "es", ua: "uk" };
    if (aliases[raw]) raw = aliases[raw];
    if (raw.indexOf("pt-pt") === 0) return "pt-pt";
    if (raw.indexOf("pt-") === 0) return "pt";
    var base = raw.split("-")[0];
    if (aliases[base]) base = aliases[base];
    return SUPPORTED_LANGUAGES[base] ? base : null;
  }

  function normalizeLanguage(value) {
    return supportedLanguage(value) || DEFAULT_LANGUAGE;
  }

  function isLocalTestHost() {
    return window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  }

  function testOverrides() {
    if (!isLocalTestHost()) return null;
    var params = new URLSearchParams(window.location.search);
    if (!params.has("titan_test_language") && !params.has("titan_test_country") && !params.has("titan_test_brand")) return null;
    return {
      Channel: { brand: params.get("titan_test_brand") || "Philips", vendor: "local-test" },
      Product: {
        country: params.get("titan_test_country") || "DE",
        language: params.get("titan_test_language") || DEFAULT_LANGUAGE,
        platform: params.get("titan_test_platform") || "Sharp Titan test"
      },
      Capability: {}
    };
  }

  async function readDeviceInfo() {
    var override = testOverrides();
    if (override) return { info: override, source: "local-test" };
    if (!window.TitanSDK || !window.TitanSDK.deviceInfo) throw new Error("TitanSDK is not available");
    if (window.TitanSDK.isReady && typeof window.TitanSDK.isReady.then === "function") await window.TitanSDK.isReady;
    return { info: await window.TitanSDK.deviceInfo.getDeviceInfo(), source: "titan-sdk" };
  }

  function addLanguageCandidate(candidates, value, source) {
    var language = supportedLanguage(value);
    if (!language) return;
    for (var i = 0; i < candidates.length; i += 1) {
      if (candidates[i].language === language) return;
    }
    candidates.push({ language: language, raw: String(value), source: source });
  }

  function addObjectLanguageCandidates(candidates, object, source) {
    if (!object || typeof object !== "object") return;
    var keys = [
      "menuLanguage", "menu_language", "uiLanguage", "ui_language",
      "systemLanguage", "system_language", "language", "locale",
      "MENU_LANGUAGE", "UI_LANGUAGE", "SYSTEM_LANGUAGE", "LANGUAGE", "LOCALE"
    ];
    for (var i = 0; i < keys.length; i += 1) {
      try { addLanguageCandidate(candidates, object[keys[i]], source + "." + keys[i]); }
      catch (error) {}
    }
  }

  function activeUiLanguage() {
    var candidates = [];
    var params = new URLSearchParams(window.location.search);
    if (isLocalTestHost()) addLanguageCandidate(candidates, params.get("titan_test_ui_language"), "local-test.ui-language");
    addLanguageCandidate(candidates, params.get("uiLanguage") || params.get("ui_language"), "url.ui-language");
    addLanguageCandidate(candidates, params.get("locale"), "url.locale");

    if (typeof window.getPlatformConfig === "function") {
      try {
        var platformConfig = window.getPlatformConfig();
        if (typeof platformConfig === "string") platformConfig = JSON.parse(platformConfig);
        addObjectLanguageCandidates(candidates, platformConfig, "platform");
        addObjectLanguageCandidates(candidates, platformConfig && platformConfig.Product, "platform.Product");
        addObjectLanguageCandidates(candidates, platformConfig && platformConfig.product, "platform.product");
        addObjectLanguageCandidates(candidates, platformConfig && platformConfig.Device, "platform.Device");
        addObjectLanguageCandidates(candidates, platformConfig && platformConfig.device, "platform.device");
      } catch (error) {}
    }

    var nav = window.navigator || {};
    addLanguageCandidate(candidates, nav.userLanguage, "navigator.userLanguage");
    addLanguageCandidate(candidates, nav.systemLanguage, "navigator.systemLanguage");
    addLanguageCandidate(candidates, nav.browserLanguage, "navigator.browserLanguage");
    if (nav.languages && nav.languages.length) {
      for (var i = 0; i < nav.languages.length; i += 1) addLanguageCandidate(candidates, nav.languages[i], "navigator.languages[" + i + "]");
    }
    addLanguageCandidate(candidates, nav.language, "navigator.language");
    try { addLanguageCandidate(candidates, Intl.DateTimeFormat().resolvedOptions().locale, "Intl.locale"); }
    catch (error) {}
    return candidates.length ? candidates[0] : null;
  }

  function updateInstructionManual(language, version) {
    var manual = document.getElementById("instructionmanual");
    if (!manual) return null;
    var manualLanguage = language === "pt-pt" ? "pt" : language;
    var url = new URL("../manual/" + version + "/" + encodeURIComponent(manualLanguage) + "/", window.location.href);
    url.searchParams.set("portalLang", language);
    manual.setAttribute("href", url.toString());
    manual.setAttribute("hreflang", language);
    return url.toString();
  }

  function redirectToLocalizedPortal(language) {
    var url = new URL(window.location.href);
    var parts = url.pathname.split("/").filter(Boolean);
    var current = parts.length ? parts[parts.length - 1].toLowerCase() : "";
    if (SUPPORTED_LANGUAGES[current] && current === language) return false;
    if (SUPPORTED_LANGUAGES[current]) parts.pop();
    parts.push(language);
    url.pathname = "/" + parts.join("/") + "/";
    url.searchParams.delete("lang");
    window.location.replace(url.toString());
    return true;
  }

  function publishState(detail) {
    window.SharpLifePortalDevice = detail;
    document.documentElement.setAttribute("lang", detail.language);
    document.documentElement.setAttribute("data-titan-language", detail.language);
    document.documentElement.setAttribute("data-titan-language-source", detail.languageSource);
    document.documentElement.setAttribute("data-titan-country", detail.country);
    document.documentElement.setAttribute("data-titan-brand", detail.brand);
    document.documentElement.setAttribute("data-titan-manual-version", detail.manualVersion);
    window.dispatchEvent(new CustomEvent("sharp-life-portal:device-ready", { detail: detail }));
  }

  async function initialize() {
    if (refreshInProgress) { refreshQueued = true; return; }
    refreshInProgress = true;
    var params = new URLSearchParams(window.location.search);
    var requestedLanguage = params.get("lang");
    var result;
    try {
      result = await readDeviceInfo();
    } catch (error) {
      console.warn("Sharp Life Portal: Titan device information is unavailable.", error);
      result = {
        source: "fallback",
        info: {
          Channel: { brand: "unknown" },
          Product: {
            country: "unknown",
            language: requestedLanguage || document.documentElement.lang || navigator.language || DEFAULT_LANGUAGE,
            platform: "unknown"
          },
          Capability: {}
        }
      };
    }

    var channel = result.info.Channel || {};
    var product = result.info.Product || {};
    var uiLanguage = activeUiLanguage();
    var languageSource = requestedLanguage ? "url.lang" : (uiLanguage ? uiLanguage.source : "titan-sdk.Product.language");
    var language = normalizeLanguage(requestedLanguage || (uiLanguage && uiLanguage.language) || product.language);
    var manualVersion = "titan101";
    var detail = {
      source: result.source,
      language: language,
      languageSource: languageSource,
      sdkLanguage: product.language || null,
      runtimeLanguage: uiLanguage ? uiLanguage.raw : null,
      manualVersion: manualVersion,
      manualUrl: updateInstructionManual(language, manualVersion),
      brand: channel.brand || product.brand || "unknown",
      country: product.country || "unknown",
      platform: product.platform || "unknown"
    };

    publishState(detail);
    console.info("Sharp Life Portal: Titan device settings applied.", detail);
    redirectToLocalizedPortal(language);
    refreshInProgress = false;
    if (refreshQueued) { refreshQueued = false; initialize(); }
  }

  function scheduleRefresh() {
    if (document.visibilityState && document.visibilityState !== "visible") return;
    initialize();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
  document.addEventListener("visibilitychange", scheduleRefresh);
  window.addEventListener("pageshow", scheduleRefresh);
  window.addEventListener("languagechange", scheduleRefresh);
})();
