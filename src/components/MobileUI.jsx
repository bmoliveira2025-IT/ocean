import React, { useState, useEffect, useRef } from 'react';

export const OrientationOverlay = () => {
  return (
    <div id="orientationOverlay">
      <div className="phone">📱</div>
      <h2>Vire o Celular</h2>
      <p>Aqua Slither é melhor jogado deitado. Por favor, rotacione seu dispositivo.</p>
    </div>
  );
};

export const MobileControls = ({ onJoystickMove, onBoostToggle }) => {
  const joystickZoneRef = useRef(null);
  const joystickStickRef = useRef(null);
  const [isBoosting, setIsBoosting] = useState(false);

  const handleJoystick = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const zone = joystickZoneRef.current;
    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = rect.width / 2;

    if (distance > maxRadius) {
      dx *= maxRadius / distance;
      dy *= maxRadius / distance;
    }

    if (joystickStickRef.current) {
      joystickStickRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    const angle = Math.atan2(dy, dx);
    onJoystickMove(angle);
  };

  const resetJoystick = () => {
    if (joystickStickRef.current) {
      joystickStickRef.current.style.transform = `translate(0px, 0px)`;
    }
  };

  const handleBoostStart = (e) => {
    e.preventDefault();
    setIsBoosting(true);
    onBoostToggle(true);
  };

  const handleBoostEnd = (e) => {
    e.preventDefault();
    setIsBoosting(false);
    onBoostToggle(false);
  };

  return (
    <div id="mobileControls">
      <div 
        id="joystickZone" 
        ref={joystickZoneRef}
        onTouchMove={handleJoystick}
        onTouchStart={handleJoystick}
        onTouchEnd={resetJoystick}
      >
        <div id="joystickStick" ref={joystickStickRef}></div>
      </div>

      <div 
        id="boostBtnZone"
        className={isBoosting ? 'active' : ''}
        onTouchStart={handleBoostStart}
        onTouchEnd={handleBoostEnd}
      >
        <span>⚡</span>
        TURBO
      </div>
    </div>
  );
};
