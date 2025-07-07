let currentLang = localStorage.getItem("language") || "en";
const i18n = {
  title: { en: "WorldView", zh: "世界视图", ja: "ワールドビュー" },
  inputPlaceholder: { en: "Enter city name", zh: "输入城市名称", ja: "都市名を入力" },
  search: { en: "Search", zh: "搜索", ja: "検索" },
  useLocation: { en: "📍 Use My Location", zh: "📍 使用当前位置", ja: "📍 現在地を使う" },
  weatherTitle: { en: "Weather in", zh: "天气：", ja: "天気：" },
  culturalInfo: { en: "Cultural Info", zh: "文化信息", ja: "文化情報" },
  languageLabel: { en: "Official Language(s):", zh: "官方语言：", ja: "公用語：" },
  food: { en: "Famous Food:", zh: "代表食物：", ja: "名物料理：" },
  greeting: { en: "Greeting:", zh: "问候语：", ja: "あいさつ：" },
  etiquette: { en: "Etiquette:", zh: "礼仪：", ja: "マナー：" },
  error: { en: "⚠️ Could not fetch weather data.", zh: "⚠️ 无法获取天气信息。", ja: "⚠️ 天気情報を取得できませんでした。" },
};

let currentTileLayer;
const map = L.map('map').setView([20, 0], 2);
function setTileLayer(style = "default") {
  if (currentTileLayer) map.removeLayer(currentTileLayer);
  if (style === "illustrated") {
    currentTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB',
    }).addTo(map);
  } else {
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  }
}
setTileLayer();

map.on('click', async (e) => {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  showLoading(true);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const data = await res.json();
    const city = data.address.city || data.address.town || data.address.village || data.address.state;
    if (city) {
      document.getElementById("cityInput").value = city;
      saveSearchHistory(city);
      await getWeather(city, lat, lon);
    } else {
      alert("No city found at this location.");
    }
  } catch (err) {
    console.error("Reverse geocoding failed", err);
  } finally {
    showLoading(false);
  }
});

async function getWeather(city = null, lat = null, lon = null) {
  const cityInput = document.getElementById("cityInput");
  const weatherInfo = document.getElementById("weatherInfo");
  const cultureInfo = document.getElementById("cultureInfo");

  city = city || cityInput.value;
  if (!city) {
    weatherInfo.innerHTML = i18n.error[currentLang];
    cultureInfo.innerHTML = "";
    return;
  }

  showLoading(true);
  const apiKey = "d0c82cf6ceae567537e0079215ab67dd";
  const url = lat && lon
    ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();

    const temperature = data.main.temp;
    const condition = data.weather[0].description;
    const icon = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    const countryCode = data.sys.country;
    const latUsed = data.coord.lat;
    const lonUsed = data.coord.lon;

    map.setView([latUsed, lonUsed], 8);
    const markerIcon = L.icon({
      iconUrl: `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`,
      iconSize: [40, 26],
      iconAnchor: [20, 13],
    });
    L.marker([latUsed, lonUsed], { icon: markerIcon }).addTo(map);

    weatherInfo.innerHTML = `
      <h2>${i18n.weatherTitle[currentLang]} ${city}</h2>
      <img src="${iconUrl}" alt="${condition}" />
      <p>🌡 ${temperature}°C, ${condition}</p>
      <p>📍 Lat: ${latUsed.toFixed(2)}, Lon: ${lonUsed.toFixed(2)}</p>
    `;

    const countryRes = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
    const countryData = await countryRes.json();
    const country = countryData[0];
    const flag = country.flags.svg;
    const language = Object.values(country.languages).join(", ");
    const countryName = country.name.common;

    const cultureTemplates = {
      JP: { food: "Sushi 🍣", greeting: "こんにちは", etiquette: "Bowing 🙇‍♂️" },
      CN: { food: "Dumplings 🥟", greeting: "你好", etiquette: "Respect with both hands 🤲" },
      US: { food: "Burger 🍔", greeting: "Hello", etiquette: "Handshake 🤝" },
      FR: { food: "Baguette 🥖", greeting: "Bonjour", etiquette: "Cheek kissing 👋" },
      KR: { food: "Kimchi 🥬", greeting: "안녕하세요", etiquette: "Two hands for everything 🙇" },
      TH: { food: "Pad Thai 🍜", greeting: "สวัสดีครับ/ค่ะ", etiquette: "Wai greeting 🙏" },
    };

    const culture = cultureTemplates[countryCode] || { food: "N/A", greeting: "N/A", etiquette: "N/A" };

    cultureInfo.innerHTML = `
      <h3>🌍 ${i18n.culturalInfo[currentLang]}: ${countryName}</h3>
      <img src="${flag}" alt="Flag of ${countryName}" style="width: 100px; margin: 10px 0;" />
      <p><strong>${i18n.languageLabel[currentLang]}</strong> ${language}</p>
      <p><strong>${i18n.food[currentLang]}</strong> ${culture.food}</p>
      <p><strong>${i18n.greeting[currentLang]}</strong> ${culture.greeting}</p>
      <p><strong>${i18n.etiquette[currentLang]}</strong> ${culture.etiquette}</p>
    `;
  } catch (err) {
    weatherInfo.innerHTML = i18n.error[currentLang];
    cultureInfo.innerHTML = "";
    console.error(err);
  } finally {
    showLoading(false);
  }
}

