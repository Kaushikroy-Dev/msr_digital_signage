import { useState, useEffect } from 'react';
import './ClockWidget.css';

export default function ClockWidget({ config = {} }) {
    const {
        format = '24h',
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
        showDate = true,
        showSeconds = true,
        font = { family: 'Arial', size: 48, color: '#ffffff', weight: 'normal' },
        dateFormat = 'short'
    } = config;

    const [time, setTime] = useState(new Date());
    const [dateString, setDateString] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now);
            
            if (showDate) {
                const options = {
                    timeZone: timezone,
                    ...(dateFormat === 'short' ? {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    } : dateFormat === 'long' ? {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                    } : {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric'
                    })
                };
                setDateString(now.toLocaleDateString('en-US', options));
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [timezone, showDate, dateFormat]);

    const formatTime = (date) => {
        const options = {
            timeZone: timezone,
            hour12: format === '12h',
            hour: '2-digit',
            minute: '2-digit',
            ...(showSeconds && { second: '2-digit' })
        };
        return date.toLocaleTimeString('en-US', options);
    };

    const style = {
        fontFamily: font.family || 'Arial',
        fontSize: `${font.size || 48}px`,
        color: font.color || '#ffffff',
        fontWeight: font.weight || 'normal'
    };

    return (
        <div className="clock-widget" style={style}>
            <div className="clock-time">{formatTime(time)}</div>
            {showDate && <div className="clock-date">{dateString}</div>}
        </div>
    );
}
