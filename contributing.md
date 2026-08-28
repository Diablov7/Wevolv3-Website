# 🤝 Contribuindo para o Wevolv3 Website

Obrigado por considerar contribuir para o projeto Wevolv3! Este documento fornece diretrizes para contribuições.

## 📋 **Índice**

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)

## 📜 **Código de Conduta**

Este projeto adere ao [Contributor Covenant](https://www.contributor-covenant.org/). Ao participar, você deve seguir este código. Reporte comportamentos inaceitáveis para info@wevolv3.com.

## 🚀 **Como Contribuir**

### **Tipos de Contribuições Bem-vindas:**

- 🐛 **Bug fixes** - Correções de problemas
- ✨ **Features** - Novas funcionalidades
- 📚 **Documentação** - Melhorias na documentação
- 🎨 **Design** - Melhorias visuais e UX
- ⚡ **Performance** - Otimizações de performance
- 🧪 **Testes** - Adição ou melhoria de testes
- 🔧 **Tooling** - Melhorias nas ferramentas de desenvolvimento

## 🐛 **Reportando Bugs**

### **Antes de Reportar:**
1. Verifique se o bug já foi reportado nas [Issues](https://github.com/wevolv3/wevolv3-website/issues)
2. Teste na versão mais recente
3. Verifique se não é um problema de configuração local

### **Template de Bug Report:**
```markdown
**Descrição do Bug**
Descrição clara e concisa do problema.

**Passos para Reproduzir**
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

**Comportamento Esperado**
O que deveria acontecer.

**Screenshots**
Se aplicável, adicione screenshots.

**Ambiente:**
- OS: [ex: Windows 10, macOS 12]
- Browser: [ex: Chrome 120, Safari 17]
- Versão: [ex: 2.0.0]
- Dispositivo: [ex: iPhone 14, Desktop]

**Informações Adicionais**
Qualquer contexto adicional sobre o problema.
```

## 💡 **Sugerindo Melhorias**

### **Template de Feature Request:**
```markdown
**Resumo da Feature**
Descrição clara da funcionalidade proposta.

**Problema que Resolve**
Qual problema esta feature resolve?

**Solução Proposta**
Como você imagina que deveria funcionar?

**Alternativas Consideradas**
Outras soluções que você considerou?

**Informações Adicionais**
Mockups, exemplos, referências, etc.
```

## 🛠️ **Desenvolvimento Local**

### **Pré-requisitos:**
- Node.js 18+
- npm 9+
- Git

### **Setup:**
```bash
# 1. Fork o repositório no GitHub

# 2. Clone seu fork
git clone https://github.com/SEU_USERNAME/wevolv3-website.git
cd wevolv3-website

# 3. Adicione o repositório original como upstream
git remote add upstream https://github.com/wevolv3/wevolv3-website.git

# 4. Instale dependências
npm install

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

### **Estrutura de Branches:**
- `main` - Branch principal (produção)
- `develop` - Branch de desenvolvimento
- `feature/nome-da-feature` - Novas funcionalidades
- `fix/nome-do-fix` - Correções de bugs
- `docs/nome-da-doc` - Melhorias na documentação

## 📏 **Padrões de Código**

### **JavaScript/TypeScript:**
- Use **ESLint** e **Prettier** (configurados no projeto)
- Prefira **arrow functions** para funções pequenas
- Use **const** por padrão, **let** quando necessário
- Evite **var**
- Use **TypeScript** quando possível

### **React:**
- Use **functional components** com hooks
- Prefira **custom hooks** para lógica reutilizável
- Use **React.memo** para otimizações quando necessário
- Mantenha componentes pequenos e focados

### **CSS/Styling:**
- Use **Tailwind CSS** classes utilitárias
- Prefira **CSS-in-JS** para estilos dinâmicos
- Mantenha **mobile-first** approach
- Use **CSS custom properties** para temas

### **Commits:**
Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Tipos válidos:
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação, ponto e vírgula, etc
refactor: refatoração de código
test: adição ou correção de testes
chore: tarefas de build, configuração, etc

# Exemplos:
git commit -m "feat: adiciona desktop faithful mobile mode"
git commit -m "fix: corrige layout quebrado em mobile"
git commit -m "docs: atualiza README com instruções de deploy"
```

### **Nomenclatura:**
- **Arquivos:** `kebab-case.js`
- **Componentes:** `PascalCase.jsx`
- **Variáveis:** `camelCase`
- **Constantes:** `UPPER_SNAKE_CASE`
- **CSS Classes:** `kebab-case`

## 🔄 **Processo de Pull Request**

### **Antes de Submeter:**
1. ✅ Certifique-se que os testes passam: `npm test`
2. ✅ Execute o linter: `npm run lint`
3. ✅ Formate o código: `npm run format`
4. ✅ Teste em diferentes dispositivos e browsers
5. ✅ Atualize documentação se necessário

### **Criando o PR:**
1. **Sincronize** com upstream:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Crie uma branch** para sua feature:
   ```bash
   git checkout -b feature/minha-feature
   ```

3. **Faça suas alterações** e commits

4. **Push** para seu fork:
   ```bash
   git push origin feature/minha-feature
   ```

5. **Abra um Pull Request** no GitHub

### **Template de Pull Request:**
```markdown
## 📝 Descrição
Descrição clara das mudanças implementadas.

## 🔗 Issue Relacionada
Fixes #123

## 🧪 Tipo de Mudança
- [ ] Bug fix (mudança que corrige um problema)
- [ ] Nova feature (mudança que adiciona funcionalidade)
- [ ] Breaking change (fix ou feature que quebra funcionalidade existente)
- [ ] Documentação

## ✅ Checklist
- [ ] Meu código segue os padrões do projeto
- [ ] Fiz self-review do meu código
- [ ] Comentei código complexo
- [ ] Fiz mudanças correspondentes na documentação
- [ ] Minhas mudanças não geram novos warnings
- [ ] Adicionei testes que provam que minha correção/feature funciona
- [ ] Testes novos e existentes passam localmente

## 📱 Teste Mobile
- [ ] Testado em dispositivos móveis reais
- [ ] Testado no Desktop Faithful Mobile mode
- [ ] Testado na versão Mobile Adaptada

## 🖼️ Screenshots
Se aplicável, adicione screenshots das mudanças.
```

## 🧪 **Testes**

### **Executando Testes:**
```bash
npm test              # Executa todos os testes
npm run test:ui       # Interface visual dos testes
npm run coverage      # Relatório de cobertura
```

### **Tipos de Testes:**
- **Unit Tests** - Componentes individuais
- **Integration Tests** - Fluxos completos
- **E2E Tests** - Testes end-to-end
- **Visual Tests** - Testes de regressão visual

### **Escrevendo Testes:**
```javascript
// Exemplo de teste de componente
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

## 📚 **Recursos Úteis**

### **Documentação:**
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Framer Motion Documentation](https://www.framer.com/motion/)

### **Ferramentas:**
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [ES7+ React/Redux/React-Native snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets)

## 🎯 **Áreas que Precisam de Ajuda**

### **Alta Prioridade:**
- 🐛 Correções de bugs em mobile
- ⚡ Otimizações de performance
- 🧪 Adição de testes automatizados
- 📱 Melhorias na experiência mobile

### **Média Prioridade:**
- 🎨 Melhorias visuais e animações
- 📚 Documentação e exemplos
- 🔧 Ferramentas de desenvolvimento
- 🌐 Internacionalização (i18n)

### **Baixa Prioridade:**
- 🎯 Features experimentais
- 🔍 SEO avançado
- 📊 Analytics e métricas
- 🎪 Easter eggs e detalhes divertidos

## 💬 **Comunicação**

### **Canais:**
- **GitHub Issues** - Bugs e features
- **GitHub Discussions** - Discussões gerais
- **Email** - info@wevolv3.com

### **Respondemos em:**
- Issues: 24-48 horas
- Pull Requests: 2-5 dias
- Emails: 1-3 dias

## 🏆 **Reconhecimento**

Contribuidores são reconhecidos:
- 📝 **README** - Lista de contribuidores
- 🎉 **Releases** - Menção em changelogs
- 🐦 **Social Media** - Posts de agradecimento
- 🎁 **Swag** - Para contribuições significativas

---

## 🙏 **Obrigado!**

Sua contribuição, não importa o tamanho, faz a diferença! Juntos estamos construindo uma experiência web incrível.

**Happy coding! 🚀**
