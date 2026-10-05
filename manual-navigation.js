(function () {
  "use strict";

  var script = document.currentScript;
  var portalRoot = new URL("./", script && script.src ? script.src : window.location.href);
  var sourceMeta = document.querySelector('meta[name="sharp-manual-source"]');
  var sourceUrl = sourceMeta ? sourceMeta.getAttribute("content") : "";
  var source = sourceUrl ? new URL(sourceUrl) : null;
  var language = source && source.searchParams.get("lang") || document.documentElement.lang || "en";
  language = String(language).toLowerCase().replace(/_/g, "-");
  if (language === "pt-pt") language = "pt";
  else language = language.split("-")[0];
  var portalLanguage = new URLSearchParams(window.location.search).get("portalLang") || language;
  portalLanguage = String(portalLanguage).toLowerCase().replace(/_/g, "-");
  if (portalLanguage !== "pt-pt") portalLanguage = portalLanguage.split("-")[0];

  var MANUAL_TITLE_LABELS = {
    bg: "Ръководство за експлоатация", ca: "Manual d'instruccions", cs: "Návod k použití",
    da: "Brugervejledning", de: "Bedienungsanleitung", el: "Εγχειρίδιο οδηγιών",
    en: "Instruction Manual", es: "Manual de instrucciones", et: "Kasutusjuhend",
    fi: "Käyttöopas", fr: "Manuel d'instructions", hr: "Priručnik s uputama",
    hu: "Használati utasítás", it: "Manuale di istruzioni", lt: "Naudojimo instrukcija",
    lv: "Lietošanas instrukcija", nl: "Gebruikshandleiding", no: "Brukerhåndbok",
    pl: "Instrukcja obsługi", pt: "Manual de instruções", ro: "Manual de instrucțiuni",
    ru: "Инструкция по эксплуатации", sk: "Návod na použitie", sl: "Navodila za uporabo",
    sr: "Uputstvo za upotrebu", sv: "Bruksanvisning", uk: "Керівництво з експлуатації"
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
      "html[data-sharp-manual] h1, html[data-sharp-manual] h2, html[data-sharp-manual] h3, html[data-sharp-manual] h4, html[data-sharp-manual] h5, html[data-sharp-manual] h6, html[data-sharp-manual] p, html[data-sharp-manual] li, html[data-sharp-manual] td, html[data-sharp-manual] th, html[data-sharp-manual] label, html[data-sharp-manual] span, html[data-sharp-manual] i, html[data-sharp-manual] .icon { color: #fff !important; }",
      "html[data-sharp-manual] a { color: #fff !important; }",
      "html[data-sharp-manual] table, html[data-sharp-manual] td, html[data-sharp-manual] th { background-color: #30373c !important; border-color: #66717a !important; }",
      "html[data-sharp-manual] .item-con, html[data-sharp-manual] .childlist-item, html[data-sharp-manual] .nav-tabs a, html[data-sharp-manual] .backlinks { background-color: #343c42 !important; color: #fff !important; border-color: #66717a !important; }",
      "html[data-sharp-manual] header.header { display: flex !important; align-items: center !important; box-sizing: border-box !important; width: 100% !important; min-height: 72px !important; margin: 0 !important; padding: 12px 28px !important; }",
      "html[data-sharp-manual] header.header .model { display: block !important; box-sizing: border-box !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; text-align: left !important; font-size: 30px !important; line-height: 1.2 !important; }",
      "html[data-sharp-manual] header.header .model .sharp-manual-title { display: inline-flex !important; align-items: center !important; gap: 10px !important; float: none !important; margin: 0 !important; padding: 0 !important; }",
      "html[data-sharp-manual] #backlink { display: none !important; }",
      "html[data-sharp-manual] #home.home-con { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 14px !important; box-sizing: border-box !important; width: calc(100% - 32px) !important; max-width: none !important; margin: 0 auto !important; padding: 18px 0 36px !important; }",
      "html[data-sharp-manual] #home.home-con::before, html[data-sharp-manual] #home.home-con::after { display: none !important; content: none !important; }",
      "html[data-sharp-manual] #home.home-con > a.items { display: block !important; float: none !important; box-sizing: border-box !important; width: auto !important; min-width: 0 !important; height: 210px !important; margin: 0 !important; padding: 0 !important; }",
      "html[data-sharp-manual] #home.home-con > a.items .item-con { display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; width: 100% !important; height: 100% !important; min-height: 210px !important; margin: 0 !important; padding: 22px !important; border: 1px solid #66717a !important; }",
      "html[data-sharp-manual] #home.home-con .icon { margin: 0 0 18px !important; font-size: 66px !important; line-height: 1 !important; text-align: center !important; }",
      "html[data-sharp-manual] #home.home-con .sectitle { margin: 0 !important; padding: 0 !important; font-size: 24px !important; line-height: 1.2 !important; text-align: center !important; }",
      "@media (max-width: 900px) { html[data-sharp-manual] #home.home-con { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }",
      "@media (max-width: 560px) { html[data-sharp-manual] header.header { padding: 12px 18px !important; } html[data-sharp-manual] header.header .model { font-size: 24px !important; } html[data-sharp-manual] #home.home-con { grid-template-columns: 1fr !important; width: calc(100% - 24px) !important; } }",
      "html[data-sharp-manual] a:focus, html[data-sharp-manual] button:focus, html[data-sharp-manual] [role='button']:focus, html[data-sharp-manual] [tabindex]:focus {",
      "  outline: 3px solid #baff35 !important;",
      "  outline-offset: -7px !important;",
      "  background-color: #f7309d !important;",
      "  color: #fff !important;",
      "  box-shadow: inset 0 0 0 7px #baff35, 0 0 0 4px #f7309d, 0 0 18px rgba(247, 48, 157, 0.9) !important;",
      "  transform: scale(1.012);",
      "  transition: transform 120ms ease, box-shadow 120ms ease !important;",
      "}",
      "html[data-sharp-manual] a:focus .item-con, html[data-sharp-manual] [tabindex]:focus .item-con { background-color: #f7309d !important; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  function applyManualChrome() {
    var manualTitle = MANUAL_TITLE_LABELS[language] || MANUAL_TITLE_LABELS.en;
    var headerTitle = document.querySelector("header.header .model");
    if (headerTitle) {
      headerTitle.textContent = "";
      var title = document.createElement("strong");
      title.className = "sharp-manual-title";
      var icon = document.createElement("i");
      icon.className = "fas fa-book";
      icon.setAttribute("aria-hidden", "true");
      title.appendChild(icon);
      title.appendChild(document.createTextNode(manualTitle));
      headerTitle.appendChild(title);
      headerTitle.setAttribute("aria-label", manualTitle);
    }

    var back = document.getElementById("backlink");
    if (back && back.parentNode) back.parentNode.removeChild(back);
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
    applyManualChrome();
    window.addEventListener("load", applyManualChrome, { once: true });
    loadAccessibility();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
