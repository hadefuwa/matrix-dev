/**
 * eBlocks Online - Main Application
 * Pure web-based IDE for Arduino/ESP32 boards using Web Serial API
 */

import { SerialManager } from './serial-manager.js';
import { CodeRunner } from './code-runner.js';
import { FirmataController } from './firmata-controller.js';

class EblocksApp {
  constructor() {
    this.editor = null;
    this.serialManager = new SerialManager();
    this.codeRunner = new CodeRunner();
    this.firmataController = new FirmataController();
    this.availablePorts = []; // previously-authorized ports
    this.serialLineBuffer = ''; // buffer for incomplete serial lines

    // Default code template
    this.defaultCode = `// eBlocks Online - Arduino C++ Example
// This code runs in-browser using JSCPP interpreter
// and communicates with your board via Firmata protocol

void setup() {
  // Initialize serial communication
  Serial.begin(115200);

  // Set pin 13 (built-in LED) as output
  pinMode(13, OUTPUT);

  Serial.println("eBlocks Online - Ready!");
}

void loop() {
  // Blink the LED
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`;

    this.init();
  }

  async init() {
    // Check browser compatibility
    this.checkBrowserSupport();

    // Initialize Monaco Editor
    await this.initMonacoEditor();

    // Set up event listeners
    this.setupEventListeners();

    // Set up serial communication listeners
    this.setupSerialListeners();

    // Load saved code if exists
    this.loadSavedCode();

    // Curriculum / worksheets
    this.initCurriculum();

    // Populate COM port list from previously-authorized ports
    await this.refreshPortList();

    // Ensure JSCPP is loaded, then debug info
    await this.ensureJSCPP();
    this.logDebugInfo();

    console.log('eBlocks Online initialized successfully');
  }

  checkBrowserSupport() {
    const supportInfo = document.getElementById('browser-support');

    if ('serial' in navigator) {
      if (supportInfo) {
        supportInfo.textContent = '✅ Supported';
        supportInfo.style.color = '#4ec9b0';
      }
    } else {
      if (supportInfo) {
        supportInfo.textContent = '❌ Not Supported';
        supportInfo.style.color = '#f48771';
      }

      // Show warning modal
      setTimeout(() => {
        const modal = document.getElementById('unsupported-modal');
        if (modal) modal.style.display = 'flex';
      }, 1000);
    }
  }

  async initMonacoEditor() {
    return new Promise((resolve, reject) => {
      require.config({
        paths: {
          vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
        }
      });

      require(['vs/editor/editor.main'], () => {
        const editorEl = document.getElementById('monaco-editor') || document.getElementById('editor-container');
        this.editor = monaco.editor.create(editorEl, {
          value: this.defaultCode,
          language: 'cpp',
          theme: 'vs-dark',
          fontSize: 14,
          minimap: { enabled: true },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          wordWrap: 'on'
        });

        console.log('Monaco Editor initialized');
        resolve();
      });
    });
  }

  setupEventListeners() {
    const on = (id, event, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, fn);
    };

    // Connect button (may not exist in all HTML versions)
    on('connect-btn', 'click', () => this.handleConnect());

    // Run / Upload button
    on('run-btn', 'click', () => this.handleRunCode());
    on('upload-btn', 'click', () => this.handleRunCode());

    // Save/Load buttons
    on('save-btn', 'click', () => this.saveCode());
    on('load-btn', 'click', () => this.loadCode());

    // Console / Serial monitor controls
    on('clear-console-btn', 'click', () => this.clearConsole());
    on('clear-monitor-btn', 'click', () => this.clearConsole());

