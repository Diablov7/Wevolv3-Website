// Blocos HTML crus que o ContentStudio grava no corpo (tabelas e gráficos). O site
// renderiza o HTML direto; sem estes tipos o Studio abria esses posts com "Invalid
// Portable Text value" e não deixava editar o corpo. `children` e `markDefs` ficam
// ocultos só para aceitar os arrays vazios que os posts já publicados carregam.
const rawHtmlBlock = (name: string, title: string) => ({
  name,
  title,
  type: 'object',
  fields: [
    {name: 'html', title: 'HTML', type: 'text', rows: 8},
    {name: 'children', type: 'array', of: [{type: 'string'}], hidden: true},
    {name: 'markDefs', type: 'array', of: [{type: 'string'}], hidden: true},
  ],
  preview: {
    select: {html: 'html'},
    prepare({html}: any) {
      const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      return {title, subtitle: text.slice(0, 80)}
    },
  },
})

export default {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Título',
      type: 'string',
      description: 'Título do artigo',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      description: 'URL do artigo (gerado automaticamente do título)',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'mainImage',
      title: 'Imagem de Header',
      type: 'image',
      description: 'Imagem principal do artigo (aparece no topo)',
      options: {
        hotspot: true,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      // A capa do site é a arte limpa (mainImage). A versão com texto por cima vai
      // aqui e só aparece no preview de quem compartilha o link nas redes.
      name: 'socialImage',
      title: 'Imagem para as redes (com texto)',
      type: 'image',
      description: 'Opcional. Preview do link no X, LinkedIn, Telegram. Vazio = usa a imagem de header.',
    },
    {
      name: 'excerpt',
      title: 'Resumo',
      type: 'text',
      description: 'Breve descrição do artigo (aparece na listagem)',
      rows: 3,
    },
    {
      name: 'keyTakeaways',
      title: 'Pontos principais',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Até 3 frases curtas, tiradas do próprio artigo. Aparecem logo depois do primeiro parágrafo.',
      validation: (Rule: any) => Rule.max(3).warning('Mais de 3 pontos deixa o bloco longo demais.'),
    },
    {
      name: 'seoTitle',
      title: 'Título para o Google',
      type: 'string',
      description:
        'Opcional. O que aparece no resultado de busca. Vazio = usa o título do artigo. Até 60 caracteres, senão o Google corta.',
      validation: (Rule: any) => Rule.max(60).warning('Acima de 60 caracteres o Google corta o título.'),
    },
    {
      name: 'seoDescription',
      title: 'Descrição para o Google',
      type: 'text',
      rows: 3,
      description:
        'Opcional. O texto abaixo do título no resultado de busca. Vazio = usa o resumo. Até 160 caracteres.',
      validation: (Rule: any) => Rule.max(160).warning('Acima de 160 caracteres o Google corta a descrição.'),
    },
    {
      name: 'author',
      title: 'Autor',
      type: 'reference',
      to: [{type: 'author'}],
    },
    {
      name: 'body',
      title: 'Conteúdo do Artigo',
      description: 'Use o editor visual. Cole de Word/Google Docs para converter automaticamente.',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H1', value: 'h1'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'H4', value: 'h4'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'URL',
                fields: [
                  {
                    title: 'URL',
                    name: 'href',
                    type: 'url',
                    validation: (Rule: any) =>
                      Rule.uri({
                        allowRelative: true,
                        scheme: ['http', 'https', 'mailto', 'tel'],
                      }),
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          fields: [
            {
              name: 'alt',
              title: 'Texto Alternativo',
              type: 'string',
              description: 'Importante para SEO e acessibilidade',
            },
            {
              name: 'caption',
              title: 'Legenda',
              type: 'string',
            },
          ],
        },
        rawHtmlBlock('htmlTable', 'Tabela (HTML)'),
        rawHtmlBlock('htmlEmbed', 'Gráfico / embed (HTML)'),
      ],
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'categories',
      title: 'Categorias',
      type: 'array',
      description: 'Categorias do artigo (opcional)',
      of: [{type: 'reference', to: {type: 'category'}}],
    },
    {
      name: 'publishedAt',
      title: 'Data de Publicação',
      type: 'datetime',
      description: 'Data de publicação',
      initialValue: () => new Date().toISOString(),
    },
    {
      name: 'published',
      title: 'Publicado',
      type: 'boolean',
      description: 'Marque para publicar o artigo',
      initialValue: false,
    },
  ],
  orderings: [
    {
      title: 'Data de Publicação, Novo',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      published: 'published',
    },
    prepare(selection: any) {
      const {title, media, published} = selection
      const status = published ? '✅ Publicado' : '📝 Rascunho'
      return {
        title: title || 'Sem título',
        subtitle: status,
        media: media,
      }
    },
  },
}
