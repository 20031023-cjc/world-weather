// 🌐 多语言 定义
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

// Loading overlay
function showLoading() { document.getElementById('loadingOverlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loadingOverlay').classList.add('hidden'); }

// 地图初始化 & 样式切换
const map = L.map('map').setView([20, 0], 2);
let tileLayer;
function setMapStyle(style) {
  if (tileLayer) map.removeLayer(tileLayer);
  const urls = {
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    hydda: 'https://{s}.tile.openstreetmap.fr/hydda/full/{z}/{x}/{y}.png'
  };
  tileLayer = L.tileLayer(urls[style], { attribution: 'Map data © OpenStreetMap contributors' }).addTo(map);
}
document.getElementById('mapStyleSelect').addEventListener('change', e => setMapStyle(e.target.value));
setMapStyle('osm');

// 地图点击获取城市
map.on('click', async e => {
  const { lat, lng } = e.latlng;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    const city = data.address.city || data.address.town || data.address.village || data.address.state;
    if (city) {
      document.getElementById('cityInput').value = city;
      getWeather(city, lat, lng);
    } else {
      alert('No city found at this location.');
    }
  } catch (err) {
    console.error('Reverse geocoding failed', err);
  }
});

// 搜索历史管理
let historyArr = JSON.parse(localStorage.getItem('searchHistory')) || [];
function renderHistory() {
  const ul = document.getElementById('historyList');
  ul.innerHTML = '';
  historyArr.forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.onclick = () => getWeather(city);
    ul.appendChild(li);
  });
}
function addHistory(city) {
  if (!historyArr.includes(city)) {
    historyArr.unshift(city);
    if (historyArr.length > 10) historyArr.pop();
    localStorage.setItem('searchHistory', JSON.stringify(historyArr));
    renderHistory();
  }
}
renderHistory();

// 获取并展示天气与文化
async function getWeather(city = null, lat = null, lon = null) {
  showLoading();
  const input = document.getElementById('cityInput');
  city = city || input.value;
  const weatherFront = document.querySelector('.weather-card .front');
  const weatherBack = document.querySelector('.weather-card .back');
  const cultureFront = document.querySelector('.culture-card .front');
  const cultureBack = document.querySelector('.culture-card .back');

  if (!city) {
    weatherFront.innerHTML = i18n.error[currentLang];
    hideLoading();
    return;
  }
  const key = 'd0c82cf6ceae567537e0079215ab67dd';
  const url = lat && lon
    ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
    : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('City not found');
    const data = await res.json();
    const temp = data.main.temp;
    const desc = data.weather[0].description;
    const icon = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    const countryCode = data.sys.country;
    const latU = data.coord.lat;
    const lonU = data.coord.lon;

    map.setView([latU, lonU], 8);
    L.marker([latU, lonU]).addTo(map);

    // 天气卡片
    weatherFront.innerHTML = `
      <h2>${i18n.weatherTitle[currentLang]} ${city}</h2>
      <img src="${iconUrl}" alt="${desc}" />
      <p>🌡 ${temp}°C, ${desc}</p>
    `;
    weatherBack.innerHTML = `
      <h3>Coordinates</h3>
      <p>Lat: ${latU}, Lon: ${lonU}</p>
      <p>Country: ${countryCode}</p>
    `;

    // 文化信息
    const cRes = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
    const cData = await cRes.json();
    const country = cData[0];
    const name = country.name.common;
    const flag = country.flags.svg;
    const langs = Object.values(country.languages).join(', ');
    const templates = {
      JP: { food: 'Sushi 🍣', greeting: 'こんにちは', etiquette: 'Bowing 🙇‍♂️' },
      CN: { food: 'Dumplings 🥟', greeting: '你好', etiquette: 'Respect with both hands 🤲' },
      US: { food: 'Burger 🍔', greeting: 'Hello', etiquette: 'Handshake 🤝' },
      FR: { food: 'Baguette 🥖', greeting: 'Bonjour', etiquette: 'Cheek kissing 👋' },
      KR: { food: 'Kimchi 🥬', greeting: '안녕하세요', etiquette: 'Two hands 🙇' },
      TH: { food: 'Pad Thai 🍜', greeting: 'สวัสดีครับ/ค่ะ', etiquette: 'Wai 🙏' },
    };
    const cult = templates[countryCode] || { food: 'N/A', greeting: 'N/A', etiquette: 'N/A' };

    cultureFront.innerHTML = `
      <h3>🌍 ${i18n.culturalInfo[currentLang]} ${name}</h3>
      <img src="${flag}" alt="Flag of ${name}" style="width:80px;" />
      <p><strong>${i18n.languageLabel[currentLang]}</strong> ${langs}</p>
    `;
    cultureBack.innerHTML = `
      <p><strong>${i18n.food[currentLang]}</strong> ${cult.food}</p>
      <p><strong>${i18n.greeting[currentLang]}</strong> ${cult.greeting}</p>
      <p><strong>${i18n.etiquette[currentLang]}</strong> ${cult.etiquette}</p>
    `;

    addHistory(city);
  } catch (err) {
    weatherFront.innerHTML = i18n.error[currentLang];
    console.error(err);
  } finally {
    hideLoading();
  }
}

document.getElementById('searchBtn').onclick = () => getWeather();
document.getElementById('useLocationBtn').onclick = () => getLocationWeather();

// 获取地理位置
function getLocationWeather() {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  showLoading();
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      const city = data.address.city || data.address.town || data.address.village || data.address.state;
      if (city) getWeather(city, lat, lon);
      else alert('Could not determine city');
    } catch (err) {
      console.error(err);
    } finally {
      hideLoading();
    }
  }, () => { alert('Unable to retrieve location'); hideLoading(); });
}

// 卡片翻转
document.querySelectorAll('.info-card').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('flipped'));
});

// 主题切换
const toggleBtn = document.getElementById('toggleTheme');
function loadTheme() {
  const t = localStorage.getItem('theme') || 'light';
  document.body.classList.toggle('dark-theme', t === 'dark');
}
toggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
loadTheme();

// 多语言支持
function highlightLang() {
  document.querySelectorAll('.language-switch button').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === currentLang));
}
document.querySelectorAll('.language-switch button').forEach(btn => btn.addEventListener('click', () => {
  currentLang = btn.dataset.lang;
  localStorage.setItem('language', currentLang);
  applyTranslations();
}));
function applyTranslations() {
  document.title = i18n.title[currentLang];
  document.querySelector('.title').textContent = i18n.title[currentLang];
  document.getElementById('cityInput').placeholder = i18n.inputPlaceholder[currentLang];
  document.getElementById('searchBtn').textContent = `🔍 ${i18n.search[currentLang]}`;
  document.getElementById('useLocationBtn').textContent = i18n.useLocation[currentLang];
  highlightLang();
  if (localStorage.getItem('lastCity')) getWeather(localStorage.getItem('lastCity'));
}
applyTranslations();
