(function () {
  "use strict";

  var script = document.currentScript;
  var portalRoot = new URL("./", script && script.src ? script.src : window.location.href);
  var releaseVersion = script && script.src ? new URL(script.src).searchParams.get("v") : "";
  var sharpLogoUrl = new URL("assets/sharp_logo.svg", portalRoot).toString();
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
      "html[data-sharp-manual] body, html[data-sharp-manual] button, html[data-sharp-manual] input, html[data-sharp-manual] select, html[data-sharp-manual] textarea { font-family: \"Roboto\", Arial, sans-serif !important; }",
      "html[data-sharp-manual] h1, html[data-sharp-manual] h2, html[data-sharp-manual] h3, html[data-sharp-manual] h4, html[data-sharp-manual] h5, html[data-sharp-manual] h6, html[data-sharp-manual] p, html[data-sharp-manual] li, html[data-sharp-manual] td, html[data-sharp-manual] th, html[data-sharp-manual] label, html[data-sharp-manual] a, html[data-sharp-manual] strong, html[data-sharp-manual] em, html[data-sharp-manual] span:not(.fa):not(.fas):not(.far):not(.fab):not(.zmdi) { font-family: \"Roboto\", Arial, sans-serif !important; }",
      "html[data-sharp-manual] header, html[data-sharp-manual] .header { background: #272d31 !important; color: #fff !important; border-color: #66717a !important; }",
      "html[data-sharp-manual] body, html[data-sharp-manual] #page, html[data-sharp-manual] .site, html[data-sharp-manual] .site-content, html[data-sharp-manual] .content-area, html[data-sharp-manual] .site-main, html[data-sharp-manual] article, html[data-sharp-manual] section, html[data-sharp-manual] .im-content, html[data-sharp-manual] .con-center, html[data-sharp-manual] .container--content, html[data-sharp-manual] .tab-content, html[data-sharp-manual] .tab-pane { background-color: #272d31 !important; color: #fff !important; }",
      "html[data-sharp-manual] h1, html[data-sharp-manual] h2, html[data-sharp-manual] h3, html[data-sharp-manual] h4, html[data-sharp-manual] h5, html[data-sharp-manual] h6, html[data-sharp-manual] p, html[data-sharp-manual] li, html[data-sharp-manual] td, html[data-sharp-manual] th, html[data-sharp-manual] label, html[data-sharp-manual] span, html[data-sharp-manual] i, html[data-sharp-manual] .icon { color: #fff !important; }",
      "html[data-sharp-manual] a { color: #fff !important; }",
      "html[data-sharp-manual] table, html[data-sharp-manual] td, html[data-sharp-manual] th { background-color: #30373c !important; border-color: #66717a !important; }",
      "html[data-sharp-manual] .item-con, html[data-sharp-manual] .childlist-item, html[data-sharp-manual] .nav-tabs a, html[data-sharp-manual] .backlinks { background-color: #343c42 !important; color: #fff !important; border-color: #66717a !important; }",
      "html[data-sharp-manual] header.header { display: flex !important; align-items: center !important; box-sizing: border-box !important; width: 100% !important; min-height: 72px !important; margin: 0 !important; padding: 12px 25px !important; }",
      "html[data-sharp-manual] header.header .model { display: block !important; box-sizing: border-box !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; text-align: left !important; font-size: 30px !important; line-height: 1.2 !important; }",
      "html[data-sharp-manual] header.header .model .sharp-manual-title { display: inline-flex !important; align-items: center !important; gap: 10px !important; float: none !important; margin: 0 !important; padding: 0 !important; }",
      "html[data-sharp-manual] .sharp-manual-logo { display: block !important; flex: 0 0 auto !important; width: auto !important; height: .75em !important; margin: 0 !important; }",
      "html[data-sharp-manual] #backlink { display: none !important; }",
      "html[data-sharp-manual] #home.home-con { position: fixed !important; top: 0 !important; left: 25px !important; right: 25px !important; display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; grid-template-rows: repeat(2, 35vh) !important; grid-auto-rows: 35vh !important; align-content: start !important; gap: 15px !important; box-sizing: border-box !important; width: calc(100% - 50px) !important; max-width: none !important; height: 100vh !important; margin: 0 !important; padding: calc(10vh + 90px) 0 14px !important; }",
      "html[data-sharp-manual] #home.home-con::before, html[data-sharp-manual] #home.home-con::after { display: none !important; content: none !important; }",
      "html[data-sharp-manual] #home.home-con > a.items { position: relative !important; display: block !important; float: none !important; box-sizing: border-box !important; width: auto !important; min-width: 0 !important; height: 35vh !important; margin: 0 !important; padding: 0 !important; border-radius: 5px !important; color: #d1d1d1 !important; text-decoration: none !important; filter: drop-shadow(0 0 14px #0a0a0a); }",
      "html[data-sharp-manual] #home.home-con > a.items .item-con { display: grid !important; grid-template-columns: 1fr !important; grid-template-rows: 1fr auto !important; align-items: stretch !important; justify-items: stretch !important; box-sizing: border-box !important; width: 100% !important; height: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; border: 1px solid #363636 !important; border-radius: 5px !important; background-image: linear-gradient(to right, #253135, #262f34, #282e32, #282c30, #292b2e) !important; color: #d1d1d1 !important; }",
      "html[data-sharp-manual] #home.home-con .icon { display: flex !important; align-items: center !important; justify-content: center !important; width: 100% !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; background-image: linear-gradient(to right bottom, #343c42, #30373c, #293035) !important; color: #d1d1d1 !important; font-size: 165px !important; line-height: 1 !important; text-align: center !important; }",
      "html[data-sharp-manual] #home.home-con .sectitle { display: flex !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important; width: 100% !important; min-height: 82px !important; margin: 0 !important; padding: 16px 20px !important; border-top: 1px solid #394247 !important; background-image: linear-gradient(to right, #253135, #262f34, #282e32, #282c30, #292b2e) !important; color: #d1d1d1 !important; font-size: 24px !important; line-height: 1.2 !important; font-weight: 700 !important; text-align: center !important; }",
      "@media (max-width: 700px) { html[data-sharp-manual] header.header { padding: 12px 25px !important; } html[data-sharp-manual] header.header .model { font-size: 24px !important; } html[data-sharp-manual] #home.home-con { padding-top: calc(10vh + 145px) !important; } html[data-sharp-manual] #home.home-con .icon { font-size: 105px !important; } html[data-sharp-manual] #home.home-con .sectitle { font-size: 16px !important; } }",
      "html[data-sharp-manual] a:focus, html[data-sharp-manual] button:focus, html[data-sharp-manual] [role='button']:focus, html[data-sharp-manual] [tabindex]:focus {",
      "  outline: 4px solid #ec1e3c !important;",
      "  outline-offset: -4px !important;",
      "  background-color: #ec1e3c !important;",
      "  color: #fff !important;",
      "  box-shadow: 0 0 0 4px #ec1e3c, 0 0 18px rgba(236, 30, 60, 0.9) !important;",
      "  transform: scale(1.012);",
      "  transition: transform 120ms ease, box-shadow 120ms ease !important;",
      "}",
      "html[data-sharp-manual] a:focus .item-con, html[data-sharp-manual] [tabindex]:focus .item-con { background-color: #ec1e3c !important; }",
      "html[data-sharp-manual] #home.home-con > a.items:focus { outline: 4px solid #ec1e3c !important; outline-offset: -4px !important; background: transparent !important; box-shadow: 0 0 0 4px #ec1e3c, 0 0 18px rgba(236, 30, 60, .9) !important; transform: scale(1.018) !important; }",
      "html[data-sharp-manual] #home.home-con > a.items:focus .item-con { background-color: transparent !important; }",
      "html[data-sharp-manual] #home.home-con > a.items:focus::after { position: absolute !important; inset: 0 !important; z-index: 5 !important; display: block !important; border-radius: 5px !important; box-shadow: inset 0 0 0 999px rgba(236, 30, 60, .28) !important; content: '' !important; pointer-events: none !important; }",
      "html[data-sharp-manual][data-sharp-tts-state='enabled'] a:focus, html[data-sharp-manual][data-sharp-tts-state='enabled'] button:focus, html[data-sharp-manual][data-sharp-tts-state='enabled'] [role='button']:focus, html[data-sharp-manual][data-sharp-tts-state='enabled'] [tabindex]:focus { outline: 3px solid #baff35 !important; outline-offset: -7px !important; box-shadow: inset 0 0 0 7px #baff35, 0 0 0 4px #ec1e3c, 0 0 18px rgba(236, 30, 60, .9) !important; }",
      "html[data-sharp-manual][data-sharp-tts-state='enabled'] #home.home-con > a.items:focus { outline: 3px solid #baff35 !important; outline-offset: -7px !important; }",
      "html[data-sharp-manual][data-sharp-tts-state='enabled'] #home.home-con > a.items:focus::after { box-shadow: inset 0 0 0 7px #baff35, inset 0 0 0 999px rgba(236, 30, 60, .28) !important; }"
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
      var logo = document.createElement("img");
      logo.className = "sharp-manual-logo";
      logo.src = sharpLogoUrl;
      logo.alt = "Sharp";
      title.appendChild(logo);
      var titleText = document.createElement("span");
      titleText.className = "sharp-manual-title-text";
      titleText.textContent = manualTitle;
      title.appendChild(titleText);
      headerTitle.appendChild(title);
      headerTitle.setAttribute("aria-label", manualTitle);
    }

    var back = document.getElementById("backlink");
    if (back && back.parentNode) back.parentNode.removeChild(back);
  }

  function focusManualDefault() {
    var isManualHome = Boolean(document.querySelector("#home.home-con"));
    var focusTarget = isManualHome
      ? document.querySelector("#home.home-con > a.items")
      : document.querySelector("#sharp-portal-top-controls .sharp-portal-back");
    if (!focusTarget) return;
    focusTarget.setAttribute("tabindex", "0");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        try { focusTarget.focus({ preventScroll: true }); }
        catch (error) { focusTarget.focus(); }
      });
    });
  }

  function loadAccessibility() {
    var loaded = false;
    function addAccessibility() {
      if (loaded) return;
      loaded = true;
      var accessibility = document.createElement("script");
      var accessibilityUrl = new URL("portal-accessibility.js", portalRoot);
      if (releaseVersion) accessibilityUrl.searchParams.set("v", releaseVersion);
      accessibility.src = accessibilityUrl.toString();
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
    focusManualDefault();
    window.addEventListener("load", function () {
      applyManualChrome();
      focusManualDefault();
    }, { once: true });
    loadAccessibility();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
