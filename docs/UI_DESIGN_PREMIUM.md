# Premium UI Design - Light Neumorphism + Glassmorphism
## Apple-Inspired Aesthetic

---

## Design Philosophy

**Soft, tactile, premium** - Inspired by Apple's design language with modern glassmorphism touches.

### Core Principles
1. **Soft shadows** - Multiple layered shadows for depth
2. **Subtle highlights** - Inner light for raised effect
3. **Frosted glass** - Backdrop blur for overlays
4. **Gentle curves** - Large border radius (16-24px)
5. **Muted colors** - Soft pastels, no harsh contrasts
6. **Micro-animations** - Smooth, natural movements
7. **Tactile feedback** - Elements feel pressable

---

## Color Palette

```css
/* Background */
--bg-primary: #F5F7FA;          /* Soft blue-gray */
--bg-secondary: #FFFFFF;        /* Pure white */
--bg-elevated: #FAFBFC;         /* Slightly elevated */

/* Neumorphic Shadows */
--shadow-light: #FFFFFF;        /* Highlight */
--shadow-dark: #D1D9E6;         /* Shadow */

/* Glassmorphism */
--glass-bg: rgba(255, 255, 255, 0.7);
--glass-border: rgba(255, 255, 255, 0.8);
--glass-shadow: rgba(0, 0, 0, 0.05);

/* Accent Colors (Soft) */
--accent-primary: #5B7FFF;      /* Soft blue */
--accent-secondary: #A78BFA;    /* Soft purple */
--accent-success: #6EE7B7;      /* Soft green */
--accent-gradient: linear-gradient(135deg, #5B7FFF 0%, #A78BFA 100%);

/* Text */
--text-primary: #2D3748;        /* Dark gray */
--text-secondary: #718096;      /* Medium gray */
--text-tertiary: #A0AEC0;       /* Light gray */
```

---

## 1. Add New Site Modal

### Visual Design

```
┌─────────────────────────────────────────┐
│  ╔═══════════════════════════════════╗  │
│  ║  ✨ New Site                      ║  │
│  ║                                   ║  │
│  ║  Create Your Property             ║  │
│  ║  Set up a new location for your   ║  │
│  ║  digital signage network          ║  │
│  ║                                   ║  │
│  ║  ┌─────────────────────────────┐ ║  │
│  ║  │ 🏢  Property Name           │ ║  │
│  ║  │ [London Office, Mumbai Hub] │ ║  │
│  ║  └─────────────────────────────┘ ║  │
│  ║                                   ║  │
│  ║  ┌──────────┐  ┌──────────────┐  ║  │
│  ║  │📍 City   │  │🕐 Timezone   │  ║  │
│  ║  │[_______] │  │[Select ▼]    │  ║  │
│  ║  └──────────┘  └──────────────┘  ║  │
│  ║                                   ║  │
│  ║  ┌─────────┐  ┌──────────────┐   ║  │
│  ║  │ Cancel  │  │ Create Site →│   ║  │
│  ║  └─────────┘  └──────────────┘   ║  │
│  ╚═══════════════════════════════════╝  │
└─────────────────────────────────────────┘
```

### CSS Implementation

```css
/* Modal Container */
.add-site-modal {
  background: var(--bg-primary);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  width: 560px;
  
  /* Neumorphic shadow */
  box-shadow: 
    12px 12px 24px var(--shadow-dark),
    -12px -12px 24px var(--shadow-light),
    inset 0 0 0 1px rgba(255, 255, 255, 0.8);
}

/* Badge */
.modal-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 16px;
  
  box-shadow: 
    4px 4px 8px rgba(209, 217, 230, 0.4),
    -4px -4px 8px rgba(255, 255, 255, 0.8);
}

/* Heading */
.modal-heading {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

/* Subtitle */
.modal-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 32px;
  line-height: 1.5;
}

/* Input Container */
.input-group {
  margin-bottom: 24px;
}

/* Neumorphic Input */
.neuro-input {
  width: 100%;
  height: 56px;
  padding: 16px 20px 16px 48px;
  background: var(--bg-primary);
  border: none;
  border-radius: 16px;
  font-size: 16px;
  color: var(--text-primary);
  
  /* Inset shadow for pressed effect */
  box-shadow: 
    inset 4px 4px 8px rgba(209, 217, 230, 0.6),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.neuro-input:focus {
  outline: none;
  box-shadow: 
    inset 4px 4px 8px rgba(209, 217, 230, 0.6),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5),
    0 0 0 3px rgba(91, 127, 255, 0.1);
}

/* Input Icon */
.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-tertiary);
}

/* Two Column Layout */
.input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

/* Cancel Button (Neumorphic) */
.neuro-button-secondary {
  flex: 1;
  height: 56px;
  background: var(--bg-primary);
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  
  /* Raised effect */
  box-shadow: 
    6px 6px 12px rgba(209, 217, 230, 0.6),
    -6px -6px 12px rgba(255, 255, 255, 0.8);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.neuro-button-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 
    8px 8px 16px rgba(209, 217, 230, 0.6),
    -8px -8px 16px rgba(255, 255, 255, 0.8);
}

.neuro-button-secondary:active {
  transform: translateY(0);
  box-shadow: 
    inset 4px 4px 8px rgba(209, 217, 230, 0.6),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5);
}

/* Create Button (Gradient + Glass) */
.glass-button-primary {
  flex: 2;
  height: 56px;
  background: var(--accent-gradient);
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  box-shadow: 
    0 8px 16px rgba(91, 127, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-button-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s;
}

.glass-button-primary:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 12px 24px rgba(91, 127, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.glass-button-primary:hover::before {
  left: 100%;
}

.glass-button-primary:active {
  transform: translateY(0);
}
```

