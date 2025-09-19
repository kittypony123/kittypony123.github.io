# Air Traffic Routes Game - Test Suite

This comprehensive test suite verifies that the Air Traffic Routes game works correctly across desktop and mobile platforms, with extensive cross-browser compatibility testing.

## Quick Start

### Windows
```bash
# Install dependencies and run all tests
run-tests.bat

# Run specific test suites
run-tests.bat desktop   # Desktop functionality only
run-tests.bat mobile    # Mobile/touch functionality only
run-tests.bat headed    # Run with visible browser windows
run-tests.bat debug     # Run in debug mode
```

### Mac/Linux
```bash
# Make script executable (first time only)
chmod +x run-tests.sh

# Install dependencies and run all tests
./run-tests.sh

# Run specific test suites
./run-tests.sh desktop  # Desktop functionality only
./run-tests.sh mobile   # Mobile/touch functionality only
./run-tests.sh headed   # Run with visible browser windows
./run-tests.sh debug    # Run in debug mode
```

## Test Coverage

### 🖥️ **Desktop Functionality Tests** (`tests/desktop.spec.js`)
- ✅ Game loading and initialization
- ✅ Canvas rendering and sizing
- ✅ Mouse-based route drawing
- ✅ Keyboard shortcuts (F1, P, number keys, etc.)
- ✅ UI button interactions
- ✅ Mouse wheel zoom functionality
- ✅ Performance monitoring (FPS tracking)
- ✅ Canvas DPR (Device Pixel Ratio) handling

### 📱 **Mobile Touch Interaction Tests** (`tests/mobile.spec.js`)
- ✅ Touch-based route drawing
- ✅ Pinch-to-zoom gestures
- ✅ Touch target accessibility (44px minimum)
- ✅ Touch-action CSS configuration
- ✅ Viewport scaling settings
- ✅ Coordinate transformation accuracy
- ✅ Mobile performance optimization
- ✅ iOS Safari specific optimizations

### 🎯 **Route Drawing Tests** (`tests/route-drawing.spec.js`)
- ✅ Basic route creation between airports
- ✅ Multiple route creation
- ✅ Route preview during drag operations
- ✅ Invalid route prevention
- ✅ Different viewport size compatibility
- ✅ Cross-device route drawing consistency

### 🎨 **Canvas Rendering Tests** (`tests/canvas-rendering.spec.js`)
- ✅ Canvas initialization and context creation
- ✅ DPR optimization functionality
- ✅ Game element rendering verification
- ✅ Background and overlay rendering
- ✅ Performance metrics monitoring
- ✅ Resize handling
- ✅ Memory usage monitoring
- ✅ Rendering performance under load

### 🍎 **iOS Safari Specific Tests** (`tests/ios-safari.spec.js`)
- ✅ Touch object copying (iOS Safari quirk)
- ✅ DPR capping for iOS devices
- ✅ Viewport meta tag configuration
- ✅ Touch-action CSS properties
- ✅ Touch-to-pointer event conversion
- ✅ Pinch zoom gesture handling
- ✅ iOS-specific performance optimizations
- ✅ Memory management on iOS

### ♿ **Accessibility Tests** (`tests/accessibility.spec.js`)
- ✅ Touch target size compliance (44px minimum)
- ✅ User scaling enablement (accessibility requirement)
- ✅ Color contrast verification
- ✅ Keyboard navigation support
- ✅ Focus management in dialogs
- ✅ ARIA attributes presence
- ✅ Canvas accessibility considerations
- ✅ Text scaling compatibility
- ✅ Reduced motion preference support

### 🌐 **Cross-Browser Compatibility Tests** (`tests/cross-browser.spec.js`)
- ✅ Consistent game loading across browsers
- ✅ Canvas rendering API compatibility
- ✅ Event handling consistency
- ✅ DPR handling across browsers
- ✅ CSS feature support verification
- ✅ JavaScript API compatibility
- ✅ Performance consistency
- ✅ Route drawing functionality across browsers

## Browser Support

The test suite runs on the following browsers:

### Desktop
- ✅ **Chrome** (Latest) - Full support
- ✅ **Firefox** (Latest) - Full support
- ✅ **Safari** (Latest) - Full support

