import React from 'react';

const HUD = ({ stats, powerups, ranking, onlineCount, ping, fps, biome }) => {
  return (
    <div id="hud">
      <div id="scorePanel">
        <div className="label">Tamanho</div>
        <div className="size-row">
          <span className="size-icon">🐟</span>
          <span className="value" id="sizeVal">{stats.size}</span>
        </div>
        <div id="scoreSizeBar">
          <div id="scoreSizeBarFill" style={{ width: `${Math.min(100, (stats.size / 1000) * 100)}%` }}></div>
        </div>
        <div className="sub" id="killVal">{stats.kills} peixes devorados</div>
      </div>

      <div id="bestScoreRibbon">Recorde: <strong id="bestScoreVal">{stats.bestSize}</strong></div>

      <div id="pingPanel">
        <div className="online" id="onlineCount">● ONLINE • {onlineCount} jogadores</div>
        <div className="ping" id="pingVal">Ping: {ping}ms</div>
      </div>

      <div id="ranking">
        <div className="rank-title">🏆 Top Oceano</div>
        <div id="rankList">
          {ranking.map((item, i) => (
            <div key={i} className={`rank-item ${item.isMe ? 'me' : ''}`}>
              <span className="rank-num">{i + 1}</span>
              <span>{item.name}</span>
              <span>{item.size}</span>
            </div>
          ))}
        </div>
      </div>

      <div id="powerupsHUD">
        {['shield', 'speed', 'magnet'].map(type => (
          <div key={type} className={`pu-slot ${powerups[type].active ? 'active' : ''}`} id={`pu-${type}`}>
            <div className="pu-icon">{type === 'shield' ? '🛡️' : type === 'speed' ? '⚡' : '🧲'}</div>
            <div className="pu-name">{type === 'shield' ? 'Escudo' : type === 'speed' ? 'Turbo' : 'Imã'}</div>
            <div className="pu-timer">{powerups[type].timer || '—'}</div>
            <div className="pu-bar" style={{ width: `${powerups[type].percent}%` }}></div>
          </div>
        ))}
      </div>

      <div id="minimap"><canvas id="minimapCanvas" width="120" height="120"></canvas></div>
      <div id="fpsCounter">{fps} FPS</div>
      <div id="biomeLabel">{biome}</div>
      <div id="dangerAlert"><div className="danger-ring"></div><div className="danger-text">⚠ PERIGO</div></div>
    </div>
  );
};

export default HUD;
