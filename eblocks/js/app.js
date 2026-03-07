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

    // Refresh ports button
    on('refresh-ports-btn', 'click', () => this.handleConnect());
  }

  setupSerialListeners() {
    // Listen for connection state changes
    this.serialManager.on('connected', (portInfo) => {
      this.updateConnectionStatus(true, portInfo);
      this.logToConsole('✅ Board connected successfully', 'success');
      
      // Initialize Firmata controller with the port
      this.firmataController.setPort(this.serialManager.port);
    });

    this.serialManager.on('disconnected', () => {
      this.updateConnectionStatus(false);
      this.logToConsole('⚠️ Board disconnected', 'warning');
    });

    this.serialManager.on('data', (data) => {
      this.logToConsole(data);
    });

    this.serialManager.on('error', (error) => {
      this.logToConsole(`❌ Error: ${error}`, 'error');
    });
  }

  async handleConnect() {
    const connectBtn = document.getElementById('connect-btn');

    if (this.serialManager.isConnected) {
      await this.serialManager.disconnect();
      if (connectBtn) connectBtn.innerHTML = '<span class="icon">🔌</span> Connect to Board';
    } else {
      try {
        if (connectBtn) { connectBtn.disabled = true; connectBtn.innerHTML = '<span class="icon">⏳</span> Connecting...'; }

        const baudEl = document.getElementById('baud-select');
        const baudRate = baudEl ? parseInt(baudEl.value) : 115200;
        await this.serialManager.connect(baudRate);

        if (connectBtn) connectBtn.innerHTML = '<span class="icon">🔌</span> Disconnect';
      } catch (error) {
        this.logToConsole(`❌ Connection failed: ${error.message}`, 'error');
        if (connectBtn) connectBtn.innerHTML = '<span class="icon">🔌</span> Connect to Board';
      } finally {
        if (connectBtn) connectBtn.disabled = false;
      }
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
      
      // Run the code through JSCPP interpreter
      const result = await this.codeRunner.run(code, {
        onOutput: (output) => {
          this.logToConsole(output);
        },
        onFirmataCommand: (command, args) => {
          // Send Firmata commands to the board
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

    if (!curriculumContent) return; // curriculum UI not present

    const list = [
      { code: 'CP4807', title: 'Curriculum Overview', file: 'assets/curriculum1.txt' },
      { code: 'CP0507', title: 'Motors and Microcontrollers', file: 'assets/CP0507 - Motors and microconrtollers.txt' },
      { code: 'CP1972', title: 'Sensors and Microcontrollers', file: 'assets/CP1972 - Sensors and microcontrollers.txt' },
      { code: 'CP4436', title: 'PC and Web Interfacing', file: 'assets/CP4436 - PC and web interfacing.txt' }
    ];

    const showList = () => {
      if (worksheetViewer) worksheetViewer.style.display = 'none';
      if (curriculumListEl) curriculumListEl.style.display = 'block';
    };

    const showWorksheet = async (item) => {
      if (curriculumListEl) curriculumListEl.style.display = 'none';
      if (worksheetViewer) worksheetViewer.style.display = 'block';
      if (worksheetTitle) worksheetTitle.textContent = item.title;
      if (worksheetCode) worksheetCode.textContent = item.code;
      if (worksheetContent) worksheetContent.textContent = 'Loading...';
      try {
        const res = await fetch(item.file);
        const text = await res.text();
        if (worksheetContent) worksheetContent.textContent = text;
      } catch (e) {
        if (worksheetContent) worksheetContent.textContent = 'Failed to load worksheet.';
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

Created with ❤️ for the eBlocks community
https://github.com/hadefuwa/eblocks-online`);
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
