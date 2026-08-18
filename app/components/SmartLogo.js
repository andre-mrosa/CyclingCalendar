"use client";
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export default function SmartLogo({ src, alt, style, className }) {
    const { theme } = useTheme();
    const [logoType, setLogoType] = useState('unknown'); // 'dark', 'light', 'mixed'
    const imgRef = useRef(null);

    useEffect(() => {
        if (!src) return;
        
        const analyzeImage = () => {
            try {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Resize for performance
                    const maxSize = 50;
                    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    let r = 0, g = 0, b = 0, count = 0;
                    
                    for (let i = 0; i < imageData.length; i += 4) {
                        const alpha = imageData[i+3];
                        if (alpha > 50) { // Only consider visible pixels
                            r += imageData[i];
                            g += imageData[i+1];
                            b += imageData[i+2];
                            count++;
                        }
                    }
                    
                    if (count === 0) {
                        setLogoType('unknown');
                        return;
                    }
                    
                    r = r / count;
                    g = g / count;
                    b = b / count;
                    
                    // YIQ brightness formula
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    
                    if (brightness < 100) {
                        setLogoType('dark');
                    } else if (brightness > 200) {
                        setLogoType('light');
                    } else {
                        setLogoType('mixed');
                    }
                };
                img.src = src;
            } catch (e) {
                console.error("Error analyzing image", e);
            }
        };
        
        analyzeImage();
    }, [src]);

    let applyShadow = false;
    let shadowClass = '';
    
    // In dark mode, if the logo is dark, we need a white shadow
    if (theme === 'dark' && logoType === 'dark') {
        applyShadow = true;
        shadowClass = 'drop-shadow-light';
    }
    // In light mode, if the logo is light (white), we need a dark shadow
    else if (theme !== 'dark' && logoType === 'light') {
        applyShadow = true;
        shadowClass = 'drop-shadow-dark';
    }

    return (
        <img 
            ref={imgRef}
            src={src} 
            alt={alt} 
            className={`${className || ''} ${applyShadow ? shadowClass : ''}`.trim()}
            style={{ 
                ...style, 
                transition: 'filter 0.3s ease' 
            }} 
        />
    );
}