### Mobile
- ✅ **Mobile Chrome** (Pixel 5) - Full touch support
- ✅ **Mobile Safari** (iPhone 12) - iOS optimizations
- ✅ **iPad Safari** (iPad Pro) - Tablet support
- ✅ **iPhone SE** - Small screen support
- ✅ **Galaxy S8** - Android compatibility

## Test Structure

```
tests/
├── desktop.spec.js           # Desktop functionality
├── mobile.spec.js            # Mobile touch interactions
├── route-drawing.spec.js     # Core game functionality
├── canvas-rendering.spec.js  # Rendering and performance
├── ios-safari.spec.js        # iOS-specific features
├── accessibility.spec.js     # Accessibility compliance
└── cross-browser.spec.js     # Cross-browser compatibility
```

## Performance Benchmarks

### Desktop Targets
- **Minimum FPS**: 30 FPS
- **Maximum Frame Time**: 33ms
- **Memory Usage**: < 90% of available heap

### Mobile Targets
- **Minimum FPS**: 20 FPS (iOS Safari: 20 FPS)
- **Maximum Frame Time**: 50ms
- **Memory Usage**: < 80% of available heap
- **DPR Capping**: iOS ≤ 2.0, Android ≤ 2.5

## Key Features Tested

### 🎮 **Core Game Mechanics**
- Station (airport) rendering and positioning
- Route creation between stations
- Train (aircraft) spawning and movement
- Passenger simulation
- Score tracking and UI updates

### 🖱️ **Input Systems**
- Mouse drag-and-drop for desktop route creation
- Touch drag gestures for mobile route creation
- Pinch-to-zoom camera controls
- Keyboard shortcuts and hotkeys
- UI button and control interactions

### 🎨 **Rendering Pipeline**
- Canvas 2D context setup and DPR scaling
- Game object rendering (stations, routes, trains)
- UI overlay rendering (HUD, dialogs)
- Background effects (radar grid, sweep animation)
- Performance-optimized frame rendering

### ⚡ **Performance Optimizations**
- Device pixel ratio capping for mobile performance
- Canvas size optimization
- Touch event conversion to pointer events
- Cached coordinate transformations
- Memory usage monitoring and optimization

## Troubleshooting

### Common Issues

**Tests fail to start:**
- Ensure Node.js is installed (`node --version`)
- Ensure Python is installed (`python --version` or `python3 --version`)
- Run `npm install` to install dependencies

**Mobile tests fail:**
- Check that Playwright browsers are installed (`npx playwright install`)
- Verify touch event support in test environment
- Ensure mobile device emulation is working

**Performance tests fail:**
- Lower performance expectations for older hardware
- Check system resources (CPU, memory usage)
- Verify no other resource-intensive applications are running

**iOS Safari tests skip:**
- iOS Safari tests only run on WebKit browser engine
- Ensure `--project="Mobile Safari"` is included in test runs

### Debug Mode

Run tests in debug mode to step through failures:

```bash
# Windows
run-tests.bat debug

# Mac/Linux
./run-tests.sh debug
```

## Continuous Integration

For CI/CD pipelines, use:

```bash
# Install dependencies
npm install
npx playwright install --with-deps

# Run tests with CI reporter
npm run test:ci
```

## Test Reports

After running tests, view detailed reports:
- **HTML Report**: Open `playwright-report/index.html` in your browser
- **Console Output**: Real-time test results and failure details
- **Screenshots**: Automatic screenshots on test failures
- **Video**: Recorded video of failing tests (retention on failure)

## Contributing

When adding new features to the game:

1. **Add corresponding tests** in the appropriate spec file
2. **Update performance benchmarks** if needed
3. **Test on mobile devices** to ensure touch compatibility
4. **Verify accessibility** compliance for new UI elements
5. **Run full test suite** before committing changes

## Support

If you encounter issues with the test suite:

1. Check the troubleshooting section above
2. Verify your environment meets the requirements
3. Run tests in debug mode for detailed failure information
4. Check browser compatibility for your specific use case

The test suite ensures the Air Traffic Routes game provides a consistent, high-quality experience across all supported platforms and devices.