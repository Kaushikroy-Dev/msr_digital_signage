import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import './QRCodeWidget.css';

export default function QRCodeWidget({ config = {} }) {
    const {
        text = '',
        size = 200,
        errorCorrection = 'M',
        margin = 1,
        color = { dark: '#000000', light: '#ffffff' }
    } = config;

    const canvasRef = useRef(null);

    useEffect(() => {
        if (!text || !canvasRef.current) return;

        const options = {
            width: size,
            margin: margin,
            color: {
                dark: color.dark,
                light: color.light
            },
            errorCorrectionLevel: errorCorrection
        };

        QRCode.toCanvas(canvasRef.current, text, options, (err) => {
            if (err) {
                console.error('QR Code generation error:', err);
            }
        });
    }, [text, size, errorCorrection, margin, color]);

    if (!text) {
        return (
            <div className="qrcode-widget">
                <div className="qrcode-error">No text provided</div>
            </div>
        );
    }

    return (
        <div className="qrcode-widget">
            <canvas ref={canvasRef} className="qrcode-canvas" />
        </div>
    );
}
