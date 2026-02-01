import { useState, useEffect, useRef } from 'react';
import './ChartWidget.css';

export default function ChartWidget({ config = {} }) {
    const {
        chartType = 'bar', // 'bar', 'line', 'pie', 'doughnut'
        data = [], // Array of { label, value } objects
        labels = [], // Alternative: array of labels
        values = [], // Alternative: array of values
        colors = ['#1976d2', '#dc004e', '#00a86b', '#ff9800', '#9c27b0'],
        showLegend = true,
        showGrid = true,
        font = { family: 'Arial', size: 12, color: '#000000', weight: 'normal' },
        title = '',
        titleFont = { family: 'Arial', size: 16, color: '#000000', weight: 'bold' },
        backgroundColor = '#ffffff'
    } = config;

    const canvasRef = useRef(null);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        // Process data - support both formats
        let processedData = [];
        if (data && data.length > 0) {
            processedData = data;
        } else if (labels && values && labels.length === values.length) {
            processedData = labels.map((label, index) => ({
                label,
                value: values[index]
            }));
        }

        setChartData(processedData);
    }, [data, labels, values]);

    useEffect(() => {
        if (!canvasRef.current || chartData.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (chartType === 'bar' || chartType === 'line') {
            drawBarOrLineChart(ctx, width, height, chartData, chartType, colors, showGrid, font);
        } else if (chartType === 'pie' || chartType === 'doughnut') {
            drawPieChart(ctx, width, height, chartData, chartType, colors, font);
        }
    }, [chartData, chartType, colors, showGrid, font]);

    const drawBarOrLineChart = (ctx, width, height, data, type, colors, showGrid, font) => {
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...data.map(d => d.value), 1);

        // Draw grid
        if (showGrid) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding + (chartHeight / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }
        }

        // Draw bars or lines
        const barWidth = chartWidth / data.length * 0.6;
        const spacing = chartWidth / data.length;

        data.forEach((item, index) => {
            const x = padding + spacing * index + spacing * 0.2;
            const barHeight = (item.value / maxValue) * chartHeight;
            const y = padding + chartHeight - barHeight;

            ctx.fillStyle = colors[index % colors.length];
            ctx.font = `${font.weight || 'normal'} ${font.size || 12}px ${font.family || 'Arial'}`;
            ctx.fillStyle = font.color || '#000000';

            if (type === 'bar') {
                ctx.fillStyle = colors[index % colors.length];
                ctx.fillRect(x, y, barWidth, barHeight);
            } else if (type === 'line') {
                ctx.strokeStyle = colors[index % colors.length];
                ctx.lineWidth = 2;
                if (index > 0) {
                    const prevX = padding + spacing * (index - 1) + spacing * 0.5;
                    const prevValue = data[index - 1].value;
                    const prevY = padding + chartHeight - (prevValue / maxValue) * chartHeight;
                    ctx.beginPath();
                    ctx.moveTo(prevX, prevY);
                    ctx.lineTo(x + barWidth / 2, y);
                    ctx.stroke();
                }
                ctx.fillStyle = colors[index % colors.length];
                ctx.beginPath();
                ctx.arc(x + barWidth / 2, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw label
            ctx.fillStyle = font.color || '#000000';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, x + barWidth / 2, height - padding + 20);
        });
    };

    const drawPieChart = (ctx, width, height, data, type, colors, font) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 40;
        const innerRadius = type === 'doughnut' ? radius * 0.6 : 0;

        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;

        data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * Math.PI * 2;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            if (innerRadius > 0) {
                ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            }
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            ctx.fillStyle = font.color || '#000000';
            ctx.font = `${font.weight || 'normal'} ${font.size || 12}px ${font.family || 'Arial'}`;
            ctx.textAlign = 'center';
            ctx.fillText(item.label, labelX, labelY);

            currentAngle += sliceAngle;
        });
    };

    if (chartData.length === 0) {
        return (
            <div className="chart-widget chart-empty" style={{ backgroundColor, color: font.color }}>
                No chart data configured
            </div>
        );
    }

    const containerStyle = {
        backgroundColor,
        fontFamily: font.family || 'Arial',
        fontSize: `${font.size || 12}px`,
        color: font.color || '#000000',
        fontWeight: font.weight || 'normal'
    };

    return (
        <div className="chart-widget" style={containerStyle}>
            {title && (
                <div 
                    className="chart-title"
                    style={{
                        fontFamily: titleFont.family || 'Arial',
                        fontSize: `${titleFont.size || 16}px`,
                        color: titleFont.color || '#000000',
                        fontWeight: titleFont.weight || 'bold'
                    }}
                >
                    {title}
                </div>
            )}
            <canvas ref={canvasRef} width={400} height={300} className="chart-canvas" />
            {showLegend && (
                <div className="chart-legend">
                    {chartData.map((item, index) => (
                        <div key={index} className="legend-item">
                            <span 
                                className="legend-color"
                                style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span className="legend-label">{item.label}</span>
                            <span className="legend-value">{item.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
