import { useState, useEffect } from 'react';
import './CountdownWidget.css';

export default function CountdownWidget({ config = {} }) {
    const {
        targetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default: 7 days from now
        format = 'full', // 'full', 'compact', 'days-only'
        showLabels = true,
        font = { family: 'Arial', size: 48, color: '#ffffff', weight: 'bold' },
        labelFont = { family: 'Arial', size: 14, color: '#ffffff', weight: 'normal' },
        separator = ':',
        completedText = 'Event has started!',
        completedFont = { family: 'Arial', size: 36, color: '#ffffff', weight: 'bold' }
    } = config;

    const [timeRemaining, setTimeRemaining] = useState(null);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const target = new Date(targetDate);
            const now = new Date();
            const difference = target - now;

            if (difference <= 0) {
                setIsCompleted(true);
                setTimeRemaining(null);
                return;
            }

            setIsCompleted(false);
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeRemaining({ days, hours, minutes, seconds });
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (isCompleted) {
        return (
            <div 
                className="countdown-widget countdown-completed"
                style={{
                    fontFamily: completedFont.family || 'Arial',
                    fontSize: `${completedFont.size || 36}px`,
                    color: completedFont.color || '#ffffff',
                    fontWeight: completedFont.weight || 'bold'
                }}
            >
                {completedText}
            </div>
        );
    }

    if (!timeRemaining) {
        return <div className="countdown-widget">Calculating...</div>;
    }

    const style = {
        fontFamily: font.family || 'Arial',
        fontSize: `${font.size || 48}px`,
        color: font.color || '#ffffff',
        fontWeight: font.weight || 'bold'
    };

    const labelStyle = {
        fontFamily: labelFont.family || 'Arial',
        fontSize: `${labelFont.size || 14}px`,
        color: labelFont.color || '#ffffff',
        fontWeight: labelFont.weight || 'normal'
    };

    const formatNumber = (num) => String(num).padStart(2, '0');

    if (format === 'days-only') {
        return (
            <div className="countdown-widget" style={style}>
                <div className="countdown-value">{timeRemaining.days}</div>
                {showLabels && <div className="countdown-label" style={labelStyle}>Days</div>}
            </div>
        );
    }

    if (format === 'compact') {
        return (
            <div className="countdown-widget countdown-compact" style={style}>
                {timeRemaining.days > 0 && (
                    <>
                        <span className="countdown-value">{formatNumber(timeRemaining.days)}</span>
                        {showLabels && <span className="countdown-label" style={labelStyle}>d</span>}
                        <span className="countdown-separator">{separator}</span>
                    </>
                )}
                <span className="countdown-value">{formatNumber(timeRemaining.hours)}</span>
                {showLabels && <span className="countdown-label" style={labelStyle}>h</span>}
                <span className="countdown-separator">{separator}</span>
                <span className="countdown-value">{formatNumber(timeRemaining.minutes)}</span>
                {showLabels && <span className="countdown-label" style={labelStyle}>m</span>}
                <span className="countdown-separator">{separator}</span>
                <span className="countdown-value">{formatNumber(timeRemaining.seconds)}</span>
                {showLabels && <span className="countdown-label" style={labelStyle}>s</span>}
            </div>
        );
    }

    // Full format
    return (
        <div className="countdown-widget countdown-full">
            <div className="countdown-item">
                <div className="countdown-value" style={style}>{formatNumber(timeRemaining.days)}</div>
                {showLabels && <div className="countdown-label" style={labelStyle}>Days</div>}
            </div>
            <div className="countdown-separator" style={style}>{separator}</div>
            <div className="countdown-item">
                <div className="countdown-value" style={style}>{formatNumber(timeRemaining.hours)}</div>
                {showLabels && <div className="countdown-label" style={labelStyle}>Hours</div>}
            </div>
            <div className="countdown-separator" style={style}>{separator}</div>
            <div className="countdown-item">
                <div className="countdown-value" style={style}>{formatNumber(timeRemaining.minutes)}</div>
                {showLabels && <div className="countdown-label" style={labelStyle}>Minutes</div>}
            </div>
            <div className="countdown-separator" style={style}>{separator}</div>
            <div className="countdown-item">
                <div className="countdown-value" style={style}>{formatNumber(timeRemaining.seconds)}</div>
                {showLabels && <div className="countdown-label" style={labelStyle}>Seconds</div>}
            </div>
        </div>
    );
}
