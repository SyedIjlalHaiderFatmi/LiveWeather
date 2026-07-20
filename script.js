// ---------------- SPLASH SCREEN LOGIC ----------------
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        splash.classList.add('splash-hidden');
        setTimeout(() => splash.remove(), 1000);
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
            showError("Location access denied. Please type city name.");
            loader.classList.add('hidden');
        });
    } else { showError("Geolocation is not supported by your browser."); }
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
    loader.innerText = "Analyzing Global Data...";

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`);
        const geoData = await geoRes.json();
        
        if (!geoData.results || geoData.results.length === 0) throw new Error("City not found");
        const location = geoData.results[0];
        fetchWeatherByCoords(location.latitude, location.longitude, location.name, location.country);
    } catch (error) {
        loader.classList.add('hidden');
        showError("City not found. Try checking the spelling.");
    }
}

async function fetchWeatherByCoords(lat, lon, cityName, countryName) {
    currentLat = lat; currentLon = lon; currentCityName = cityName; currentCountryName = countryName;
    const unitParam = isCelsius ? 'celsius' : 'fahrenheit';
    const sym = isCelsius ? '°C' : '°F';

    try {
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,uv_index_max&hourly=temperature_2m,weathercode&temperature_unit=${unitParam}&timezone=auto`);
        const weatherData = await weatherRes.json();
        
        const current = weatherData.current_weather;
        dailyForecastData = weatherData.daily; 
        hourlyForecastData = weatherData.hourly; 

        updateBackground(current.weathercode, current.temperature);

        document.getElementById('cityName').innerText = countryName ? `${cityName}, ${countryName}` : cityName;
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-US', options);

        document.getElementById('temperature').innerText = `${Math.round(current.temperature)}${sym}`;
        const code = current.weathercode;
        document.getElementById('description').innerText = weatherDesc[code] || 'Active Weather';
        document.getElementById('windSpeed').innerText = `${current.windspeed} km/h`;
        document.getElementById('highLow').innerText = `${Math.round(dailyForecastData.temperature_2m_max[0])}${sym} / ${Math.round(dailyForecastData.temperature_2m_min[0])}${sym}`;
        document.getElementById('weatherIcon').innerText = weatherIcons[code] || '🌍';

        renderHourlyForecast(0, sym);
        buildForecastCards(sym);

        loader.classList.add('hidden');
        weatherResult.classList.remove('hidden');
        toggleForecastBtn.classList.remove('hidden'); 

    } catch (error) {
        loader.classList.add('hidden');
        showError("Network error. Please check your internet connection.");
    }
}

function updateBackground(code, temp) {
    weatherBg.innerHTML = ''; 
    weatherBg.className = ''; 
    const tempC = isCelsius ? temp : (temp - 32) * 5/9;

    if (code === 0 || code === 1) {
        if (tempC >= 35) {
            weatherBg.classList.add('bg-hot');
            weatherBg.innerHTML = '<div class="sun hot"></div>';
        } else {
            weatherBg.classList.add('bg-clear');
            weatherBg.innerHTML = '<div class="sun"></div>';
        }
    } else if ([2, 3, 45, 48].includes(code)) {
        weatherBg.classList.add('bg-cloudy');
        createParticles('cloud', 8);
    } else if ([51, 53, 55, 61, 63, 65].includes(code)) {
        weatherBg.classList.add('bg-rain');
        createParticles('drop', 100);
    } else if ([71, 73, 75].includes(code)) {
        weatherBg.classList.add('bg-snow');
        createParticles('flake', 80);
    } else if ([95, 96, 99].includes(code)) {
        weatherBg.classList.add('bg-thunder');
        createParticles('drop', 150); 
    } else {
        weatherBg.classList.add('bg-default');
    }
}

