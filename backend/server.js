const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { TacProcessor } = require('./tac');

class TacServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.uploadsDir = path.join(__dirname, '../uploads');
    this.tacProcessor = new TacProcessor({
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB
      bufferSize: 64 * 1024 // 64KB
    });

    this.initializeServer();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Inicializa configurações básicas do servidor
   */
  initializeServer() {
    // Criar diretório de uploads se não existir
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    // Middlewares básicos
    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === 'production'
            ? ['https://yourdomain.com']
            : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        optionsSuccessStatus: 200
      })
    );

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Servir arquivos estáticos
    this.app.use(express.static(path.join(__dirname, '../')));
    this.app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
    this.app.use('/css', express.static(path.join(__dirname, '../css')));
    this.app.use('/js', express.static(path.join(__dirname, '../js')));
    this.app.use('/assets', express.static(path.join(__dirname, '../assets')));

    // Configurar multer para upload de arquivos
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `upload-${uniqueSuffix}${ext}`);
      }
    });

    this.upload = multer({
      storage: storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1
      },
      fileFilter: (req, file, cb) => {
        // Tipos de arquivo permitidos
        const allowedTypes = /\.(txt|log|csv|md|json)$/i;
        const allowedMimes = ['text/plain', 'text/csv', 'application/json', 'text/markdown'];

        if (allowedTypes.test(file.originalname) || allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Tipo de arquivo não permitido. Use apenas arquivos de texto.'));
        }
      }
    });

    // Log de inicialização
    console.log(`🚀 Servidor TAC inicializando...`);
    console.log(`📂 Diretório de uploads: ${this.uploadsDir}`);
    console.log(`💾 Limite de memória: ${this.tacProcessor.formatBytes(this.tacProcessor.options.maxMemoryUsage)}`);
  }

  /**
   * Configura todas as rotas da aplicação
   */
  setupRoutes() {
    // Rota principal - servir index.html
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/index.html'));
    });

    // API: Informações do servidor
    this.app.get('/api/info', (req, res) => {
      const memoryStats = this.tacProcessor.getMemoryStats();
      res.json({
        name: 'TAC Server',
        version: '1.0.0',
        status: 'running',
        uptime: process.uptime(),
        memory: memoryStats,
        limits: {
          maxFileSize: '50MB',
          maxMemoryUsage: this.tacProcessor.formatBytes(this.tacProcessor.options.maxMemoryUsage),
          supportedFormats: ['txt', 'log', 'csv', 'md', 'json']
        }
      });
    });

    // API: Processar arquivo via upload
    this.app.post('/api/tac', this.upload.single('file'), async (req, res) => {
      const startTime = Date.now();

      try {
        if (!req.file) {
          return res.status(400).json({
            error: 'Nenhum arquivo foi enviado',
            code: 'NO_FILE'
          });
        }

        const filePath = req.file.path;
        const originalName = req.file.originalname;

        console.log(`📄 Processando arquivo: ${originalName} (${this.tacProcessor.formatBytes(req.file.size)})`);

        // Processar arquivo com TAC
        const result = await this.tacProcessor.processFile(filePath);

        // Adicionar informações do upload
        result.uploadInfo = {
          originalName: originalName,
          uploadedSize: req.file.size,
          processedAt: new Date().toISOString(),
          serverProcessingTime: Date.now() - startTime
        };

        // Limpar arquivo temporário
        this.cleanupFile(filePath);

        console.log(
          `✅ Arquivo processado com sucesso: ${result.lineCount} linhas em ${result.metadata.processingTime}ms`
        );

        res.json(result);
      } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error.message);

        // Limpar arquivo se existir
        if (req.file) {
          this.cleanupFile(req.file.path);
        }

        res.status(500).json({
          error: error.message,
          code: 'PROCESSING_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    });

    // API: Processar texto direto
    this.app.post('/api/tac/text', async (req, res) => {
      const startTime = Date.now();

      try {
        const { text, source } = req.body;

        if (!text || typeof text !== 'string') {
          return res.status(400).json({
            error: 'Texto não fornecido ou inválido',
            code: 'INVALID_TEXT'
          });
        }

        if (text.length > 10 * 1024 * 1024) {
          // 10MB limit for text
          return res.status(400).json({
            error: 'Texto muito grande. Limite: 10MB',
            code: 'TEXT_TOO_LARGE'
          });
        }

        console.log(`📝 Processando texto direto: ${text.length} caracteres`);

        // Processar texto
        const result = this.tacProcessor.processText(text, source || 'Texto via API');

        // Adicionar informações do processamento
        result.apiInfo = {
          textLength: text.length,
          processedAt: new Date().toISOString(),
          serverProcessingTime: Date.now() - startTime
        };

        console.log(`✅ Texto processado: ${result.lineCount} linhas em ${result.metadata.processingTime}ms`);

        res.json(result);
      } catch (error) {
        console.error('❌ Erro ao processar texto:', error.message);

        res.status(500).json({
          error: error.message,
          code: 'TEXT_PROCESSING_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    });

    // API: Health check
    this.app.get('/api/health', (req, res) => {
      const memoryUsage = process.memoryUsage();
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        version: process.version,
        platform: process.platform
      };

      res.json(healthStatus);
    });

    // Rota para download de resultados (opcional)
    this.app.post('/api/download', (req, res) => {
      try {
        const { content, filename } = req.body;

        if (!content) {
          return res.status(400).json({
            error: 'Conteúdo não fornecido',
            code: 'NO_CONTENT'
          });
        }

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const downloadFilename = filename || `tac_resultado_${timestamp}.txt`;

        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.setHeader('Content-Type', 'text/plain');
        res.send(content);
      } catch (error) {
        res.status(500).json({
          error: 'Erro ao gerar download',
          code: 'DOWNLOAD_ERROR'
        });
      }
    });
  }

  /**
   * Configura tratamento de erros globais
   */
  setupErrorHandling() {
    // Middleware para capturar erros de multer
    this.app.use((error, req, res, next) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Arquivo muito grande. Limite: 50MB',
            code: 'FILE_TOO_LARGE'
          });
        }

        return res.status(400).json({
          error: `Erro no upload: ${error.message}`,
          code: 'UPLOAD_ERROR'
        });
      }

      if (error.message.includes('Tipo de arquivo não permitido')) {
        return res.status(400).json({
          error: error.message,
          code: 'INVALID_FILE_TYPE'
        });
      }

      console.error('❌ Erro não tratado:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    });

    // Rota 404
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Rota não encontrada',
        code: 'NOT_FOUND',
        path: req.path
      });
    });

    // Tratamento de erros não capturados
    process.on('uncaughtException', error => {
      console.error('❌ Exceção não capturada:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
    });
  }

  /**
   * Remove arquivo temporário com tratamento de erro
   * @param {string} filePath - Caminho do arquivo
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Arquivo temporário removido: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao remover arquivo temporário: ${error.message}`);
    }
  }

  /**
   * Inicia o servidor
   */
  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`🌟 Servidor TAC rodando em http://localhost:${this.port}`);
      console.log(`📱 Interface web: http://localhost:${this.port}`);
      console.log(`🔗 API endpoints:`);
      console.log(`   POST /api/tac - Upload e processamento de arquivo`);
      console.log(`   POST /api/tac/text - Processamento de texto direto`);
      console.log(`   GET /api/info - Informações do servidor`);
      console.log(`   GET /api/health - Status de saúde`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    return this.server;
  }

  /**
   * Para o servidor graciosamente
   */
  shutdown() {
    console.log('\n🛑 Iniciando shutdown do servidor...');

    if (this.server) {
      this.server.close(() => {
        console.log('✅ Servidor encerrado com sucesso');

        // Limpar arquivos temporários
        this.cleanupUploads();

        process.exit(0);
      });
    }
  }

  /**
   * Limpa arquivos de upload antigos
   */
  cleanupUploads() {
    try {
      const files = fs.readdirSync(this.uploadsDir);
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hora

      files.forEach(file => {
        const filePath = path.join(this.uploadsDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Arquivo antigo removido: ${file}`);
        }
      });
    } catch (error) {
      console.warn(`⚠️ Erro na limpeza de arquivos: ${error.message}`);
    }
  }
}

// Inicializar servidor se executado diretamente
if (require.main === module) {
  const server = new TacServer();
  server.start();
}

module.exports = TacServer;
