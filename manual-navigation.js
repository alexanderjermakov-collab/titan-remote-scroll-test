(function () {
  "use strict";

  var script = document.currentScript;
  var portalRoot = new URL("./", script && script.src ? script.src : window.location.href);
  var sourceMeta = document.querySelector('meta[name="sharp-manual-source"]');
  var sourceUrl = sourceMeta ? sourceMeta.getAttribute("content") : "";
  var source = sourceUrl ? new URL(sourceUrl) : null;
  var language = source && source.searchParams.get("lang") || document.documentElement.lang || "en";
  language = String(language).toLowerCase().split("-")[0];
  if (language === "pt-pt") language = "pt";

  window.SharpLifePortalBackTarget = new URL(language + "/?lang=" + encodeURIComponent(language), portalRoot).toString();
  document.documentElement.setAttribute("data-sharp-manual", "true");
  document.documentElement.setAttribute("lang", language);

  function localManualUrl(remoteUrl) {
    var url;
    try { url = new URL(remoteUrl, sourceUrl || window.location.href); } catch (error) { return null; }
    if (url.hostname !== "data.umc-poland.com") return null;

    if (/^\/im\/titan101\/?$/i.test(url.pathname)) {
      var targetLanguage = String(url.searchParams.get("lang") || language).toLowerCase();
      if (targetLanguage === "pt-pt") targetLanguage = "pt";
      return new URL("manual/titan101/" + encodeURIComponent(targetLanguage) + "/", portalRoot).toString();
    }

    if (url.pathname.indexOf("/android-com/") === 0) {
      var pathname = url.pathname.replace(/^\/+/, "");
      if (pathname.charAt(pathname.length - 1) !== "/") pathname += "/";
      return new URL("manual/pages/" + pathname, portalRoot).toString();
    }
    return null;
  }

  function rewriteLinks() {
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i += 1) {
      var local = localManualUrl(links[i].getAttribute("href"));
      if (local) links[i].setAttribute("href", local);
    }
  }

  function addFocusStyle() {
    var style = document.createElement("style");
    style.textContent = [
      "a:focus, button:focus, [role='button']:focus, [tabindex]:focus {",
      "  outline: 5px solid #ffd400 !important;",
      "  outline-offset: 4px !important;",
      "  box-shadow: 0 0 0 3px #111 !important;",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function loadAccessibility() {
    var loaded = false;
    function addAccessibility() {
      if (loaded) return;
      loaded = true;
      var accessibility = document.createElement("script");
      accessibility.src = new URL("portal-accessibility.js", portalRoot).toString();
      accessibility.defer = true;
      document.head.appendChild(accessibility);
    }

    if (window.TitanSDK) {
      addAccessibility();
      return;
    }

    var sdk = document.createElement("script");
    sdk.src = "https://sdk.titanos.tv/sdk/sdk.js";
    sdk.onload = addAccessibility;
    sdk.onerror = addAccessibility;
    document.head.appendChild(sdk);
    window.setTimeout(addAccessibility, 2500);
  }

  function initialize() {
    rewriteLinks();
    addFocusStyle();
    loadAccessibility();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
