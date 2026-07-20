// ---------------- SPLASH SCREEN LOGIC ----------------
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) {
            splash.classList.add('splash-hidden');
            setTimeout(() => splash.remove(), 1000);
        }
    }, 3500); 
});

// ---------------- WEATHER APP LOGIC ----------------
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const unitBtn = document.getElementById('unitBtn');
const cityInput = document.getElementById('cityInput');
const weatherResult = document.getElementById('weatherResult');
const loader = document.getElementById('loader');
const errorMsg = document.getElementById('errorMsg');

const toggleForecastBtn = document.getElementById('toggleForecastBtn');
const forecastSection = document.getElementById('forecastSection');
const forecastContainer = document.getElementById('forecastContainer');
const dayDetailSection = document.getElementById('dayDetailSection');
const hourlyContainer = document.getElementById('hourlyContainer');
const hourlyTitle = document.getElementById('hourlyTitle');
const weatherBg = document.getElementById('weather-bg'); 

let dailyForecastData = null; 
let hourlyForecastData = null;
let currentLat = null;
let currentLon = null;
let currentCityName = "";
let currentCountryName = "";
let isCelsius = true;

const weatherIcons = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '❄️', 73: '❄️', 75: '❄️', 95: '⚡', 96: '⛈️', 99: '⛈️' };
const weatherDesc = { 0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Depositing Rime Fog', 51: 'Light Drizzle', 61: 'Slight Rain', 71: 'Slight Snow Fall', 95: 'Thunderstorms' };

searchBtn.addEventListener('click', () => fetchCityCoordinates(cityInput.value.trim()));
cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') fetchCityCoordinates(cityInput.value.trim()); });
toggleForecastBtn.addEventListener('click', () => { forecastSection.classList.remove('hidden'); toggleForecastBtn.classList.add('hidden'); });

unitBtn.addEventListener('click', () => {
    isCelsius = !isCelsius;
    unitBtn.innerText = isCelsius ? '°C' : '°F';
    if (currentLat && currentLon) fetchWeatherByCoords(currentLat, currentLon, currentCityName, currentCountryName);
});

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        resetUI();
        loader.classList.remove('hidden');
        loader.innerText = "Finding your location...";
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                const data = await res.json();
                fetchWeatherByCoords(lat, lon, data.city || data.locality || "Your Location", data.countryName || "");
            } catch(e) { fetchWeatherByCoords(lat, lon, "Your Location", ""); }
        }, () => {
            showError("Location access denied.");
            loader.classList.add('hidden');
        });
    }
});

function resetUI() {
    errorMsg.classList.add('hidden');
    weatherResult.classList.add('hidden');
    forecastSection.classList.add('hidden');
    dayDetailSection.classList.add('hidden');
    toggleForecastBtn.classList.add('hidden');
    forecastContainer.innerHTML = ''; 
}

async function fetchCityCoordinates(city) {
    if (!city) return showError("Please enter a city name!");
    resetUI();
    loader.classList.remove('hidden');
    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`);
        const geoData = await geoRes.json();
        if (!geoData.results) throw new Error();
        fetchWeatherByCoords(geoData.results[0].latitude, geoData.results[0].longitude, geoData.results[0].name, geoData.results[0].country);
    } catch (e) { loader.classList.add('hidden'); showError("City not found."); }
}

async function fetchWeatherByCoords(lat, lon, cityName, countryName) {
    currentLat = lat; currentLon = lon; currentCityName = cityName; currentCountryName = countryName;
    const unitParam = isCelsius ? 'celsius' : 'fahrenheit';
    const sym = isCelsius ? '°C' : '°F';
    try {
        // FIXED SYNTAX ERROR HERE
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,uv_index_max&hourly=temperature_2m,weathercode&temperature_unit=${unitParam}&timezone=auto`);
        const weatherData = await weatherRes.json();
        
        dailyForecastData = weatherData.daily; 
        hourlyForecastData = weatherData.hourly; 
        updateBackground(weatherData.current.weather_code, weatherData.current.temperature_2m, weatherData.current.is_day);

        document.getElementById('cityName').innerText = `${cityName}, ${countryName}`;
        document.getElementById('temperature').innerText = `${Math.round(weatherData.current.temperature_2m)}${sym}`;
        document.getElementById('weatherIcon').innerText = weatherIcons[weatherData.current.weather_code] || '🌍';
        
        renderHourlyForecast(0, sym);
        buildForecastCards(sym);
        loader.classList.add('hidden');
        weatherResult.classList.remove('hidden');
        toggleForecastBtn.classList.remove('hidden'); 
    } catch (e) { loader.classList.add('hidden'); showError("Network error."); }
}

function updateBackground(code, temp, isDay) {
    weatherBg.innerHTML = ''; 
    weatherBg.className = ''; 
    const tempC = isCelsius ? temp : (temp - 32) * 5/9;
    if (code === 0 || code === 1) {
        weatherBg.classList.add(isDay === 0 ? 'bg-night-clear' : 'bg-clear');
        weatherBg.innerHTML = isDay === 0 ? '<div class="moon"></div>' : '<div class="sun"></div>';
    } else if ([2, 3, 45, 48].includes(code)) {
        weatherBg.classList.add('bg-cloudy');
        createParticles('cloud', 8);
    } else if ([51, 65].includes(code)) {
        weatherBg.classList.add('bg-rain');
        createParticles('drop', 100);
    }
    // Baqi conditions waisay hi...
}

function renderHourlyForecast(dayIndex, sym) {
    hourlyContainer.innerHTML = '';
    for (let i = dayIndex * 24; i < (dayIndex + 1) * 24 && i < hourlyForecastData.time.length; i++) {
        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `<div class="h-time">${i % 24}:00</div><div class="h-icon">${weatherIcons[hourlyForecastData.weathercode[i]]}</div><div class="h-temp">${Math.round(hourlyForecastData.temperature_2m[i])}${sym}</div>`;
        card.addEventListener('click', () => updateBackground(hourlyForecastData.weathercode[i], hourlyForecastData.temperature_2m[i], 1));
        hourlyContainer.appendChild(card);
    }
}

function buildForecastCards(sym) {
    forecastContainer.innerHTML = '';
    for (let i = 1; i < dailyForecastData.time.length; i++) {
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `<div class="f-day">${new Date(dailyForecastData.time[i]).toLocaleDateString('en-US', {weekday:'short'})}</div><div class="f-temps">${Math.round(dailyForecastData.temperature_2m_max[i])}${sym}</div>`;
        card.addEventListener('click', () => updateBackground(dailyForecastData.weathercode[i], dailyForecastData.temperature_2m_max[i], 1));
        forecastContainer.appendChild(card);
    }
}

function showError(m) { errorMsg.innerText = m; errorMsg.classList.remove('hidden'); }
