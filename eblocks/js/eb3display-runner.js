/**
 * EB3Display Runner
 *
 * Parses generated EB3Display C++ code and sends the equivalent
 * wire-protocol packets over Web Serial (via SerialManager.sendBytes).
 *
 * Wire protocol (from EB3Display.cpp):
 *   Every packet: 0x3A (':') + command_byte + data_bytes + 0x3B (';') + 0x0A ('\n')
 *   Text packets: 0x3A + header_bytes + utf8_text + 0x00 + 0x3B + 0x0A
 */

export class EB3DisplayRunner {

  /**
   * Parse C++ code and send all EB3Display commands over serial.
   * @param {string} code          - Generated Arduino C++ source
   * @param {SerialManager} serial - Connected SerialManager instance
   * @param {function} onOutput    - Log callback (string) => void
   */
  async run(code, serial, onOutput) {
    if (!serial || !serial.isConnected) {
      onOutput('❌ Board not connected. Connect via the Connect button first.\n');
      return { success: false };
    }

    const packets = this._parseCode(code);

    if (packets.length === 0) {
      onOutput('⚠️  No display commands found in code.\n');
      return { success: false };
    }

    // Always prepend the display init sequence so it's in a known state,
    // unless the code already starts with a begin() call (which handles it)
    const hasBegin = /display\.begin\s*\(\s*\)/.test(code);
    const allPackets = hasBegin ? packets : [...this._initPackets(), ...packets];

    onOutput(`🎨 Sending ${allPackets.length} command(s) to display...\n`);

    try {
      for (const packet of allPackets) {
        await serial.sendBytes(packet);
        // Give the display time to process each command
        await _delay(20);
      }
      onOutput('✅ All commands sent! Check your display.\n');
      return { success: true };
    } catch (err) {
      onOutput(`❌ Serial error: ${err.message}\n`);
      return { success: false };
    }
  }

  /**
   * Full init sequence matching EB3Display::begin():
   * setBackgroundColor(0,0,0) + setForegroundColor(255,255,255) +
   * setDisplayOrientation(1) + clearDisplay()
   */
  _initPackets() {
    return [
      this._packet([0x43, 0, 0, 0]),           // 'C' bg black
      this._packet([0x42, 255, 255, 255]),      // 'B' fg white
      this._packet([0x4B, 1]),                  // 'K' orientation 90°CW
      this._packet([0x44]),                     // 'D' clear
    ];
  }

  // ---------------------------------------------------------------------------
  // Parsing
  // ---------------------------------------------------------------------------

  _parseCode(code) {
    const packets = [];

    // Match: display.methodName(args);
    // Handles multi-line and extra whitespace
    const callRegex = /display\.(\w+)\s*\(([^)]*)\)\s*;/g;
    let match;

    while ((match = callRegex.exec(code)) !== null) {
      const method = match[1];
      const args = this._parseArgs(match[2]);
      const packet = this._buildPacket(method, args);
      if (packet) packets.push(packet);
    }

