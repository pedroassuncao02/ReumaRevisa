# Reuma Revisa sem API

> Esta é uma versão simplificada do site estático. Ela não implementa FSRS real, estatísticas completas ou o fluxo de curadoria integral do prompt. Para usar a aplicação completa com FSRS e curadoria rigorosa, abra [o repositório no GitHub](https://github.com/pedroassuncao02/ReumaRevisa) e inicie um Codespace na branch main (Code → Codespaces → Create codespace on main). O modo manual da versão completa não usa créditos da API.

Versão estática para publicar no GitHub Pages. Não usa chave de API nem servidor próprio. O fluxo de IA é manual: copie o pedido preparado pelo app, cole no ChatGPT e depois cole a resposta JSON no app para importar os cartões.

## Dados e privacidade

Questões, cartões e revisões ficam no armazenamento local do navegador em que você abriu a página. O site não envia esses dados ao GitHub. Para usar a IA, você escolhe copiar o texto e enviá-lo manualmente ao ChatGPT. Não inclua identificadores de pacientes. Exporte o backup em **Backup e dados** regularmente; trocar de navegador ou dispositivo não transfere o acervo automaticamente.

## Publicar

1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment**, escolha **GitHub Actions** como origem.
3. O workflow `Publicar Reuma Revisa sem API` publica o conteúdo desta pasta em cada alteração na branch `main`.
4. Consulte **Actions** e abra o último workflow concluído para encontrar o endereço da página.

No GitHub Free, o GitHub Pages exige um repositório público. O código da página não contém uma chave da OpenAI, mas a página publicada fica acessível a outras pessoas. Não publique conteúdo pessoal ou arquivos de backup no repositório.

## Como usar

1. Envie a questão no site e clique em **Copiar pedido**.
2. Abra o ChatGPT, cole o pedido e envie.
3. Copie a resposta JSON do ChatGPT e cole na tela da questão.
4. Clique em **Importar cartões para curadoria**; revise e aprove os cartões.
5. Use **Backup e dados** para baixar um backup JSON ou exportar TSV para Anki.

O app importa JSON no formato mostrado no pedido. Para a análise ser válida, confira sempre a evidência citada e o conteúdo dos cartões antes de aprová-los.