function getLocationWeather() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  showLoading(true);
  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      const city = data.address.city || data.address.town || data.address.village || data.address.state;

      if (city) {
        document.getElementById("cityInput").value = city;
        saveSearchHistory(city);
        await getWeather(city, lat, lon);
      } else {
        alert("Could not determine city from location.");
      }
    } catch (err) {
      console.error("Location fetch failed", err);
    } finally {
      showLoading(false);
    }
  }, () => {
    alert("Unable to retrieve your location.");
    showLoading(false);
  });
}

// 显示/隐藏加载中动画
function showLoading(isLoading) {
  document.getElementById("loading").style.display = isLoading ? "block" : "none";
}

// 夜间模式切换
function toggleNightMode() {
  document.body.classList.toggle("dark");
}

// 地图风格切换
let isIllustrated = false;
function toggleMapStyle() {
  isIllustrated = !isIllustrated;
  setTileLayer(isIllustrated ? "illustrated" : "default");
}

// 保存历史记录
function saveSearchHistory(city) {
  const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
  if (!history.includes(city)) {
    history.unshift(city);
    if (history.length > 10) history.pop();
    localStorage.setItem("searchHistory", JSON.stringify(history));
  }
}

// 多语言切换
function highlightActiveLanguage() {
  document.querySelectorAll(".language-switch button").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
  });
}

document.querySelectorAll(".language-switch button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const lang = btn.getAttribute("data-lang");
    currentLang = lang;
    localStorage.setItem("language", lang);
    applyTranslations();
  });
});

// 自动语言 & 内容更新
function applyTranslations() {
  document.title = i18n.title[currentLang];
  document.querySelector("h1").textContent = i18n.title[currentLang];
  document.getElementById("cityInput").placeholder = i18n.inputPlaceholder[currentLang];
  const buttons = document.querySelectorAll(".search-box button");
  buttons[0].textContent = `🔍 ${i18n.search[currentLang]}`;
  buttons[1].textContent = i18n.useLocation[currentLang];
  highlightActiveLanguage();

  if (document.getElementById("weatherInfo").innerHTML) {
    const city = document.getElementById("cityInput").value;
    getWeather(city);
  }
}

// 自动夜间模式切换
function autoNightMode() {
  const hour = new Date().getHours();
  if (hour >= 19 || hour < 6) {
    document.body.classList.add("dark");
  }
}

// 初始化
applyTranslations();
autoNightMode();
