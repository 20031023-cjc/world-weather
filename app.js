// 🌍 WorldView v3.0 - app.js

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
  greeting: { en: "Greeting:", zh: "打招呼方式：", ja: "挨拶：" },
};

function applyTranslations() {
  document.title = i18n.title[currentLang];
  document.getElementById("cityInput").placeholder = i18n.inputPlaceholder[currentLang];
  document.querySelector(".search-box button").innerText = `🔍 ${i18n.search[currentLang]}`;
  document.getElementById("useLocationBtn").innerText = i18n.useLocation[currentLang];
}

// 切换语言
const langButtons = document.querySelectorAll(".language-switch button");
langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem("language", currentLang);
    applyTranslations();
  });
});

// 初始化地图
const map = L.map("map").setView([35.6895, 139.6917], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a>'
}).addTo(map);

map.on("click", function (e) {
  const ripple = document.createElement("div");
  ripple.className = "map-ripple";
  ripple.style.left = `${e.originalEvent.pageX - 50}px`;
  ripple.style.top = `${e.originalEvent.pageY - 50}px`;
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);

  fetchCityDataByCoords(e.latlng.lat, e.latlng.lng);
});

// 使用城市名称获取天气
async function getWeather() {
  const city = document.getElementById("cityInput").value;
  if (!city) return;
  const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}`);
  const geoData = await geoRes.json();
  if (!geoData[0]) return;
  const lat = geoData[0].lat;
  const lon = geoData[0].lon;
  fetchCityDataByCoords(lat, lon);
  addFavorite(city);
}

// 使用当前位置获取天气
function getLocationWeather() {
  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    fetchCityDataByCoords(latitude, longitude);
  });
}

async function fetchCityDataByCoords(lat, lon) {
  map.setView([lat, lon], 8);

  const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=2cb36c12d78b26cc6c0a916a648a7c1d&units=metric`);
  const weatherData = await weatherRes.json();

  document.getElementById("weatherInfo").innerHTML = `
    <h2>${i18n.weatherTitle[currentLang]} ${weatherData.name}</h2>
    <p>${weatherData.weather[0].description}, 🌡️ ${weatherData.main.temp}°C</p>
  `;

  document.getElementById("cultureInfo").innerHTML = `
    <h3>${i18n.culturalInfo[currentLang]}</h3>
    <p><strong>${i18n.languageLabel[currentLang]}</strong> ${weatherData.sys.country === "JP" ? "Japanese" : "English"}</p>
    <p><strong>${i18n.food[currentLang]}</strong> ${getFamousFood(weatherData.sys.country)}</p>
    <p><strong>${i18n.greeting[currentLang]}</strong> ${getGreeting(weatherData.sys.country)}</p>
  `;

  L.marker([lat, lon]).addTo(map);
}

// 简化文化信息（可拓展）
function getFamousFood(countryCode) {
  const foods = {
    JP: "寿司 (Sushi)",
    CN: "火锅 (Hotpot)",
    US: "汉堡 (Burger)",
    FR: "法式蜗牛 (Escargot)"
  };
  return foods[countryCode] || "Unknown";
}

function getGreeting(countryCode) {
  const greetings = {
    JP: "こんにちは (Konnichiwa)",
    CN: "你好 (Nǐ hǎo)",
    US: "Hello",
    FR: "Bonjour"
  };
  return greetings[countryCode] || "Hello";
}

// 收藏城市功能
function addFavorite(cityName) {
  const favoritesDiv = document.getElementById("favoritesList");
  const existing = Array.from(favoritesDiv.children).find(btn => btn.textContent === cityName);
  if (existing) return;

  const btn = document.createElement("button");
  btn.textContent = cityName;
  btn.onclick = () => {
    document.getElementById("cityInput").value = cityName;
    getWeather();
    btn.classList.add("favorite-popped");
    setTimeout(() => btn.classList.remove("favorite-popped"), 400);
  };
  favoritesDiv.appendChild(btn);
}

// 夜间模式切换
const toggleBtn = document.getElementById("toggleMode");
toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  toggleBtn.classList.add("rotating");
  setTimeout(() => toggleBtn.classList.remove("rotating"), 600);
});

// 星空背景初始化
const canvas = document.getElementById("starCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const stars = Array.from({ length: 100 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  radius: Math.random() * 1.5,
  alpha: Math.random()
}));

function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
    star.alpha += (Math.random() - 0.5) * 0.05;
    if (star.alpha < 0.1) star.alpha = 0.1;
    if (star.alpha > 1) star.alpha = 1;
  }
  requestAnimationFrame(animateStars);
}
animateStars();

applyTranslations();
