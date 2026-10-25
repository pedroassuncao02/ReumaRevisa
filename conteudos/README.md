# Exportações de conteúdo

Esta pasta começa vazia. Enviar questões nunca cria commits nem arquivos aqui.

Em **Configurações → Conteúdo JSON**, baixe `content.json`. Para separar por área:

```sh
node src/export-content.js /caminho/content.json /caminho/exportacao-nova
```

O destino deve ser uma pasta nova. Copie as áreas revisadas para esta pasta se desejar versioná-las. Cada questão aparece somente em sua área principal; cada nota e objetivo em sua própria área. `vinculos.json` relaciona os IDs entre áreas. Identificadores permanecem estáveis.

Conteúdo pode conter material autoral, identificadores no texto original e dados pessoais colados. Revise-o antes de publicar. Subpastas de conteúdo estão ignoradas por padrão; somente use `git add -f conteudos/<area>` depois dessa revisão. Backups completos e históricos de estudo nunca devem entrar no Git.
