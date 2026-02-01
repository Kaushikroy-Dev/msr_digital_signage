import { useState, useEffect } from 'react';
import './ClockWidget.css';

export default function ClockWidget({ config = {} }) {
    const {
        format = '24h',
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
        showDate = true,
        showSeconds = true,
        // Support both old font object and new flat structure from designer
        fontFamily = config.font?.family || config.fontFamily || 'Arial',
        fontSize = config.font?.size || config.fontSize || 48,
        textColor = config.font?.color || config.textColor || '#000000',
        fontWeight = config.font?.weight || config.fontWeight || 'normal',
        backgroundColor = config.backgroundColor || 'transparent',
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
            hour12: format === '12h' || config.timeFormat === '12',
            hour: '2-digit',
            minute: '2-digit',
            ...(showSeconds && { second: '2-digit' })
        };
        return date.toLocaleTimeString('en-US', options);
    };

    const style = {
        fontFamily: fontFamily,
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: fontWeight,
        backgroundColor: backgroundColor === 'transparent' ? 'rgba(0,0,0,0.3)' : backgroundColor,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        padding: '10px',
        textShadow: textColor === '#ffffff' || textColor === 'white' ? '0 2px 4px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.3)',
        boxSizing: 'border-box'
    };

    return (
        <div className="clock-widget" style={style}>
            <div className="clock-time">{formatTime(time)}</div>
            {showDate && <div className="clock-date">{dateString}</div>}
        </div>
    );
}
