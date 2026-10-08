(function () {
  "use strict";

  var DEFAULT_LINE_SCROLL_STEP = 40;
  var SMOOTH_SCROLL = "smooth";
  var RELEASE_VERSION = "8.0.9";
  var RELEASE_DATE = "2026-10-08";
  var navigationScript = document.currentScript;
  var portalRoot = new URL("./", navigationScript && navigationScript.src ? navigationScript.src : window.location.href);
  var backIconUrl = new URL("assets/back-arrow.svg", portalRoot).toString();
  var sharpLogoUrl = new URL("assets/sharp_logo.svg", portalRoot).toString();
  var FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "select:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "[role='button']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  var EXIT_COPY = {
    bg: ["Да затворите ли Sharp Life Portal?", "Отказ", "Затвори"],
    ca: ["Voleu tancar Sharp Life Portal?", "Cancel·la", "Tanca"],
    cs: ["Chcete zavřít Sharp Life Portal?", "Zrušit", "Zavřít"],
    da: ["Vil du lukke Sharp Life Portal?", "Annuller", "Luk"],
    de: ["Möchten Sie Sharp Life Portal schließen?", "Abbrechen", "Schließen"],
    el: ["Θέλετε να κλείσετε το Sharp Life Portal;", "Ακύρωση", "Κλείσιμο"],
    en: ["Close Sharp Life Portal?", "Cancel", "Close"],
    es: ["¿Desea cerrar Sharp Life Portal?", "Cancelar", "Cerrar"],
    et: ["Kas sulgeda Sharp Life Portal?", "Loobu", "Sulge"],
    fi: ["Suljetaanko Sharp Life Portal?", "Peruuta", "Sulje"],
    fr: ["Fermer Sharp Life Portal ?", "Annuler", "Fermer"],
    hr: ["Želite li zatvoriti Sharp Life Portal?", "Odustani", "Zatvori"],
    hu: ["Bezárja a Sharp Life Portalt?", "Mégse", "Bezárás"],
    it: ["Chiudere Sharp Life Portal?", "Annulla", "Chiudi"],
    lt: ["Uždaryti „Sharp Life Portal“?", "Atšaukti", "Uždaryti"],
    lv: ["Vai aizvērt Sharp Life Portal?", "Atcelt", "Aizvērt"],
    nl: ["Sharp Life Portal sluiten?", "Annuleren", "Sluiten"],
    no: ["Vil du lukke Sharp Life Portal?", "Avbryt", "Lukk"],
    pl: ["Zamknąć Sharp Life Portal?", "Anuluj", "Zamknij"],
    pt: ["Fechar o Sharp Life Portal?", "Cancelar", "Fechar"],
    "pt-pt": ["Fechar o Sharp Life Portal?", "Cancelar", "Fechar"],
    ro: ["Închideți Sharp Life Portal?", "Anulați", "Închideți"],
    ru: ["Закрыть Sharp Life Portal?", "Отмена", "Закрыть"],
    sk: ["Zavrieť Sharp Life Portal?", "Zrušiť", "Zavrieť"],
    sl: ["Želite zapreti Sharp Life Portal?", "Prekliči", "Zapri"],
    sr: ["Želite li da zatvorite Sharp Life Portal?", "Otkaži", "Zatvori"],
    sv: ["Vill du stänga Sharp Life Portal?", "Avbryt", "Stäng"],
    uk: ["Закрити Sharp Life Portal?", "Скасувати", "Закрити"]
  };
  var ABOUT_COPY = {
    bg: ["Относно", "Номер на версията", "Дата на издаване", "Собственик", "Всички права запазени.", "Назад"],
    ca: ["Quant a", "Número de versió", "Data de llançament", "Propietari", "Tots els drets reservats.", "Enrere"],
    cs: ["O aplikaci", "Číslo verze", "Datum vydání", "Vlastník", "Všechna práva vyhrazena.", "Zpět"],
    da: ["Om", "Versionsnummer", "Udgivelsesdato", "Ejer", "Alle rettigheder forbeholdes.", "Tilbage"],
    de: ["Über", "Versionsnummer", "Veröffentlichungsdatum", "Eigentümer", "Alle Rechte vorbehalten.", "Zurück"],
    el: ["Σχετικά", "Αριθμός έκδοσης", "Ημερομηνία κυκλοφορίας", "Κάτοχος", "Με την επιφύλαξη παντός δικαιώματος.", "Πίσω"],
    en: ["About", "Version number", "Release date", "Owner", "All rights reserved.", "Back"],
    es: ["Acerca de", "Número de versión", "Fecha de lanzamiento", "Propietario", "Todos los derechos reservados.", "Atrás"],
    et: ["Teave", "Versiooni number", "Väljalaskekuupäev", "Omanik", "Kõik õigused kaitstud.", "Tagasi"],
    fi: ["Tietoja", "Versionumero", "Julkaisupäivä", "Omistaja", "Kaikki oikeudet pidätetään.", "Takaisin"],
    fr: ["À propos", "Numéro de version", "Date de publication", "Propriétaire", "Tous droits réservés.", "Retour"],
    hr: ["O portalu", "Broj verzije", "Datum izdanja", "Vlasnik", "Sva prava pridržana.", "Natrag"],
    hu: ["Névjegy", "Verziószám", "Kiadás dátuma", "Tulajdonos", "Minden jog fenntartva.", "Vissza"],
    it: ["Informazioni", "Numero di versione", "Data di rilascio", "Proprietario", "Tutti i diritti riservati.", "Indietro"],
    lt: ["Apie", "Versijos numeris", "Išleidimo data", "Savininkas", "Visos teisės saugomos.", "Atgal"],
    lv: ["Par", "Versijas numurs", "Izdošanas datums", "Īpašnieks", "Visas tiesības aizsargātas.", "Atpakaļ"],
    nl: ["Over", "Versienummer", "Releasedatum", "Eigenaar", "Alle rechten voorbehouden.", "Terug"],
    no: ["Om", "Versjonsnummer", "Utgivelsesdato", "Eier", "Alle rettigheter reservert.", "Tilbake"],
    pl: ["Informacje", "Numer wersji", "Data wydania", "Właściciel", "Wszelkie prawa zastrzeżone.", "Wstecz"],
    pt: ["Sobre", "Número da versão", "Data de lançamento", "Proprietário", "Todos os direitos reservados.", "Voltar"],
    "pt-pt": ["Sobre", "Número da versão", "Data de lançamento", "Proprietário", "Todos os direitos reservados.", "Voltar"],
    ro: ["Despre", "Numărul versiunii", "Data lansării", "Proprietar", "Toate drepturile rezervate.", "Înapoi"],
    ru: ["О портале", "Номер версии", "Дата выпуска", "Владелец", "Все права защищены.", "Назад"],
    sk: ["Informácie", "Číslo verzie", "Dátum vydania", "Vlastník", "Všetky práva vyhradené.", "Späť"],
    sl: ["O portalu", "Številka različice", "Datum izdaje", "Lastnik", "Vse pravice pridržane.", "Nazaj"],
    sr: ["O portalu", "Broj verzije", "Datum izdanja", "Vlasnik", "Sva prava zadržana.", "Nazad"],
    sv: ["Om", "Versionsnummer", "Utgivningsdatum", "Ägare", "Alla rättigheter förbehållna.", "Tillbaka"],
    uk: ["Про портал", "Номер версії", "Дата випуску", "Власник", "Усі права захищено.", "Назад"]
  };
  var ABOUT_RUNTIME_COPY = {
    bg: ["Език", "Държава", "Синтез на реч", "Скорост на речта", "Сила на звука", "Увеличаване на текста", "Вкл.", "Изкл.", "Няма данни"],
    ca: ["Idioma", "País", "Text a veu", "Velocitat de parla", "Volum de veu", "Ampliació de text", "Activat", "Desactivat", "No disponible"],
    cs: ["Jazyk", "Země", "Převod textu na řeč", "Rychlost řeči", "Hlasitost řeči", "Zvětšení textu", "Zapnuto", "Vypnuto", "Není k dispozici"],
    da: ["Sprog", "Land", "Tekst-til-tale", "Talehastighed", "Talelydstyrke", "Tekstforstørrelse", "Til", "Fra", "Ikke tilgængelig"],
    de: ["Sprache", "Land", "Sprachausgabe", "Sprechgeschwindigkeit", "Sprachlautstärke", "Textvergrößerung", "Ein", "Aus", "Nicht verfügbar"],
    el: ["Γλώσσα", "Χώρα", "Μετατροπή κειμένου σε ομιλία", "Ταχύτητα ομιλίας", "Ένταση ομιλίας", "Μεγέθυνση κειμένου", "Ενεργό", "Ανενεργό", "Μη διαθέσιμο"],
    en: ["Language", "Country", "Text To Speech", "Speech Rate", "Speech volume", "Text Magnification", "On", "Off", "Unavailable"],
    es: ["Idioma", "País", "Texto a voz", "Velocidad de voz", "Volumen de voz", "Ampliación de texto", "Activado", "Desactivado", "No disponible"],
    et: ["Keel", "Riik", "Kõnesüntees", "Kõne kiirus", "Kõne helitugevus", "Teksti suurendus", "Sees", "Väljas", "Pole saadaval"],
    fi: ["Kieli", "Maa", "Tekstistä puheeksi", "Puheen nopeus", "Puheen äänenvoimakkuus", "Tekstin suurennus", "Päällä", "Pois", "Ei saatavilla"],
    fr: ["Langue", "Pays", "Synthèse vocale", "Vitesse de parole", "Volume de la voix", "Agrandissement du texte", "Activé", "Désactivé", "Indisponible"],
    hr: ["Jezik", "Država", "Pretvaranje teksta u govor", "Brzina govora", "Glasnoća govora", "Povećanje teksta", "Uključeno", "Isključeno", "Nije dostupno"],
    hu: ["Nyelv", "Ország", "Szövegfelolvasás", "Beszédsebesség", "Beszéd hangereje", "Szövegnagyítás", "Be", "Ki", "Nem érhető el"],
    it: ["Lingua", "Paese", "Sintesi vocale", "Velocità voce", "Volume voce", "Ingrandimento testo", "Attivo", "Disattivo", "Non disponibile"],
    lt: ["Kalba", "Šalis", "Teksto vertimas į kalbą", "Kalbėjimo greitis", "Kalbos garsumas", "Teksto didinimas", "Įjungta", "Išjungta", "Nepasiekiama"],
    lv: ["Valoda", "Valsts", "Teksta pārvēršana runā", "Runas ātrums", "Runas skaļums", "Teksta palielināšana", "Ieslēgts", "Izslēgts", "Nav pieejams"],
    nl: ["Taal", "Land", "Tekst-naar-spraak", "Spraaksnelheid", "Spraakvolume", "Tekstvergroting", "Aan", "Uit", "Niet beschikbaar"],
    no: ["Språk", "Land", "Tekst-til-tale", "Talehastighet", "Talevolum", "Tekstforstørrelse", "På", "Av", "Ikke tilgjengelig"],
    pl: ["Język", "Kraj", "Synteza mowy", "Szybkość mowy", "Głośność mowy", "Powiększenie tekstu", "Wł.", "Wył.", "Niedostępne"],
    pt: ["Idioma", "País", "Conversão de texto em voz", "Velocidade da fala", "Volume da fala", "Ampliação do texto", "Ligado", "Desligado", "Indisponível"],
    "pt-pt": ["Idioma", "País", "Conversão de texto em voz", "Velocidade da fala", "Volume da fala", "Ampliação do texto", "Ligado", "Desligado", "Indisponível"],
    ro: ["Limbă", "Țară", "Text în vorbire", "Viteza vorbirii", "Volumul vorbirii", "Mărirea textului", "Pornit", "Oprit", "Indisponibil"],
    ru: ["Язык", "Страна", "Синтез речи", "Скорость речи", "Громкость речи", "Увеличение текста", "Вкл.", "Выкл.", "Недоступно"],
    sk: ["Jazyk", "Krajina", "Prevod textu na reč", "Rýchlosť reči", "Hlasitosť reči", "Zväčšenie textu", "Zapnuté", "Vypnuté", "Nedostupné"],
    sl: ["Jezik", "Država", "Pretvorba besedila v govor", "Hitrost govora", "Glasnost govora", "Povečava besedila", "Vklopljeno", "Izklopljeno", "Ni na voljo"],
    sr: ["Језик", "Земља", "Претварање текста у говор", "Брзина говора", "Јачина говора", "Увећање текста", "Укључено", "Искључено", "Није доступно"],
    sv: ["Språk", "Land", "Text-till-tal", "Talhastighet", "Talvolym", "Textförstoring", "På", "Av", "Inte tillgängligt"],
    uk: ["Мова", "Країна", "Синтез мовлення", "Швидкість мовлення", "Гучність мовлення", "Збільшення тексту", "Увімк.", "Вимк.", "Недоступно"]
  };
  var focusBeforeExitDialog = null;
  var focusBeforeAboutDialog = null;

  function normalizedLanguage() {
    var value = String(document.documentElement.lang || "en").toLowerCase().replace(/_/g, "-");
    if (EXIT_COPY[value]) return value;
    value = value.split("-")[0];
    return EXIT_COPY[value] ? value : "en";
  }

  function addPortalUiStyles() {
    if (document.getElementById("sharp-portal-ui-style")) return;
    var style = document.createElement("style");
    style.id = "sharp-portal-ui-style";
    style.textContent = [
      "html:not([data-sharp-manual]) .homepage-large #instructionmanual h3,",
      "html:not([data-sharp-manual]) .homepage-large #lifeapp h2,",
      "html:not([data-sharp-manual]) .homepage-large #some h2 {",
      "  font-size: 1.28em !important;",
      "  line-height: 1.12 !important;",
      "  font-weight: 700 !important;",
      "  margin: 0 !important;",
      "}",
      "html:not([data-sharp-manual]) .homepage-large #lifeapp h3 { display: none !important; }",
      "html:not([data-sharp-manual]) .homepage-large #lifeapp > p.btn-link, html:not([data-sharp-manual]) .homepage-large #some > p.btn-link { font-size: .88em !important; }",
      "html:not([data-sharp-manual]) .homepage-large .logo-con .app-name { font-size: 30px !important; line-height: 1.2 !important; }",
      "html:not([data-sharp-manual]) .homepage-large .logo-con > img { width: auto !important; height: 22.5px !important; max-width: none !important; }",
      "#sharp-portal-top-controls { position: fixed; top: 14px; right: 18px; z-index: 2147483645; display: flex; align-items: center; gap: 12px; font-family: Roboto, Arial, sans-serif; }",
      "#sharp-portal-top-controls button, #sharp-portal-about .sharp-about-back { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; height: 44px; min-height: 44px; border: 2px solid #69727a; border-radius: 11px; background: rgba(20, 23, 26, .94); color: #d1d1d1; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.4); }",
      "#sharp-portal-top-controls button { padding: 5px 14px; font-family: Roboto, sans-serif; font-size: 16px; line-height: 1; font-weight: bold; }",
      "#sharp-portal-top-controls .sharp-portal-back { width: 44px; padding: 4px; }",
      "#sharp-portal-top-controls .sharp-portal-back img, #sharp-portal-about .sharp-about-back img { display: block; width: 34px; height: 34px; }",
      "html.sharp-modal-active #sharp-portal-top-controls, html.sharp-about-active #sharp-portal-top-controls { display: none !important; }",
      "html[data-sharp-manual] header.header .model { padding-right: 84px !important; }",
      "#modal.modal-on .close { display: inline-flex !important; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 11px; background: #111 !important; }",
      "#modal.modal-on .close .xlogo { width: 34px !important; height: 34px !important; }",
      "#sharp-portal-about { position: fixed; inset: 0; z-index: 2147483646; display: none; align-items: center; justify-content: center; background: rgba(0, 0, 0, .76); font-family: Roboto, Arial, sans-serif; }",
      "#sharp-portal-about.sharp-dialog-open { display: flex; }",
      "#sharp-portal-about .sharp-about-panel { position: relative; box-sizing: border-box; width: min(760px, 88vw); max-height: 92vh; overflow: auto; padding: 42px 56px 34px; border: 2px solid #69727a; border-radius: 12px; background: #30373c; color: #d1d1d1; font-family: Roboto, sans-serif; font-size: 16px; text-align: center; box-shadow: 0 18px 55px rgba(0,0,0,.75); }",
      "#sharp-portal-about .sharp-about-panel, #sharp-portal-about .sharp-about-panel h2, #sharp-portal-about .sharp-about-panel p, #sharp-portal-about .sharp-about-panel strong, #sharp-portal-about .sharp-about-panel span { color: #d1d1d1 !important; }",
      "#sharp-portal-about .sharp-about-back { position: absolute; top: 16px; right: 16px; width: 44px; padding: 4px; }",
      "#sharp-portal-about .sharp-about-logo { display: block; width: 170px; height: auto; margin: 18px auto 30px; }",
      "#sharp-portal-about .sharp-about-title { margin: 0 0 22px; font-size: 1.44em; line-height: 1.2; font-weight: bold; }",
      "#sharp-portal-about .sharp-about-details { margin: 0; font-size: 1.1em; line-height: 1.55; font-weight: normal; }",
      "#sharp-portal-about .sharp-about-rights { margin-top: 15px; }",
      "#sharp-portal-about .sharp-about-runtime { display: grid; grid-template-columns: minmax(190px, 1fr) minmax(180px, 1fr); gap: 6px 24px; width: min(560px, 100%); margin: 22px auto 0; text-align: left; font-size: 1.05em; line-height: 1.35; }",
      "#sharp-portal-about .sharp-about-runtime dt { margin: 0; font-weight: 700; }",
      "#sharp-portal-about .sharp-about-runtime dd { margin: 0; overflow-wrap: anywhere; }",
      "html:not([data-sharp-manual]) .homepage-app .content:focus,",
      "html:not([data-sharp-manual]) #modal .close:focus,",
      "html:not([data-sharp-manual]) button:focus,",
      "html:not([data-sharp-manual]) select:focus,",
      "html:not([data-sharp-manual]) [role='button']:focus {",
      "  outline: 3px solid #ec1e3c !important;",
      "  outline-offset: -5px !important;",
      "  box-shadow: inset 0 0 0 999px rgba(236, 30, 60, 0.34), 0 0 0 4px #ec1e3c, 0 0 18px rgba(236, 30, 60, 0.9) !important;",
      "  transform: scale(1.018) !important;",
      "  transition: transform 120ms ease, box-shadow 120ms ease !important;",
      "}",
      "html[data-sharp-tts-enabled='true']:not([data-sharp-manual]) .homepage-app .content:focus,",
      "html[data-sharp-tts-enabled='true']:not([data-sharp-manual]) #modal .close:focus,",
      "html[data-sharp-tts-enabled='true']:not([data-sharp-manual]) button:focus,",
      "html[data-sharp-tts-enabled='true']:not([data-sharp-manual]) select:focus,",
      "html[data-sharp-tts-enabled='true']:not([data-sharp-manual]) [role='button']:focus { outline-color: #baff35 !important; outline-offset: -7px !important; box-shadow: inset 0 0 0 7px #baff35, inset 0 0 0 999px rgba(236, 30, 60, 0.28), 0 0 0 4px #ec1e3c, 0 0 18px rgba(236, 30, 60, 0.9) !important; }",
      "#sharp-portal-exit-confirmation { position: fixed; inset: 0; z-index: 2147483646; display: none; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.72); font-family: Roboto, Arial, sans-serif; }",
      "#sharp-portal-exit-confirmation.sharp-dialog-open { display: flex; }",
      "#sharp-portal-exit-confirmation .sharp-exit-panel { width: min(680px, 82vw); padding: 36px; border: 2px solid #69727a; border-radius: 8px; background: #30373c; color: #fff; text-align: center; box-shadow: 0 18px 55px rgba(0,0,0,.7); }",
      "#sharp-portal-exit-confirmation .sharp-exit-message { margin: 0 0 32px; font-size: 30px; line-height: 1.25; font-weight: 600; }",
      "#sharp-portal-exit-confirmation .sharp-exit-actions { display: flex; justify-content: center; gap: 24px; }",
      "#sharp-portal-exit-confirmation button { min-width: 190px; padding: 15px 24px; border: 2px solid #75808a; border-radius: 4px; background: #424b52; color: #fff; font-size: 23px; font-weight: 600; }",
      "#sharp-portal-exit-confirmation button:focus { background: #ec1e3c !important; color: #fff !important; }",
      "@media (max-width: 700px) {",
      "  html:not([data-sharp-manual]) .homepage-large #instructionmanual h3, html:not([data-sharp-manual]) .homepage-large #lifeapp h2, html:not([data-sharp-manual]) .homepage-large #some h2 { font-size: 18px !important; }",
      "  #sharp-portal-exit-confirmation .sharp-exit-message { font-size: 23px; }",
      "  #sharp-portal-exit-confirmation button { min-width: 125px; font-size: 18px; }",
      "  html:not([data-sharp-manual]) .homepage-large .logo-con .app-name { font-size: 24px !important; line-height: 1.2 !important; }",
      "  html:not([data-sharp-manual]) .homepage-large .logo-con > img { width: auto !important; height: 18px !important; }",
      "  #sharp-portal-top-controls { top: 8px; right: 10px; gap: 7px; }",
      "  #sharp-portal-top-controls button { height: 40px; min-height: 40px; padding: 4px 11px; font-size: 14px; }",
      "  #sharp-portal-top-controls .sharp-portal-back { width: 40px; }",
      "  #sharp-portal-top-controls .sharp-portal-back img { width: 30px; height: 30px; }",
      "  html:not([data-sharp-manual]) .homepage-app { grid-template-rows: 130px 1fr !important; }",
      "  html:not([data-sharp-manual]) .homepage-large .logo-con { height: 130px !important; align-items: start !important; padding-top: 14px !important; }",
      "  html:not([data-sharp-manual]) .homepage-large .container-app { margin-top: 0 !important; }",
      "  html:not([data-sharp-manual]) #sharp-portal-top-controls { top: 70px; }",
      "  #sharp-portal-about .sharp-about-panel { width: 92vw; padding: 42px 24px 30px; font-size: 15px; }",
      "  #sharp-portal-about .sharp-about-runtime { grid-template-columns: 1fr 1fr; gap: 5px 12px; }",
      "}"
    ].join("\n");
    document.head.appendChild(style);
    document.documentElement.setAttribute("data-portal-ui", "true");
  }

  function isPortalHome() {
    return Boolean(document.getElementById("instructionmanual"));
  }

  function closeAboutDialog() {
    var dialog = document.getElementById("sharp-portal-about");
    if (!dialog || !dialog.classList.contains("sharp-dialog-open")) return false;
    dialog.classList.remove("sharp-dialog-open");
    dialog.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("sharp-about-active");
    if (focusBeforeAboutDialog && typeof focusBeforeAboutDialog.focus === "function") {
      focusBeforeAboutDialog.focus({ preventScroll: true });
    }
    return true;
  }

  function runtimeCopy() {
    return ABOUT_RUNTIME_COPY[normalizedLanguage()] || ABOUT_RUNTIME_COPY.en;
  }

  function displayName(code, type) {
    code = String(code || "").trim();
    if (!code || code.toLowerCase() === "unknown") return "";
    try {
      if (window.Intl && typeof Intl.DisplayNames === "function") {
        var name = new Intl.DisplayNames([normalizedLanguage()], { type: type }).of(code);
        if (name && name.toLowerCase() !== code.toLowerCase()) return name + " (" + code + ")";
      }
    } catch (error) {}
    return code;
  }

  function formatSpeechRate(value, unavailable) {
    if (value === null || typeof value === "undefined" || value === "") return unavailable;
    var number = Number(value);
    return isFinite(number) ? String(Math.round(number * 100) / 100) + "×" : unavailable;
  }

  function formatSpeechVolume(value, unavailable) {
    if (value === null || typeof value === "undefined" || value === "") return unavailable;
    var number = Number(value);
    if (!isFinite(number)) return unavailable;
    if (number >= 0 && number <= 1) number *= 100;
    return String(Math.round(number)) + "%";
  }

  function updateAboutRuntime(dialog) {
    if (!dialog) return;
    var labels = runtimeCopy();
    var state = window.SharpPortalRuntime || {};
    var device = window.SharpLifePortalDevice || {};
    var unavailable = labels[8];
    var language = state.language || device.language || document.documentElement.lang;
    var country = state.country || device.country;
    var values = {
      language: displayName(language, "language") || unavailable,
      country: displayName(country, "region") || unavailable,
      tts: state.ttsEnabled ? labels[6] : labels[7],
      rate: formatSpeechRate(state.speechRate, unavailable),
      volume: formatSpeechVolume(state.speechVolume, unavailable),
      magnification: state.textMagnificationEnabled ? labels[6] : labels[7]
    };
    var keys = ["language", "country", "tts", "rate", "volume", "magnification"];
    for (var i = 0; i < keys.length; i += 1) {
      var target = dialog.querySelector("[data-runtime-value='" + keys[i] + "']");
      if (target) target.textContent = values[keys[i]];
    }
  }

  function applyAboutLocalization(dialog) {
    var text = ABOUT_COPY[normalizedLanguage()] || ABOUT_COPY.en;
    var aboutButton = document.querySelector("#sharp-portal-top-controls .sharp-portal-about-button");
    if (aboutButton) {
      aboutButton.textContent = text[0];
      aboutButton.setAttribute("aria-label", text[0]);
      aboutButton.setAttribute("title", text[0]);
    }
    if (!dialog) return;
    dialog.setAttribute("aria-label", text[0] + " Sharp Life Portal");
    var back = dialog.querySelector(".sharp-about-back");
    back.setAttribute("aria-label", text[5]);
    back.setAttribute("title", text[5]);
    dialog.querySelector(".sharp-about-version-label").textContent = text[1];
    dialog.querySelector(".sharp-about-release-label").textContent = text[2];
    dialog.querySelector(".sharp-about-owner-label").textContent = text[3];
    dialog.querySelector(".sharp-about-rights").textContent = text[4];
    var runtimeLabels = runtimeCopy();
    var runtimeNames = ["language", "country", "tts", "rate", "volume", "magnification"];
    for (var i = 0; i < runtimeNames.length; i += 1) {
      var runtimeLabel = dialog.querySelector("[data-runtime-label='" + runtimeNames[i] + "']");
      if (runtimeLabel) runtimeLabel.textContent = runtimeLabels[i];
    }
    updateAboutRuntime(dialog);
  }

  function showAboutDialog() {
    var dialog = document.getElementById("sharp-portal-about");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "sharp-portal-about";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.innerHTML = [
        '<div class="sharp-about-panel">',
        '<button type="button" class="sharp-about-back" aria-label="Back" title="Back"><img alt="" aria-hidden="true"></button>',
        '<img class="sharp-about-logo" alt="Sharp">',
        '<h2 class="sharp-about-title">Sharp Life Portal</h2>',
        '<p class="sharp-about-details"><span class="sharp-about-version-label"></span>: <strong class="sharp-about-version"></strong><br><span class="sharp-about-release-label"></span>: <span class="sharp-about-release"></span><br><span class="sharp-about-owner-label"></span>: <span class="sharp-about-owner">Sharp Corporation</span></p>',
        '<dl class="sharp-about-runtime">',
        '<dt data-runtime-label="language">Language</dt><dd data-runtime-value="language"></dd>',
        '<dt data-runtime-label="country">Country</dt><dd data-runtime-value="country"></dd>',
        '<dt data-runtime-label="tts">Text To Speech</dt><dd data-runtime-value="tts"></dd>',
        '<dt data-runtime-label="rate">Speech Rate</dt><dd data-runtime-value="rate"></dd>',
        '<dt data-runtime-label="volume">Speech volume</dt><dd data-runtime-value="volume"></dd>',
        '<dt data-runtime-label="magnification">Text Magnification</dt><dd data-runtime-value="magnification"></dd>',
        '</dl>',
        '<p class="sharp-about-details sharp-about-rights">All rights reserved.</p>',
        '</div>'
      ].join("");
      dialog.querySelector(".sharp-about-back img").src = backIconUrl;
      dialog.querySelector(".sharp-about-logo").src = sharpLogoUrl;
      dialog.querySelector(".sharp-about-version").textContent = RELEASE_VERSION;
      dialog.querySelector(".sharp-about-release").textContent = RELEASE_DATE;
      dialog.querySelector(".sharp-about-back").addEventListener("click", closeAboutDialog);
      document.body.appendChild(dialog);
    }
    applyAboutLocalization(dialog);
    focusBeforeAboutDialog = document.activeElement;
    dialog.setAttribute("aria-hidden", "false");
    dialog.classList.add("sharp-dialog-open");
    document.documentElement.classList.add("sharp-about-active");
    updateAboutRuntime(dialog);
    dialog.querySelector(".sharp-about-back").focus({ preventScroll: true });
    return true;
  }

  function addTopControls() {
    if (document.getElementById("sharp-portal-top-controls")) return;
    var controls = document.createElement("div");
    controls.id = "sharp-portal-top-controls";
    controls.setAttribute("aria-label", "Portal controls");

    if (isPortalHome()) {
      var about = document.createElement("button");
      about.type = "button";
      about.className = "sharp-portal-about-button";
      about.textContent = (ABOUT_COPY[normalizedLanguage()] || ABOUT_COPY.en)[0];
      about.setAttribute("aria-label", about.textContent);
      about.setAttribute("title", about.textContent);
      about.addEventListener("click", showAboutDialog);
      controls.appendChild(about);
    }

    var back = document.createElement("button");
    back.type = "button";
    back.className = "sharp-portal-back";
    back.setAttribute("aria-label", "Back");
    back.setAttribute("title", "Back");
    back.innerHTML = '<img alt="" aria-hidden="true">';
    back.querySelector("img").src = backIconUrl;
    back.addEventListener("click", handleBack);
    controls.appendChild(back);
    document.body.appendChild(controls);
  }

  function syncModalBackButton() {
    var modal = document.getElementById("modal");
    var closes = document.querySelectorAll("#modal .close, .hidden-content .close");
    for (var i = 0; i < closes.length; i += 1) {
      closes[i].setAttribute("role", "button");
      closes[i].setAttribute("aria-label", "Back");
      closes[i].setAttribute("title", "Back");
      var image = closes[i].querySelector("img");
      if (image && image.src !== backIconUrl) image.src = backIconUrl;
      if (image) {
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
      }
    }
    document.documentElement.classList.toggle("sharp-modal-active", Boolean(modal && modal.classList.contains("modal-on")));
  }

  function observeModal() {
    syncModalBackButton();
    if (!window.MutationObserver || !document.body) return;
    var observer = new MutationObserver(syncModalBackButton);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });
  }

  function closeExitConfirmation() {
    var dialog = document.getElementById("sharp-portal-exit-confirmation");
    if (!dialog) return false;
    dialog.classList.remove("sharp-dialog-open");
    dialog.setAttribute("aria-hidden", "true");
    if (focusBeforeExitDialog && typeof focusBeforeExitDialog.focus === "function") {
      focusBeforeExitDialog.focus({ preventScroll: true });
    }
    return true;
  }

  function showExitConfirmation() {
    var language = normalizedLanguage();
    var text = EXIT_COPY[language] || EXIT_COPY.en;
    var dialog = document.getElementById("sharp-portal-exit-confirmation");
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = "sharp-portal-exit-confirmation";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.innerHTML = '<div class="sharp-exit-panel"><p class="sharp-exit-message"></p><div class="sharp-exit-actions"><button type="button" data-exit-action="cancel"></button><button type="button" data-exit-action="close"></button></div></div>';
      document.body.appendChild(dialog);
      dialog.querySelector('[data-exit-action="cancel"]').addEventListener("click", closeExitConfirmation);
      dialog.querySelector('[data-exit-action="close"]').addEventListener("click", function () {
        closeExitConfirmation();
        exitPortal();
      });
    }
    dialog.querySelector(".sharp-exit-message").textContent = text[0];
    dialog.querySelector('[data-exit-action="cancel"]').textContent = text[1];
    dialog.querySelector('[data-exit-action="close"]').textContent = text[2];
    dialog.setAttribute("aria-label", text[0]);
    dialog.setAttribute("aria-hidden", "false");
    focusBeforeExitDialog = document.activeElement;
    dialog.classList.add("sharp-dialog-open");
    dialog.querySelector('[data-exit-action="cancel"]').focus({ preventScroll: true });
    return true;
  }

  function commandFor(event) {
    var key = String(event.key || "");
    var code = event.keyCode || event.which || 0;
    var physical = String(event.code || "");

    if (key === "ArrowUp" || key === "Up" || physical === "ArrowUp" || code === 38 || code === 19) return "up";
    if (key === "ArrowDown" || key === "Down" || physical === "ArrowDown" || code === 40 || code === 20) return "down";
    if (key === "ArrowLeft" || key === "Left" || physical === "ArrowLeft" || code === 37 || code === 21) return "left";
    if (key === "ArrowRight" || key === "Right" || physical === "ArrowRight" || code === 39 || code === 22) return "right";
    if (key === "Enter" || key === "OK" || key === "Select" || key === "Accept" || physical === "Enter" || physical === "NumpadEnter" || code === 13 || code === 23 || code === 66) return "ok";
    if (key === "Back" || key === "Backspace" || key === "BrowserBack" || key === "GoBack" || key === "Escape" || physical === "BrowserBack" || physical === "Escape" || code === 4 || code === 8 || code === 27 || code === 461 || code === 10009) return "back";
    if (key === "PageUp" || code === 33 || code === 92) return "page-up";
    if (key === "PageDown" || code === 34 || code === 93) return "page-down";
    if (key === "Home" || code === 36 || code === 3) return "home";
    if (key === "End" || code === 35 || code === 123) return "end";
    return "";
  }

  function isTextEditor(element) {
    if (!element || element === document.body) return false;
    var name = String(element.tagName || "").toLowerCase();
    return name === "input" || name === "textarea" || element.isContentEditable;
  }

  function isVisible(element) {
    if (!element) return false;
    var style = window.getComputedStyle(element);
    var rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0;
  }

  function activeScroller() {
    var modal = document.getElementById("modal");
    if (isVisible(modal)) {
      var modalContent = modal.querySelector(".modal-content");
      if (modalContent && modalContent.scrollHeight > modalContent.clientHeight) return modalContent;
      if (modal.scrollHeight > modal.clientHeight) return modal;
    }
    return document.scrollingElement || document.documentElement || document.body;
  }

  function scrollElement(element, delta) {
    if (element === document.scrollingElement || element === document.documentElement || element === document.body) {
      window.scrollBy({ top: delta, left: 0, behavior: SMOOTH_SCROLL });
      return;
    }
    if (typeof element.scrollBy === "function") element.scrollBy({ top: delta, left: 0, behavior: SMOOTH_SCROLL });
    else element.scrollTop += delta;
  }

  function lineScrollStep() {
    var target = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
    var style = window.getComputedStyle(target);
    var lineHeight = parseFloat(style.lineHeight);
    if (!isFinite(lineHeight)) lineHeight = parseFloat(style.fontSize) * 1.35;
    if (!isFinite(lineHeight) || lineHeight < 16) lineHeight = DEFAULT_LINE_SCROLL_STEP;
    return Math.round(Math.min(64, Math.max(24, lineHeight)));
  }

  function focusableElements() {
    var exitDialog = document.getElementById("sharp-portal-exit-confirmation");
    var aboutDialog = document.getElementById("sharp-portal-about");
    var root = exitDialog && isVisible(exitDialog) ? exitDialog : aboutDialog && isVisible(aboutDialog) ? aboutDialog : document;
    var nodes = root.querySelectorAll(FOCUSABLE_SELECTOR);
    var result = [];
    for (var i = 0; i < nodes.length; i += 1) {
      if (isVisible(nodes[i]) && nodes[i].getAttribute("aria-hidden") !== "true") result.push(nodes[i]);
    }
    return result;
  }

  function centerOf(element) {
    var rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function directionScore(origin, candidate, direction) {
    var from = centerOf(origin);
    var to = centerOf(candidate);
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var primary;
    var secondary;

    if (direction === "up") { if (dy >= -2) return Infinity; primary = -dy; secondary = Math.abs(dx); }
    else if (direction === "down") { if (dy <= 2) return Infinity; primary = dy; secondary = Math.abs(dx); }
    else if (direction === "left") { if (dx >= -2) return Infinity; primary = -dx; secondary = Math.abs(dy); }
    else { if (dx <= 2) return Infinity; primary = dx; secondary = Math.abs(dy); }

    return primary * 3 + secondary;
  }

  function moveFocus(direction) {
    var items = focusableElements();
    if (!items.length) return false;
    var current = document.activeElement;

    if (!current || current === document.body || items.indexOf(current) === -1) {
      items[0].focus({ preventScroll: true });
      items[0].scrollIntoView({ block: "center", behavior: SMOOTH_SCROLL });
      return true;
    }

    var best = null;
    var bestScore = Infinity;
    for (var i = 0; i < items.length; i += 1) {
      if (items[i] === current) continue;
      var score = directionScore(current, items[i], direction);
      if (score < bestScore) { best = items[i]; bestScore = score; }
    }

    if (!best) return false;
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: "center", inline: "nearest", behavior: SMOOTH_SCROLL });
    return true;
  }

  function changeSelect(select, direction) {
    var step = direction === "up" || direction === "left" ? -1 : 1;
    var next = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + step));
    if (next === select.selectedIndex) return false;
    select.selectedIndex = next;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function activateCurrent() {
    var current = document.activeElement;
    if (!current || current === document.body) {
      var items = focusableElements();
      if (!items.length) return false;
      current = document.getElementById("instructionmanual") || items[0];
      current.focus({ preventScroll: true });
    }

    var tagName = String(current.tagName || "").toLowerCase();
    var isActionable = tagName === "a" || tagName === "button" || tagName === "select" ||
      tagName === "input" || current.getAttribute("role") === "button";
    if (!isActionable && typeof current.querySelector === "function") {
      var nested = current.querySelector("a[href], button:not([disabled]), [role='button'], input:not([disabled])");
      if (nested && isVisible(nested)) current = nested;
    }

    if (String(current.tagName || "").toLowerCase() === "select") {
      var form = current.form;
      if (form) {
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
        return true;
      }
    }

    if (typeof current.click === "function") {
      current.click();
      return true;
    }
    return false;
  }

  function handleBack() {
    var exitDialog = document.getElementById("sharp-portal-exit-confirmation");
    if (isVisible(exitDialog)) return closeExitConfirmation();

    var aboutDialog = document.getElementById("sharp-portal-about");
    if (isVisible(aboutDialog)) return closeAboutDialog();

    var modal = document.getElementById("modal");
    if (isVisible(modal)) {
      var close = modal.querySelector(".close, [data-dismiss='modal'], [aria-label*='close' i]");
      if (close && typeof close.click === "function") {
        close.click();
        return true;
      }
    }

    if (document.documentElement.hasAttribute("data-sharp-manual")) {
      if (document.referrer && window.history.length > 1) {
        window.history.back();
        return true;
      }
      if (window.SharpLifePortalBackTarget) {
        window.location.assign(window.SharpLifePortalBackTarget);
        return true;
      }
    }

    if (document.documentElement.hasAttribute("data-language-selector") || document.getElementById("instructionmanual")) {
      return showExitConfirmation();
    }

    if (window.history.length > 1) {
      window.history.back();
      return true;
    }

    if (window.SharpLifePortalBackTarget) {
      window.location.assign(window.SharpLifePortalBackTarget);
      return true;
    }
    return false;
  }

  function exitPortal() {
    try {
      if (typeof window.SmartTvA_API !== "undefined" && typeof window.SmartTvA_API.exit === "function") {
        window.SmartTvA_API.exit();
        return true;
      }
    } catch (error) {
      console.warn("Sharp Life Portal: native exit failed.", error);
    }

    try { window.close(); } catch (error) {}
    window.setTimeout(function () {
      if (!document.hidden && window.history.length > 1) window.history.go(-1);
    }, 80);
    return true;
  }

  function handleKeydown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    var command = commandFor(event);
    if (!command || isTextEditor(event.target)) return;

    var active = document.activeElement;
    var activeName = String((active && active.tagName) || "").toLowerCase();
    var handled = false;

    if (command === "back") {
      handled = handleBack();
    } else if (activeName === "select" && (command === "up" || command === "down")) {
      handled = changeSelect(active, command);
    } else if (command === "ok") {
      handled = activateCurrent();
    } else if (command === "left" || command === "right" || command === "up" || command === "down") {
      handled = moveFocus(command);
      if (!handled && (command === "up" || command === "down")) {
        var step = lineScrollStep();
        scrollElement(activeScroller(), command === "up" ? -step : step);
        handled = true;
      }
    } else {
      var viewport = Math.max(DEFAULT_LINE_SCROLL_STEP, Math.round(window.innerHeight * 0.8));
      if (command === "page-up") scrollElement(activeScroller(), -viewport);
      else if (command === "page-down") scrollElement(activeScroller(), viewport);
      else if (command === "home") scrollElement(activeScroller(), -Number.MAX_SAFE_INTEGER);
      else if (command === "end") scrollElement(activeScroller(), Number.MAX_SAFE_INTEGER);
      handled = true;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function initializePortalNavigation() {
    if (document.documentElement.hasAttribute("data-sharp-manual") && !document.getElementById("status")) {
      var legacyStatus = document.createElement("span");
      legacyStatus.id = "status";
      legacyStatus.hidden = true;
      document.body.appendChild(legacyStatus);
    }
    addTopControls();
    observeModal();
    window.addEventListener("sharp-life-portal:runtime-change", function () {
      updateAboutRuntime(document.getElementById("sharp-portal-about"));
    });
  }

  addPortalUiStyles();
  document.addEventListener("keydown", handleKeydown, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializePortalNavigation, { once: true });
  else initializePortalNavigation();
})();
