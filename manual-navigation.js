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
  var portalLanguage = new URLSearchParams(window.location.search).get("portalLang") || language;
  portalLanguage = String(portalLanguage).toLowerCase().replace(/_/g, "-");
  if (portalLanguage !== "pt-pt") portalLanguage = portalLanguage.split("-")[0];

  var BACK_LABELS = {
    bg: "Назад", ca: "Enrere", cs: "Zpět", da: "Tilbage", de: "Zurück",
    el: "Πίσω", en: "Back", es: "Atrás", et: "Tagasi", fi: "Takaisin",
    fr: "Retour", hr: "Natrag", hu: "Vissza", it: "Indietro", lt: "Atgal",
    lv: "Atpakaļ", nl: "Terug", no: "Tilbake", pl: "Wstecz", pt: "Voltar",
    ro: "Înapoi", ru: "Назад", sk: "Späť", sl: "Nazaj", sr: "Nazad",
    sv: "Tillbaka", uk: "Назад"
  };

  window.SharpLifePortalBackTarget = new URL(portalLanguage + "/?lang=" + encodeURIComponent(portalLanguage), portalRoot).toString();
  document.documentElement.setAttribute("data-sharp-manual", "true");
  document.documentElement.setAttribute("lang", language);

  function localManualUrl(remoteUrl) {
    var url;
    try { url = new URL(remoteUrl, sourceUrl || window.location.href); } catch (error) { return null; }
    if (url.hostname !== "data.umc-poland.com") return null;

    if (/^\/im\/titan101\/?$/i.test(url.pathname)) {
      var targetLanguage = String(url.searchParams.get("lang") || language).toLowerCase();
      if (targetLanguage === "pt-pt") targetLanguage = "pt";
      var manualHome = new URL("manual/titan101/" + encodeURIComponent(targetLanguage) + "/", portalRoot);
      manualHome.searchParams.set("portalLang", portalLanguage);
      return manualHome.toString();
    }

    if (url.pathname.indexOf("/android-com/") === 0) {
      var pathname = url.pathname.replace(/^\/+/, "");
      if (pathname.charAt(pathname.length - 1) !== "/") pathname += "/";
      var manualPage = new URL("manual/pages/" + pathname, portalRoot);
      manualPage.searchParams.set("portalLang", portalLanguage);
      return manualPage.toString();
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
      "html[data-sharp-manual], html[data-sharp-manual] body { background: #272d31 !important; color: #fff !important; color-scheme: dark; }",
      "html[data-sharp-manual] header, html[data-sharp-manual] .header { background: #272d31 !important; color: #fff !important; border-color: #66717a !important; }",
      "html[data-sharp-manual] body, html[data-sharp-manual] #page, html[data-sharp-manual] .site, html[data-sharp-manual] .site-content, html[data-sharp-manual] .content-area, html[data-sharp-manual] .site-main, html[data-sharp-manual] article, html[data-sharp-manual] section, html[data-sharp-manual] .im-content, html[data-sharp-manual] .con-center, html[data-sharp-manual] .container--content, html[data-sharp-manual] .tab-content, html[data-sharp-manual] .tab-pane { background-color: #272d31 !important; color: #fff !important; }",
      "html[data-sharp-manual] h1, html[data-sharp-manual] h2, html[data-sharp-manual] h3, html[data-sharp-manual] h4, html[data-sharp-manual] h5, html[data-sharp-manual] h6, html[data-sharp-manual] p, html[data-sharp-manual] li, html[data-sharp-manual] td, html[data-sharp-manual] th, html[data-sharp-manual] label, html[data-sharp-manual] span { color: #fff !important; }",
      "html[data-sharp-manual] a { color: #fff !important; }",
      "html[data-sharp-manual] table, html[data-sharp-manual] td, html[data-sharp-manual] th { background-color: #30373c !important; border-color: #66717a !important; }",
      "html[data-sharp-manual] .childlist-item, html[data-sharp-manual] .nav-tabs a, html[data-sharp-manual] .backlinks { background-color: #343c42 !important; color: #fff !important; border-color: #66717a !important; }",
      "html[data-sharp-manual] #backlink { display: inline-flex !important; align-items: center; gap: 10px; min-width: 150px; padding: 12px 18px !important; font-weight: 700 !important; }",
      "html[data-sharp-manual] a:focus, html[data-sharp-manual] button:focus, html[data-sharp-manual] [role='button']:focus, html[data-sharp-manual] [tabindex]:focus {",
      "  outline: 3px solid #baff35 !important;",
      "  outline-offset: -7px !important;",
      "  background-color: #f7309d !important;",
      "  color: #fff !important;",
      "  box-shadow: inset 0 0 0 7px #baff35, 0 0 0 4px #f7309d, 0 0 18px rgba(247, 48, 157, 0.9) !important;",
      "  transform: scale(1.012);",
      "  transition: transform 120ms ease, box-shadow 120ms ease !important;",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function applyBackButton() {
    var back = document.getElementById("backlink");
    if (!back) {
      var host = document.querySelector(".con-center") ||
        document.querySelector(".site-content") ||
        document.querySelector("main") ||
        document.body;
      back = document.createElement("a");
      back.id = "backlink";
      back.className = "sharp-portal-back";
      host.insertBefore(back, host.firstChild);
    }
    var label = BACK_LABELS[language] || BACK_LABELS.en;
    var icon = back.querySelector("i");
    back.textContent = "";
    if (icon) back.appendChild(icon);
    back.appendChild(document.createTextNode((icon ? " " : "") + label));
    back.setAttribute("href", window.SharpLifePortalBackTarget);
    back.setAttribute("aria-label", label);
  }

  function handleManualBackClick(event) {
    var target = event.target;
    while (target && target !== document && target.id !== "backlink") target = target.parentNode;
    if (!target || target.id !== "backlink") return;
    event.preventDefault();
    window.location.assign(window.SharpLifePortalBackTarget);
  }

  function keepBackButtonConnected() {
    if (!window.MutationObserver || !document.body) return;
    var scheduled = false;
    var observer = new window.MutationObserver(function () {
      if (scheduled) return;
      var back = document.getElementById("backlink");
      var label = BACK_LABELS[language] || BACK_LABELS.en;
      if (back && back.textContent.trim() === label && back.href === window.SharpLifePortalBackTarget) return;
      scheduled = true;
      window.setTimeout(function () {
        scheduled = false;
        applyBackButton();
      }, 0);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
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
    applyBackButton();
    document.addEventListener("click", handleManualBackClick, true);
    window.addEventListener("load", applyBackButton, { once: true });
    window.addEventListener("load", keepBackButtonConnected, { once: true });
    loadAccessibility();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
