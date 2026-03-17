// LoadingScreen.jsx
import React, { useState } from 'react';

export const LoadingScreen = ({ progress }) => {
  return (
    <div id="loadingScreen" className={progress >= 100 ? 'fade' : ''}>
      <div id="loadLogo">aquaslither.io</div>
      <div id="loadBarOuter">
        <div id="loadBarInner" style={{ width: `${progress}%` }}></div>
      </div>
      <div id="loadTip">Preparando o oceano...</div>
    </div>
  );
};

// StartScreen.jsx
export const StartScreen = ({ onStart, bestSize }) => {
  const [nickname, setNickname] = useState('');

  return (
    <div id="startScreen" className="visible">
      <div id="startInner">
        <div id="logoWrap">
          <span id="logoText">aquaslither</span><span id="logoDot">.io</span>
        </div>
        {bestSize > 0 && (
          <div id="deathLine" style={{ display: 'block' }}>
            Seu comprimento final foi de <strong>{bestSize}</strong>
          </div>
        )}
        <input 
          id="nicknameInput" 
          type="text" 
          maxLength={20} 
          placeholder="Apelido" 
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <button id="startBtn" onClick={() => onStart(nickname)}>Joga</button>
      </div>
    </div>
  );
};

// DeathScreen.jsx
export const DeathScreen = ({ stats, onRespawn }) => {
  return (
    <div id="deathScreen" className="show">
      <h1>DEVORADO!</h1>
      <div className="death-sub">Você foi engolido pelo oceano</div>
      <div id="deathStatsGrid">
        <div className="death-stat highlight">
          <div className="ds-icon">📏</div>
          <div className="ds-val">{stats.size}</div>
          <div className="ds-lbl">Tamanho</div>
        </div>
        <div className="death-stat">
          <div className="ds-icon">💀</div>
          <div className="ds-val">{stats.kills}</div>
          <div className="ds-lbl">Abates</div>
        </div>
      </div>
      <div id="deathScreenBtns">
        <button id="respawnBtn" onClick={onRespawn}>🌊 Jogar Novamente</button>
      </div>
    </div>
  );
};

// SkinModal.jsx
export const SkinModal = ({ isOpen, onClose, onSelectSkin }) => {
  if (!isOpen) return null;
  return (
    <div id="skinModal" className="open">
      <div id="skinModalInner">
        <button id="skinCloseBtn" onClick={onClose}>✕</button>
        <h2>Escolha sua skin</h2>
        <div className="skin-section-title">⚪ Padrão</div>
        <div id="themeGrid">
          <div className="theme-card selected unlocked" onClick={() => onSelectSkin({ body: '#00b4d8', glow: '#00b4d8' })}>
            <div className="tc-name">Oceano</div>
          </div>
          <div className="theme-card unlocked" onClick={() => onSelectSkin({ body: '#ff4d6d', glow: '#ff4d6d' })}>
            <div className="tc-name">Fogo</div>
          </div>
        </div>
      </div>
    </div>
  );
};
