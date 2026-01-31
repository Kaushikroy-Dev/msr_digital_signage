import { useState, useEffect } from 'react';
import './WeatherWidget.css';

export default function WeatherWidget({ config = {} }) {
    const {
        location = 'New York, US',
        units = 'C',
        apiKey = '',
        updateInterval = 600000, // 10 minutes
        font = { family: 'Arial', size: 24, color: '#ffffff' },
        showIcon = true,
        showDescription = true
    } = config;

    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeather = async () => {
            if (!apiKey) {
                setError('Weather API key not configured');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=${units === 'C' ? 'metric' : 'imperial'}&appid=${apiKey}`
                );

                if (!response.ok) {
                    throw new Error(`Weather API error: ${response.status}`);
                }

                const data = await response.json();
                setWeather(data);
                setError(null);
            } catch (err) {
                console.error('Weather fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, updateInterval);
        return () => clearInterval(interval);
    }, [location, units, apiKey, updateInterval]);

    const style = {
        fontFamily: font.family || 'Arial',
        fontSize: `${font.size || 24}px`,
        color: font.color || '#ffffff'
    };

    if (loading) {
        return (
            <div className="weather-widget" style={style}>
                <div className="weather-loading">Loading weather...</div>
            </div>
        );
    }

    if (error || !weather) {
        return (
            <div className="weather-widget" style={style}>
                <div className="weather-error">{error || 'Weather unavailable'}</div>
            </div>
        );
    }

    const temp = Math.round(weather.main.temp);
    const icon = weather.weather[0]?.icon;
    const description = weather.weather[0]?.description;

    return (
        <div className="weather-widget" style={style}>
            <div className="weather-main">
                {showIcon && icon && (
                    <img
                        src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
                        alt={description}
                        className="weather-icon"
                    />
                )}
                <div className="weather-temp">{temp}°{units}</div>
            </div>
            {showDescription && description && (
                <div className="weather-description">{description}</div>
            )}
            <div className="weather-location">{location}</div>
        </div>
    );
}
