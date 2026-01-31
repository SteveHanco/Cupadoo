
import React from 'react';

interface CupIconProps {
  color: string;
  className?: string;
  isShaking?: boolean;
  isUp?: boolean;
}

export const CupIcon: React.FC<CupIconProps> = ({ color, className = "", isShaking, isUp }) => {
  return (
    <div className={`${className} transition-transform duration-300 ${isShaking ? 'animate-bounce' : ''} ${isUp ? '-translate-y-12 rotate-12 scale-110' : ''}`}>
      <svg width="60" height="80" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 5C5 2.23858 7.23858 0 10 0H50C52.7614 0 55 2.23858 55 5V70C55 75.5228 50.5228 80 45 80H15C9.47715 80 5 75.5228 5 70V5Z" fill={color}/>
        <path d="M5 10H55V15H5V10Z" fill="black" fillOpacity="0.1"/>
        <path d="M5 25H55V30H5V25Z" fill="black" fillOpacity="0.1"/>
        <path d="M5 40H55V45H5V40Z" fill="black" fillOpacity="0.1"/>
        <circle cx="30" cy="40" r="10" stroke="white" strokeWidth="2" strokeOpacity="0.3"/>
      </svg>
    </div>
  );
};
