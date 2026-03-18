/**
 * QualityManager.js
 * Detects hardware capabilities and manages graphical presets.
 */
class QualityManager {
  constructor() {
    this.levels = {
      LOW: {
        label: 'Baixo',
        shadows: false,
        particles: 0.2, // 20%
        glow: false,
        renderScale: 0.8,
        targetFPS: 30,
        aa: false
      },
      MEDIUM: {
        label: 'Médio',
        shadows: true,
        particles: 0.6, // 60%
        glow: true,
        renderScale: 1.0,
        targetFPS: 60,
        aa: true
      },
      HIGH: {
        label: 'Alto',
        shadows: true,
        particles: 1.0, // 100%
        glow: true,
        renderScale: 1.2, // Supersampling
        targetFPS: 60,
        aa: true
      }
    };

    this.currentQuality = this.detectHardware();
  }

  detectHardware() {
    // 1. Check RAM (if available, mostly Chromium)
    const ram = navigator.deviceMemory || 4; // Default to 4GB if undetected
    
    // 2. Check CPU Cores
    const cores = navigator.hardwareConcurrency || 4;

    // 3. Simple GPU Info (WebGL)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    let gpuName = '';
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
      }
    }

    // Heuristics for "Low"
    const isLowEndGPU = /mali-t|adreno\s*308|intel\s*hd\s*graphics\s*4000/i.test(gpuName);
    const isLowRAM = ram <= 2;
    const isLowCPU = cores <= 2;

    if (isLowRAM || isLowEndGPU || isLowCPU) {
      return 'LOW';
    }

    // Heuristics for "High"
    const isHighEndGPU = /nvidia|radeon|apple\s*gpu|m1|m2/i.test(gpuName);
    if (ram >= 8 && cores >= 8 && isHighEndGPU) {
      return 'HIGH';
    }

    return 'MEDIUM';
  }

  getSettings() {
    return this.levels[this.currentQuality];
  }

  setQuality(level) {
    if (this.levels[level]) {
      this.currentQuality = level;
      localStorage.setItem('game_quality', level);
      return true;
    }
    return false;
  }

  loadPreference() {
    const saved = localStorage.getItem('game_quality');
    if (saved && this.levels[saved]) {
      this.currentQuality = saved;
    }
  }
}

export const qualityManager = new QualityManager();
qualityManager.loadPreference();
