# ✈️ Air Traffic Control Simulation Game

A realistic browser-based air traffic control simulation built with vanilla JavaScript and HTML5 Canvas. Manage flight routes between airports, transport passengers efficiently, and optimize your aviation network for maximum performance.

![Air Traffic Control Game](https://img.shields.io/badge/Status-Ready%20for%20Play-brightgreen)
![Mobile Optimized](https://img.shields.io/badge/Mobile-Optimized-blue)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-orange)

## 🎮 Quick Start

### Play Instantly
1. **Download or clone** this repository
2. **Open `index.html`** in any modern web browser
3. **Start playing** immediately - no installation required!

### Local Server (Recommended)
For the best experience, serve via a local web server:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Then visit http://localhost:8000
```

## 🎯 How to Play

### Basic Controls
- **Drag** between airports to create flight routes
- **Single tap/click** to select airports
- **Pinch to zoom** (mobile) or **mouse wheel** (desktop)
- **Pan** with finger or mouse to explore the map

### Keyboard Shortcuts
- **1-7 Keys**: Select route colors manually
- **Tab**: Cycle through route colors
- **A**: Toggle auto-routing assistance
- **D**: Toggle passenger flow visualization
- **W**: Toggle weather systems
- **P**: Open difficulty settings
- **H**: Check network harmony score
- **R**: Rebuild routes with aesthetic styling

### Game Objective
- Connect airports to transport passengers to their destinations
- Manage increasing passenger demand over time
- Avoid airport overcrowding and missed connections
- Optimize your network for maximum efficiency

## 🚀 Key Features

### 📱 **Mobile-First Design**
- **Touch Optimized**: Native pinch-to-zoom and gesture support
- **Responsive UI**: Adapts to all screen sizes (phones, tablets, desktop)
- **Performance Optimized**: Smooth 60fps on mobile devices
- **Accessibility**: 44px minimum touch targets, high contrast

### 🌍 **Progressive World Expansion**
- **50+ Airports**: Unlocked progressively across 4 expansion zones
- **Dynamic Spawning**: Airports appear based on game day and performance
- **Strategic Locations**: Hub airports, regional connections, and international destinations

### 🧠 **Intelligent Game Systems**
- **Smart Passenger Routing**: AI-driven destination selection favoring connected routes
- **Performance Tracking**: Real-time efficiency monitoring and optimization suggestions
- **Auto-Route Colors**: Strategic color assignment (Express/Hub/Regional/Relief)
- **Hub-and-Spoke**: Intelligent network topology for realistic aviation operations

### 🎨 **Aesthetic Routing System**
- **Visual Harmony Analysis**: Real-time network beauty evaluation with 0-100% scoring
- **Golden Ratio Proportions**: Mathematical harmony in route spacing and lengths
- **Clean Geometric Paths**: Elegant curves instead of complex zigzag patterns
- **Pattern Recognition**: Maintains consistent angles and symmetrical layouts
- **Auto-Routing Enhancement**: Creates beautiful networks (disabled by default)

### 🎮 **Advanced Features**
- **Weather Systems**: Dynamic storm cells that affect flight operations
- **Achievement System**: Track progress and unlock new capabilities
- **Visual Feedback**: Route efficiency indicators and passenger flow visualization
- **Performance Monitoring**: Real-time analytics and optimization suggestions

## 🛠️ Technical Details

### Architecture
- **Vanilla JavaScript**: No frameworks or dependencies
- **ES6 Modules**: Clean, modular architecture
- **Canvas 2D**: Hardware-accelerated rendering
- **Progressive Enhancement**: Works offline after first load

### Performance Features
- **Mobile Optimization**: Frame skipping and effect reduction on mobile
- **DPR Management**: Automatic pixel ratio optimization for performance
- **Efficient Rendering**: Canvas culling and optimized draw calls
- **Memory Management**: Efficient particle systems and animation pooling

### Browser Support
- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile Support**: iOS Safari 12+, Android Chrome 60+
- **Fallback Systems**: Graceful degradation for older browsers

## 🎛️ Advanced Features

### Debug Tools & Live Tuning
Use browser DevTools console for real-time adjustments:

#### Gameplay Tuning
```javascript
MM.setSpawnMultiplier(0.85)           // Passenger spawn rate
MM.setStationSpawnInterval(53333)     // Airport spawn timing
MM.setHubAndSpoke(true)               // Hub-centric routing
MM.setMCTMultiplier(0.5)              // Connection time scaling
MM.setMaxWaitSeconds(200)             // Passenger wait tolerance
```

#### Aesthetic System Commands
```javascript
MM.validateHarmony()                  // Check network harmony score
MM.getAestheticRecommendations()      // Get visual improvement suggestions
MM.rebuildAllLines()                  // Rebuild routes with clean styling
```

#### Simulation & Testing
```javascript
await MM.simulateWeeks(20, { log: true })  // Run 20-week headless simulation
```

### Difficulty Customization
- **Passenger Spawn Rate**: Adjust demand pressure
- **Connection Times**: Control transfer windows at hubs
- **Hub Priority**: Modify routing preferences
- **Airport Growth**: Control expansion timing
- **Network Complexity**: Automatic scaling based on performance

## 📁 Project Structure

```
air-traffic-control/
├── index.html              # Main game entry point
├── src/                     # Game source code
│   ├── core/               # Camera and core systems
│   ├── systems/            # Game logic (passengers, routes, AI)
│   ├── render/             # Canvas rendering modules
│   ├── ui/                 # User interface and input handling
│   ├── maps/               # Game world configuration
│   └── utils/              # Utility functions
├── CLAUDE.md               # Development instructions
├── README.md               # This file
├── .gitignore              # Git ignore rules
└── archive/                # Development files (not needed for play)
    ├── assets/             # Screenshots and images
    ├── docs/               # Implementation guides
    ├── tests/              # Test files and mobile testing
    └── scripts/            # Development scripts
```

## 🎨 Visual Design Philosophy

This game emphasizes **aesthetic beauty** alongside realistic aviation simulation:

- **Clean Routes**: Smooth, mathematically harmonious flight paths
- **Visual Balance**: Symmetrical layouts and proper visual weight distribution
- **Golden Ratio**: Natural proportions in spacing and route design
- **Consistent Patterns**: Maintained angles and spacing for visual coherence
- **Real-time Feedback**: Live harmony scoring with actionable recommendations

## 🔧 Development

### Core Game Files
- **Essential**: `index.html`, `src/` directory, `README.md`, `CLAUDE.md`
- **Archive**: Development assets and test files in `archive/` (excluded from .gitignore)

### Contributing
1. Fork the repository
2. Create a feature branch
3. Test on both desktop and mobile
4. Ensure visual harmony standards
5. Submit a pull request

### Build Requirements
- **None!** Pure vanilla JavaScript
- Works directly in any modern browser
- No build step or dependencies required

## 📄 License

This project is open source and available under the MIT License.

## 🎮 Ready to Play?

**[Download and open index.html in your browser to start managing air traffic!](index.html)**

### Quick Tutorial
1. **Connect airports**: Drag between two nearby airports to create your first route
2. **Watch passengers**: Colored shapes represent passengers heading to matching destination airports
3. **Manage demand**: As passenger numbers grow, expand your network strategically
4. **Optimize routes**: Use the aesthetic tools (H key) to create beautiful, efficient networks
5. **Handle weather**: Storm cells slow aircraft - plan routes accordingly
6. **Weekly rewards**: Choose upgrades each week to expand your aviation empire

---

*Built with ❤️ using vanilla JavaScript. No installation, no dependencies, just pure web technology optimized for mobile and desktop.*