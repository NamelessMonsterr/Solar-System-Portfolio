export class SocialFeaturesManager {
  constructor() {
    this.comments = [];
    this.initialized = false;
  }

  init() {
    this.createCommentsSection();
    this.loadComments();
    
    console.log('✓ Social features initialized');
    this.initialized = true;
  }

  createCommentsSection() {
    const container = document.createElement('div');
    container.id = 'comments-section';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 500px;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #06b6d4;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
      gap: 15px;
      z-index: 1800;
      max-height: 400px;
      overflow-y: auto;
    `;

    container.innerHTML = `
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      ">
        <h3 style="margin: 0; color: #06b6d4; font-size: 16px;">💬 Comments</h3>
        <button id="comments-close" style="
          background: none;
          border: none;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        ">✕</button>
      </div>

      <div id="comments-list" style="
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 250px;
        overflow-y: auto;
        padding-right: 5px;
      ">
        <!-- Comments will be populated here -->
      </div>

      <div style="
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 15px;
        margin-top: 10px;
      ">
        <input
          id="comment-name"
          type="text"
          placeholder="Your name..."
          style="
            width: 100%;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 6px;
            color: #fff;
            font-size: 13px;
            margin-bottom: 10px;
          "
        />
        <textarea
          id="comment-text"
          placeholder="Leave a comment about this project..."
          rows="3"
          style="
            width: 100%;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 6px;
            color: #fff;
            font-size: 13px;
            resize: vertical;
            font-family: inherit;
          "
        ></textarea>
        <button id="comment-submit" style="
          width: 100%;
          padding: 10px;
          background: #06b6d4;
          border: none;
          border-radius: 6px;
          color: #000;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
          font-size: 13px;
        ">Post Comment</button>
      </div>
    `;

    document.body.appendChild(container);

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'comments-toggle';
    toggleBtn.innerHTML = '💬';
    toggleBtn.setAttribute('aria-label', 'Toggle Comments');
    toggleBtn.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      border: none;
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
      z-index: 1799;
      transition: transform 0.2s;
    `;
    toggleBtn.onmouseover = () => toggleBtn.style.transform = 'scale(1.1)';
    toggleBtn.onmouseout = () => toggleBtn.style.transform = 'scale(1)';
    toggleBtn.onclick = () => this.toggle();
    
    document.body.appendChild(toggleBtn);

    // Event listeners
    document.getElementById('comments-close').onclick = () => this.close();
    document.getElementById('comment-submit').onclick = () => this.submitComment();
  }

  toggle() {
    const container = document.getElementById('comments-section');
    if (container.style.display === 'none') {
      container.style.display = 'flex';
    } else {
      container.style.display = 'none';
    }
  }

  close() {
    const container = document.getElementById('comments-section');
    container.style.display = 'none';
  }

  loadComments() {
    // Load from localStorage
    try {
      const stored = localStorage.getItem('portfolio_comments');
      if (stored) {
        this.comments = JSON.parse(stored);
        this.renderComments();
      } else {
        // Add sample comments
        this.comments = [
          {
            id: 1,
            name: 'Space Explorer',
            text: 'This is an amazing portfolio! Love the 3D navigation.',
            timestamp: Date.now() - 86400000
          },
          {
            id: 2,
            name: 'Developer',
            text: 'The WebGL shaders and spatial audio are impressive!',
            timestamp: Date.now() - 3600000
          }
        ];
        this.saveComments();
        this.renderComments();
      }
    } catch (error) {
      console.warn('Failed to load comments:', error);
    }
  }

  renderComments() {
    const list = document.getElementById('comments-list');
    if (!list) return;

    if (this.comments.length === 0) {
      list.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No comments yet. Be the first!</div>';
      return;
    }

    list.innerHTML = this.comments
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(comment => `
        <div style="
          background: rgba(255, 255, 255, 0.05);
          padding: 12px;
          border-radius: 8px;
          border-left: 3px solid #06b6d4;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          ">
            <span style="color: #06b6d4; font-weight: 600; font-size: 13px;">${this.escapeHtml(comment.name)}</span>
            <span style="color: #888; font-size: 11px;">${this.formatTimestamp(comment.timestamp)}</span>
          </div>
          <div style="color: #ddd; font-size: 13px; line-height: 1.5;">
            ${this.escapeHtml(comment.text)}
          </div>
        </div>
      `).join('');
  }

  submitComment() {
    const nameInput = document.getElementById('comment-name');
    const textInput = document.getElementById('comment-text');

    const name = nameInput.value.trim();
    const text = textInput.value.trim();

    if (!name || !text) {
      alert('Please enter both your name and comment.');
      return;
    }

    const comment = {
      id: Date.now(),
      name,
      text,
      timestamp: Date.now()
    };

    this.comments.push(comment);
    this.saveComments();
    this.renderComments();

    // Clear inputs
    nameInput.value = '';
    textInput.value = '';

    // Show confirmation
    if (window.Helpers) {
      window.Helpers.showNotification('Comment posted!', 'success');
    }

    // Track analytics
    if (window.analyticsManager) {
      window.analyticsManager.trackEvent('comment_posted');
    }
  }

  saveComments() {
    try {
      localStorage.setItem('portfolio_comments', JSON.stringify(this.comments));
    } catch (error) {
      console.warn('Failed to save comments:', error);
    }
  }

  formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    const container = document.getElementById('comments-section');
    const toggle = document.getElementById('comments-toggle');
    if (container) container.remove();
    if (toggle) toggle.remove();
  }
}
