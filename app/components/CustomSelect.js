"use client";

import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, maxHeight = '600px' }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="searchInput"
                style={{ 
                    width: '100%', 
                    padding: '0.6rem', 
                    borderRadius: '6px', 
                    border: '1px solid var(--card-border)', 
                    background: 'var(--card-bg)', 
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0, marginLeft: '0.5rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </div>
            
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    maxHeight: maxHeight,
                    overflowY: 'auto',
                    zIndex: 1000,
                    padding: '0.25rem 0'
                }}>
                    {options.map(opt => (
                        <div 
                            key={opt}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                background: value === opt ? 'var(--accent-primary)' : 'transparent',
                                color: value === opt ? '#fff' : 'var(--text-primary)',
                                fontWeight: value === opt ? 'bold' : 'normal',
                                fontSize: '0.95rem'
                            }}
                            onMouseOver={(e) => {
                                if (value !== opt) {
                                    e.currentTarget.style.background = 'var(--bg-secondary)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (value !== opt) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
