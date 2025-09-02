const fs = require('fs');
const path = require('path');
const { Readable, Transform } = require('stream');

/**
 * TAC - Implementação eficiente do comando tac Unix
 * Inverte as linhas de um arquivo usando streams para eficiência de memória
 */
class TacProcessor {
  constructor(options = {}) {
    this.options = {
      encoding: options.encoding || 'utf8',
      bufferSize: options.bufferSize || 64 * 1024, // 64KB buffer
      maxMemoryUsage: options.maxMemoryUsage || 512 * 1024 * 1024, // 512MB limit
      ...options
    };
  }

  /**
   * Processa um arquivo aplicando tac (inversão de linhas)
   * @param {string} filePath - Caminho do arquivo
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processFile(filePath) {
    const startTime = Date.now();

    try {
      // Validar arquivo
      const stats = await this.validateFile(filePath);

      // Processar baseado no tamanho
      let result;
      if (stats.size < this.options.bufferSize) {
        result = await this.processSmallFile(filePath, stats);
      } else {
        result = await this.processLargeFile(filePath, stats);
      }

      const processingTime = Date.now() - startTime;

      return {
        ...result,
        metadata: {
          originalSize: stats.size,
          processingTime,
          method: stats.size < this.options.bufferSize ? 'memory' : 'streaming'
        }
      };
    } catch (error) {
      throw new Error(`Erro ao processar arquivo: ${error.message}`);
    }
  }

  /**
   * Processa texto diretamente
   * @param {string} text - Texto a ser processado
   * @param {string} source - Fonte do texto
   * @returns {Object} Resultado do processamento
   */
  processText(text, source = 'texto direto') {
    const startTime = Date.now();

    if (!text || typeof text !== 'string') {
      throw new Error('Texto inválido fornecido');
    }

    const lines = text.split('\n');
    const originalCount = lines.length;

    // Aplicar tac (reverter linhas)
    const reversedLines = [...lines].reverse();
    const result = reversedLines.join('\n');

    // Gerar passos de cálculo
    const steps = this.generateCalculationSteps(originalCount, source, 'memory');

    return {
      original: text,
      result: result,
      steps: steps,
      lineCount: originalCount,
      source: source,
      metadata: {
        originalSize: Buffer.byteLength(text, 'utf8'),
        processingTime: Date.now() - startTime,
        method: 'memory'
      }
    };
  }

  /**
   * Valida o arquivo antes do processamento
   * @param {string} filePath - Caminho do arquivo
   * @returns {Promise<fs.Stats>} Estatísticas do arquivo
   */
  async validateFile(filePath) {
    if (!filePath) {
      throw new Error('Caminho do arquivo não fornecido');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('Arquivo não encontrado');
    }

    const stats = await fs.promises.stat(filePath);

    if (!stats.isFile()) {
      throw new Error('Caminho não aponta para um arquivo');
    }

    if (stats.size === 0) {
      throw new Error('Arquivo está vazio');
    }

    if (stats.size > this.options.maxMemoryUsage) {
      throw new Error(`Arquivo muito grande. Tamanho máximo: ${this.formatBytes(this.options.maxMemoryUsage)}`);
    }

    return stats;
  }

  /**
   * Processa arquivos pequenos carregando tudo na memória
   * @param {string} filePath - Caminho do arquivo
   * @param {fs.Stats} stats - Estatísticas do arquivo
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processSmallFile(filePath, stats) {
    const content = await fs.promises.readFile(filePath, this.options.encoding);
    const filename = path.basename(filePath);

    return this.processText(content, `Arquivo: ${filename}`);
  }

  /**
   * Processa arquivos grandes usando streams para eficiência de memória
   * @param {string} filePath - Caminho do arquivo
   * @param {fs.Stats} stats - Estatísticas do arquivo
   * @returns {Promise<Object>} Resultado do processamento
   */
  async processLargeFile(filePath, stats) {
    const filename = path.basename(filePath);

    return new Promise((resolve, reject) => {
      const lines = [];
      let currentLine = '';
      let lineCount = 0;
      let bytesProcessed = 0;

      const readStream = fs.createReadStream(filePath, {
        encoding: this.options.encoding,
        highWaterMark: this.options.bufferSize
      });

      const lineProcessor = new Transform({
        transform(chunk, encoding, callback) {
          const text = chunk.toString();
          bytesProcessed += Buffer.byteLength(text, 'utf8');

          // Dividir em linhas
          const parts = (currentLine + text).split('\n');
          currentLine = parts.pop(); // Última parte pode estar incompleta

          // Adicionar linhas completas
          for (const line of parts) {
            lines.push(line);
            lineCount++;
          }

          callback();
        }
      });

      readStream.pipe(lineProcessor);

      lineProcessor.on('end', () => {
        // Adicionar última linha se existir
        if (currentLine) {
          lines.push(currentLine);
          lineCount++;
        }

        // Aplicar tac (reverter linhas)
        const reversedLines = [...lines].reverse();
        const result = reversedLines.join('\n');

        // Gerar passos de cálculo
        const steps = this.generateCalculationSteps(lineCount, `Arquivo: ${filename}`, 'streaming');

        resolve({
          original: `[Arquivo grande - ${this.formatBytes(stats.size)}]`,
          result: result,
          steps: steps,
          lineCount: lineCount,
          source: `Arquivo: ${filename}`,
          bytesProcessed: bytesProcessed
        });
      });

      readStream.on('error', error => {
        reject(new Error(`Erro ao ler arquivo: ${error.message}`));
      });

      lineProcessor.on('error', error => {
        reject(new Error(`Erro ao processar linhas: ${error.message}`));
      });
    });
  }

