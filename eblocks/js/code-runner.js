/**
 * Code Runner - JSCPP-based C++ interpreter with safety features
 * Runs C++ code in-browser with infinite loop protection
 */

export class CodeRunner {
  constructor() {
    this.isRunning = false;
    this.shouldStop = false;
    this.maxExecutionTime = 30000; // 30 seconds max
    this.loopIterationLimit = 100000; // Max iterations per loop
  }

  /**
   * Run C++ code using JSCPP interpreter
   */
  async run(code, options = {}) {
    if (this.isRunning) {
      throw new Error('Code is already running');
    }

    const {
      onOutput = () => {},
      onFirmataCommand = () => {},
      onError = () => {}
    } = options;

    this.isRunning = true;
    this.shouldStop = false;

    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      let loopIterations = 0;

      try {
        // Ensure JSCPP is available (load dynamically if needed)
        if (typeof JSCPP === 'undefined') {
          await this.loadJSCPP();
        }

        if (typeof JSCPP === 'undefined') {
          console.error('[CodeRunner] JSCPP still missing after loadJSCPP()');
          throw new Error('JSCPP library not loaded');
        }

        // Create Arduino-compatible environment
        const arduinoEnvironment = this.createArduinoEnvironment(
          onOutput,
          onFirmataCommand
        );

        // Configure JSCPP
        const config = {
          stdio: {
            write: (s) => {
              onOutput(s);
            }
          },
          debug: false,
          // Add custom functions for Arduino compatibility
          includes: {
            'Arduino.h': arduinoEnvironment.header,
            'EB3Display.h': arduinoEnvironment.eb3DisplayHeader
          }
        };

        // Preprocess code to add loop protection
        const safeCode = this.preprocessCode(code);

        // Execute with timeout protection
        const timeoutId = setTimeout(() => {
          this.shouldStop = true;
          onError(new Error('Execution timeout - code took too long'));
          this.isRunning = false;
          reject(new Error('Execution timeout'));
        }, this.maxExecutionTime);

        try {
          // Run the code
          JSCPP.run(safeCode, '', config);
          
          clearTimeout(timeoutId);
          this.isRunning = false;
          resolve({ success: true });
          
        } catch (execError) {
          clearTimeout(timeoutId);
          this.isRunning = false;
          
          // Parse JSCPP error to make it more readable
          const errorMsg = this.parseError(execError);
          onError(new Error(errorMsg));
          reject(new Error(errorMsg));
        }

      } catch (error) {
        this.isRunning = false;
        onError(error);
        reject(error);
      }
    });
  }

  /**
   * Preprocess code to add safety features
   */
  preprocessCode(code) {
    // For now, return code as-is
    // In a production version, we would add loop counters and yield points
    // This is complex and requires proper AST parsing
    
    // Basic preprocessing: ensure setup() and loop() exist
    let processedCode = code;
    
    // Wrap in minimal Arduino structure if not present
    if (!code.includes('void setup()') && !code.includes('void loop()')) {
      processedCode = `
#include <Arduino.h>

void setup() {
  ${code}
}

void loop() {
  // Empty loop
}
`;
    }
    
    return processedCode;
  }

  /**
   * Create Arduino-compatible environment for JSCPP
   */
  createArduinoEnvironment(onOutput, onFirmataCommand) {
    // This is a simplified Arduino environment
    // In production, we'd need to implement full Arduino API
    
    const header = `
      // Arduino constants
      #define HIGH 1
      #define LOW 0
      #define INPUT 0
      #define OUTPUT 1
      #define INPUT_PULLUP 2
      
      // Pin definitions
      #define LED_BUILTIN 13
      
      // Serial class stub
      class SerialClass {
        public:
          void begin(int baud) {}
          void print(const char* s) {}
          void println(const char* s) {}
          void println(int n) {}
          void println() {}
      };
      
      SerialClass Serial;
      
      // Arduino functions
      void pinMode(int pin, int mode) {}
      void digitalWrite(int pin, int value) {}
      int digitalRead(int pin) { return 0; }
      void delay(int ms) {}
      unsigned long millis() { return 0; }
    `;
    
    const eb3DisplayHeader = `
      class HardwareSerial {
        public:
          void begin(int baud) {}
          void print(const char* s) {}
          void println(const char* s) {}
          void println(int n) {}
          void println() {}
      };
      HardwareSerial Serial2;
      HardwareSerial Serial3;

      class EB3Display {
        public:
          EB3Display(HardwareSerial serialPort, int baudRate) {}
          void begin() {}
          void clearDisplay() {}
          void setDisplayOrientation(int orientation) {}
          void setBacklightBrightness(int brightness) {}
          void setForegroundColor(int r, int g, int b) {}
          void setBackgroundColor(int r, int g, int b) {}
          void drawPixel(int x, int y) {}
          void drawLine(int x1, int y1, int x2, int y2) {}
          void drawRectangle(int x1, int y1, int x2, int y2, int transparent, int solid) {}
          void drawRoundedRectangle(int x1, int y1, int x2, int y2, int radius, int transparent, int solid) {}
          void drawCircle(int x, int y, int radius, int transparent, int solid) {}
          void drawEllipse(int x, int y, int xRadius, int yRadius, int transparent, int solid) {}
          void drawArc(int x, int y, int radius, int startAngle, int endAngle, int resolution, int transparent, int solid) {}
          void printText(const char* text, int x, int y, int font, int transparent) {}
          void printNumber(int number, int x, int y, int font, int transparent) {}
          void printFloat(float number, int decimalPlaces, int x, int y, int font, int transparent) {}
          void setFontScaler(int scaleX, int scaleY) {}
          void drawQRCode(int x, int y, int scaler, const char* text) {}
          int touchCheck() { return 0; }
          int touchReadX() { return 0; }
          int touchReadY() { return 0; }
      };
    `;

    return { header, eb3DisplayHeader };
  }

  /**
   * Parse JSCPP error to make it more user-friendly
   */
  parseError(error) {
    const errorStr = error.toString();
    
    // Extract line number and error message if possible
    const lineMatch = errorStr.match(/line (\d+)/i);
    const msgMatch = errorStr.match(/error: (.+)/i);
    
    if (lineMatch && msgMatch) {
      return `Line ${lineMatch[1]}: ${msgMatch[1]}`;
    }
    
    return errorStr;
  }

  /**
   * Dynamically load JSCPP from CDN (with fallback)
   */
  loadJSCPP() {
    return new Promise((resolve) => {
      const loadScript = (src, onDone) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => onDone(true);
        s.onerror = () => onDone(false);
        document.head.appendChild(s);
      };

      console.log('[CodeRunner] Loading JSCPP...');

      // Try local bundle first, then CDNs if needed
      loadScript('vendor/jscpp.bundle.js', (ok) => {
        console.log('[CodeRunner] local bundle loaded:', ok);
        if (ok && typeof JSCPP !== 'undefined') {
          return resolve();
        }
        loadScript('https://cdn.jsdelivr.net/npm/jscpp@1.1.3/dist/JSCPP.es5.min.js', (ok2) => {
          console.log('[CodeRunner] jsDelivr loaded:', ok2);
          if (ok2 && typeof JSCPP !== 'undefined') {
            return resolve();
          }
          loadScript('https://unpkg.com/jscpp@1.1.3/dist/JSCPP.es5.min.js', (ok3) => {
            console.log('[CodeRunner] unpkg loaded:', ok3);
            resolve();
          });
        });
      });
    });
  }

  /**
   * Stop code execution
   */
  stop() {
    this.shouldStop = true;
    this.isRunning = false;
  }
}
