(function () {
  "use strict";

  var EN = {
    title: "Select portal language",
    intro: "Choose the language for Sharp Life Portal. The selected ISO language code will be added to the URL.",
    label: "Portal UI language",
    open: "Open portal",
    url: "Portal URL:",
    hint: "Use the arrow keys to choose a language and press OK to open the portal.",
    documentTitle: "Sharp Life Portal language selection"
  };

  var translations = {
    bg: ["Изберете език на портала", "Изберете езика на Sharp Life Portal. Избраният ISO код на езика ще бъде добавен към URL адреса.", "Език на интерфейса на портала", "Отвори портала", "URL адрес на портала:", "Използвайте стрелките, за да изберете език, и натиснете OK, за да отворите портала.", "Избор на език за Sharp Life Portal"],
    ca: ["Seleccioneu l’idioma del portal", "Trieu l’idioma de Sharp Life Portal. El codi ISO de l’idioma seleccionat s’afegirà a l’URL.", "Idioma de la interfície del portal", "Obre el portal", "URL del portal:", "Utilitzeu les fletxes per triar un idioma i premeu OK per obrir el portal.", "Selecció d’idioma de Sharp Life Portal"],
    cs: ["Vyberte jazyk portálu", "Vyberte jazyk portálu Sharp Life Portal. Vybraný kód jazyka ISO bude přidán do adresy URL.", "Jazyk uživatelského rozhraní portálu", "Otevřít portál", "URL portálu:", "Pomocí šipek vyberte jazyk a stisknutím tlačítka OK otevřete portál.", "Výběr jazyka portálu Sharp Life Portal"],
    da: ["Vælg portalsprog", "Vælg sproget for Sharp Life Portal. Den valgte ISO-sprogkode føjes til URL-adressen.", "Sprog for portalens brugerflade", "Åbn portal", "Portalens URL:", "Brug piletasterne til at vælge et sprog, og tryk på OK for at åbne portalen.", "Sprogvalg for Sharp Life Portal"],
    de: ["Portalsprache auswählen", "Wählen Sie die Sprache für das Sharp Life Portal. Der ausgewählte ISO-Sprachcode wird der URL hinzugefügt.", "Sprache der Portaloberfläche", "Portal öffnen", "Portal-URL:", "Wählen Sie mit den Pfeiltasten eine Sprache aus und drücken Sie OK, um das Portal zu öffnen.", "Sprachauswahl für das Sharp Life Portal"],
    el: ["Επιλέξτε γλώσσα πύλης", "Επιλέξτε τη γλώσσα για το Sharp Life Portal. Ο επιλεγμένος κωδικός γλώσσας ISO θα προστεθεί στη διεύθυνση URL.", "Γλώσσα περιβάλλοντος πύλης", "Άνοιγμα πύλης", "URL πύλης:", "Χρησιμοποιήστε τα πλήκτρα βέλους για να επιλέξετε γλώσσα και πατήστε OK για να ανοίξετε την πύλη.", "Επιλογή γλώσσας Sharp Life Portal"],
    en: [EN.title, EN.intro, EN.label, EN.open, EN.url, EN.hint, EN.documentTitle],
    es: ["Seleccionar idioma del portal", "Elija el idioma de Sharp Life Portal. El código ISO del idioma seleccionado se añadirá a la URL.", "Idioma de la interfaz del portal", "Abrir portal", "URL del portal:", "Utilice las flechas para elegir un idioma y pulse OK para abrir el portal.", "Selección de idioma de Sharp Life Portal"],
    et: ["Valige portaali keel", "Valige Sharp Life Portali keel. Valitud ISO keelekood lisatakse URL-ile.", "Portaali kasutajaliidese keel", "Ava portaal", "Portaali URL:", "Valige nooleklahvidega keel ja vajutage portaali avamiseks OK.", "Sharp Life Portali keele valik"],
    fi: ["Valitse portaalin kieli", "Valitse Sharp Life Portal -portaalin kieli. Valittu ISO-kielikoodi lisätään URL-osoitteeseen.", "Portaalin käyttöliittymän kieli", "Avaa portaali", "Portaalin URL:", "Valitse kieli nuolinäppäimillä ja avaa portaali painamalla OK.", "Sharp Life Portal -portaalin kielivalinta"],
    fr: ["Sélectionner la langue du portail", "Choisissez la langue du Sharp Life Portal. Le code ISO de la langue sélectionnée sera ajouté à l’URL.", "Langue de l’interface du portail", "Ouvrir le portail", "URL du portail :", "Utilisez les touches fléchées pour choisir une langue, puis appuyez sur OK pour ouvrir le portail.", "Sélection de la langue du Sharp Life Portal"],
    hr: ["Odaberite jezik portala", "Odaberite jezik za Sharp Life Portal. Odabrani ISO kôd jezika dodat će se URL-u.", "Jezik korisničkog sučelja portala", "Otvori portal", "URL portala:", "Tipkama sa strelicama odaberite jezik i pritisnite OK za otvaranje portala.", "Odabir jezika za Sharp Life Portal"],
    hu: ["Válassza ki a portál nyelvét", "Válassza ki a Sharp Life Portal nyelvét. A kiválasztott ISO-nyelvkód hozzáadódik az URL-címhez.", "A portál kezelőfelületének nyelve", "Portál megnyitása", "A portál URL-címe:", "A nyílbillentyűkkel válasszon nyelvet, majd nyomja meg az OK gombot a portál megnyitásához.", "A Sharp Life Portal nyelvének kiválasztása"],
    it: ["Seleziona la lingua del portale", "Scegli la lingua di Sharp Life Portal. Il codice ISO della lingua selezionata verrà aggiunto all’URL.", "Lingua dell’interfaccia del portale", "Apri portale", "URL del portale:", "Usa i tasti freccia per scegliere una lingua e premi OK per aprire il portale.", "Selezione della lingua di Sharp Life Portal"],
    lt: ["Pasirinkite portalo kalbą", "Pasirinkite „Sharp Life Portal“ kalbą. Pasirinktas ISO kalbos kodas bus pridėtas prie URL.", "Portalo sąsajos kalba", "Atidaryti portalą", "Portalo URL:", "Rodyklių klavišais pasirinkite kalbą ir paspauskite OK, kad atidarytumėte portalą.", "„Sharp Life Portal“ kalbos pasirinkimas"],
    lv: ["Izvēlieties portāla valodu", "Izvēlieties Sharp Life Portal valodu. Atlasītais ISO valodas kods tiks pievienots URL.", "Portāla saskarnes valoda", "Atvērt portālu", "Portāla URL:", "Izmantojiet bulttaustiņus, lai izvēlētos valodu, un nospiediet OK, lai atvērtu portālu.", "Sharp Life Portal valodas izvēle"],
    nl: ["Selecteer de portaaltaal", "Kies de taal voor Sharp Life Portal. De geselecteerde ISO-taalcode wordt aan de URL toegevoegd.", "Taal van de portalinterface", "Portal openen", "Portal-URL:", "Gebruik de pijltjestoetsen om een taal te kiezen en druk op OK om de portal te openen.", "Taalkeuze voor Sharp Life Portal"],
    no: ["Velg portalspråk", "Velg språket for Sharp Life Portal. Den valgte ISO-språkkoden legges til i URL-adressen.", "Språk for portalens brukergrensesnitt", "Åpne portal", "Portalens URL:", "Bruk piltastene til å velge et språk, og trykk OK for å åpne portalen.", "Språkvalg for Sharp Life Portal"],
    pl: ["Wybierz język portalu", "Wybierz język portalu Sharp Life Portal. Wybrany kod języka ISO zostanie dodany do adresu URL.", "Język interfejsu portalu", "Otwórz portal", "Adres URL portalu:", "Wybierz język za pomocą przycisków strzałek i naciśnij OK, aby otworzyć portal.", "Wybór języka portalu Sharp Life Portal"],
    pt: ["Selecionar o idioma do portal", "Escolha o idioma do Sharp Life Portal. O código ISO do idioma selecionado será adicionado ao URL.", "Idioma da interface do portal", "Abrir portal", "URL do portal:", "Utilize as teclas de seta para escolher um idioma e prima OK para abrir o portal.", "Seleção do idioma do Sharp Life Portal"],
    "pt-pt": ["Selecionar o idioma do portal", "Escolha o idioma do Sharp Life Portal. O código ISO do idioma selecionado será adicionado ao URL.", "Idioma da interface do portal", "Abrir portal", "URL do portal:", "Utilize as teclas de seta para escolher um idioma e prima OK para abrir o portal.", "Seleção do idioma do Sharp Life Portal"],
    ro: ["Selectați limba portalului", "Alegeți limba pentru Sharp Life Portal. Codul ISO al limbii selectate va fi adăugat la URL.", "Limba interfeței portalului", "Deschide portalul", "URL portal:", "Utilizați tastele săgeată pentru a alege o limbă și apăsați OK pentru a deschide portalul.", "Selectarea limbii pentru Sharp Life Portal"],
    ru: ["Выберите язык портала", "Выберите язык Sharp Life Portal. Код выбранного языка в формате ISO будет добавлен в URL-адрес.", "Язык интерфейса портала", "Открыть портал", "URL-адрес портала:", "Выберите язык кнопками со стрелками и нажмите OK, чтобы открыть портал.", "Выбор языка Sharp Life Portal"],
    sk: ["Vyberte jazyk portálu", "Vyberte jazyk portálu Sharp Life Portal. Vybraný kód jazyka ISO sa pridá do adresy URL.", "Jazyk používateľského rozhrania portálu", "Otvoriť portál", "URL portálu:", "Pomocou šípok vyberte jazyk a stlačením tlačidla OK otvorte portál.", "Výber jazyka portálu Sharp Life Portal"],
    sl: ["Izberite jezik portala", "Izberite jezik za Sharp Life Portal. Izbrana koda jezika ISO bo dodana naslovu URL.", "Jezik uporabniškega vmesnika portala", "Odpri portal", "URL portala:", "S puščičnimi tipkami izberite jezik in pritisnite OK, da odprete portal.", "Izbira jezika za Sharp Life Portal"],
    sr: ["Izaberite jezik portala", "Izaberite jezik za Sharp Life Portal. Izabrani ISO kôd jezika biće dodat URL adresi.", "Jezik korisničkog interfejsa portala", "Otvori portal", "URL portala:", "Tasterima sa strelicama izaberite jezik i pritisnite OK da biste otvorili portal.", "Izbor jezika za Sharp Life Portal"],
    sv: ["Välj portalspråk", "Välj språk för Sharp Life Portal. Den valda ISO-språkkoden läggs till i webbadressen.", "Språk för portalens användargränssnitt", "Öppna portal", "Portalens URL:", "Använd piltangenterna för att välja språk och tryck på OK för att öppna portalen.", "Språkval för Sharp Life Portal"],
    uk: ["Виберіть мову порталу", "Виберіть мову Sharp Life Portal. Код вибраної мови у форматі ISO буде додано до URL-адреси.", "Мова інтерфейсу порталу", "Відкрити портал", "URL-адреса порталу:", "Виберіть мову кнопками зі стрілками та натисніть OK, щоб відкрити портал.", "Вибір мови Sharp Life Portal"]
  };

  function entry(language) {
    var values = translations[language] || translations[String(language || "").split("-")[0]] || translations.en;
    return { title: values[0], intro: values[1], label: values[2], open: values[3], url: values[4], hint: values[5], documentTitle: values[6] };
  }

  function apply(language) {
    language = String(language || "en").toLowerCase().replace(/_/g, "-");
    var text = entry(language);
    var select = document.getElementById("language");
    document.documentElement.lang = language;
    document.title = text.documentTitle;
    document.getElementById("page-title").textContent = text.title;
    document.getElementById("page-intro").textContent = text.intro;
    document.getElementById("language-label").textContent = text.label;
    document.getElementById("open-portal").textContent = text.open;
    document.getElementById("url-label").textContent = text.url;
    document.getElementById("navigation-hint").textContent = text.hint;
    if (select) select.setAttribute("aria-label", text.label + ". " + select.options[select.selectedIndex].text);
  }

  function initialize() {
    var select = document.getElementById("language");
    if (!select) return;
    select.addEventListener("change", function () { apply(select.value); });
    window.addEventListener("sharp-life-portal:device-ready", function (event) {
      apply(event.detail && event.detail.language || select.value);
    });
    apply(select.value);
  }

  window.SharpPortalLanguageSelectorLocalization = { apply: apply };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
