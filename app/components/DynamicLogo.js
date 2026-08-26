'use client';

import React from 'react';
import Image from 'next/image';

export default function DynamicLogo({ className = "w-8 h-8" }) {
    return (
        <div className={`relative overflow-hidden rounded-lg shadow-sm shrink-0 ${className}`}>
            <Image 
                src="/logo.jpg" 
                alt="Cycling Calendar" 
                width={128} 
                height={128} 
                className="w-full h-full object-cover"
                priority
            />
        </div>
    );
}
