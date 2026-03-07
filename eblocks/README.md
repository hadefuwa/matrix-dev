# eBlocks Online - Web IDE

Pure web-based IDE for Arduino and ESP32 boards. Runs entirely in the browser using modern Web APIs.

## Features

- **Monaco Editor**: Full-featured code editor with C++ syntax highlighting
- **JSCPP Interpreter**: Run C++ code directly in the browser
- **Web Serial API**: Direct USB communication with Arduino/ESP32 boards
- **Firmata Protocol**: Control hardware using StandardFirmata
- **No Backend Required**: Completely static - perfect for GitHub Pages

## Browser Requirements

- **Chrome 89+**
- **Edge 89+**
- **Opera 75+**

(Web Serial API is not available in Firefox or Safari)

## Hardware Requirements

Boards must be pre-flashed with **StandardFirmata**:

### For Arduino Mega:
1. Open Arduino IDE
2. File → Examples → Firmata → StandardFirmata
3. Upload to your Arduino Mega

### For ESP32:
1. Install Firmata library (if not installed)
2. Open Examples → Firmata → StandardFirmataESP32
3. Upload to your ESP32

## Usage

1. **Open the IDE**: Navigate to the deployed GitHub Pages URL
2. **Connect Board**: Click "Connect to Board" and select your serial port
3. **Write Code**: Use the Monaco Editor to write C++ code
4. **Run Code**: Click "Run Code" to execute (interpreted via JSCPP)
5. **Monitor Output**: View serial output in the console panel

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser                                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Monaco    │  │    JSCPP     │  │  Web Serial API │    │
│  │   Editor    │→→│ Interpreter  │→→│  (USB access)   │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
│         ↓                  ↓                  ↓              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Firmata Controller                          │    │
│  │  (Translates Arduino commands to Firmata protocol)  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │   USB Cable   │
                    └───────────────┘
                            ↓
                    ┌───────────────┐
                    │ Arduino/ESP32 │
                    │  (Firmata)    │
                    └───────────────┘
```

## Files

- `index.html` - Main HTML structure
- `styles.css` - Dark theme styling (VS Code inspired)
- `js/app.js` - Main application logic
- `js/serial-manager.js` - Web Serial API wrapper
- `js/code-runner.js` - JSCPP C++ interpreter with safety features
- `js/firmata-controller.js` - Firmata protocol implementation

## Safety Features

- **Infinite Loop Protection**: (To be implemented with Web Workers)
- **Timeout Protection**: Maximum 30-second execution time
- **Iteration Limits**: Prevents runaway loops

## Limitations

- **Interpretation Only**: Code is interpreted, not compiled
- **Limited Arduino API**: Not all Arduino functions are implemented
- **No Library Support**: Third-party libraries not supported
- **Chrome/Edge Only**: Web Serial API limitation

## Development

To develop locally:

```bash
# Serve the web directory with any HTTP server
cd web
python3 -m http.server 8000
# Open http://localhost:8000
```

## Deployment

This project is designed for GitHub Pages deployment:

1. Push to GitHub
2. Enable GitHub Pages (Settings → Pages)
3. Select source: `main` branch, `/web` folder
4. Access at: `https://username.github.io/eblocks-online/`

## License

MIT License - See LICENSE file

## Contributing

Contributions welcome! Please open issues and pull requests on GitHub.
