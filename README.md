# TAC - Inversor de Linhas

Sistema completo para inversão de linhas de arquivos texto, implementando o comando Unix tac com interface web moderna e API REST robusta.

## 🌟 Características

✨ **Interface Web Moderna**: Design glassmorphism com animações e efeitos visuais
🚀 **Processamento Eficiente**: Suporte a arquivos grandes usando streams (até 512MB)
🔄 **Duplo Modo**: Upload de arquivos ou entrada de texto direto
📊 **Cálculo Detalhado**: Mostra passo a passo do processamento
💾 **Download de Resultados**: Baixe o arquivo processado
🎯 **API REST Completa**: Endpoints para integração
🧪 **Testes Abrangentes**: Cobertura completa com Jest
📱 **Responsivo**: Funciona perfeitamente em dispositivos móveis

## 📋 Pré-requisitos

Node.js 16.0 ou superior
npm 7.0 ou superior
Sistema Operacional: Windows, Linux, macOS

## 🚀 Instalação Rápida
### 1. Clone o Repositório
```
bash
git clone <repository-url>
cd tac-project
```
### 2. Instale as Dependências
```
bash
npm install
```
### 3. Inicie o Servidor
```
bash
npm start
```
### 4. Acesse a Interface
```
Abra seu navegador e visite: http://localhost:3000
```
## 🛠️ Comandos Disponíveis
```
bash
# Iniciar servidor em produção
npm start

# Iniciar servidor em modo desenvolvimento (com auto-reload)
npm run dev

# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Compilar SCSS para CSS (se modificar estilos)
npm run build:css
```

## 📁 Estrutura do Projeto
```
tac-project/
├── assets/                    # Recursos estáticos
│   └── background.png         # Imagem de fundo
├── frontend/                  # Interface web
│   └── index.html            # Página principal
├── css/                      # Estilos compilados
│   ├── styles.css           # Estilos principais
│   └── button.css           # Estilos dos botões animados
├── scss/                     # Código fonte SCSS
│   ├── styles.scss          # Estilos principais (fonte)
│   └── button.scss          # Botões animados (fonte)
├── js/                       # JavaScript frontend
│   └── script.js            # Lógica da interface
├── backend/                  # Servidor Node.js
│   ├── server.js            # Servidor Express
│   └── tac.js               # Implementação do algoritmo TAC
├── tests/                    # Testes automatizados
│   ├── tac.test.js          # Testes do algoritmo
│   └── server.test.js       # Testes da API
├── uploads/                  # Diretório temporário (criado automaticamente)
├── package.json              # Configuração do projeto
└── README.md                # Este arquivo
```
## 🎮 Como Usar

### Interface Web

**Acesse**  ``` http://localhost:3000 ``` no seu navegador

### Escolha uma opção:

📁 **Upload de Arquivo**: Clique em "Escolher arquivo..." e selecione um arquivo .txt, .log, .csv ou .md
✏️ **Texto Direto**: Digite ou cole o texto no campo de entrada


**Processe**: Clique no botão "REVELAR" para inverter as linhas
**Visualize**: Veja o resultado detalhado com cálculos passo a passo
**Download**: Clique no botão ⬇️ para baixar o resultado

### Atalhos de Teclado

**Ctrl + Enter**: Processar entrada
**Esc**: Limpar todos os campos

## API REST

### Processar Arquivo via Upload
```
bash
curl -X POST http://localhost:3000/api/tac \
  -F "file=@exemplo.txt"
```
### Processar Texto Direto
```
bash
curl -X POST http://localhost:3000/api/tac/text \
  -H "Content-Type: application/json" \
  -d '{"text":"linha 1\nlinha 2\nlinha 3"}'
```
### Informações do Servidor
```
bash
curl http://localhost:3000/api/info
```
### Status de Saúde
```
bash
curl http://localhost:3000/api/health
```
## 🔧 Configuração Avançada

