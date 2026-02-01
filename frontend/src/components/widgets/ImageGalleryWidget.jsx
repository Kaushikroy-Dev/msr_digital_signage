import { useState, useEffect } from 'react';
import './ImageGalleryWidget.css';

export default function ImageGalleryWidget({ config = {} }) {
    const {
        images = [], // Array of image URLs or media asset IDs
        transitionType = 'fade', // 'fade', 'slide', 'zoom'
        transitionDuration = 1000, // milliseconds
        displayDuration = 5000, // milliseconds per image
        showControls = false,
        showIndicators = true,
        autoplay = true,
        loop = true,
        fitMode = 'cover', // 'cover', 'contain', 'fill'
        backgroundColor = '#000000'
    } = config;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (!autoplay || images.length <= 1) return;

        const interval = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentIndex(prev => {
                    if (prev >= images.length - 1) {
                        return loop ? 0 : prev;
                    }
                    return prev + 1;
                });
                setIsTransitioning(false);
            }, transitionDuration);
        }, displayDuration);

        return () => clearInterval(interval);
    }, [autoplay, images.length, displayDuration, transitionDuration, loop]);

    const goToSlide = (index) => {
        if (index === currentIndex) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex(index);
            setIsTransitioning(false);
        }, transitionDuration / 2);
    };

    const nextSlide = () => {
        if (currentIndex >= images.length - 1) {
            if (loop) goToSlide(0);
        } else {
            goToSlide(currentIndex + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex <= 0) {
            if (loop) goToSlide(images.length - 1);
        } else {
            goToSlide(currentIndex - 1);
        }
    };

    if (images.length === 0) {
        return (
            <div 
                className="image-gallery-widget image-gallery-empty"
                style={{ backgroundColor }}
            >
                No images configured
            </div>
        );
    }

    const currentImage = images[currentIndex];
    const imageUrl = typeof currentImage === 'string' ? currentImage : currentImage.url || currentImage;

    const containerStyle = {
        backgroundColor,
        transition: `opacity ${transitionDuration}ms ease-in-out`
    };

    const imageStyle = {
        objectFit: fitMode,
        transition: transitionType === 'fade' 
            ? `opacity ${transitionDuration}ms ease-in-out`
            : transitionType === 'zoom'
            ? `transform ${transitionDuration}ms ease-in-out, opacity ${transitionDuration}ms ease-in-out`
            : 'none'
    };

    return (
        <div className="image-gallery-widget" style={containerStyle}>
            <div className="gallery-container">
                {transitionType === 'slide' && images.length > 1 && (
                    <div 
                        className="gallery-slider"
                        style={{
                            transform: `translateX(-${currentIndex * 100}%)`,
                            transition: `transform ${transitionDuration}ms ease-in-out`
                        }}
                    >
                        {images.map((img, index) => {
                            const url = typeof img === 'string' ? img : img.url || img;
                            return (
                                <div key={index} className="gallery-slide">
                                    <img src={url} alt={`Slide ${index + 1}`} style={imageStyle} />
                                </div>
                            );
                        })}
                    </div>
                )}
                {transitionType !== 'slide' && (
                    <img 
                        src={imageUrl} 
                        alt={`Image ${currentIndex + 1}`}
                        className={`gallery-image ${isTransitioning ? 'transitioning' : ''}`}
                        style={imageStyle}
                    />
                )}
            </div>

            {showIndicators && images.length > 1 && (
                <div className="gallery-indicators">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            className={`gallery-indicator ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => goToSlide(index)}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            {showControls && images.length > 1 && (
                <>
                    <button 
                        className="gallery-control gallery-prev"
                        onClick={prevSlide}
                        aria-label="Previous image"
                    >
                        ‹
                    </button>
                    <button 
                        className="gallery-control gallery-next"
                        onClick={nextSlide}
                        aria-label="Next image"
                    >
                        ›
                    </button>
                </>
            )}
        </div>
    );
}