    // Send button & serial form
    on('send-btn', 'click', () => this.sendToBoard());
    const serialForm = document.getElementById('serial-send-form');
    if (serialForm) {
      serialForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendToBoard();
      });
    }

    // Serial/console input enter key
    on('console-input', 'keypress', (e) => { if (e.key === 'Enter') this.sendToBoard(); });
    on('serial-input',  'keypress', (e) => { if (e.key === 'Enter') this.sendToBoard(); });

    // Modal close
    on('close-modal-btn', 'click', () => {
      const modal = document.getElementById('unsupported-modal');
      if (modal) modal.style.display = 'none';
    });

    // About link
    on('about-link', 'click', (e) => { e.preventDefault(); this.showAbout(); });

    // Refresh ports button — scan authorized ports, don't open Chrome picker
    on('refresh-ports-btn', 'click', () => this.refreshPortList());
  }

  setupSerialListeners() {
    this.serialManager.on('connected', async (portInfo) => {
      this.updateConnectionStatus(true, portInfo);
      this.logToConsole('✅ Board connected successfully', 'success');

      // Initialize Firmata controller with the port
      this.firmataController.setPort(this.serialManager.port);

      // Refresh port list so the newly-authorized port appears
      await this.refreshPortList();

      // Mark the connected port as selected in the dropdown
      this.markConnectedPortInSelect();
    });

    this.serialManager.on('disconnected', () => {
      this.updateConnectionStatus(false);
      this.logToConsole('⚠️ Board disconnected', 'warning');
    });

    this.serialManager.on('data', (data) => {
      // Buffer incoming chunks into complete lines
      this.serialLineBuffer += data;
      const lines = this.serialLineBuffer.split('\n');
      this.serialLineBuffer = lines.pop(); // keep any incomplete trailing chunk

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        this.logToConsole(trimmed);
        this.parseComboData(trimmed);
      });
    });

    this.serialManager.on('error', (error) => {
      this.logToConsole(`❌ Error: ${error}`, 'error');
    });
  }

  /**
   * Scan previously-authorized ports and populate the COM port dropdown
   */
  async refreshPortList() {
    this.availablePorts = await this.serialManager.getAvailablePorts();

    const select = document.getElementById('com-port-select');
    if (!select) return;

    const previousValue = select.value;
    select.innerHTML = '<option value="">Select a port...</option>';

    this.availablePorts.forEach((port, i) => {
      const info = port.getInfo();
      const label = this.getPortLabel(info, i);
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = label;
      select.appendChild(option);
    });

    // Restore previous selection if it still exists
    if (previousValue !== '' && select.querySelector(`option[value="${previousValue}"]`)) {
      select.value = previousValue;
    }

    console.log(`[eBlocks] Found ${this.availablePorts.length} authorized port(s)`);
  }

  /**
   * After connection, select the connected port in the dropdown
   */
  markConnectedPortInSelect() {
    const select = document.getElementById('com-port-select');
    if (!select || !this.serialManager.port) return;

    // Find the index of the connected port in our list
    const idx = this.availablePorts.indexOf(this.serialManager.port);
    if (idx !== -1) {
      select.value = String(idx);
    }
  }

  /**
   * Build a human-readable label for a serial port
   */
  getPortLabel(info, index) {
    const knownVendors = {
      0x2341: 'Arduino',
      0x1A86: 'CH340',
      0x0403: 'FTDI',
      0x10C4: 'Silicon Labs CP210x',
      0x04D8: 'Microchip',
      0x239A: 'Adafruit',
    };

    const vid = info.usbVendorId;
    const pid = info.usbProductId;

    if (vid && knownVendors[vid]) {
      return `Port ${index + 1} — ${knownVendors[vid]} (${pid ? `PID:${pid.toString(16).toUpperCase()}` : 'unknown PID'})`;
    }
    if (vid) {
      return `Port ${index + 1} — VID:${vid.toString(16).toUpperCase()} PID:${pid ? pid.toString(16).toUpperCase() : '?'}`;
    }
    return `Port ${index + 1}`;
  }

  async handleConnect() {
    const connectBtn = document.getElementById('connect-btn');

    if (this.serialManager.isConnected) {
      await this.serialManager.disconnect();
      return;
    }

    try {
      if (connectBtn) { connectBtn.disabled = true; connectBtn.textContent = 'Connecting...'; }

      const baudEl = document.getElementById('baud-select');
      const baudRate = baudEl ? parseInt(baudEl.value) : 115200;

      // Check if user has selected a previously-authorized port in the dropdown
      const select = document.getElementById('com-port-select');
      const selectedIndex = select ? parseInt(select.value) : NaN;
      const selectedPort = !isNaN(selectedIndex) && this.availablePorts[selectedIndex];

      if (selectedPort) {
        // Connect to the chosen port directly — no Chrome picker
        await this.serialManager.connect(baudRate, selectedPort);
      } else {
        // No port selected — open Chrome's serial port picker
        await this.serialManager.connect(baudRate);
      }

    } catch (error) {
      this.logToConsole(`❌ Connection failed: ${error.message}`, 'error');
      if (connectBtn) { connectBtn.disabled = false; connectBtn.textContent = 'Connect'; connectBtn.classList.remove('connected'); }
    }
  }

  async handleRunCode() {
    const code = this.editor.getValue();
    const runBtn = document.getElementById('run-btn') || document.getElementById('upload-btn');
    const statusBar = document.getElementById('editor-status') || document.getElementById('upload-status');

    try {
      if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = '⏳ Running...'; }
      if (statusBar) { statusBar.style.display = ''; statusBar.textContent = 'Executing code...'; }

      this.clearConsole();
      this.logToConsole('🚀 Starting code execution...', 'success');

      const result = await this.codeRunner.run(code, {
        onOutput: (output) => {
          this.logToConsole(output);
        },
        onFirmataCommand: (command, args) => {
          if (this.serialManager.isConnected) {
            this.firmataController.executeCommand(command, args);
          }
        }
      });

      this.logToConsole('✅ Code execution completed', 'success');
      if (statusBar) statusBar.textContent = 'Ready';

    } catch (error) {
      this.logToConsole(`❌ Execution error: ${error.message}`, 'error');
      if (statusBar) statusBar.textContent = 'Error - See console';
      console.error('Code execution error:', error);
    } finally {
      if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = '▶️ Run Code'; }
    }
  }

  updateConnectionStatus(connected, portInfo = {}) {
    // Connect button label + style
    const connectBtn = document.getElementById('connect-btn');
    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.textContent = connected ? 'Disconnect' : 'Connect';
      if (connected) {
        connectBtn.classList.add('connected');
      } else {
        connectBtn.classList.remove('connected');
      }
    }

    // Board image glow
    const boardImage = document.getElementById('board-image');
    if (boardImage) {
      if (connected) {
        boardImage.classList.add('connected');
        boardImage.classList.remove('disconnected');
      } else {
        boardImage.classList.remove('connected');
        boardImage.classList.add('disconnected');
      }
    }

    // Legacy status indicator (if present)
    const statusIndicator = document.getElementById('connection-status');
    if (statusIndicator) {
      const statusText = statusIndicator.querySelector('.status-text');
      if (connected) {
        statusIndicator.classList.add('connected');
        if (statusText) statusText.textContent = 'Connected';
      } else {
        statusIndicator.classList.remove('connected');
        if (statusText) statusText.textContent = 'Disconnected';
      }
    }

    const boardStatus = document.getElementById('board-status');
    if (boardStatus) boardStatus.textContent = connected ? 'Connected' : 'Not connected';

    const boardType = document.getElementById('board-type');
    if (boardType) boardType.textContent = connected ? (portInfo.productName || 'Arduino/ESP32') : 'Unknown';
  }

  /**
   * Parse a serial line from the combo-board firmware.
   * Expected format: "Port A: 1 0 1 1 0 1 0 1 | Port B: 0 0 1 1 0 0 1 1 "
   */
  parseComboData(line) {
    const match = line.match(/Port A:\s*([\d ]+)\|\s*Port B:\s*([\d ]+)/);
    if (!match) return false;

    const portA = match[1].trim().split(/\s+/).map(Number);
    const portB = match[2].trim().split(/\s+/).map(Number);

    this.updateComboBoardLEDs('first', portA);
    this.updateComboBoardLEDs('second', portB);

    const statusEl = document.getElementById('combo-board-status');
    if (statusEl) {
      statusEl.classList.add('active');
      statusEl.classList.remove('inactive');
      const txt = statusEl.querySelector('.status-text');
      if (txt) txt.textContent = 'Live';
    }

    return true;
  }

  /**
   * Update one row of combo board LEDs.
   * @param {string} port  - 'first' (Port A, top row) or 'second' (Port B, bottom row)
   * @param {number[]} bits - array of 8 values (0 or 1), bit 0 = leftmost LED
   */
  updateComboBoardLEDs(port, bits) {
    bits.forEach((val, i) => {
      const led = document.querySelector(`.combo-led[data-port="${port}"][data-bit="${i}"]`);
      if (!led) return;
      led.classList.toggle('on', val === 1);
      led.classList.toggle('off', val === 0);
      led.classList.remove('unknown');
    });
  }

  logToConsole(message, type = 'normal') {
    const consoleOutput = document.getElementById('monitor-content') || document.getElementById('console-output');
    if (!consoleOutput) return;

    const line = document.createElement('div');
    line.className = `console-line ${type}`;

    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${message}`;

    consoleOutput.appendChild(line);

    const autoScrollEl = document.getElementById('autoscroll-checkbox');
    if (!autoScrollEl || autoScrollEl.checked) {
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
  }

  clearConsole() {
    const consoleOutput = document.getElementById('monitor-content') || document.getElementById('console-output');
    if (consoleOutput) consoleOutput.innerHTML = '';
  }

  async sendToBoard() {
    const input = document.getElementById('serial-input') || document.getElementById('console-input');
    if (!input) return;
    const message = input.value.trim();

    if (!message) return;

    if (!this.serialManager.isConnected) {
      this.logToConsole('⚠️ Not connected to board', 'warning');
      return;
    }

    try {
      await this.serialManager.send(message + '\n');
      this.logToConsole(`📤 Sent: ${message}`, 'success');
      input.value = '';
    } catch (error) {
      this.logToConsole(`❌ Send failed: ${error.message}`, 'error');
    }
  }

  saveCode() {
    const code = this.editor.getValue();

    // Save to localStorage
    localStorage.setItem('eblocks-code', code);

    // Also download as file
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch.cpp';
    a.click();
    URL.revokeObjectURL(url);

    this.logToConsole('💾 Code saved', 'success');
  }

  loadCode() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cpp,.ino,.txt';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        this.editor.setValue(event.target.result);
        this.logToConsole(`📂 Loaded: ${file.name}`, 'success');
      };
      reader.readAsText(file);
    };

    input.click();
  }

  loadSavedCode() {
    const saved = localStorage.getItem('eblocks-code');
    if (saved) {
      this.editor.setValue(saved);
      this.logToConsole('📂 Loaded saved code from browser storage', 'success');
    }
  }

  async ensureJSCPP() {
    if (typeof JSCPP !== 'undefined') return true;

    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'vendor/jscpp.bundle.js';
      s.onload = () => {
        console.log('[eBlocks] JSCPP bundle loaded via ensureJSCPP');
        resolve(true);
      };
      s.onerror = () => {
        console.error('[eBlocks] Failed to load JSCPP bundle in ensureJSCPP');
        resolve(false);
      };
      document.head.appendChild(s);
    });
  }

  initCurriculum() {
    const curriculumContent = document.getElementById('curriculum-content');
    const worksheetViewer = document.getElementById('worksheet-viewer');
    const curriculumListEl = document.getElementById('curriculum-list');
    const worksheetTitle = document.getElementById('worksheet-viewer-title');
    const worksheetCode = document.getElementById('worksheet-viewer-code');
    const worksheetContent = document.getElementById('worksheet-content');
    const closeBtn = document.getElementById('worksheet-close-btn');

    if (!curriculumContent) return;

    const list = [
      { code: 'CP4807', title: 'Curriculum Overview', file: 'assets/curriculum1.txt' },
      { code: 'CP0507', title: 'Motors and Microcontrollers', file: 'assets/CP0507 - Motors and microconrtollers.txt' },
      { code: 'CP1972', title: 'Sensors and Microcontrollers', file: 'assets/CP1972 - Sensors and microcontrollers.txt' },
      { code: 'CP4436', title: 'PC and Web Interfacing', file: 'assets/CP4436 - PC and web interfacing.txt' }
    ];

    const showList = () => {
      if (worksheetViewer) worksheetViewer.style.display = 'none';
      if (curriculumListEl) curriculumListEl.style.display = 'flex';
    };

    const showWorksheet = async (item) => {
      if (curriculumListEl) curriculumListEl.style.display = 'none';
      if (worksheetViewer) worksheetViewer.style.display = 'flex';
      if (worksheetTitle) worksheetTitle.textContent = item.title;
      if (worksheetCode) worksheetCode.textContent = item.code;
      if (worksheetContent) worksheetContent.innerHTML = '<p class="worksheet-description">Loading...</p>';
      try {
        const res = await fetch(item.file);
        const text = await res.text();
        if (worksheetContent) worksheetContent.innerHTML = this.textToHTML(text);
      } catch (e) {
        if (worksheetContent) worksheetContent.innerHTML = '<p class="worksheet-description">Failed to load worksheet.</p>';
      }
    };

    curriculumContent.innerHTML = '';
    list.forEach(item => {
      const div = document.createElement('div');
      div.className = 'curriculum-item';
      div.innerHTML = `
        <div class="curriculum-item-icon">📚</div>
        <div class="curriculum-item-info">
          <div class="curriculum-item-code">${item.code}</div>
          <div class="curriculum-item-title">${item.title}</div>
        </div>
      `;
      div.addEventListener('click', () => showWorksheet(item));
      curriculumContent.appendChild(div);
    });

    if (closeBtn) closeBtn.addEventListener('click', showList);
    showList();
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  textToHTML(text) {
    const lines = text.split('\n');
    let html = '';
    let inUl = false;
    let inOl = false;

    const closeList = () => {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        closeList();
        continue;
      }

      // YouTube URL → video button
      if (/^https?:\/\/(www\.)?(youtu\.be|youtube\.com)/.test(line)) {
        closeList();
        const url = line.trim();
        html += `<div class="worksheet-video"><a class="worksheet-video-link" href="${url}" target="_blank" rel="noopener"><span>▶</span> Watch Video</a></div>`;
        continue;
      }

      // Skip CP code lines (e.g. "CP4807-1Introduction to microcontrollers")
      if (/^CP\d+/.test(line)) continue;

      // Worksheet section header (e.g. "Worksheet 4")
      if (/^Worksheet \d+$/.test(line)) {
        closeList();
        const num = line.split(' ')[1];
        const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
        if (nextLine && !/^CP\d+/.test(nextLine) && !/^https/.test(nextLine) && nextLine.length < 80) {
          html += `<div class="worksheet-section"><h3>Worksheet ${this.escapeHtml(num)} — ${this.escapeHtml(nextLine)}</h3></div>`;
          i++;
        } else {
          html += `<div class="worksheet-section"><h3>${this.escapeHtml(line)}</h3></div>`;
        }
        continue;
      }

      // Named section headers
      if (/^(Over to you|Challenges|Hints|Part \d+|Preparation|Teacher.s notes?|Contents|Bronze|Silver|Gold|Hardware|Pedagogy|Assessment|Software|Time|Example programs|Version control)[:.]?\s*$/i.test(line)) {
        closeList();
        html += `<h3 class="worksheet-section-title">${this.escapeHtml(line)}</h3>`;
        continue;
      }

      // Bullet item (* or o )
      if (/^\*\s/.test(line) || /^o\s/.test(line)) {
        if (inOl) { html += '</ol>'; inOl = false; }
        if (!inUl) { html += '<ul class="worksheet-list">'; inUl = true; }
        html += `<li>${this.escapeHtml(line.replace(/^[*o]\s+/, ''))}</li>`;
        continue;
      }

      // Numbered list item
      if (/^\d+\.\s/.test(line)) {
        if (inUl) { html += '</ul>'; inUl = false; }
        if (!inOl) { html += '<ol class="worksheet-list">'; inOl = true; }
        html += `<li>${this.escapeHtml(line.replace(/^\d+\.\s*/, ''))}</li>`;
        continue;
      }

      // Regular paragraph
      closeList();
      html += `<p class="worksheet-description">${this.escapeHtml(line)}</p>`;
    }

    closeList();
    return html;
  }

  logDebugInfo() {
    const versionEl = document.getElementById('app-version');
    const ver = window.EBLOCKS_VERSION || 'v1.0.0';
    if (versionEl) versionEl.textContent = `Web IDE ${ver}`;

    const jscppStatus = (typeof JSCPP !== 'undefined') ? 'loaded' : 'missing';
    console.log(`[eBlocks] Version: ${ver}`);
    console.log(`[eBlocks] JSCPP status: ${jscppStatus}`);
    this.logToConsole(`🔎 Version: ${ver}`, 'info');
    this.logToConsole(`🔎 JSCPP: ${jscppStatus}`, jscppStatus === 'loaded' ? 'success' : 'warning');
  }

  showAbout() {
    const ver = window.EBLOCKS_VERSION || 'v1.0.0';
    alert(`eBlocks Online - Web-Based IDE
Version: ${ver}

A pure web-based development environment for Arduino and ESP32 boards.

Features:
- Monaco Editor (VS Code engine)
- JSCPP C++ interpreter
- Web Serial API for board communication
- StandardFirmata protocol support

Browser Requirements:
- Chrome 89+ / Edge 89+ / Opera 75+

Created with love for the eBlocks community`);
  }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.eblocksApp = new EblocksApp();
  });
} else {
  window.eblocksApp = new EblocksApp();
}

export default EblocksApp;
