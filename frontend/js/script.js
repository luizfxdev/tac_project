class TacInterface {
  constructor() {
    this.fileInput = document.getElementById('file-input');
    this.textInput = document.getElementById('text-input');
    this.fileInfo = document.getElementById('file-info');
    this.processBtn = document.getElementById('process-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.resultSection = document.getElementById('result-section');
    this.calculationDetails = document.getElementById('calculation-details');
    this.outputText = document.getElementById('output-text');
    this.downloadBtn = document.getElementById('download-btn');
    this.loading = document.getElementById('loading');

    this.currentFile = null;
    this.currentResult = null;

    this.initEventListeners();
  }

  initEventListeners() {
    // File input events
    this.fileInput.addEventListener('change', e => this.handleFileSelect(e));

    // Button events
    this.processBtn.addEventListener('click', () => this.processInput());
    this.clearBtn.addEventListener('click', () => this.clearAll());
    this.downloadBtn.addEventListener('click', () => this.downloadResult());

    // Text input events
    this.textInput.addEventListener('input', () => this.updateProcessButton());

    // Keyboard accessibility
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.processInput();
      }
      if (e.key === 'Escape') {
        this.clearAll();
      }
    });
  }

  handleFileSelect(event) {
    const file = event.target.files[0];

    if (!file) {
      this.clearFileInfo();
      return;
    }

    // Validate file type
    const validTypes = ['text/plain', 'text/csv', 'application/json', 'text/markdown'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const validExtensions = ['txt', 'log', 'csv', 'md', 'json'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      this.showError('Tipo de arquivo não suportado. Use apenas arquivos de texto.');
      this.clearFileInfo();
      return;
    }

    // Check file size (max 50MB for frontend processing)
    if (file.size > 50 * 1024 * 1024) {
      this.showError('Arquivo muito grande. Tamanho máximo: 50MB');
      this.clearFileInfo();
      return;
    }

    this.currentFile = file;
    this.displayFileInfo(file);
    this.textInput.value = ''; // Clear text input when file is selected
    this.updateProcessButton();
  }

  displayFileInfo(file) {
    const sizeStr = this.formatFileSize(file.size);
    this.fileInfo.innerHTML = `
            <span style="color: #00ff95;">✓</span> 
            ${file.name} (${sizeStr})
        `;
  }

  clearFileInfo() {
    this.fileInfo.innerHTML = '';
    this.currentFile = null;
    this.fileInput.value = '';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  updateProcessButton() {
    const hasInput = this.currentFile || this.textInput.value.trim();
    this.processBtn.disabled = !hasInput;

    if (hasInput) {
      this.processBtn.style.opacity = '1';
      this.processBtn.style.cursor = 'pointer';
    } else {
      this.processBtn.style.opacity = '0.6';
      this.processBtn.style.cursor = 'not-allowed';
    }
  }

  async processInput() {
    if (this.processBtn.disabled) return;

    this.showLoading(true);
    this.hideResult();

    try {
      let inputData = '';
      let inputSource = '';

      if (this.currentFile) {
        inputData = await this.readFileAsText(this.currentFile);
        inputSource = `Arquivo: ${this.currentFile.name}`;
      } else {
        inputData = this.textInput.value.trim();
        inputSource = 'Texto digitado';
      }

      if (!inputData) {
        throw new Error('Nenhum conteúdo encontrado para processar');
      }

      // Process with backend if file is large, otherwise process locally
      let result;
      if (this.currentFile && this.currentFile.size > 5 * 1024 * 1024) {
        result = await this.processWithBackend();
      } else {
        result = await this.processLocally(inputData, inputSource);
      }

      this.displayResult(result);
    } catch (error) {
      this.showError(`Erro ao processar: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  async processLocally(inputData, inputSource) {
    // Simulate processing time for better UX
    await this.delay(500);

    const lines = inputData.split('\n');
    const originalCount = lines.length;

    // Apply tac (reverse lines)
    const reversedLines = [...lines].reverse();
    const resultText = reversedLines.join('\n');

    // Create calculation details
    const steps = [
      `Fonte: ${inputSource}`,
      `Total de linhas encontradas: ${originalCount}`,
      `Aplicando inversão de linhas (comando tac)...`,
      `Linha ${originalCount} → Linha 1`,
      `Linha ${originalCount - 1} → Linha 2`,
      '...',
      `Linha 1 → Linha ${originalCount}`,
      `✓ Processamento concluído com sucesso`
    ];

    return {
      original: inputData,
      result: resultText,
      steps: steps,
      lineCount: originalCount,
      source: inputSource
    };
  }

  async processWithBackend() {
    const formData = new FormData();
    formData.append('file', this.currentFile);

    const response = await fetch('/api/tac', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Erro do servidor: ${response.status}`);
    }

    const result = await response.json();
    return result;
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  displayResult(result) {
    // Update calculation details
    this.calculationDetails.innerHTML = result.steps
      .map((step, index) => {
        const isHighlight = step.includes('✓') || step.includes('Total') || step.includes('Fonte');
        return `<div class="step ${isHighlight ? 'highlight' : ''}">${step}</div>`;
      })
      .join('');

    // Update output
    this.outputText.value = result.result;
    this.currentResult = result;

    // Show result section with animation
    this.resultSection.classList.add('show');
    this.resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  hideResult() {
    this.resultSection.classList.remove('show');
    this.currentResult = null;
  }

  showLoading(show) {
    if (show) {
      this.loading.classList.add('show');
      this.processBtn.disabled = true;
    } else {
      this.loading.classList.remove('show');
      this.updateProcessButton();
    }
  }

  clearAll() {
    // Clear all inputs
    this.textInput.value = '';
    this.clearFileInfo();

    // Hide result
    this.hideResult();

    // Update button states
    this.updateProcessButton();

    // Show clear animation
    this.showNotification('Campos limpos com sucesso!', 'success');
  }

  downloadResult() {
    if (!this.currentResult) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `tac_resultado_${timestamp}.txt`;

    const blob = new Blob([this.currentResult.result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('Arquivo baixado com sucesso!', 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
            <span class="notification-icon">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
            <span class="notification-message">${message}</span>
        `;

    // Add styles
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background:
        type === 'error'
          ? 'rgba(255, 107, 107, 0.9)'
          : type === 'success'
          ? 'rgba(0, 255, 149, 0.9)'
          : 'rgba(76, 236, 196, 0.9)',
      color: '#ffffff',
      padding: '1rem 1.5rem',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
      zIndex: '1000',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.9rem',
      fontWeight: '500',
      maxWidth: '300px',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease'
    });

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Auto remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TacInterface();

  // Add some visual enhancements
  const container = document.querySelector('.main-content');
  if (container) {
    // Add subtle mouse parallax effect
    document.addEventListener('mousemove', e => {
      const x = (e.clientX - window.innerWidth / 2) / window.innerWidth;
      const y = (e.clientY - window.innerHeight / 2) / window.innerHeight;

      container.style.transform = `translate(${x * 5}px, ${y * 5}px) translateY(-10px)`;
    });
  }

  // Add keyboard shortcuts info
  const shortcuts = document.createElement('div');
  shortcuts.innerHTML = `
        <div style="position: fixed; bottom: 20px; left: 20px; font-size: 0.8rem; color: rgba(255, 255, 255, 0.5);">
            <div>Ctrl+Enter: Processar</div>
            <div>Esc: Limpar</div>
        </div>
    `;
  document.body.appendChild(shortcuts);
});
