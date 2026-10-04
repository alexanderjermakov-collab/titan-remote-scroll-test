(function () {
  "use strict";

  var DEFAULT_LANGUAGE = "en";
  var LIVE_PORTAL_HOST = "data.umc-poland.com";
  var MANUAL_ROOT = "https://data.umc-poland.com/im/";
  var SUPPORTED_LANGUAGES = {
    bg: true, ca: true, cs: true, da: true, de: true, el: true, en: true,
    es: true, et: true, fi: true, fr: true, hr: true, hu: true, it: true,
    lt: true, lv: true, nl: true, no: true, pl: true, pt: true, "pt-pt": true,
    ro: true, ru: true, sk: true, sl: true, sr: true, sv: true, uk: true
  };

  function normalizeLanguage(value) {
    var raw = String(value || "").trim().toLowerCase().replace(/_/g, "-");
    var aliases = { cz: "cs", dk: "da", gr: "el", nb: "no", nn: "no", ua: "uk" };

    if (aliases[raw]) raw = aliases[raw];
    if (raw.indexOf("pt-pt") === 0) return "pt-pt";
    if (raw.indexOf("pt-") === 0) return "pt";

    var base = raw.split("-")[0];
    if (aliases[base]) base = aliases[base];
    return SUPPORTED_LANGUAGES[base] ? base : DEFAULT_LANGUAGE;
  }

  function testOverrides() {
    // Local-only test hook. It is ignored on the production host.
    if (window.location.hostname === LIVE_PORTAL_HOST) return null;
    var params = new URLSearchParams(window.location.search);
    if (!params.has("titan_test_language") && !params.has("titan_test_uhd")) return null;
    return {
      Product: {
        brand: "Sharp",
        country: params.get("titan_test_country") || "DE",
        language: params.get("titan_test_language") || DEFAULT_LANGUAGE,
        platform: params.get("titan_test_platform") || "Sharp Titan test"
      },
      Capability: {
        supportUHD: params.get("titan_test_uhd") !== "false",
        supportFHD: true
      }
    };
  }

  async function readDeviceInfo() {
    var override = testOverrides();
    if (override) return { info: override, source: "local-test" };

    if (!window.TitanSDK || !window.TitanSDK.deviceInfo) {
      throw new Error("TitanSDK is not available");
    }

    return {
      info: await window.TitanSDK.deviceInfo.getDeviceInfo(),
      source: "titan-sdk"
    };
  }

  function chooseManualVersion(info) {
    var capability = (info && info.Capability) || {};
    var product = (info && info.Product) || {};
    var platform = String(product.platform || "");

    if (capability.supportUHD === true) return "titan1";
    if (capability.supportUHD === false && capability.supportFHD === true) return "titan2";
    if (/(^|[^a-z0-9])(2k|fhd|hd)([^a-z0-9]|$)/i.test(platform)) return "titan2";

    // Keep the established 4K route when the device cannot report a resolution.
    return "titan1";
  }

  function updateInstructionManual(language, version) {
    var manual = document.getElementById("instructionmanual");
    if (!manual) return null;
    var url = MANUAL_ROOT + version + "/?lang=" + encodeURIComponent(language);
    manual.setAttribute("href", url);
    manual.setAttribute("hreflang", language);
    return url;
  }

  function redirectToLocalizedPortal(language) {
    if (window.location.hostname !== LIVE_PORTAL_HOST) return false;

    var url = new URL(window.location.href);
    var current = normalizeLanguage(url.searchParams.get("lang") || document.documentElement.lang);
    if (current === language && url.searchParams.get("lang") === language) return false;

    url.searchParams.set("lang", language);
    window.location.replace(url.toString());
    return true;
  }

  function publishState(detail) {
    window.SharpLifePortalDevice = detail;
    document.documentElement.setAttribute("lang", detail.language);
    document.documentElement.setAttribute("data-titan-language", detail.language);
    document.documentElement.setAttribute("data-titan-manual-version", detail.manualVersion);
    window.dispatchEvent(new CustomEvent("sharp-life-portal:device-ready", { detail: detail }));
  }

  async function initialize() {
    var result;
    try {
      result = await readDeviceInfo();
    } catch (error) {
      console.warn("Sharp Life Portal: Titan device information is unavailable.", error);
      result = {
        source: "fallback",
        info: {
          Product: {
            brand: "unknown",
            country: "unknown",
            language: new URLSearchParams(window.location.search).get("lang") || DEFAULT_LANGUAGE,
            platform: "unknown"
          },
          Capability: {}
        }
      };
    }

    var product = result.info.Product || {};
    var language = normalizeLanguage(product.language);
    var manualVersion = chooseManualVersion(result.info);
    var manualUrl = updateInstructionManual(language, manualVersion);
    var detail = {
      source: result.source,
      language: language,
      manualVersion: manualVersion,
      manualUrl: manualUrl,
      brand: product.brand || "unknown",
      country: product.country || "unknown",
      platform: product.platform || "unknown"
    };

    publishState(detail);
    console.info("Sharp Life Portal: Titan device settings applied.", detail);
    redirectToLocalizedPortal(language);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
