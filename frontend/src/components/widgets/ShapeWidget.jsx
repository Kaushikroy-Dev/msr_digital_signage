import './ShapeWidget.css';

export default function ShapeWidget({ config = {} }) {
    const {
        shapeType = 'rectangle', // 'rectangle', 'circle', 'ellipse', 'line', 'triangle'
        width = 100,
        height = 100,
        backgroundColor = '#1976d2',
        borderColor = '#000000',
        borderWidth = 0,
        borderRadius = 0,
        rotation = 0,
        opacity = 1,
        gradient = null, // e.g., 'linear-gradient(45deg, #ff0000, #0000ff)'
        shadow = null // e.g., '0px 2px 4px rgba(0,0,0,0.2)'
    } = config;

    const style = {
        width: `${width}%`,
        height: `${height}%`,
        backgroundColor: gradient ? 'transparent' : backgroundColor,
        background: gradient || backgroundColor,
        borderColor,
        borderWidth: `${borderWidth}px`,
        borderStyle: borderWidth > 0 ? 'solid' : 'none',
        borderRadius: shapeType === 'circle' || shapeType === 'ellipse' ? '50%' : `${borderRadius}px`,
        opacity,
        transform: `rotate(${rotation}deg)`,
        boxShadow: shadow || 'none',
        transition: 'all 0.3s ease'
    };

    if (shapeType === 'line') {
        return (
            <div 
                className="shape-widget shape-line"
                style={{
                    ...style,
                    width: '100%',
                    height: `${borderWidth || 2}px`,
                    backgroundColor: borderColor || backgroundColor,
                    border: 'none',
                    borderRadius: 0
                }}
            />
        );
    }

    if (shapeType === 'triangle') {
        return (
            <div 
                className="shape-widget shape-triangle"
                style={{
                    width: 0,
                    height: 0,
                    borderLeft: `${width / 2}% solid transparent`,
                    borderRight: `${width / 2}% solid transparent`,
                    borderBottom: `${height}% solid ${gradient ? 'transparent' : backgroundColor}`,
                    background: gradient || 'none',
                    opacity,
                    transform: `rotate(${rotation}deg)`,
                    boxShadow: shadow || 'none'
                }}
            />
        );
    }

    return (
        <div 
            className={`shape-widget shape-${shapeType}`}
            style={style}
        />
    );
}
