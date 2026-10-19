/* Consultation modal copied verbatim from acrenkey.com (grvmon/a-K lead-form.min.js @ f5a688e). Do not edit here; re-copy. */
(function () {
  var HUBSPOT_PORTAL_ID = window.lfHubspotPortalId || "246341570";
  var HUBSPOT_FORM_GUID = window.lfHubspotFormGuid || "e0b2fc29-e29b-4983-850e-8dca7815d213";
  var REDIRECT_URL      = (typeof window.lfRedirectUrl !== "undefined") ? window.lfRedirectUrl : "/thankyou";
  var COOLDOWN_SECONDS  = (typeof window.lfCooldownSeconds !== "undefined") ? window.lfCooldownSeconds : 15;

  var STRINGS = {
    btnSubmit:        "Schedule Advisory Call",
    btnSending:       "Sending...",
    errNameRequired:  "Name is required",
    errNameInvalid:   "Enter a valid name",
    errPhoneRequired: "Mobile number is required",
    errPhoneInvalid:  "Enter a valid {len}-digit number for {country}",
    errPhoneCode:     "Please select a valid country code",
    errPhoneUnknown:  "Country code not recognised. Please select manually",
    errEmailRequired: "Email is required",
    errEmailInvalid:  "Enter a valid email",
    errCooldown:      "You've already submitted recently. Please wait a few seconds before trying again.",
    slowSubmit:       "Still submitting... Please wait.",
    successHeading:   "Thank You",
    successBody:      "Your request has been received. Redirecting in {n}s...",
    successBodyStay:  "Your request has been received. Tell us what you're looking for, and our advisors will help you shortlist, evaluate, and negotiate the right property.",
    errOffline:       "Connection issue. Your details are safely held. Please click Schedule Advisory Call once more to retry or reach out to support.",
    errSubmit:        "Form submission blocked by server policy. Please email us directly or try again later.",
  };

  var nameRx  = /^[\p{Letter}\p{Mark}\p{Number}\s.'-]{2,60}$/u;
  var emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var lfFormOpenTime = null;
  var isSubmitting = false;
  var slowSubmitTimer = null;
  var autofillListeners = [];
  var currentModalBtnText = "";

  if (window.lfActiveInstanceWipe && typeof window.lfActiveInstanceWipe === "function") {
    window.lfActiveInstanceWipe();
  }

  var Store = (function () {
    var mem = {};
    return {
      set: function (k, v) { mem[k] = v; try { sessionStorage.setItem(k, v); } catch (e) {} },
      get: function (k) {
        try { var v = sessionStorage.getItem(k); if (v !== null) return v; } catch (e) {}
        return mem[k] !== undefined ? String(mem[k]) : null;
      }
    };
  })();

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  var VARIABLE_LENGTH_COUNTRIES = ["US","CA","GB","AU","IN","BR","MX","NG","ID","PK"];

  var COUNTRIES = [
    {name:"Afghanistan",code:"AF",dial:"+93",len:9},{name:"Albania",code:"AL",dial:"+355",len:9},
    {name:"Algeria",code:"DZ",dial:"+213",len:9},{name:"Andorra",code:"AD",dial:"+376",len:6},
    {name:"Angola",code:"AO",dial:"+244",len:9},{name:"Antigua & Barbuda",code:"AG",dial:"+1",len:10},
    {name:"Argentina",code:"AR",dial:"+54",len:10},{name:"Armenia",code:"AM",dial:"+374",len:8},
    {name:"Australia",code:"AU",dial:"+61",len:9},{name:"Austria",code:"AT",dial:"+43",len:10},
    {name:"Azerbaijan",code:"AZ",dial:"+994",len:9},{name:"Bahamas",code:"BS",dial:"+1",len:10},
    {name:"Bahrain",code:"BH",dial:"+973",len:8},{name:"Bangladesh",code:"BD",dial:"+880",len:10},
    {name:"Barbados",code:"BB",dial:"+1",len:10},{name:"Belarus",code:"BY",dial:"+375",len:9},
    {name:"Belgium",code:"BE",dial:"+32",len:9},{name:"Belize",code:"BZ",dial:"+501",len:7},
    {name:"Benin",code:"BJ",dial:"+229",len:8},{name:"Bhutan",code:"BT",dial:"+975",len:8},
    {name:"Bolivia",code:"BO",dial:"+591",len:8},{name:"Bosnia & Herzegovina",code:"BA",dial:"+387",len:8},
    {name:"Botswana",code:"BW",dial:"+267",len:8},{name:"Brazil",code:"BR",dial:"+55",len:11},
    {name:"Brunei",code:"BN",dial:"+673",len:7},{name:"Bulgaria",code:"BG",dial:"+359",len:9},
    {name:"Burkina Faso",code:"BF",dial:"+226",len:8},{name:"Burundi",code:"BI",dial:"+257",len:8},
    {name:"Cambodia",code:"KH",dial:"+855",len:9},{name:"Cameroon",code:"CM",dial:"+237",len:9},
    {name:"Canada",code:"CA",dial:"+1",len:10},{name:"Cape Verde",code:"CV",dial:"+238",len:7},
    {name:"Central African Republic",code:"CF",dial:"+236",len:8},{name:"Chad",code:"TD",dial:"+235",len:8},
    {name:"Chile",code:"CL",dial:"+56",len:9},{name:"China",code:"CN",dial:"+86",len:11},
    {name:"Colombia",code:"CO",dial:"+57",len:10},{name:"Comoros",code:"KM",dial:"+269",len:7},
    {name:"Congo (DRC)",code:"CD",dial:"+243",len:9},{name:"Congo (Republic)",code:"CG",dial:"+242",len:9},
    {name:"Costa Rica",code:"CR",dial:"+506",len:8},{name:"Croatia",code:"HR",dial:"+385",len:9},
    {name:"Cuba",code:"CU",dial:"+53",len:8},{name:"Cyprus",code:"CY",dial:"+357",len:8},
    {name:"Czech Republic",code:"CZ",dial:"+420",len:9},{name:"Denmark",code:"DK",dial:"+45",len:8},
    {name:"Djibouti",code:"DJ",dial:"+253",len:8},{name:"Dominica",code:"DM",dial:"+1",len:10},
    {name:"Dominican Republic",code:"DO",dial:"+1",len:10},{name:"Ecuador",code:"EC",dial:"+593",len:9},
    {name:"Egypt",code:"EG",dial:"+20",len:10},{name:"El Salvador",code:"SV",dial:"+503",len:8},
    {name:"Equatorial Guinea",code:"GQ",dial:"+240",len:9},{name:"Eritrea",code:"ER",dial:"+291",len:7},
    {name:"Estonia",code:"EE",dial:"+372",len:8},{name:"Eswatini",code:"SZ",dial:"+268",len:8},
    {name:"Ethiopia",code:"ET",dial:"+251",len:9},{name:"Fiji",code:"FJ",dial:"+679",len:7},
    {name:"Finland",code:"FI",dial:"+358",len:9},{name:"France",code:"FR",dial:"+33",len:9},
    {name:"Gabon",code:"GA",dial:"+241",len:8},{name:"Gambia",code:"GM",dial:"+220",len:7},
    {name:"Georgia",code:"GE",dial:"+995",len:9},{name:"Germany",code:"DE",dial:"+49",len:10},
    {name:"Ghana",code:"GH",dial:"+233",len:9},{name:"Greece",code:"GR",dial:"+30",len:10},
    {name:"Grenada",code:"GD",dial:"+1",len:10},{name:"Guatemala",code:"GT",dial:"+502",len:8},
    {name:"Guinea",code:"GN",dial:"+224",len:9},{name:"Guinea-Bissau",code:"GW",dial:"+245",len:7},
    {name:"Guyana",code:"GY",dial:"+592",len:7},{name:"Haiti",code:"HT",dial:"+509",len:8},
    {name:"Honduras",code:"HN",dial:"+504",len:8},{name:"Hungary",code:"HU",dial:"+36",len:9},
    {name:"Iceland",code:"IS",dial:"+354",len:7},{name:"India",code:"IN",dial:"+91",len:10},
    {name:"Indonesia",code:"ID",dial:"+62",len:12},{name:"Iran",code:"IR",dial:"+98",len:10},
    {name:"Iraq",code:"IQ",dial:"+964",len:10},{name:"Ireland",code:"IE",dial:"+353",len:9},
    {name:"Israel",code:"IL",dial:"+972",len:9},{name:"Italy",code:"IT",dial:"+39",len:10},
    {name:"Ivory Coast",code:"CI",dial:"+225",len:10},{name:"Jamaica",code:"JM",dial:"+1",len:10},
    {name:"Japan",code:"JP",dial:"+81",len:10},{name:"Jordan",code:"JO",dial:"+962",len:9},
    {name:"Kazakhstan",code:"KZ",dial:"+7",len:10},{name:"Kenya",code:"KE",dial:"+254",len:9},
    {name:"Kiribati",code:"KI",dial:"+686",len:8},{name:"Kuwait",code:"KW",dial:"+965",len:8},
    {name:"Kyrgyzstan",code:"KG",dial:"+996",len:9},{name:"Laos",code:"LA",dial:"+856",len:9},
    {name:"Latvia",code:"LV",dial:"+371",len:8},{name:"Lebanon",code:"LB",dial:"+961",len:8},
    {name:"Lesotho",code:"LS",dial:"+266",len:8},{name:"Liberia",code:"LR",dial:"+231",len:8},
    {name:"Libya",code:"LY",dial:"+218",len:9},{name:"Liechtenstein",code:"LI",dial:"+423",len:7},
    {name:"Lithuania",code:"LT",dial:"+370",len:8},{name:"Luxembourg",code:"LU",dial:"+352",len:9},
    {name:"Madagascar",code:"MG",dial:"+261",len:9},{name:"Malawi",code:"MW",dial:"+265",len:9},
    {name:"Malaysia",code:"MY",dial:"+60",len:9},{name:"Maldives",code:"MV",dial:"+960",len:7},
    {name:"Mali",code:"ML",dial:"+223",len:8},{name:"Malta",code:"MT",dial:"+356",len:8},
    {name:"Marshall Islands",code:"MH",dial:"+692",len:7},{name:"Mauritania",code:"MR",dial:"+222",len:8},
    {name:"Mauritius",code:"MU",dial:"+230",len:8},{name:"Mexico",code:"MX",dial:"+52",len:10},
    {name:"Micronesia",code:"FM",dial:"+691",len:7},{name:"Moldova",code:"MD",dial:"+373",len:8},
    {name:"Monaco",code:"MC",dial:"+377",len:8},{name:"Mongolia",code:"MN",dial:"+976",len:8},
    {name:"Montenegro",code:"ME",dial:"+382",len:8},{name:"Morocco",code:"MA",dial:"+212",len:9},
    {name:"Mozambique",code:"MZ",dial:"+258",len:9},{name:"Myanmar",code:"MM",dial:"+95",len:9},
    {name:"Namibia",code:"NA",dial:"+264",len:9},{name:"Nauru",code:"NR",dial:"+674",len:7},
    {name:"Nepal",code:"NP",dial:"+977",len:10},{name:"Netherlands",code:"NL",dial:"+31",len:9},
    {name:"New Zealand",code:"NZ",dial:"+64",len:9},{name:"Nicaragua",code:"NI",dial:"+505",len:8},
    {name:"Niger",code:"NE",dial:"+227",len:8},{name:"Nigeria",code:"NG",dial:"+234",len:10},
    {name:"North Korea",code:"KP",dial:"+850",len:9},{name:"North Macedonia",code:"MK",dial:"+389",len:8},
    {name:"Norway",code:"NO",dial:"+47",len:8},{name:"Oman",code:"OM",dial:"+968",len:8},
    {name:"Pakistan",code:"PK",dial:"+92",len:10},{name:"Palau",code:"PW",dial:"+680",len:7},
    {name:"Palestine",code:"PS",dial:"+970",len:9},{name:"Panama",code:"PA",dial:"+507",len:8},
    {name:"Papua New Guinea",code:"PG",dial:"+675",len:8},{name:"Paraguay",code:"PY",dial:"+595",len:9},
    {name:"Peru",code:"PE",dial:"+51",len:9},{name:"Philippines",code:"PH",dial:"+63",len:10},
    {name:"Poland",code:"PL",dial:"+48",len:9},{name:"Portugal",code:"PT",dial:"+351",len:9},
    {name:"Qatar",code:"QA",dial:"+974",len:8},{name:"Romania",code:"RO",dial:"+40",len:9},
    {name:"Russia",code:"RU",dial:"+7",len:10},{name:"Rwanda",code:"RW",dial:"+250",len:9},
    {name:"Saint Kitts & Nevis",code:"KN",dial:"+1",len:10},{name:"Saint Lucia",code:"LC",dial:"+1",len:10},
    {name:"Saint Vincent",code:"VC",dial:"+1",len:10},{name:"Samoa",code:"WS",dial:"+685",len:7},
    {name:"San Marino",code:"SM",dial:"+378",len:9},{name:"Sao Tome & Principe",code:"ST",dial:"+239",len:7},
    {name:"Saudi Arabia",code:"SA",dial:"+966",len:9},{name:"Senegal",code:"SN",dial:"+221",len:9},
    {name:"Serbia",code:"RS",dial:"+381",len:9},{name:"Seychelles",code:"SC",dial:"+248",len:7},
    {name:"Sierra Leone",code:"SL",dial:"+232",len:8},{name:"Singapore",code:"SG",dial:"+65",len:8},
    {name:"Slovakia",code:"SK",dial:"+421",len:9},{name:"Slovenia",code:"SI",dial:"+386",len:8},
    {name:"Solomon Islands",code:"SB",dial:"+677",len:7},{name:"Somalia",code:"SO",dial:"+252",len:8},
    {name:"South Africa",code:"ZA",dial:"+27",len:9},{name:"South Korea",code:"KR",dial:"+82",len:10},
    {name:"South Sudan",code:"SS",dial:"+211",len:9},{name:"Spain",code:"ES",dial:"+34",len:9},
    {name:"Sri Lanka",code:"LK",dial:"+94",len:9},{name:"Sudan",code:"SD",dial:"+249",len:9},
    {name:"Suriname",code:"SR",dial:"+597",len:7},{name:"Sweden",code:"SE",dial:"+46",len:9},
    {name:"Switzerland",code:"CH",dial:"+41",len:9},{name:"Syria",code:"SY",dial:"+963",len:9},
    {name:"Taiwan",code:"TW",dial:"+886",len:9},{name:"Tajikistan",code:"TJ",dial:"+992",len:9},
    {name:"Tanzania",code:"TZ",dial:"+255",len:9},{name:"Thailand",code:"TH",dial:"+66",len:9},
    {name:"Timor-Leste",code:"TL",dial:"+670",len:8},{name:"Togo",code:"TG",dial:"+228",len:8},
    {name:"Tonga",code:"TO",dial:"+676",len:7},{name:"Trinidad & Tobago",code:"TT",dial:"+1",len:10},
    {name:"Tunisia",code:"TN",dial:"+216",len:8},{name:"Turkey",code:"TR",dial:"+90",len:10},
    {name:"Turkmenistan",code:"TM",dial:"+993",len:8},{name:"Tuvalu",code:"TV",dial:"+688",len:6},
    {name:"Uganda",code:"UG",dial:"+256",len:9},{name:"Ukraine",code:"UA",dial:"+380",len:9},
    {name:"United Arab Emirates",code:"AE",dial:"+971",len:9},{name:"United Kingdom",code:"GB",dial:"+44",len:10},
    {name:"United States",code:"US",dial:"+1",len:10},{name:"Uruguay",code:"UY",dial:"+598",len:8},
    {name:"Uzbekistan",code:"UZ",dial:"+998",len:9},{name:"Vanuatu",code:"VU",dial:"+678",len:7},
    {name:"Vatican City",code:"VA",dial:"+379",len:9},{name:"Venezuela",code:"VE",dial:"+58",len:10},
    {name:"Vietnam",code:"VN",dial:"+84",len:9},{name:"Yemen",code:"YE",dial:"+967",len:9},
    {name:"Zambia",code:"ZM",dial:"+260",len:9},{name:"Zimbabwe",code:"ZW",dial:"+263",len:9}
  ];

  var _sorted = null;
  function getSorted() {
    if (!_sorted) _sorted = COUNTRIES.slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
    return _sorted;
  }

  var DIAL_CODE_PREFERENCE = {
    "+1": ["US", "CA"],
    "+7": ["RU", "KZ"]
  };

  function findCountryByDial(prefix, list) {
    var matches = list.filter(function(c){ return c.dial === prefix; });
    if (!matches.length) return null;
    if (matches.length === 1) return matches[0];
    var prefer = DIAL_CODE_PREFERENCE[prefix] || [];
    for (var p = 0; p < prefer.length; p++) {
      var hit = matches.find(function(c){ return c.code === prefer[p]; });
      if (hit) return hit;
    }
    return matches[0];
  }

  function stripTrunkZero(nationalDigits) {
    if (!nationalDigits) return nationalDigits;
    if (nationalDigits.charAt(0) === "0" && nationalDigits.length > 1) {
      return nationalDigits.substring(1);
    }
    return nationalDigits;
  }

  function fitsCountryLength(country, digits) {
    if (!country || !digits) return false;
    var expLen = country.len || 10;
    var isVar = VARIABLE_LENGTH_COUNTRIES.indexOf(country.code) !== -1;
    var min = isVar ? expLen - 1 : expLen;
    var max = isVar ? expLen + 1 : expLen;
    return digits.length >= min && digits.length <= max;
  }

  function countryMaxLen(country) {
    if (!country) return 15;
    var expLen = country.len || 10;
    var isVar = VARIABLE_LENGTH_COUNTRIES.indexOf(country.code) !== -1;
    return isVar ? expLen + 1 : expLen;
  }

  function tryParseBareIntl(digits, countryList) {
    if (!digits) return null;
    if (currentCountry) {
      var curDial = currentCountry.dial.replace(/\D/g, "");
      if (curDial && digits.indexOf(curDial) === 0 && digits.length > curDial.length) {
        var curNat = stripTrunkZero(digits.substring(curDial.length));
        if (fitsCountryLength(currentCountry, curNat)) {
          return { country: currentCountry, national: curNat };
        }
      }
      if (fitsCountryLength(currentCountry, digits)) return null;
    }

    var maxDialLen = 4;
    if (currentCountry) {
      var maxLocal = countryMaxLen(currentCountry);
      var over = digits.length - maxLocal;
      if (over >= 1 && over <= 4) maxDialLen = 3;
    }

    for (var i = maxDialLen; i >= 1; i--) {
      if (digits.length <= i) continue;
      if (currentCountry && maxDialLen === 3 && i < 3) continue;
      var matched = findCountryByDial("+" + digits.substring(0, i), countryList);
      if (!matched) continue;
      var national = stripTrunkZero(digits.substring(i));
      if (national && fitsCountryLength(matched, national)) {
        return { country: matched, national: national };
      }
    }
    return null;
  }

  var isMobile = function() {
    return window.matchMedia("(max-width: 768px)").matches;
  };

  var modalOverlay       = document.getElementById("lfModalOverlay");
  var modalTrigger       = document.getElementById("lfModalTrigger");
  var modalClose         = document.getElementById("lfModalClose");
  var modalContent       = document.getElementById("lfWrap");
  var mainFormContentBox = document.getElementById("lfModalFormContent");
  var form               = document.getElementById("lfForm");
  var nameInput          = document.getElementById("lfName");
  var phoneInput         = document.getElementById("lfPhone");
  var emailInput         = document.getElementById("lfEmail");
  var nameField          = document.getElementById("lfNameField");
  var phoneField         = document.getElementById("lfPhoneField");
  var emailField         = document.getElementById("lfEmailField");
  var nameErr            = document.getElementById("lfNameErr");
  var phoneErr           = document.getElementById("lfPhoneErr");
  var emailErr           = document.getElementById("lfEmailErr");
  var submitBtn          = document.getElementById("lfSubmitBtn");
  var btnText            = document.getElementById("lfBtnText");
  var honeypot           = form ? form.querySelector('input[name="website"]') : null;
  var ccTrigger          = document.getElementById("lfCcTrigger");
  var ccDisplay          = document.getElementById("lfCcDisplay");
  var ccPanel            = document.getElementById("lfCcPanel");
  var ccSearch           = document.getElementById("lfCcSearch");
  var ccList             = document.getElementById("lfCcList");
  var ccVal              = document.getElementById("lfCcVal");
  var globalErr          = document.getElementById("lfGlobalErr");
  var ccBackdrop         = document.getElementById("lfCcBackdrop");

  var currentCountry = (function() {
    var s = getSorted();
    return s.find(function(c){ return c.code === "IN"; }) || s[0];
  })();

  var submitted = false;
  var kbFocusIdx = -1;
  var filteredCountries = [];
  var searchDebounceTimer = null;
  var lastActiveElement = null;
  var successCloseTimer = null;
  var successTicker = null;
  var showingSuccess = false;
  var phoneWatchTimer = null;
  var lastPhoneSyncedRaw = null;

  function updateClearButtonsA11y(inputEl) {
    if (!inputEl) return;
    var field = inputEl.closest(".lf-field");
    if (!field) return;
    var btn = field.querySelector(".lf-clear-btn");
    if (!btn) return;
    if (inputEl.value.trim() !== "") {
      btn.setAttribute("tabindex", "0");
      field.classList.add("lf-has-input-text");
    } else {
      btn.setAttribute("tabindex", "-1");
      field.classList.remove("lf-has-input-text");
    }
  }

  function setBackgroundA11y(hidden) {
    var nodes = document.querySelectorAll("body > *");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node === modalOverlay || (modalOverlay && node.contains(modalOverlay))) {
        continue;
      }
      if (hidden) {
        node.setAttribute("aria-hidden", "true");
        try { node.inert = true; } catch (e) {}
      } else {
        node.removeAttribute("aria-hidden");
        try { node.inert = false; } catch (e) {}
      }
    }
  }

  function resetSubmitButton() {
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove("lf-loading");
    }
    var btnTextEl = document.getElementById("lfBtnText") || btnText;
    if (btnTextEl) btnTextEl.textContent = currentModalBtnText || STRINGS.btnSubmit;
  }

  function exitSuccessState() {
    if (successCloseTimer) { clearTimeout(successCloseTimer); successCloseTimer = null; }
    if (successTicker) { clearInterval(successTicker); successTicker = null; }
    var canvas = mainFormContentBox && mainFormContentBox.querySelector(".lf-success-canvas");
    if (canvas) canvas.parentNode.removeChild(canvas);
    if (mainFormContentBox) mainFormContentBox.classList.remove("lf-showing-success");
    showingSuccess = false;
    resetSubmitButton();
    submitted = false;
    if (globalErr) {
      globalErr.classList.remove("lf-show");
      globalErr.textContent = STRINGS.errOffline;
    }
    if (nameInput) nameInput.value = "";
    if (phoneInput) phoneInput.value = "";
    if (emailInput) emailInput.value = "";
    if (honeypot) honeypot.value = "";
    if (nameField && nameErr) ValidationService.clrErr(nameField, nameErr);
    if (phoneField && phoneErr) ValidationService.clrErr(phoneField, phoneErr);
    if (emailField && emailErr) ValidationService.clrErr(emailField, emailErr);
    if (nameField) ValidationService.clrValid(nameField);
    if (phoneField) ValidationService.clrValid(phoneField);
    if (emailField) ValidationService.clrValid(emailField);
    [nameInput, phoneInput, emailInput].forEach(function(el) {
      if (el) checkValueState(el);
    });
  }

  function startPhoneAutofillWatch() {
    stopPhoneAutofillWatch();
    lastPhoneSyncedRaw = phoneInput ? phoneInput.value : null;
    phoneWatchTimer = setInterval(function() {
      if (!phoneInput || !modalOverlay || !modalOverlay.classList.contains("lf-modal-open")) return;
      var cur = phoneInput.value;
      if (cur === lastPhoneSyncedRaw) return;
      lastPhoneSyncedRaw = cur;
      PhoneSyncManager.syncInput();
      lastPhoneSyncedRaw = phoneInput.value;
    }, 300);
  }

  function stopPhoneAutofillWatch() {
    if (phoneWatchTimer) { clearInterval(phoneWatchTimer); phoneWatchTimer = null; }
  }

  var ModalController = {
    open: function (context, formName, customOptions) {
      if (!modalOverlay) {
        modalOverlay       = document.getElementById("lfModalOverlay");
        modalTrigger       = document.getElementById("lfModalTrigger");
        modalClose         = document.getElementById("lfModalClose");
        modalContent       = document.getElementById("lfWrap");
        mainFormContentBox = document.getElementById("lfModalFormContent");
        form               = document.getElementById("lfForm");
        nameInput          = document.getElementById("lfName");
        phoneInput         = document.getElementById("lfPhone");
        emailInput         = document.getElementById("lfEmail");
        nameField          = document.getElementById("lfNameField");
        phoneField         = document.getElementById("lfPhoneField");
        emailField         = document.getElementById("lfEmailField");
        nameErr            = document.getElementById("lfNameErr");
        phoneErr           = document.getElementById("lfPhoneErr");
        emailErr           = document.getElementById("lfEmailErr");
        submitBtn          = document.getElementById("lfSubmitBtn");
        btnText            = document.getElementById("lfBtnText");
        ccTrigger          = document.getElementById("lfCcTrigger");
        ccDisplay          = document.getElementById("lfCcDisplay");
        ccPanel            = document.getElementById("lfCcPanel");
        ccSearch           = document.getElementById("lfCcSearch");
        ccList             = document.getElementById("lfCcList");
        ccVal              = document.getElementById("lfCcVal");
        globalErr          = document.getElementById("lfGlobalErr");
        ccBackdrop         = document.getElementById("lfCcBackdrop");
      }
      if (!modalOverlay) return;

      var mainHeading = document.getElementById("lfMainHeading");
      var subHeading = document.getElementById("lfSubHeading");
      var formNameInput = document.getElementById("lfFormName");
      var btnTextEl = document.getElementById("lfBtnText") || btnText;

      var getProjectName = function() {
        if (window.akProjectName) return window.akProjectName;
        var path = window.location.pathname.toLowerCase();
        if (path.indexOf("prestige-evergreen") !== -1) return "Prestige Evergreen";
        if (path.indexOf("sumadhura-edition") !== -1) return "Sumadhura Edition";
        if (path.indexOf("sumadhura-folium") !== -1) return "Sumadhura Folium";
        if (path.indexOf("sattva-songbird") !== -1) return "Sattva Songbird";
        if (path.indexOf("brigade-belvedere") !== -1) return "Brigade Belvedere";
        if (path.indexOf("riviera-uno") !== -1) return "Riviera Uno";
        if (path.indexOf("sumadhura-solace") !== -1) return "Sumadhura Solace";

        return "";
      };

      var proj = getProjectName();
      var ctx = (context || "").toLowerCase();
      var fn = (formName || "").toLowerCase();

      var mainText = "";
      var subText = "";
      var btnLabel = "";

      if (customOptions && customOptions.heading) {
        mainText = customOptions.heading;
        subText = customOptions.subHeading || "";
        btnLabel = customOptions.btnText || "";
        if (formNameInput) formNameInput.value = formName || "custom_enquiry";
      } else if (ctx === 'analysis' || ctx === 'buyer-analysis' || ctx === 'diligence' || fn.indexOf('buyer_analysis') !== -1 || fn.indexOf('diligence') !== -1) {
        mainText = "Get Buyer Analysis";
        subText = "Access unit-wise pricing breakdown, high-floor premium analysis, RERA timeline risks, and independent acre&key score.";
        btnLabel = "Download Buyer Analysis (PDF)";
        if (formNameInput) formNameInput.value = formName || "buyer_analysis";
      } else if (ctx === 'brochure' || ctx.indexOf('brochure') !== -1 || fn.indexOf('brochure') !== -1) {
        mainText = "Get Official Brochure";
        subText = "Get the complete project dossier, masterplan layouts, specification sheet, and high-res floor configurations.";
        btnLabel = "Download Brochure (PDF)";
        if (formNameInput) formNameInput.value = formName || "brochure_download";
      } else if (ctx === 'pricing' || ctx === 'cost' || fn.indexOf('cost_sheet') !== -1 || fn.indexOf('cost_estimator') !== -1) {
        mainText = "Get Cost Breakdown";
        subText = "Receive unit-wise all-inclusive pricing, floor-rise & PLC charges, GST schedule, and payment milestones.";
        btnLabel = "Get Detailed Cost Sheet";
        if (formNameInput) formNameInput.value = formName || "pricing_enquiry";
      } else if (ctx === 'floorplan' || ctx === 'availability' || fn.indexOf('availability') !== -1) {
        mainText = "Check Unit Availability";
        subText = "Get real-time 1 to 4 BHK unit availability, tower layout plans, and floor selection guidance.";
        btnLabel = "Check Available Units";
        if (formNameInput) formNameInput.value = formName || "floorplan_enquiry";
      } else if (ctx === 'sitevisit' || ctx === 'visit' || fn.indexOf('visit') !== -1) {
        mainText = "Schedule a Site Visit";
        subText = "Book an accompanied private site visit with an acre&key project specialist.";
        btnLabel = "Schedule Private Visit";
        if (formNameInput) formNameInput.value = formName || "site_visit";
      } else {
        mainText = "Schedule Your Consultation";
        subText = proj ? "Get unbiased property guidance, verified unit pricing, and independent acre&key diligence for " + proj + "." : "Get unbiased property guidance, detailed pricing, and independent diligence reports.";
        btnLabel = proj ? "Request Advisor Callback" : "Request Advisory Call";
        if (formNameInput) formNameInput.value = formName || "general_enquiry";
      }

      currentModalBtnText = btnLabel;

      if (mainHeading) mainHeading.textContent = mainText;
      if (subHeading) {
        if (subText && subText.indexOf('<') !== -1) {
          subHeading.innerHTML = subText;
        } else {
          subHeading.textContent = subText;
        }
      }
      if (btnTextEl) btnTextEl.textContent = btnLabel;

      if (showingSuccess) exitSuccessState();
      lfFormOpenTime = Date.now();
      lastActiveElement = document.activeElement;
      if (globalErr) globalErr.classList.remove("lf-show");
      var sw = window.innerWidth - document.documentElement.clientWidth;
      if (sw > 0) document.body.style.paddingRight = sw + "px";
      modalOverlay.style.display = "flex";
      void modalOverlay.offsetWidth;
      modalOverlay.classList.add("lf-modal-open");
      document.body.style.overflow = "hidden";
      setBackgroundA11y(true);
      [nameInput, phoneInput, emailInput].forEach(updateClearButtonsA11y);
      startPhoneAutofillWatch();
      setTimeout(function() { if (nameInput) nameInput.focus(); }, 250);
    },
    close: function () {
      if (!modalOverlay) return;
      stopPhoneAutofillWatch();
      modalOverlay.classList.remove("lf-modal-open");
      setTimeout(function() {
        if (modalOverlay && !modalOverlay.classList.contains("lf-modal-open")) {
          modalOverlay.style.display = "none";
        }
      }, 300);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      setBackgroundA11y(false);
      closePanel();
      if (showingSuccess) exitSuccessState();
      if (lastActiveElement && typeof lastActiveElement.focus === "function") lastActiveElement.focus();
    }
  };

  window.openModal  = function(context, formName, customOptions) { ModalController.open(context, formName, customOptions); };
  window.closeModal = function() { ModalController.close(); };
  if (window._pendingModal && window._pendingModal.length) {
    var pm = window._pendingModal;
    window._pendingModal = null;
    window.openModal(pm[0], pm[1], pm[2]);
  }

  var ValidationService = {
    setErr: function(fieldEl, errorEl, msg) {
      if (!fieldEl || !errorEl) return;
      fieldEl.classList.add("lf-has-error"); fieldEl.classList.remove("lf-is-valid");
      errorEl.textContent = msg;
      var inp = fieldEl.querySelector(".lf-input");
      if (inp) inp.setAttribute("aria-invalid", "true");
    },
    clrErr: function(fieldEl, errorEl) {
      if (!fieldEl || !errorEl) return;
      fieldEl.classList.remove("lf-has-error"); errorEl.textContent = "";
      var inp = fieldEl.querySelector(".lf-input");
      if (inp) inp.setAttribute("aria-invalid", "false");
    },
    setValid: function(fieldEl) { if (fieldEl) fieldEl.classList.add("lf-is-valid"); },
    clrValid: function(fieldEl) { if (fieldEl) fieldEl.classList.remove("lf-is-valid"); },
    normalizeString: function(str) {
      return str.trim().replace(/\s+/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "");
    },
    vName: function(live) {
      if (!nameInput) return false;
      var v = nameInput.value.trim();
      if (!v) { if (!live || submitted) this.setErr(nameField, nameErr, STRINGS.errNameRequired); return false; }
      if (!nameRx.test(this.normalizeString(v))) { this.setErr(nameField, nameErr, STRINGS.errNameInvalid); return false; }
      this.clrErr(nameField, nameErr);
      if (!live) this.setValid(nameField);
      return true;
    },
    vPhone: function(live) {
      if (!phoneInput) return false;
      var v = phoneInput.value.trim();
      if (!v) { if (!live || submitted) this.setErr(phoneField, phoneErr, STRINGS.errPhoneRequired); return false; }
      if (!currentCountry || !currentCountry.code) { this.setErr(phoneField, phoneErr, STRINGS.errPhoneCode); return false; }
      var digits = v.replace(/\D/g, "");
      var expLen = currentCountry.len || 10;
      var isVar  = VARIABLE_LENGTH_COUNTRIES.indexOf(currentCountry.code) !== -1;
      var min = isVar ? expLen - 1 : expLen; var max = isVar ? expLen + 1 : expLen;
      if (digits.length < min || digits.length > max) {
        this.setErr(phoneField, phoneErr, STRINGS.errPhoneInvalid.replace("{len}", expLen).replace("{country}", currentCountry.name));
        return false;
      }
      this.clrErr(phoneField, phoneErr);
      if (!live) this.setValid(phoneField);
      return true;
    },
    vEmail: function(live) {
      if (!emailInput) return false;
      var v = emailInput.value.trim();
      if (!v) { if (!live || submitted) this.setErr(emailField, emailErr, STRINGS.errEmailRequired); return false; }
      if (!emailRx.test(v) || /\.\./.test(v)) { this.setErr(emailField, emailErr, STRINGS.errEmailInvalid); return false; }
      this.clrErr(emailField, emailErr);
      if (!live) this.setValid(emailField);
      return true;
    }
  };

  var PhoneSyncManager = {
    syncInput: function() {
      if (!phoneInput) return;
      var raw = phoneInput.value.trim();
      var s = getSorted();
      var startedWith00 = raw.indexOf("00") === 0;
      var startedWithPlus = raw.indexOf("+") === 0;

      if (startedWithPlus || startedWith00) {
        var intlRaw = startedWith00 ? ("+" + raw.substring(2)) : raw;
        var digits = intlRaw.replace(/\D/g, "");
        var matched = null;
        for (var i = 4; i >= 1; i--) {
          var prefix = "+" + digits.substring(0, i);
          matched = findCountryByDial(prefix, s);
          if (matched) break;
        }
        if (matched) {
          selectCountry(matched);
          phoneInput.value = stripTrunkZero(digits.substring(matched.dial.replace(/\D/g, "").length));
        } else if (startedWith00 && !startedWithPlus) {
          phoneInput.value = stripTrunkZero(raw.replace(/\D/g, ""));
        } else {
          phoneInput.value = raw.replace(/\D/g, "");
          if (phoneInput.value.length > 15) phoneInput.value = phoneInput.value.substring(0, 15);
          checkValueState(phoneInput);
          ValidationService.setErr(phoneField, phoneErr, STRINGS.errPhoneUnknown);
          lastPhoneSyncedRaw = phoneInput.value;
          return;
        }
      } else {
        var stripped = raw.replace(/^091/, "").replace(/\D/g, "");
        stripped = stripTrunkZero(stripped);
        var bare = tryParseBareIntl(stripped, s);
        if (bare) {
          selectCountry(bare.country);
          phoneInput.value = bare.national;
        } else {
          phoneInput.value = stripped;
        }
      }
      if (phoneInput.value.length > 15) phoneInput.value = phoneInput.value.substring(0, 15);
      checkValueState(phoneInput);
      if (phoneErr && phoneErr.textContent === STRINGS.errPhoneUnknown) {
        ValidationService.clrErr(phoneField, phoneErr);
      }
      if (submitted) ValidationService.vPhone(true);
      lastPhoneSyncedRaw = phoneInput.value;
    }
  };

  var TransportService = {
    postToHubSpot: async function (portalId, formGuid, payload) {
      var url = "https://api.hsforms.com/submissions/v3/integration/submit/" + portalId + "/" + formGuid;

      var hsFields = [
        { name: "firstname",   value: payload.name },
        { name: "email",       value: payload.email },
        { name: "phone",       value: payload.phone },
        { name: "mobilephone", value: payload.phone }
      ];

      var trackingKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fclid"];
      trackingKeys.forEach(function(key) {
        if (payload[key]) {
          hsFields.push({ name: key, value: payload[key] });
        }
      });

      var hutkCookie = getCookie("hubspotutk");
      var contextObj = {
        pageUri: (window.location.protocol === "file:") ? "https://acrenkey.com/lead-form" : (payload.source_url || window.location.href),
        pageName: document.title || "acre&key Lead Form"
      };
      if (hutkCookie) {
        contextObj.hutk = hutkCookie;
      }

      var hsBody = {
        fields: hsFields,
        context: contextObj
      };


      var response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(hsBody)
      });

      if (!response.ok) {
        var errData = await response.json().catch(function() { return {}; });
        console.error("[HubSpot Forms API Error]", response.status, errData);
        throw new Error(errData.message || ("HubSpot submission failed with status " + response.status));
      }

      var resJson = await response.json().catch(function() { return { inlineMessage: "Success" }; });
      return resJson;
    }
  };

  document.querySelectorAll(".lf-input").forEach(function(inp) {
    var h = function(e) {
      if (e.animationName === "lfAutofillDetected") {
        var f = inp.closest(".lf-field");
        if (f) f.classList.add("lf-autofilled");
        checkValueState(inp);
        if (inp === phoneInput) PhoneSyncManager.syncInput();
        if (modalOverlay) modalOverlay.scrollLeft = 0;
        if (modalContent) modalContent.scrollLeft = 0;
        if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
      }
    };
    inp.addEventListener("animationstart", h);
    inp.addEventListener("focus", function() {
      if (modalOverlay) modalOverlay.scrollLeft = 0;
      if (modalContent) modalContent.scrollLeft = 0;
      if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
    });
    autofillListeners.push({ node: inp, handler: h });
  });

  window.addEventListener("scroll", function() {
    if (modalOverlay && modalOverlay.classList.contains("lf-modal-open") && window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }
  }, { passive: true });

  if (modalTrigger) modalTrigger.addEventListener("click", window.openModal);
  if (modalClose) modalClose.addEventListener("click", window.closeModal);

  var overlayClickTracker = function(e) {
    if (modalContent && !modalContent.contains(e.target) && ccPanel && !ccPanel.contains(e.target) && e.target !== ccBackdrop) {
      window.closeModal();
    }
  };
  if (modalOverlay) modalOverlay.addEventListener("click", overlayClickTracker);

  var modalKeyTracker = function(e) {
    if (e.key === "Escape") {
      (ccPanel && ccPanel.classList.contains("lf-cc-open")) ? (closePanel(), ccTrigger && ccTrigger.focus()) : window.closeModal();
      return;
    }
    if (e.key !== "Tab" || !modalContent) return;
    var els = Array.prototype.slice.call(modalContent.querySelectorAll(".lf-focusable"));
    var focusables = els.filter(function(el) {
      return (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
        && !el.disabled && parseInt(el.getAttribute("tabindex") || "0", 10) >= 0;
    });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey) { if (document.activeElement === first) { last.focus(); e.preventDefault(); } }
    else            { if (document.activeElement === last)  { first.focus(); e.preventDefault(); } }
  };
  if (modalOverlay) modalOverlay.addEventListener("keydown", modalKeyTracker);

  function selectCountry(c) {
    currentCountry = c;
    if (ccDisplay) ccDisplay.textContent = c.dial;
    if (ccVal) ccVal.value = c.dial;
  }

  function buildList(filter) {
    if (!ccList) return;
    ccList.innerHTML = "";
    var q = (filter || "").toLowerCase();
    filteredCountries = getSorted().filter(function(c){
      return !q || c.name.toLowerCase().indexOf(q) !== -1 || c.dial.indexOf(q) !== -1;
    });
    var frag = document.createDocumentFragment();
    filteredCountries.forEach(function(c, idx) {
      var el = document.createElement("div");
      el.className = "lf-cc-opt";
      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", currentCountry && c.code === currentCountry.code ? "true" : "false");
      el.setAttribute("tabindex", "-1");
      el.setAttribute("id", "lf-opt-" + idx);
      el.innerHTML = '<span class="lf-cc-opt-dial">' + c.dial + '</span><span>' + c.name + '</span>';
      el.addEventListener("click", function(e) {
        e.stopPropagation();
        selectCountry(c);
        closePanel();
        if (phoneInput) phoneInput.focus();
      });
      frag.appendChild(el);
    });
    ccList.appendChild(frag);
    kbFocusIdx = -1;
    if (ccSearch) ccSearch.removeAttribute("aria-activedescendant");
  }

  function openPanel() {
    if (!ccPanel || ccPanel.classList.contains("lf-cc-open")) return;
    buildList("");
    if (isMobile()) {
      if (modalOverlay) {
        if (ccBackdrop) modalOverlay.appendChild(ccBackdrop);
        modalOverlay.appendChild(ccPanel);
      }
      void ccPanel.offsetWidth; 
      ccPanel.classList.add("lf-cc-open");
      if (ccBackdrop) ccBackdrop.classList.add("lf-cc-open");
      if (ccTrigger) ccTrigger.setAttribute("aria-expanded", "true");
    } else {
      var phoneRow = document.querySelector(".lf-phone-row");
      if (phoneRow) phoneRow.appendChild(ccPanel);
      ccPanel.classList.add("lf-cc-open");
      if (ccTrigger) ccTrigger.setAttribute("aria-expanded", "true");
      if (ccSearch) ccSearch.focus();
      setTimeout(function() {
        document.addEventListener("click", outsideClickListener);
      }, 50);
    }
  }

  function closePanel() {
    if (!ccPanel || !ccPanel.classList.contains("lf-cc-open")) return;
    ccPanel.classList.remove("lf-cc-open");
    if (ccTrigger) ccTrigger.setAttribute("aria-expanded", "false");
    if (ccBackdrop) ccBackdrop.classList.remove("lf-cc-open");
    setTimeout(function() {
      if (ccPanel && !ccPanel.classList.contains("lf-cc-open")) {
        var phoneRow = document.querySelector(".lf-phone-row");
        if (phoneRow && ccPanel) phoneRow.appendChild(ccPanel);
      }
    }, 300);
    document.removeEventListener("click", outsideClickListener);
    document.removeEventListener("touchstart", outsideClickListener);
  }

  if (ccBackdrop) {
    ccBackdrop.addEventListener("click", function(e) { 
      e.stopPropagation();
      closePanel(); 
      if (ccTrigger) ccTrigger.focus(); 
    });
  }

  var outsideClickListener = function(e) {
    var target = e.target;
    if (target && target.nodeType === 3) target = target.parentNode;
    if (phoneField && !phoneField.contains(target) && target !== ccBackdrop) closePanel();
  };

  var ccTriggerTracker = function(e) {
    e.preventDefault(); e.stopPropagation();
    ccPanel && ccPanel.classList.contains("lf-cc-open") ? closePanel() : openPanel();
  };
  if (ccTrigger) ccTrigger.addEventListener("click", ccTriggerTracker);

  var ccSearchTracker = function() {
    var self = this; clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function(){ buildList(self.value); }, 150);
  };
  if (ccSearch) ccSearch.addEventListener("input", ccSearchTracker);

  var ccCcPanelKeyHandler = function(e) {
    if (!ccPanel || !ccPanel.classList.contains("lf-cc-open") || !ccList) return;
    var options = ccList.querySelectorAll(".lf-cc-opt");
    if (!options.length) return;
    function moveTo(newIdx) {
      if (kbFocusIdx >= 0 && options[kbFocusIdx]) { options[kbFocusIdx].classList.remove("lf-keyboard-active"); options[kbFocusIdx].setAttribute("aria-selected","false"); }
      kbFocusIdx = newIdx;
      options[kbFocusIdx].classList.add("lf-keyboard-active"); options[kbFocusIdx].setAttribute("aria-selected","true");
      options[kbFocusIdx].scrollIntoView({ block: "nearest" });
      if (ccSearch) ccSearch.setAttribute("aria-activedescendant", "lf-opt-" + kbFocusIdx);
    }
    if      (e.key === "ArrowDown") { e.preventDefault(); if (kbFocusIdx < options.length - 1) moveTo(kbFocusIdx + 1); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); if (kbFocusIdx > 0) moveTo(kbFocusIdx - 1); }
    else if (e.key === "Home")      { e.preventDefault(); if (options.length) moveTo(0); }
    else if (e.key === "End")       { e.preventDefault(); if (options.length) moveTo(options.length - 1); }
    else if (e.key === "Enter")     { e.preventDefault(); if (kbFocusIdx >= 0 && options[kbFocusIdx]) options[kbFocusIdx].dispatchEvent(new Event("click")); }
    else if (e.key === "Escape")    { e.preventDefault(); closePanel(); if (ccTrigger) ccTrigger.focus(); }
  };
  if (ccSearch) ccSearch.addEventListener("keydown", ccCcPanelKeyHandler);

  function checkValueState(inputEl) {
    if (!inputEl) return;
    var f = inputEl.closest(".lf-field");
    if (!f) return;
    if (inputEl.value.trim() !== "") f.classList.add("lf-has-value");
    else f.classList.remove("lf-has-value", "lf-autofilled", "lf-is-valid");
    updateClearButtonsA11y(inputEl);
  }

  var phoneClearTracker = function() {
    if (!phoneInput) return;
    phoneInput.value = "";
    if (phoneField) phoneField.classList.remove("lf-is-valid");
    checkValueState(phoneInput); phoneInput.focus();
    if (submitted) ValidationService.vPhone(true);
  };
  var phoneClearBtn = document.getElementById("lfPhoneClearBtn");
  if (phoneClearBtn) phoneClearBtn.addEventListener("click", phoneClearTracker);

  var activeFieldEraserClosuresArray = [];
  document.querySelectorAll(".lf-field:not(.lf-field-phone)").forEach(function(fieldEl) {
    var inp = fieldEl.querySelector(".lf-input");
    var btn = fieldEl.querySelector(".lf-clear-btn");
    if (btn && inp) {
      var h = function() {
        inp.value = ""; fieldEl.classList.remove("lf-is-valid");
        checkValueState(inp); inp.focus();
        if (submitted) {
          if (inp.id === "lfName")  ValidationService.vName(true);
          if (inp.id === "lfEmail") ValidationService.vEmail(true);
        }
      };
      btn.addEventListener("click", h);
      activeFieldEraserClosuresArray.push({ node: btn, handler: h });
    }
  });

  var inputFocusTracker = function() {
    var f = this.closest(".lf-field");
    if (f) {
      f.classList.add("lf-focused", "lf-has-value"); f.classList.remove("lf-is-valid");
    }
  };
  var inputBlurTracker = function() {
    var f = this.closest(".lf-field");
    if (f) f.classList.remove("lf-focused");
    checkValueState(this);
    if (this === nameInput  && nameInput.value.trim())  ValidationService.vName(false);
    if (this === emailInput && emailInput.value.trim()) ValidationService.vEmail(false);
    if (this === phoneInput && phoneInput.value.trim()) ValidationService.vPhone(false);
  };
  var inputInputTracker = function() { checkValueState(this); };

  [nameInput, emailInput, phoneInput].forEach(function(el) {
    if (!el) return;
    el.addEventListener("focus", inputFocusTracker);
    el.addEventListener("blur",  inputBlurTracker);
    el.addEventListener("input", inputInputTracker);
  });

  var syncPhoneTracker = function() { PhoneSyncManager.syncInput(); };
  if (phoneInput) {
    phoneInput.addEventListener("input",  syncPhoneTracker);
    phoneInput.addEventListener("change", syncPhoneTracker);
  }

  var phonePasteTracker = function(e) {
    var pasted = null;
    if (e.clipboardData && e.clipboardData.getData) pasted = e.clipboardData.getData("text/plain");
    if (pasted !== null) { e.preventDefault(); phoneInput.value = pasted; PhoneSyncManager.syncInput(); }
    else { setTimeout(function(){ PhoneSyncManager.syncInput(); }, 50); }
  };
  if (phoneInput) phoneInput.addEventListener("paste", phonePasteTracker);

  var UTM_TTL = 30 * 60 * 1000;
  var urlParams = new URLSearchParams(window.location.search);
  function getParam(key) {
    var val = urlParams.get(key);
    if (val) { Store.set("lf_" + key, val); Store.set("lf_" + key + "_ts", String(Date.now())); return val; }
    var ts = parseInt(Store.get("lf_" + key + "_ts") || "0", 10);
    if (ts && (Date.now() - ts) < UTM_TTL) return Store.get("lf_" + key) || "";
    return "";
  }

  (function prefillHidden() {
    var gclid = document.getElementById("lfGclid");
    var fclid = document.getElementById("lfFclid");
    var utmSource = document.getElementById("lfUtmSource");
    var utmMedium = document.getElementById("lfUtmMedium");
    var utmCampaign = document.getElementById("lfUtmCampaign");
    var utmTerm = document.getElementById("lfUtmTerm");
    var utmContent = document.getElementById("lfUtmContent");
    var sourceUrl = document.getElementById("lfSourceUrl");

    if (gclid) gclid.value       = getParam("gclid");
    if (fclid) fclid.value       = getParam("fclid");
    if (utmSource) utmSource.value   = getParam("utm_source");
    if (utmMedium) utmMedium.value   = getParam("utm_medium");
    if (utmCampaign) utmCampaign.value = getParam("utm_campaign");
    if (utmTerm) utmTerm.value     = getParam("utm_term");
    if (utmContent) utmContent.value  = getParam("utm_content");
    if (sourceUrl) sourceUrl.value   = window.location.href;

    setTimeout(function(){ [nameInput, phoneInput, emailInput].forEach(function(i){ if(i) checkValueState(i); }); }, 100);
  })();

  var formSubmitTracker = async function (e) {
    e.preventDefault();
    if (isSubmitting) return;
    submitted = true;
    if (globalErr) globalErr.classList.remove("lf-show");
    
    // Honeypot check
    if (honeypot && honeypot.value !== "") return;
    
    // Timing check (min 1500ms form interaction time)
    if (!lfFormOpenTime || (Date.now() - lfFormOpenTime) < 1500) return;

    if (phoneInput) PhoneSyncManager.syncInput();

    var nameOk  = ValidationService.vName();
    var phoneOk = ValidationService.vPhone();
    var emailOk = ValidationService.vEmail();
    if (!(nameOk && phoneOk && emailOk)) {
      if (!nameOk && nameInput) nameInput.focus();
      else if (!phoneOk && phoneInput) phoneInput.focus();
      else if (emailInput) emailInput.focus();
      return;
    }

    var lock = Store.get("lf_conversion_timestamp_lock");
    var cooldownMs = COOLDOWN_SECONDS * 1000;
    if (lock && (Date.now() - parseInt(lock, 10)) < cooldownMs) {
      if (globalErr) {
        globalErr.classList.add("lf-show");
        globalErr.textContent = STRINGS.errCooldown;
      }
      return;
    }
    if (!navigator.onLine) {
      if (globalErr) {
        globalErr.classList.add("lf-show");
        globalErr.textContent = STRINGS.errOffline;
      }
      return;
    }

    var subAt = document.getElementById("lfSubmittedAt");
    if (subAt) subAt.value = new Date().toISOString();
    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("lf-loading");
    }
    if (btnText) btnText.textContent = STRINGS.btnSending;

    slowSubmitTimer = setTimeout(function () {
      if (isSubmitting && btnText) btnText.textContent = STRINGS.slowSubmit;
    }, 5000);

    var payload = {
      name: ValidationService.normalizeString(nameInput.value),
      country_code: ccVal ? ccVal.value : "+91",
      phone: (ccVal ? ccVal.value : "+91") + phoneInput.value.trim().replace(/\s+/g,""),
      email: emailInput.value.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,""),
      source_url:   document.getElementById("lfSourceUrl") ? document.getElementById("lfSourceUrl").value : window.location.href,
      submitted_at: document.getElementById("lfSubmittedAt") ? document.getElementById("lfSubmittedAt").value : new Date().toISOString(),
      gclid: document.getElementById("lfGclid") ? document.getElementById("lfGclid").value : "",
      fclid: document.getElementById("lfFclid") ? document.getElementById("lfFclid").value : "",
      utm_source:   document.getElementById("lfUtmSource") ? document.getElementById("lfUtmSource").value : "",
      utm_medium:   document.getElementById("lfUtmMedium") ? document.getElementById("lfUtmMedium").value : "",
      utm_campaign: document.getElementById("lfUtmCampaign") ? document.getElementById("lfUtmCampaign").value : "",
      utm_term:     document.getElementById("lfUtmTerm") ? document.getElementById("lfUtmTerm").value : "",
      utm_content:  document.getElementById("lfUtmContent") ? document.getElementById("lfUtmContent").value : ""
    };

    try {
      var portalId = window.lfHubspotPortalId || HUBSPOT_PORTAL_ID;
      var formGuid = window.lfHubspotFormGuid || HUBSPOT_FORM_GUID;

      await TransportService.postToHubSpot(portalId, formGuid, payload);

      clearTimeout(slowSubmitTimer);
      Store.set("lf_conversion_timestamp_lock", String(Date.now()));

      var willRedirect = !!(REDIRECT_URL && REDIRECT_URL !== "#");
      if (willRedirect) {
        var targetUrl = REDIRECT_URL;
        if (window.location.search && targetUrl.indexOf("?") === -1) {
          targetUrl += window.location.search;
        }
        window.location.href = targetUrl;
        return;
      }

      var existingSuccess = mainFormContentBox ? mainFormContentBox.querySelector(".lf-success-canvas") : null;
      if (existingSuccess) existingSuccess.parentNode.removeChild(existingSuccess);
      if (mainFormContentBox) mainFormContentBox.classList.add("lf-showing-success");
      showingSuccess = true;

      var canvas = document.createElement("div");
      canvas.className = "lf-success-canvas";
      canvas.setAttribute("role","status");
      canvas.setAttribute("aria-live","polite");

      var circle = document.createElement("div");
      circle.className = "lf-success-circle";
      circle.innerHTML = '<svg viewBox="0 0 12 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 5l3.5 3.5L11 1"/></svg>';

      var h3 = document.createElement("h3");
      h3.setAttribute("tabindex","-1");
      h3.style.cssText = "font-size:20px;font-weight:500;color:var(--obsidian-black, #2F3B42);margin-bottom:6px;outline:none;";
      h3.textContent = STRINGS.successHeading;

      var p = document.createElement("p");
      p.style.cssText = "font-size:14px;color:var(--lf-muted, rgba(13, 27, 36, 0.6));";
      p.textContent = STRINGS.successBodyStay;

      canvas.appendChild(circle); canvas.appendChild(h3); canvas.appendChild(p);
      if (mainFormContentBox) mainFormContentBox.appendChild(canvas);
      setTimeout(function() { h3.focus(); }, 50);

      successCloseTimer = setTimeout(function(){
        successCloseTimer = null;
        window.closeModal();
      }, 2500);
    } catch (err) {
      clearTimeout(slowSubmitTimer);
      resetSubmitButton();
      if (globalErr) {
        globalErr.classList.add("lf-show");
        globalErr.textContent = STRINGS.errSubmit;
      }
      console.error("[Submission Failed]", err);
    }
  };

  if (form) form.addEventListener("submit", formSubmitTracker);

  /* ── Automatic CTA binding across the entire website ── */
  function bindWebsiteCTAs() {
    var ctaSelector = [
      '.sd-btn-gold',
      '.sd-btn-navy',
      '.btn-primary',
      '.nav-cta-btn',
      '.mobile-drawer-cta',
      '.category-cta-link',
      '.lf-page-cta-btn',
      '[data-open-modal]',
      '#lfModalTrigger',
      'a[href="#footer"]',
      'a[href="#contact"]',
      'a[href="#inquiry-form"]',
      'a[href="/#footer"]'
    ].join(', ');

    var elements = document.querySelectorAll(ctaSelector);
    elements.forEach(function(el) {
      // Don't intercept internal anchor links that are purely navigational if they are not CTAs,
      // but if they are CTA buttons or contain consultation/talk/advisory text, bind modal.
      el.addEventListener('click', function(e) {
        if (el.hasAttribute('data-no-modal') || el.getAttribute('data-no-modal') === 'true') {
          return;
        }
        var href = el.getAttribute('href');
        if (el.tagName === 'A' && href) {
          var isAnchorOnly = href === '#' || href.startsWith('#');
          var isPageNavigation = !isAnchorOnly && href !== '' && !href.startsWith('javascript:');
          if (isPageNavigation || href === '/' || href === '../' || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
          }
        }
        e.preventDefault();
        window.openModal();
      });
    });
  }

  function checkUrlAutoOpen() {
    if (window.location.hash === '#modal' || window.location.hash === '#open-modal' || window.location.search.indexOf('open=modal') !== -1) {
      setTimeout(function() {
        if (window.openModal) window.openModal();
      }, 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      bindWebsiteCTAs();
      checkUrlAutoOpen();
    });
  } else {
    bindWebsiteCTAs();
    checkUrlAutoOpen();
  }
  window.addEventListener('hashchange', checkUrlAutoOpen);

  window.lfActiveInstanceWipe = function() {
    clearTimeout(searchDebounceTimer);
    stopPhoneAutofillWatch();
    if (modalTrigger) modalTrigger.removeEventListener("click", window.openModal);
    if (modalClose) modalClose.removeEventListener("click", window.closeModal);
    if (modalOverlay) {
      modalOverlay.removeEventListener("click", overlayClickTracker);
      modalOverlay.removeEventListener("keydown", modalKeyTracker);
    }
    if (ccTrigger) ccTrigger.removeEventListener("click", ccTriggerTracker);
    if (ccSearch) {
      ccSearch.removeEventListener("input", ccSearchTracker);
      ccSearch.removeEventListener("keydown", ccCcPanelKeyHandler);
    }
    document.removeEventListener("click", outsideClickListener);
    document.removeEventListener("touchstart", outsideClickListener);
    var pBtn = document.getElementById("lfPhoneClearBtn");
    if (pBtn) pBtn.removeEventListener("click", phoneClearTracker);
    if (phoneInput) {
      phoneInput.removeEventListener("input",  syncPhoneTracker);
      phoneInput.removeEventListener("change", syncPhoneTracker);
      phoneInput.removeEventListener("paste",  phonePasteTracker);
    }
    if (form) form.removeEventListener("submit", formSubmitTracker);
    activeFieldEraserClosuresArray.forEach(function(item){ item.node.removeEventListener("click", item.handler); });
    [nameInput, emailInput, phoneInput].forEach(function(el) {
      if (!el) return;
      el.removeEventListener("focus", inputFocusTracker);
      el.removeEventListener("blur",  inputBlurTracker);
      el.removeEventListener("input", inputInputTracker);
    });
    autofillListeners.forEach(function(item){ item.node.removeEventListener("animationstart", item.handler); });
  };
})();