    return packets;
  }

  /**
   * Parse comma-separated C++ argument list.
   * Returns array of { type: 'num'|'string', value: string }
   */
  _parseArgs(argsStr) {
    const args = [];
    let current = '';
    let inString = false;
    let quote = '';

    for (const ch of argsStr) {
      if (inString) {
        if (ch === quote) {
          inString = false;
          args.push({ type: 'string', value: current });
          current = '';
        } else {
          current += ch;
        }
      } else if (ch === '"' || ch === "'") {
        inString = true;
        quote = ch;
      } else if (ch === ',') {
        if (current.trim()) args.push({ type: 'num', value: current.trim() });
        current = '';
      } else {
        current += ch;
      }
    }

    if (current.trim()) args.push({ type: 'num', value: current.trim() });
    return args;
  }

  _num(arg) {
    if (!arg) return 0;
    if (arg.type === 'string') return 0;
    const s = arg.value.trim();
    if (s === 'true') return 1;
    if (s === 'false') return 0;
    return parseInt(s, 10) || 0;
  }

  _str(arg) {
    if (!arg) return '';
    return arg.type === 'string' ? arg.value : arg.value.replace(/['"]/g, '');
  }

  _lo(v) { return v & 0xFF; }
  _hi(v) { return (v >> 8) & 0xFF; }

  /** Wrap data bytes in `:` ... `;` `\n` */
  _packet(data) {
    return new Uint8Array([0x3A, ...data, 0x3B, 0x0A]);
  }

  // ---------------------------------------------------------------------------
  // Command → packet builder
  // ---------------------------------------------------------------------------

  _buildPacket(method, a) {
    switch (method) {

      // begin() — send the full init sequence (bg black, fg white, orientation, clear)
      // We return null here because run() injects _initPackets() when begin() is detected
      case 'begin':
        return null;

      case 'clearDisplay':
        return this._packet([0x44]); // 'D'

      case 'setDisplayOrientation':
        return this._packet([0x4B, this._num(a[0])]); // 'K'

      case 'setBacklightBrightness':
        return this._packet([0x4A, this._num(a[0])]); // 'J'

      case 'setForegroundColor':
        return this._packet([0x42,                    // 'B'
          this._num(a[0]), this._num(a[1]), this._num(a[2])]);

      case 'setBackgroundColor':
        return this._packet([0x43,                    // 'C'
          this._num(a[0]), this._num(a[1]), this._num(a[2])]);

      case 'drawPixel': {
        const x = this._num(a[0]), y = this._num(a[1]);
        return this._packet([0x7A,                    // 'z'
          this._lo(x), this._hi(x), this._lo(y), this._hi(y)]);
      }

      case 'drawLine': {
        const x1 = this._num(a[0]), y1 = this._num(a[1]);
        const x2 = this._num(a[2]), y2 = this._num(a[3]);
        return this._packet([0x45,                    // 'E'
          this._lo(x1), this._hi(x1), this._lo(y1), this._hi(y1),
          this._lo(x2), this._hi(x2), this._lo(y2), this._hi(y2)]);
      }

      case 'drawRectangle': {
        const x1 = this._num(a[0]), y1 = this._num(a[1]);
        const x2 = this._num(a[2]), y2 = this._num(a[3]);
        const w = x2 - x1, h = y2 - y1;
        const tr = this._num(a[4]), solid = this._num(a[5]);
        return this._packet([0x46,                    // 'F'
          this._lo(x1), this._hi(x1), this._lo(y1), this._hi(y1),
          this._lo(w),  this._hi(w),  this._lo(h),  this._hi(h),
          tr, solid]);
      }

      case 'drawRoundedRectangle': {
        const x1 = this._num(a[0]), y1 = this._num(a[1]);
        const x2 = this._num(a[2]), y2 = this._num(a[3]);
        const w = x2 - x1, h = y2 - y1;
        const r = this._num(a[4]);
        const tr = this._num(a[5]), solid = this._num(a[6]);
        return this._packet([0x74,                    // 't'
          this._lo(x1), this._hi(x1), this._lo(y1), this._hi(y1),
          this._lo(w),  this._hi(w),  this._lo(h),  this._hi(h),
          this._lo(r),  this._hi(r),
          tr, solid]);
      }

      case 'drawCircle': {
        const cx = this._num(a[0]), cy = this._num(a[1]), r = this._num(a[2]);
        const xPos = cx - r, yPos = cy - r, diam = r * 2;
        const tr = this._num(a[3]), solid = this._num(a[4]);
        return this._packet([0x79,                    // 'y'
          this._lo(xPos), this._hi(xPos), this._lo(yPos), this._hi(yPos),
          this._lo(diam), this._hi(diam), this._lo(diam), this._hi(diam),
          tr, solid]);
      }

      case 'drawEllipse': {
        const cx = this._num(a[0]), cy = this._num(a[1]);
        const rx = this._num(a[2]), ry = this._num(a[3]);
        const xPos = cx - rx, yPos = cy - ry;
        const xd = rx * 2, yd = ry * 2;
        const tr = this._num(a[4]), solid = this._num(a[5]);
        return this._packet([0x79,                    // 'y'
          this._lo(xPos), this._hi(xPos), this._lo(yPos), this._hi(yPos),
          this._lo(xd),   this._hi(xd),   this._lo(yd),   this._hi(yd),
          tr, solid]);
      }

      case 'drawArc': {
        const x  = this._num(a[0]), y   = this._num(a[1]);
        const r  = this._num(a[2]);
        const sa = this._num(a[3]), ea  = this._num(a[4]);
        const res = this._num(a[5]);
        const tr = this._num(a[6]), solid = this._num(a[7]);
        return this._packet([0x73,                    // 's'
          this._lo(x),  this._hi(x),  this._lo(y),  this._hi(y),
          this._lo(r),  this._hi(r),
          this._lo(sa), this._hi(sa), this._lo(ea), this._hi(ea),
          this._lo(res),this._hi(res),
          tr, solid]);
      }

      case 'printText':
      case 'printNumber':
      case 'printFloat': {
        const text = this._str(a[0]);
        const x    = this._num(a[1]), y    = this._num(a[2]);
        const font = this._num(a[3]), tr   = this._num(a[4]);
        // Header bytes for 'G' command
        const header = [0x47,                         // 'G'
          this._lo(x), this._hi(x), this._lo(y), this._hi(y),
          font, tr, 0x00];
        const textBytes = Array.from(text).map(c => c.charCodeAt(0));
        return new Uint8Array([0x3A, ...header, ...textBytes, 0x00, 0x3B, 0x0A]);
      }

      case 'setFontScaler':
        return this._packet([0x36,                    // '6'
          this._num(a[0]), this._num(a[1])]);

      default:
        return null;
    }
  }
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