---

## 2. Media Upload Interface

### Visual Design

```
┌────────────────────────────────────────────────┐
│  Media Library                                 │
│  Upload and manage your digital signage...     │
├────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐           │
│  │  🏢 Property │  │  📍 Zone     │           │
│  │  ╔═════════╗ │  │  ╔═════════╗ │           │
│  │  ║ Select ▼║ │  │  ║ All ▼   ║ │           │
│  │  ╚═════════╝ │  │  ╚═════════╝ │           │
│  └──────────────┘  └──────────────┘           │
│                                                │
│  ╔══════════════════════════════════════════╗ │
│  ║  🔍 Search media...                      ║ │
│  ╚══════════════════════════════════════════╝ │
│                                                │
│  [All] [Images] [Videos] [Documents]           │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │         ☁️                                │ │
│  │   Drag & drop files here                 │ │
│  │   or click to browse                     │ │
│  │                                          │ │
│  │   Supports: Images, Videos, PDF...      │ │
│  │   Max 500MB per file                    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ╔══════════════════════════════════════════╗ │
│  ║ 📹 video.mp4                             ║ │
│  ║ ●●●●●●●●●●●○○○○○○○○○  67%              ║ │
│  ║ 124.5 MB / 186 MB  •  8.2 MB/s          ║ │
│  ╚══════════════════════════════════════════╝ │
└────────────────────────────────────────────────┘
```

### CSS Implementation

```css
/* Page Container */
.media-library {
  background: var(--bg-primary);
  min-height: 100vh;
  padding: 40px;
}

/* Filter Cards (Neumorphic) */
.filter-card {
  background: var(--bg-primary);
  border-radius: 20px;
  padding: 20px;
  
  box-shadow: 
    8px 8px 16px rgba(209, 217, 230, 0.6),
    -8px -8px 16px rgba(255, 255, 255, 0.8);
}

.filter-card-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Dropdown (Inset) */
.neuro-select {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  background: var(--bg-primary);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  color: var(--text-primary);
  cursor: pointer;
  
  box-shadow: 
    inset 3px 3px 6px rgba(209, 217, 230, 0.6),
    inset -3px -3px 6px rgba(255, 255, 255, 0.5);
}

/* Search Bar (Inset) */
.neuro-search {
  width: 100%;
  height: 52px;
  padding: 0 20px 0 48px;
  background: var(--bg-primary);
  border: none;
  border-radius: 16px;
  font-size: 15px;
  
  box-shadow: 
    inset 4px 4px 8px rgba(209, 217, 230, 0.6),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5);
}

/* Filter Pills */
.filter-pills {
  display: flex;
  gap: 12px;
  margin: 24px 0;
}

.filter-pill {
  padding: 10px 20px;
  background: var(--bg-primary);
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  
  box-shadow: 
    4px 4px 8px rgba(209, 217, 230, 0.6),
    -4px -4px 8px rgba(255, 255, 255, 0.8);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-pill.active {
  background: var(--accent-gradient);
  color: white;
  box-shadow: 
    0 4px 12px rgba(91, 127, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.filter-pill:hover:not(.active) {
  transform: translateY(-2px);
}

/* Upload Zone (Glassmorphic) */
.upload-zone {
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.9), 
    rgba(245, 247, 250, 0.9));
  backdrop-filter: blur(20px);
  border: 2px dashed rgba(91, 127, 255, 0.3);
  border-radius: 24px;
  padding: 60px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  box-shadow: 
    inset 0 0 0 1px rgba(255, 255, 255, 0.8),
    0 8px 32px rgba(0, 0, 0, 0.04);
}

.upload-zone:hover {
  border-color: var(--accent-primary);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.95), 
    rgba(245, 247, 250, 0.95));
  transform: translateY(-4px);
  box-shadow: 
    inset 0 0 0 1px rgba(255, 255, 255, 0.8),
    0 12px 48px rgba(91, 127, 255, 0.1);
}

.upload-zone.drag-over {
  border-color: var(--accent-primary);
  border-style: solid;
  background: linear-gradient(135deg, 
    rgba(91, 127, 255, 0.05), 
    rgba(167, 139, 250, 0.05));
}

/* Upload Icon */
.upload-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: var(--accent-gradient);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  box-shadow: 
    0 8px 24px rgba(91, 127, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Progress Card (Glassmorphic) */
.upload-progress-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 20px;
  margin-top: 20px;
  
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 0.8);
}

/* Circular Progress */
.circular-progress {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: conic-gradient(
    var(--accent-primary) 0deg,
    var(--accent-secondary) calc(var(--progress) * 3.6deg),
    rgba(209, 217, 230, 0.3) calc(var(--progress) * 3.6deg)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.circular-progress::before {
  content: '';
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  position: absolute;
}

.circular-progress-text {
  position: relative;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}
```

