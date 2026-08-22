import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'sszuldy6',
    dataset: 'production'
  },
  deployment: {
    /**
     * Auto-updates DESLIGADO de proposito.
     *
     * Este Studio nao roda no hosting do Sanity: ele e buildado para a pasta
     * /studio na raiz do site e servido pelo Netlify. Com auto-updates ligado,
     * o build gera uma pasta /vendor com modulos .mjs e um import map que puxa
     * o runtime de sanity-cdn.com. Isso quebra em producao por dois motivos:
     *
     * 1. netlify.toml tem "/studio/*" -> "/studio/index.html" com force=true, e
     *    so "/studio/static/*" esta excluida, entao os .mjs de /studio/vendor
     *    receberiam o index.html no lugar do modulo.
     * 2. A CSP do site restringe script-src, e o runtime viria de dominio externo.
     *
     * Desligado, o bundle sai autocontido em /studio/static, que e exatamente o
     * formato que ja funciona hoje. Custo: atualizar a versao do Studio passa a
     * exigir bump no package.json e novo build.
     */
    autoUpdates: false,
  }
})
