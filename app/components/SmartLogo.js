"use client";
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export default function SmartLogo({ src, alt, style, className }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [logoType, setLogoType] = useState('unknown'); // 'dark', 'light', 'mixed'

    useEffect(() => {
        if (!src) return;
        
        const analyzeImage = () => {
            try {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 50;
                    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                    canvas.width = Math.max(1, Math.floor(img.width * scale));
                    canvas.height = Math.max(1, Math.floor(img.height * scale));
                    
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
                    
                    if (brightness < 80) {
                        setLogoType('dark');
                    } else if (brightness > 200) {
                        setLogoType('light');
                    } else {
                        setLogoType('mixed');
                    }
                };
                img.src = src;
            } catch (e) {
                // Silently fallback on CORS restrictions
            }
        };
        
        analyzeImage();
    }, [src]);

    // Apply a clean capsule background rather than a blurry bloom
    const needsLightCapsule = isDark && logoType === 'dark';
    const needsDarkCapsule = !isDark && logoType === 'light';

    if (needsLightCapsule) {
        return (
            <div className="bg-white/95 px-1.5 py-0.5 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                <img 
                    src={src} 
                    alt={alt} 
                    className={`${className || ''} object-contain`}
                    style={style} 
                    loading="lazy"
                />
            </div>
        );
    }

    if (needsDarkCapsule) {
        return (
            <div className="bg-slate-900 px-1.5 py-0.5 rounded-lg shadow-sm flex items-center justify-center shrink-0">
                <img 
                    src={src} 
                    alt={alt} 
                    className={`${className || ''} object-contain`}
                    style={style} 
                    loading="lazy"
                />
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className={className || ''}
            style={style} 
            loading="lazy"
        />
    );
}
