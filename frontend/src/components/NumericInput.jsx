import { useState } from 'react';
import './NumericInput.css';

export default function NumericInput({
    value,
    onChange,
    label,
    min = 0,
    max = 1000,
    step = 1,
    unit = 'px',
    showSlider = true
}) {
    const [inputValue, setInputValue] = useState(value || min);

    const handleSliderChange = (e) => {
        const newValue = parseFloat(e.target.value);
        setInputValue(newValue);
        onChange(newValue);
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        const parsed = parseFloat(newValue);
        if (!isNaN(parsed) && parsed >= min && parsed <= max) {
            onChange(parsed);
        }
    };

    const handleIncrement = () => {
        const newValue = Math.min(max, (parseFloat(inputValue) || 0) + step);
        setInputValue(newValue);
        onChange(newValue);
    };

    const handleDecrement = () => {
        const newValue = Math.max(min, (parseFloat(inputValue) || 0) - step);
        setInputValue(newValue);
        onChange(newValue);
    };

    return (
        <div className="numeric-input-wrapper">
            {label && <label className="numeric-input-label">{label}</label>}

            <div className="numeric-input-controls">
                <div className="numeric-input-field">
                    <button
                        className="numeric-btn decrement"
                        onClick={handleDecrement}
                        type="button"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        className="numeric-value-input"
                        value={inputValue}
                        onChange={handleInputChange}
                        min={min}
                        max={max}
                        step={step}
                    />
                    {unit && <span className="numeric-unit">{unit}</span>}
                    <button
                        className="numeric-btn increment"
                        onClick={handleIncrement}
                        type="button"
                    >
                        +
                    </button>
                </div>

                {showSlider && (
                    <div className="numeric-slider-container">
                        <input
                            type="range"
                            className="numeric-slider"
                            value={inputValue}
                            onChange={handleSliderChange}
                            min={min}
                            max={max}
                            step={step}
                        />
                        <div className="slider-track-fill" style={{ width: `${((inputValue - min) / (max - min)) * 100}%` }} />
                    </div>
                )}
            </div>
        </div>
    );
}
