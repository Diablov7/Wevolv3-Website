# Wevolv3 - Web3 Marketing & Modular Advertising Agency

## 🚀 Digital Reality - Transforming Your Vision into Digital Reality

Site oficial da Wevolv3 com foco em marketing Web3 e publicidade modular.

## 📖 Documentos principais

- **[CATALOGO_SERVICOS.md](CATALOGO_SERVICOS.md)** — catálogo completo: 9 módulos, 40+ serviços, preços, pacotes fechados e termos de engajamento. Fonte para propostas, parcerias e orçamento.
- [docs/](docs/) — SEO, backlinks, diretórios e rascunhos de conteúdo.

## 📋 Sobre o Projeto

- **Tipo**: Site estático HTML/CSS/JS
- **Estilo**: Design moderno com animações suaves
- **Blog**: Integrado com Sanity CMS
- **Deploy**: Otimizado para Netlify

## 🎯 Características

- ✅ Site estático de alta performance
- ✅ Blog integrado com Sanity CMS
- ✅ Design responsivo
- ✅ SEO otimizado
- ✅ Animações suaves
- ✅ Vídeo de background no hero
- ✅ Integração com Telegram e redes sociais

## 📁 Estrutura

```
/
├── index.html          # Página principal
├── about.html          # Sobre nós
├── works.html          # Portfólio
├── blog.html           # Lista de artigos (Sanity)
├── singleblog.html     # Artigo individual (Sanity)
├── contact.html        # Contato
├── singlework.html     # Projeto individual
├── css/                # Estilos CSS
│   ├── normalize.css
│   ├── layout.css
│   └── style.css
├── js/                 # JavaScript
│   ├── jquery.min.js
│   └── plugins.js
├── images/             # Imagens
├── fonts/              # Fontes customizadas
└── netlify.toml        # Configuração Netlify
```

## 🔍 SEO e Indexação

### Sitemap Dinâmico
O sitemap é gerado automaticamente de 3 formas:

#### 1. **Automático no Netlify** (Recomendado)
O sitemap é gerado automaticamente a cada deploy no Netlify. Não é necessário fazer nada!

#### 2. **GitHub Actions** (Automático)
- Executa **diariamente às 2h UTC**
- Executa quando há push na branch `main`
- Pode ser executado manualmente em: Actions > Update Sitemap > Run workflow

#### 3. **Manual** (Opcional)
Se quiser gerar manualmente:

```bash
node generate-sitemap.js
```

O script irá:
- ✅ Buscar todos os posts publicados do Sanity
- ✅ Gerar um `sitemap.xml` atualizado
- ✅ Incluir todas as páginas estáticas e posts do blog
- ✅ Commit automático via GitHub Actions (se houver mudanças)

### Schema.org
- ✅ Schema.org JSON-LD implementado para artigos (BlogPosting)
- ✅ Meta tags Open Graph e Twitter Cards dinâmicas
- ✅ Canonical URLs configuradas

### Performance
- ✅ Lazy loading de imagens
- ✅ Preload da imagem principal do artigo
- ✅ FetchPriority otimizado
- ✅ Decoding assíncrono de imagens

## 🛠️ Deploy

### Netlify (Recomendado)
1. Conecte este repositório ao Netlify
2. Não é necessário comando de build (site estático)
3. Publish directory: `.`

### GitHub Pages
1. Vá em Settings > Pages
2. Source: Deploy from a branch
3. Branch: main / (root)

### Outros Hosts
- Faça upload de todos os arquivos
- Configure como site estático
- Aponte para `index.html`

## 🌐 Links

- **Site**: [wevolv3.com](https://wevolv3.com)
- **Contato**: contact@wevolv3.com
- **Telegram**: [@wevolv3](https://t.me/wevolv3)
- **X (Twitter)**: [@wevolv3_media](https://x.com/wevolv3_media)
- **LinkedIn**: [Wevolv3](https://www.linkedin.com/company/wevolv3-web3-growth)

## 📱 Blog

O blog é integrado com Sanity CMS. Os artigos são carregados dinamicamente via API.

### Configuração do Sanity
- Project ID: `sszuldy6`
- Dataset: `production`
- CORS Origins: Adicione seu domínio em [sanity.io/manage](https://www.sanity.io/manage/project/sszuldy6)

## 🎨 Cores do Projeto

- **Teal (Principal)**: `#10b981`
- **Azul (Destaques)**: `#3b82f6`
- **Preto (Background)**: `#000000`
- **Cinza (Bordas)**: `#292929`

## 📄 Licença

© 2025 Wevolv3. All rights reserved.
