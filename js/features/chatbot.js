import { CONFIG } from '../utils/config.js';

export class AIChatbot {
  constructor() {
    this.isOpen = false;
    this.messageHistory = [];
    this.container = null;
    this.knowledgeBase = CONFIG.CHATBOT.PLANET_KNOWLEDGE;
  }

  init() {
    this.createChatInterface();
    this.setupEventListeners();
    console.log('✓ AI Chatbot initialized');
  }

  createChatInterface() {
    const container = document.createElement('div');
    container.id = 'chatbot-container';
    container.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 350px;
      max-height: 500px;
      background: rgba(10, 10, 20, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      border: 2px solid #06b6d4;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
      z-index: 2000;
      overflow: hidden;
    `;

    container.innerHTML = `
      <div style="
        padding: 15px;
        background: rgba(6, 182, 212, 0.2);
        border-bottom: 1px solid #06b6d4;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 10px;
            height: 10px;
            background: #00ff00;
            border-radius: 50%;
            animation: blink 1.5s infinite;
          "></div>
          <span style="color: #fff; font-weight: 600; font-size: 14px;">Space Guide AI</span>
        </div>
        <button id="chatbot-close" style="
          background: none;
          border: none;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
        ">✕</button>
      </div>

      <div id="chat-messages" style="
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        max-height: 350px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      "></div>

      <div style="
        padding: 15px;
        border-top: 1px solid rgba(6, 182, 212, 0.3);
      ">
        <div style="display: flex; gap: 8px;">
          <input
            id="chat-input"
            type="text"
            placeholder="Ask about planets or projects..."
            style="
              flex: 1;
              padding: 10px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(6, 182, 212, 0.3);
              border-radius: 6px;
              color: #fff;
              font-size: 13px;
            "
          />
          <button id="chat-send" style="
            padding: 10px 20px;
            background: #06b6d4;
            border: none;
            border-radius: 6px;
            color: #000;
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
          ">Send</button>
        </div>
        <div style="margin-top: 10px; display: flex; gap: 5px; flex-wrap: wrap;">
          <button class="quick-question" data-question="Tell me about Earth" style="
            padding: 5px 10px;
            background: rgba(6, 182, 212, 0.2);
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 4px;
            color: #06b6d4;
            font-size: 11px;
            cursor: pointer;
          ">Earth</button>
          <button class="quick-question" data-question="Tell me about Mars" style="
            padding: 5px 10px;
            background: rgba(6, 182, 212, 0.2);
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 4px;
            color: #06b6d4;
            font-size: 11px;
            cursor: pointer;
          ">Mars</button>
          <button class="quick-question" data-question="Tell me about Jupiter" style="
            padding: 5px 10px;
            background: rgba(6, 182, 212, 0.2);
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 4px;
            color: #06b6d4;
            font-size: 11px;
            cursor: pointer;
          ">Jupiter</button>
        </div>
      </div>
    `;

    // Add blink animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      #chat-messages::-webkit-scrollbar {
        width: 6px;
      }
      #chat-messages::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
      }
      #chat-messages::-webkit-scrollbar-thumb {
        background: #06b6d4;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(container);
    this.container = container;

    // Add welcome message
    this.addMessage('bot', 'Hello! I\'m your Space Guide AI. Ask me anything about the planets in our solar system or the projects showcased here!');
  }

  setupEventListeners() {
    // Toggle button (create floating button)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'chatbot-toggle';
    toggleBtn.innerHTML = '🤖';
    toggleBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      border: none;
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(6, 182, 212, 0.4);
      z-index: 1999;
      transition: transform 0.2s;
    `;
    toggleBtn.onmouseover = () => toggleBtn.style.transform = 'scale(1.1)';
    toggleBtn.onmouseout = () => toggleBtn.style.transform = 'scale(1)';
    toggleBtn.onclick = () => this.toggle();
    document.body.appendChild(toggleBtn);

    // Close button
    document.getElementById('chatbot-close').onclick = () => this.close();

    // Send button
    document.getElementById('chat-send').onclick = () => this.sendMessage();

    // Input enter key
    const input = document.getElementById('chat-input');
    input.onkeypress = (e) => {
      if (e.key === 'Enter') this.sendMessage();
    };

    // Quick questions
    document.querySelectorAll('.quick-question').forEach(btn => {
      btn.onclick = () => {
        const question = btn.dataset.question;
        input.value = question;
        this.sendMessage();
      };
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.container) {
      this.container.style.display = 'flex';
      this.isOpen = true;
      document.getElementById('chat-input').focus();
    }
  }

  close() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isOpen = false;
    }
  }

  sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

    // Simulate thinking
    setTimeout(() => {
      const response = this.generateResponse(message);
      this.addMessage('bot', response);
    }, 500);
  }

  addMessage(type, text) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    
    messageDiv.style.cssText = `
      padding: 10px 12px;
      border-radius: 8px;
      max-width: 80%;
      ${type === 'user' 
        ? 'background: #06b6d4; color: #000; align-self: flex-end; margin-left: auto;' 
        : 'background: rgba(255, 255, 255, 0.05); color: #fff; align-self: flex-start;'
      }
      font-size: 13px;
      line-height: 1.5;
      word-wrap: break-word;
    `;
    
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    this.messageHistory.push({ type, text });
  }

  generateResponse(message) {
    const lowerMessage = message.toLowerCase();

    // Check for planet mentions
    for (const [planet, knowledge] of Object.entries(this.knowledgeBase)) {
      if (lowerMessage.includes(planet.toLowerCase())) {
        return knowledge;
      }
    }

    // General responses
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
      return "I can tell you about any planet in our solar system! Just ask me about Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, or Pluto. I can also provide information about the projects showcased in this portfolio.";
    }

    if (lowerMessage.includes('project') || lowerMessage.includes('portfolio')) {
      return "This interactive 3D portfolio showcases various projects through a solar system exploration experience. Fly to different planets to discover projects, skills, and contact information!";
    }

    if (lowerMessage.includes('how') && lowerMessage.includes('control')) {
      return "Use WASD to move your spaceship, Space to go up, Shift to go down, and Q/E to rotate. Drag your mouse to look around. Press C to toggle cockpit view, and M to switch between game and orbit modes!";
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! Welcome to this space exploration portfolio. Feel free to ask me about any planet or how to navigate!";
    }

    // Default response
    return "That's an interesting question! Try asking me about a specific planet (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, or Pluto), or ask about the controls and features of this portfolio.";
  }

  cleanup() {
    if (this.container) {
      this.container.remove();
    }
    const toggleBtn = document.getElementById('chatbot-toggle');
    if (toggleBtn) {
      toggleBtn.remove();
    }
  }
}