### Variáveis de Ambiente
```
bash
# Porta do servidor (padrão: 3000)
PORT=8080

# Ambiente de execução
NODE_ENV=production
```
### Configuração do Processador TAC
```
javascript
const { TacProcessor } = require('./backend/tac');

const processor = new TacProcessor({
    encoding: 'utf8',                    // Codificação dos arquivos
    bufferSize: 64 * 1024,              // Tamanho do buffer (64KB)
    maxMemoryUsage: 512 * 1024 * 1024   // Limite de memória (512MB)
});
```

### 📊 Limites e Restrições

| **Recurso** | **Limite** |
| --- | --- |
|Tamanho máximo de arquivo| 50MB (upload)|
|Tamanho máximo de texto |10MB (entrada direta)|
|Uso máximo de memória| 512MB|
|Formatos suportados |.txt, .log, .csv, .md, .json|
|Codificação | UTF-8|

### 🧪 Executando Testes

**Testes Completos**
```
bash
npm test
```
**Testes com Cobertura**
```
bash
npm test -- --coverage
```
**Testes Específicos**
```
bash
# Apenas testes do algoritmo TAC
npm test -- tests/tac.test.js

# Apenas testes do servidor
npm test -- tests/server.test.js
```
**Testes em Modo Watch**
```
bash
npm run test:watch
```

## 🔍 Exemplos de Uso

### Exemplo 1: Arquivo de Log
```
Entrada:
2024-01-01 10:00:00 INFO Started
2024-01-01 10:00:01 WARN Warning
2024-01-01 10:00:02 ERROR Error

Saída:
2024-01-01 10:00:02 ERROR Error
2024-01-01 10:00:01 WARN Warning
2024-01-01 10:00:00 INFO Started
```
### Exemplo 2: Lista de Tarefas
```
Entrada:
1. Primeira tarefa
2. Segunda tarefa
3. Terceira tarefa

Saída:
3. Terceira tarefa
2. Segunda tarefa
1. Primeira tarefa
```
### Exemplo 3: Código com Comentários
```
Entrada:
// Início do arquivo
function main() {
    console.log("Hello");
}
// Fim do arquivo

Saída:
// Fim do arquivo
}
    console.log("Hello");
function main() {
// Início do arquivo
```
## ⚡ Performance

O sistema foi otimizado para:

**Arquivos pequenos** (< 64KB): Processamento em memória
**Arquivos grandes** (64KB - 512MB): Processamento via streams
**Múltiplas requisições**: Suporte a processamento concorrente
**Gestão de memória**: Limpeza automática de recursos

## Benchmarks (arquivo 100MB, 1M linhas)

Tempo de processamento: ~3-5 segundos
Uso de memória: < 100MB
CPU: Uso moderado durante processamento

## 🤝 Contribuindo

Fork o projeto
Crie uma branch para sua feature ``(git checkout -b feature/AmazingFeature)``
Commit suas mudanças ``(git commit -m 'Add some AmazingFeature')``
Push para a branch ``(git push origin feature/AmazingFeature)``
Abra um Pull Request

## Padrões de Código

Use ESLint para linting
Escreva testes para novas funcionalidades
Mantenha cobertura de testes > 90%
Documente APIs e funções públicas
Use commit messages descritivos

## 📝 Changelog

v1.0.0 (01-09-2025)

✨ Implementação inicial do sistema TAC
🎨 Interface web com design glassmorphism
🚀 API REST completa
🧪 Suite de testes abrangente
📱 Suporte responsivo
💾 Processamento de arquivos grandes via streams

### 📄 Licença
Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](https://mit-license.org) para detalhes.

### 👥 Autor

@luizfx.dev

### 🙏 Agradecimentos

Inspirado no comando Unix tac
Comunidade Node.js pelos excelentes módulos
Contribuidores e testadores
Usuários que fornecem feedback valioso




***Feito com ❤️ e Node.js***