function createParticles(type, count) {
    for(let i=0; i<count; i++) {
        let el = document.createElement('div');
        el.className = type;
        if (type === 'drop') {
            el.style.left = Math.random() * 100 + 'vw';
            el.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
            el.style.animationDelay = Math.random() * 2 + 's';
        } else if (type === 'flake') {
            el.style.left = Math.random() * 100 + 'vw';
            el.style.animationDuration = (Math.random() * 3 + 3) + 's';
            el.style.animationDelay = Math.random() * 5 + 's';
            let size = Math.random() * 6 + 4;
            el.style.width = size + 'px';
            el.style.height = size + 'px';
            el.style.opacity = Math.random();
        } else if (type === 'cloud') {
            el.style.top = Math.random() * 50 + 'vh';
            el.style.width = (Math.random() * 200 + 100) + 'px';
            el.style.height = (Math.random() * 80 + 40) + 'px';
            el.style.animationDuration = (Math.random() * 30 + 20) + 's';
            el.style.animationDelay = '-' + (Math.random() * 20) + 's';
        }
        weatherBg.appendChild(el);
    }
}

function renderHourlyForecast(dayIndex, sym) {
    hourlyContainer.innerHTML = ''; 
    let startIndex = dayIndex * 24;
    let endIndex = startIndex + 24;
    
    if (dayIndex === 0) {
        const nowTime = new Date().getTime();
        let foundIndex = 0;
        for(let i=0; i<24; i++) {
            if (new Date(hourlyForecastData.time[i]).getTime() >= nowTime - 3600000) { foundIndex = i; break; }
        }
        startIndex = foundIndex; endIndex = foundIndex + 24;
    }
    
    const dateObj = new Date(dailyForecastData.time[dayIndex]);
    const dayStr = dayIndex === 0 ? "Today's" : dateObj.toLocaleDateString('en-US', { weekday: 'long' }) + "'s";
    hourlyTitle.innerText = `${dayStr} Hourly Forecast`;

    for (let i = startIndex; i < endIndex && i < hourlyForecastData.time.length; i++) {
        const hourDate = new Date(hourlyForecastData.time[i]);
        let hours = hourDate.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12; hours = hours ? hours : 12; 
        
        const temp = Math.round(hourlyForecastData.temperature_2m[i]);
        const code = hourlyForecastData.weathercode[i];
        const icon = weatherIcons[code] || '☁️';
        
        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `<div class="h-time">${dayIndex === 0 && i === startIndex ? 'Now' : `${hours} ${ampm}`}</div><div class="h-icon">${icon}</div><div class="h-temp">${temp}${sym}</div>`;
        
        card.addEventListener('click', () => {
            document.querySelectorAll('.hourly-card').forEach(c => c.classList.remove('active-hour'));
            card.classList.add('active-hour');
            updateBackground(code, temp);
        });

        hourlyContainer.appendChild(card);
    }
}

function buildForecastCards(sym) {
    forecastContainer.innerHTML = '';
    for (let i = 1; i < dailyForecastData.time.length; i++) {
        const dateObj = new Date(dailyForecastData.time[i]);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const maxTemp = Math.round(dailyForecastData.temperature_2m_max[i]);
        const code = dailyForecastData.weathercode[i];
        const icon = weatherIcons[code] || '🌥️';

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `<div class="f-day">${dayName}</div><div class="f-icon">${icon}</div><div class="f-temps">${maxTemp}${sym}</div>`;
        
        card.addEventListener('click', () => {
            document.querySelectorAll('.forecast-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            showDayDetail(i, dateObj.toLocaleDateString('en-US', { weekday: 'long' }), sym);
            renderHourlyForecast(i, sym); 
            updateBackground(code, maxTemp);
        });
        forecastContainer.appendChild(card);
    }
}

function showDayDetail(index, fullDayName, sym) {
    dayDetailSection.classList.remove('hidden');
    const code = dailyForecastData.weathercode[index];
    
    document.getElementById('detailDayName').innerText = fullDayName + ' Details';
    document.getElementById('detailCondition').innerText = weatherDesc[code] || 'Variable';
    document.getElementById('detailMax').innerText = `${Math.round(dailyForecastData.temperature_2m_max[index])}${sym}`;
    document.getElementById('detailMin').innerText = `${Math.round(dailyForecastData.temperature_2m_min[index])}${sym}`;
    document.getElementById('detailWind').innerText = `${dailyForecastData.windspeed_10m_max[index]} km/h`;
    document.getElementById('detailUV').innerText = dailyForecastData.uv_index_max[index] || 'N/A';
}

function showError(message) { errorMsg.innerText = message; errorMsg.classList.remove('hidden'); }