  /**
   * Gera os passos detalhados do cálculo para exibição
   * @param {number} lineCount - Número de linhas
   * @param {string} source - Fonte dos dados
   * @param {string} method - Método usado (memory/streaming)
   * @returns {Array<string>} Array com os passos
   */
  generateCalculationSteps(lineCount, source, method) {
    const steps = [
      `Fonte: ${source}`,
      `Método de processamento: ${method === 'memory' ? 'Em memória' : 'Streaming (arquivos grandes)'}`,
      `Total de linhas detectadas: ${lineCount.toLocaleString('pt-BR')}`,
      '',
      '📋 Aplicando comando TAC (Text Append with Carriage return):',
      '┌─ Lendo arquivo sequencialmente...',
      '├─ Armazenando linhas em buffer...',
      '├─ Invertendo ordem das linhas...',
      '└─ Gerando resultado final',
      '',
      '🔄 Processo de inversão:'
    ];

    // Adicionar exemplos da inversão
    if (lineCount > 0) {
      const maxExamples = Math.min(3, lineCount);
      for (let i = 1; i <= maxExamples; i++) {
        steps.push(`   Linha ${lineCount - i + 1} (original) → Linha ${i} (resultado)`);
      }

      if (lineCount > 6) {
        steps.push('   ...');
        steps.push(`   Linha 2 (original) → Linha ${lineCount - 1} (resultado)`);
        steps.push(`   Linha 1 (original) → Linha ${lineCount} (resultado)`);
      } else if (lineCount > maxExamples) {
        for (let i = maxExamples + 1; i <= lineCount; i++) {
          steps.push(`   Linha ${lineCount - i + 1} (original) → Linha ${i} (resultado)`);
        }
      }
    }

    steps.push('');
    steps.push('✅ Processamento concluído com sucesso!');
    steps.push(`📊 Total: ${lineCount.toLocaleString('pt-BR')} linhas invertidas`);

    return steps;
  }

  /**
   * Converte bytes para formato legível
   * @param {number} bytes - Número de bytes
   * @returns {string} Tamanho formatado
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Processa buffer de dados (útil para uploads)
   * @param {Buffer} buffer - Buffer de dados
   * @param {string} filename - Nome do arquivo original
   * @returns {Object} Resultado do processamento
   */
  processBuffer(buffer, filename = 'buffer') {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Dados fornecidos não são um buffer válido');
    }

    const text = buffer.toString(this.options.encoding);
    return this.processText(text, `Arquivo: ${filename}`);
  }

  /**
   * Salva resultado em arquivo
   * @param {string} result - Resultado do processamento
   * @param {string} outputPath - Caminho do arquivo de saída
   * @returns {Promise<void>}
   */
  async saveResult(result, outputPath) {
    try {
      await fs.promises.writeFile(outputPath, result, this.options.encoding);
    } catch (error) {
      throw new Error(`Erro ao salvar resultado: ${error.message}`);
    }
  }

  /**
   * Valida e limpa o texto de entrada
   * @param {string} text - Texto a ser validado
   * @returns {string} Texto limpo
   */
  sanitizeInput(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Remove caracteres de controle perigosos, mas preserva quebras de linha
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Retorna estatísticas de memória atual
   * @returns {Object} Estatísticas de uso de memória
   */
  getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      heapUsed: this.formatBytes(usage.heapUsed),
      heapTotal: this.formatBytes(usage.heapTotal),
      external: this.formatBytes(usage.external),
      rss: this.formatBytes(usage.rss),
      maxMemoryLimit: this.formatBytes(this.options.maxMemoryUsage)
    };
  }
}

/**
 * Função utilitária para criar uma instância do processador TAC
 * @param {Object} options - Opções de configuração
 * @returns {TacProcessor} Nova instância do processador
 */
function createTacProcessor(options = {}) {
  return new TacProcessor(options);
}

/**
 * Função de conveniência para processar arquivo diretamente
 * @param {string} filePath - Caminho do arquivo
 * @param {Object} options - Opções de configuração
 * @returns {Promise<Object>} Resultado do processamento
 */
async function tacFile(filePath, options = {}) {
  const processor = new TacProcessor(options);
  return await processor.processFile(filePath);
}

/**
 * Função de conveniência para processar texto diretamente
 * @param {string} text - Texto a ser processado
 * @param {Object} options - Opções de configuração
 * @returns {Object} Resultado do processamento
 */
function tacText(text, options = {}) {
  const processor = new TacProcessor(options);
  return processor.processText(text);
}

module.exports = {
  TacProcessor,
  createTacProcessor,
  tacFile,
  tacText
};