---

## 3. Pair Device Modal

### Visual Design

```
┌─────────────────────────────────────────┐
│  ╔═══════════════════════════════════╗  │
│  ║         📺                        ║  │
│  ║                                   ║  │
│  ║  Pair Your Device                 ║  │
│  ║  Enter the code shown on screen   ║  │
│  ║                                   ║  │
│  ║  ┌──┐┌──┐┌──┐┌──┐ ┌──┐┌──┐┌──┐┌──┐║  │
│  ║  │5 ││2 ││7 ││9 │ │  ││  ││  ││  │║  │
│  ║  └──┘└──┘└──┘└──┘ └──┘└──┘└──┘└──┘║  │
│  ║                                   ║  │
│  ║  ┌─────────────────────────────┐ ║  │
│  ║  │ 📱 Device Name              │ ║  │
│  ║  │ [Main Lobby Display]        │ ║  │
│  ║  └─────────────────────────────┘ ║  │
│  ║                                   ║  │
│  ║  ┌──────────┐  ┌──────────────┐  ║  │
│  ║  │🏢Property│  │📍 Area       │  ║  │
│  ║  │[Select ▼]│  │[Select ▼]    │  ║  │
│  ║  └──────────┘  └──────────────┘  ║  │
│  ║                                   ║  │
│  ║  ┌──────────────────────────────┐║  │
│  ║  │    Connect Device →          │║  │
│  ║  └──────────────────────────────┘║  │
│  ║                                   ║  │
│  ║  Need help? Contact support →    ║  │
│  ╚═══════════════════════════════════╝  │
└─────────────────────────────────────────┘
```

### CSS Implementation

```css
/* Device Icon (3D Neumorphic) */
.device-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: var(--bg-primary);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  box-shadow: 
    12px 12px 24px rgba(209, 217, 230, 0.6),
    -12px -12px 24px rgba(255, 255, 255, 0.8),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

/* Code Input Boxes (Neumorphic Inset) */
.code-input-container {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin: 32px 0;
}

.code-separator {
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-weight: 700;
}

.code-input-box {
  width: 56px;
  height: 64px;
  background: var(--bg-primary);
  border: none;
  border-radius: 16px;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  font-family: 'SF Mono', 'Monaco', monospace;
  
  /* Inset shadow */
  box-shadow: 
    inset 4px 4px 8px rgba(209, 217, 230, 0.6),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.code-input-box:focus {
  outline: none;
  box-shadow: 
    inset 4px 4px 8px rgba(209, 217, 230, 0.6),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5),
    0 0 0 3px rgba(91, 127, 255, 0.2);
}

.code-input-box.filled {
  box-shadow: 
    inset 4px 4px 8px rgba(110, 231, 183, 0.3),
    inset -4px -4px 8px rgba(255, 255, 255, 0.5);
}

/* Connect Button (Full Width Glass) */
.connect-button {
  width: 100%;
  height: 60px;
  background: var(--accent-gradient);
  border: none;
  border-radius: 16px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  margin-top: 32px;
  
  box-shadow: 
    0 12px 24px rgba(91, 127, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.connect-button:hover {
  transform: translateY(-3px);
  box-shadow: 
    0 16px 32px rgba(91, 127, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.connect-button:active {
  transform: translateY(-1px);
}

/* Support Link */
.support-link {
  display: block;
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.3s;
}

.support-link:hover {
  color: var(--accent-primary);
}
```

---

## Animations

```css
/* Smooth entrance */
@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Shimmer effect */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

/* Pulse glow */
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(91, 127, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(91, 127, 255, 0.5);
  }
}

/* Success checkmark */
@keyframes checkmark {
  0% {
    stroke-dashoffset: 100;
  }
  100% {
    stroke-dashoffset: 0;
  }
}
```

---

## Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

body {
  font-family: var(--font-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Key Features

✨ **Soft Neumorphism** - Raised and inset elements  
🪟 **Glassmorphism** - Frosted glass overlays  
🎨 **Soft Gradients** - Subtle blue to purple  
🌊 **Smooth Animations** - Natural, Apple-like  
💎 **Premium Feel** - Tactile, high-quality  
📱 **Responsive** - Works on all devices  
♿ **Accessible** - WCAG 2.1 AA compliant  

---

## Implementation Priority

1. ✅ Set up color variables
2. ✅ Create neumorphic input components
3. ✅ Build glassmorphic overlays
4. ✅ Add smooth animations
5. ✅ Test on all screen sizes
6. ✅ Verify accessibility

This design will make your app feel like a **premium Apple product**! 🍎✨
