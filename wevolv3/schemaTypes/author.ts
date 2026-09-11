// O documento de autor já existia no dataset ("Wevolv3", criado em 12/2025), mas o
// tipo não estava no schema: o Studio não deixava abrir nem escolher autor no post.
// O site lê `author->name` e, quando o autor é a própria marca, marca o artigo
// como escrito pela organização, não por uma pessoa.
export default {
  name: 'author',
  title: 'Autor',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nome',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'url',
      title: 'Página do autor',
      type: 'url',
      description: 'Opcional. Perfil do autor no site ou no LinkedIn.',
    },
    {
      // O bloco "Written by" no fim do artigo só aparece quando há bio.
      name: 'bio',
      title: 'Bio',
      type: 'text',
      rows: 3,
      description: 'Uma ou duas frases, em inglês. Aparece no fim de cada artigo do autor.',
    },
    {
      name: 'image',
      title: 'Foto',
      type: 'image',
      description: 'Opcional. Sem foto, o site mostra as iniciais.',
    },
  ],
  preview: {
    select: {title: 'name'},
  },
}
