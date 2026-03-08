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
    this.serialHistory = [];
    this.currentWorksheet = null;
    this.chatHistory = [];
    this.maxChatHistory = 12;
    this.chatStorageKey = 'eblocks-chat-history';

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

    // AI assistant
    this.initChat();

    // Mobile bottom nav
    this.initMobileNav();

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

    // Driver banner
    on('driver-banner-install-btn', 'click', () => {
      const modal = document.getElementById('driver-modal');
      if (modal) modal.style.display = 'flex';
    });
    on('driver-banner-dismiss-btn', 'click', () => {
      const banner = document.getElementById('driver-banner');
      if (banner) banner.style.display = 'none';
    });
    on('driver-modal-close', 'click', () => {
      const modal = document.getElementById('driver-modal');
      if (modal) modal.style.display = 'none';
    });
    document.getElementById('driver-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'driver-modal') e.target.style.display = 'none';
    });

    // About link
    on('about-link', 'click', (e) => { e.preventDefault(); this.showAbout(); });

    // Refresh ports button — scan authorized ports, don't open Chrome picker
    on('refresh-ports-btn', 'click', () => this.refreshPortList());

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendChatMessage();
      });
    }

    on('chat-clear-btn', 'click', () => this.clearChatHistory());

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.sendChatMessage();
        }
      });
    }
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
    this.appendSerialHistory(`[${timestamp}] ${message}`);

    const autoScrollEl = document.getElementById('autoscroll-checkbox');
    if (!autoScrollEl || autoScrollEl.checked) {
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
  }

  clearConsole() {
    const consoleOutput = document.getElementById('monitor-content') || document.getElementById('console-output');
    if (consoleOutput) consoleOutput.innerHTML = '';
    this.serialHistory = [];
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
    const curriculumHeader = curriculumListEl ? curriculumListEl.querySelector('.curriculum-header h3') : null;

    if (!curriculumContent) return;

    const modules = [
      { code: 'CP4807', title: 'Introduction to Microcontrollers', file: 'assets/curriculum1.txt' },
      { code: 'CP0507', title: 'Motors and Microcontrollers', file: 'assets/CP0507 - Motors and microconrtollers.txt' },
      { code: 'CP1972', title: 'Sensors and Microcontrollers', file: 'assets/CP1972 - Sensors and microcontrollers.txt' },
      { code: 'CP4436', title: 'PC and Web Interfacing', file: 'assets/CP4436 - PC and web interfacing.txt' }
    ];

    let currentModule = null;

    const showModuleList = () => {
      if (worksheetViewer) worksheetViewer.style.display = 'none';
      if (curriculumListEl) curriculumListEl.style.display = 'flex';
      if (curriculumHeader) curriculumHeader.textContent = 'E-Blocks Curriculum';
      currentModule = null;
      this.currentWorksheet = null;
      curriculumContent.innerHTML = '';
      modules.forEach(mod => {
        const div = document.createElement('div');
        div.className = 'curriculum-item';
        div.innerHTML = `
          <div class="curriculum-item-icon">📚</div>
          <div class="curriculum-item-info">
            <div class="curriculum-item-code">${mod.code}</div>
            <div class="curriculum-item-title">${mod.title}</div>
          </div>
        `;
        div.addEventListener('click', () => showWorksheetList(mod));
        curriculumContent.appendChild(div);
      });
    };

    const showWorksheetList = async (mod) => {
      currentModule = mod;
      this.currentWorksheet = null;
      if (worksheetViewer) worksheetViewer.style.display = 'none';
      if (curriculumListEl) curriculumListEl.style.display = 'flex';
      if (curriculumHeader) curriculumHeader.textContent = mod.title;
      curriculumContent.innerHTML = '<div class="curriculum-loading">Loading...</div>';
      try {
        const res = await fetch(mod.file);
        const text = await res.text();
        const worksheets = this.parseWorksheets(text);
        curriculumContent.innerHTML = '';
        const backDiv = document.createElement('div');
        backDiv.className = 'curriculum-back-button';
        backDiv.textContent = '← All Modules';
        backDiv.addEventListener('click', showModuleList);
        curriculumContent.appendChild(backDiv);
        const headerDiv = document.createElement('div');
        headerDiv.className = 'curriculum-selected-header';
        headerDiv.innerHTML = `<div class="curriculum-selected-code">${mod.code}</div><div class="curriculum-selected-title">${mod.title}</div>`;
        curriculumContent.appendChild(headerDiv);
        worksheets.forEach(ws => {
          const div = document.createElement('div');
          div.className = 'curriculum-lesson';
          div.innerHTML = `
            <span class="curriculum-lesson-number">${ws.num}</span>
            <span class="curriculum-lesson-title">${ws.subtitle || 'Worksheet ' + ws.num}</span>
          `;
          div.addEventListener('click', () => showSingleWorksheet(ws, mod));
          curriculumContent.appendChild(div);
        });
      } catch (e) {
        this.currentWorksheet = null;
        curriculumContent.innerHTML = '<div class="curriculum-loading">Failed to load module.</div>';
      }
    };

    const showSingleWorksheet = (ws, mod) => {
      if (curriculumListEl) curriculumListEl.style.display = 'none';
      if (worksheetViewer) worksheetViewer.style.display = 'flex';
      if (worksheetTitle) worksheetTitle.textContent = ws.subtitle || 'Worksheet ' + ws.num;
      if (worksheetCode) worksheetCode.textContent = mod.code + '-' + ws.num;
      if (worksheetContent) worksheetContent.innerHTML = this.textToHTML(ws.lines.join('\n'));
      if (worksheetContent) worksheetContent.scrollTop = 0;
      this.currentWorksheet = {
        code: mod.code + '-' + ws.num,
        title: ws.subtitle || 'Worksheet ' + ws.num,
        text: ws.lines.join('\n')
      };
    };

    if (closeBtn) closeBtn.addEventListener('click', () => {
      if (currentModule) showWorksheetList(currentModule);
      else showModuleList();
    });

    showModuleList();
  }

  initChat() {
    this.chatHistory = this.loadChatHistory();
    this.renderChatHistory();
    this.setChatStatus('Ready');
  }

  loadChatHistory() {
    try {
      const raw = sessionStorage.getItem(this.chatStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((entry) => entry && (entry.role === 'user' || entry.role === 'assistant') && typeof entry.content === 'string')
        .slice(-this.maxChatHistory);
    } catch (_) {
      return [];
    }
  }

  saveChatHistory() {
    sessionStorage.setItem(this.chatStorageKey, JSON.stringify(this.chatHistory.slice(-this.maxChatHistory)));
  }

  renderChatHistory() {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    messagesEl.innerHTML = '';

    if (!this.chatHistory.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.textContent = 'Ask about your code, board behavior, or the open worksheet.';
      messagesEl.appendChild(empty);
      return;
    }

    this.chatHistory.forEach((entry) => {
      const item = document.createElement('div');
      item.className = `chat-message ${entry.role}`;

      const role = document.createElement('span');
      role.className = 'chat-message-role';
      role.textContent = entry.role === 'assistant' ? 'Assistant' : 'You';

      const body = document.createElement('div');
      body.textContent = entry.content;

      item.appendChild(role);
      item.appendChild(body);
      messagesEl.appendChild(item);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  clearChatHistory() {
    this.chatHistory = [];
    this.saveChatHistory();
    this.renderChatHistory();
    this.setChatStatus('Conversation cleared.', 'success');
  }

  appendChatEntry(role, content) {
    this.chatHistory.push({ role, content });
    this.chatHistory = this.chatHistory.slice(-this.maxChatHistory);
    this.saveChatHistory();
    this.renderChatHistory();
  }

  setChatStatus(message, type = '') {
    const statusEl = document.getElementById('chat-status');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.classList.remove('error', 'success');
    if (type) statusEl.classList.add(type);
  }

  appendSerialHistory(line) {
    this.serialHistory.push(line);
    this.serialHistory = this.serialHistory.slice(-40);
  }

  getBoardTypeLabel() {
    const boardSelect = document.getElementById('editor-board-select');
    if (!boardSelect) return '';
    const selected = boardSelect.options[boardSelect.selectedIndex];
    return selected ? `${selected.text} (${selected.value})` : boardSelect.value;
  }

  getWorksheetContext() {
    if (!this.currentWorksheet) return null;

    return {
      code: this.currentWorksheet.code || '',
      title: this.currentWorksheet.title || '',
      text: this.currentWorksheet.text || ''
    };
  }

  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const includeCode = document.getElementById('chat-include-code');
    const includeSerial = document.getElementById('chat-include-serial');

    if (!input || !sendBtn) return;

    const message = input.value.trim();
    if (!message) {
      this.setChatStatus('Enter a message to start chatting.', 'error');
      return;
    }

    const payload = {
      message,
      boardType: this.getBoardTypeLabel(),
      editorCode: includeCode && includeCode.checked && this.editor ? this.editor.getValue() : '',
      worksheet: this.getWorksheetContext(),
      serialContext: includeSerial && includeSerial.checked ? this.serialHistory.join('\n') : '',
      conversation: this.chatHistory
    };

    this.appendChatEntry('user', message);
    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    this.setChatStatus('Waiting for Gemini...');

    try {
      const response = await fetch('/api/eblocks/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed');
      }

      this.appendChatEntry('assistant', data.reply || 'No reply received.');
      this.setChatStatus(
        Array.isArray(data.warnings) && data.warnings.length
          ? data.warnings.join(' ')
          : 'Reply received.',
        Array.isArray(data.warnings) && data.warnings.length ? '' : 'success'
      );
    } catch (error) {
      this.appendChatEntry('assistant', `I couldn't complete that request: ${error.message}`);
      this.setChatStatus(error.message, 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      input.focus();
    }
  }

  parseWorksheets(text) {
    const lines = text.split('\n');
    const worksheets = [];
    let current = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^Worksheet \d+$/.test(trimmed)) {
        if (current) worksheets.push(current);
        const num = parseInt(trimmed.split(' ')[1]);
        current = { num, subtitle: '', lines: [line] };
      } else if (current) {
        if (!current.subtitle && trimmed && !/^CP\d+/.test(trimmed) && !/^https/.test(trimmed) && trimmed.length < 80) {
          current.subtitle = trimmed;
        }
        current.lines.push(line);
      }
    }
    if (current) worksheets.push(current);
    return worksheets;
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

  initMobileNav() {
    const nav = document.getElementById('mobile-nav');
    if (!nav) return;

    const panels = {
      left:  document.getElementById('leftSidebar'),
      main:  document.querySelector('.app-main'),
      right: document.getElementById('rightSidebar'),
    };

    const setActive = (key) => {
      Object.values(panels).forEach(p => p?.classList.remove('mobile-active'));
      panels[key]?.classList.add('mobile-active');
      nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('mobile-nav-active', btn.dataset.panel === key);
      });
    };

    nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => setActive(btn.dataset.panel));
    });

    // Activate the Code panel by default on mobile
    const isMobile = () => window.innerWidth <= 768;
    if (isMobile()) setActive('main');

    // Re-apply on resize
    window.addEventListener('resize', () => {
      if (isMobile() && !document.querySelector('.mobile-active')) setActive('main');
    });
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
