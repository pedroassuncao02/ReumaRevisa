# Reuma Revisa

Aplicação web em português para transformar questões comentadas em objetivos de aprendizagem, curar notas simples/cloze e estudar com FSRS real. Aplicação pessoal para uso local ou no GitHub Codespaces, com banco SQLite persistente. Sem dados demonstrativos no acervo inicial.
## Alternativa sem cobrança da API

A pasta [static-site](static-site/) contém uma versão estática para GitHub Pages, sem chave da OpenAI e sem chamadas automáticas à API. Ela prepara um pedido para copiar ao ChatGPT; depois você cola a resposta JSON no app para importar e revisar os cartões. O acervo dessa versão fica no navegador local. Veja [static-site/README.md](static-site/README.md) para publicar e fazer backup.

## Executar

Requer **Node.js 24 ou superior**, incluindo npm.

```sh
npm ci
```

Copie `.env.example` para `.env`, preencha `OPENAI_API_KEY` e ajuste `OPENAI_MODEL` para um modelo disponível na sua conta com Structured Outputs. Nunca coloque a chave no código, navegador ou Git.

```sh
npm start
```

Abra **http://127.0.0.1:3210**. O servidor escuta apenas em `127.0.0.1` no computador ou na porta privada do Codespaces. Sem chave, o envio persiste como pendente; abra a questão e use **Retomar análise** depois de configurar a chave e reiniciar. Não existem cartões falsos nem gerador de demonstração na aplicação.

No Windows, para copiar a configuração: `Copy-Item .env.example .env`. Para encerrar: Ctrl+C. Para reiniciar, execute `npm start` novamente. Os dados continuam em `data/reuma.sqlite`; não apague essa pasta para atualizar o código.

Nesta entrega, as dependências já estão instaladas no projeto local. O ZIP contém somente fontes; nele, execute `npm ci` antes de iniciar.

## Fluxo principal

1. **Enviar questão:** cole enunciado, alternativas e comentário. Marque as seções com `Gabarito:` e `Comentário:` em linhas separadas; `Resposta correta:` e `Resolução:` também são reconhecidos. Informe fonte, área, resultado e dúvida opcionalmente.
2. **Verificar repetição:** normalização local e índice exclusivo no banco impedem repetições exatas. Possíveis paráfrases são comparadas pela IA com todas as questões, em lotes, e exigem confirmação do usuário. Comentário/gabarito distintos não criam questão nova quando as seções são identificáveis.
3. **Identificar objetivos:** extração estruturada de entidade, aspecto, condições, pergunta mental, resposta e trecho literal. Zero objetivos é válido.
4. **Comparar:** todos os objetivos do acervo participam, inclusive rascunhos, suspensos e descartados. A comparação considera texto e representação estruturada; o modelo julga equivalência semântica antes da redação e novamente antes da gravação. Mesmo foco vincula a nova questão ao cartão existente.
5. **Gerar e avaliar:** uma chamada redige, outra avalia os oito critérios. Há no máximo duas reescritas após a primeira tentativa; persistindo falhas, a nota vai para revisão manual. O gerador pode escolher pergunta simples quando a resposta não cabe em cloze.
6. **Curar:** revise evidência, objetivo, termo oculto, alertas e semelhantes. Edite, converta, selecione outro termo, descarte com motivo, vincule ou aprove. Cartões com alertas não podem ser aprovados em lote. A aprovação individual com alertas exige justificativa explícita; sintaxe essencial inválida e evidência ausente não são liberadas por justificativa.
7. **Estudar:** somente aprovados entram na fila. Revele a resposta, avalie e receba novo agendamento pela biblioteca. Desfazer preserva o evento auditável e o exclui das métricas.

## O que foi implementado

- Interface responsiva: visão geral, envio, curadoria, acervo, estudo, estatísticas, correções e configurações.
- Texto preservado na sessão do navegador em caso de falha; envio desabilitado durante processamento; jobs consultáveis e idempotentes; serialização dos envios e índice UNIQUE persistente.
- Áreas iniciais do pedido, criação/renomeação de áreas, etiquetas e filtros por conteúdo/fonte, área, etiqueta, status e pendências.
- Notas simples e **uma oclusão c1 por nota**, produzindo um cartão efetivo com ID e estado FSRS próprios. Múltiplas oclusões são rejeitadas deliberadamente para manter um objetivo por nota.
- Revisão com **ts-fsrs 5.4.2 / FSRS-6**, parâmetros padrão, retenção configurável, limite diário de novos, histórico, concorrência otimista por revisão do cartão e ID idempotente da avaliação.
- Edição com versões recuperáveis, suspensão, relatos de problema e fila de correção. Edições comuns mantêm agendamento e voltam à curadoria.
- Mudança explícita de objetivo oferece novo cartão (suspende anterior) ou reinicialização de agendamento; ambas preservam eventos históricos e exigem curadoria novamente.
- Auditoria semântica sem mutações automáticas. União manual mantém o cartão/agendamento escolhido, suspende o outro e acrescenta vínculos. Históricos nunca são misturados. Desfazer restaura o status e remove apenas vínculos adicionados pela união.
- Backup completo transacional, restauração com cópia anterior, exportações JSON e TSV do Anki, CSV agregado.
- Estatísticas separadas para questões/tentativas e cartões/eventos, por período, área e etiqueta; indicadores com denominadores e ausência de dados explícita.

## Arquitetura e privacidade

Node HTTP + SQLite nativo + JavaScript/CSS sem framework no navegador. Uma dependência de execução: `ts-fsrs`, com versão fixada e lockfile. Essa arquitetura evita serviços de banco e compilação para um usuário local.

Tabelas: `questions`, `attempts`, `objectives`, `notes`, `cards`, `links`, `reviews`, `versions`, `reports`, `merges`, `jobs` e `meta`. Relações têm IDs estáveis; principais vínculos possuem chaves estrangeiras. A fonte original permanece na questão; `links.evidence` preserva evidência de cada origem ao reutilizar uma nota. `verifiedAt` permanece nulo: geração e aprovação não são verificação externa.

SQLite usa WAL, transações `BEGIN IMMEDIATE` e restrições únicas. Chamadas de IA não mantêm transações abertas. Um processo é responsável pelo acervo; múltiplas instâncias concorrentes e distribuição horizontal não são suportadas.

O navegador não recebe chaves. Pedidos de mutação exigem token da sessão e origem local; Host é validado contra localhost, reduzindo risco de DNS rebinding. A interface usa escape de texto e Content Security Policy. Não há rastreamento externo, fontes remotas, telemetria nem scripts de terceiros.

**Serviço de IA:** OpenAI, endpoint Chat Completions com `store:false`. O envio inclui material da questão e lotes relevantes de questões/objetivos do acervo para comparação completa. Consulte as condições da sua conta para tratamento pelo provedor. Remova identificadores de pacientes antes de colar. A aplicação não anonimiza conteúdo automaticamente e não pesquisa diretrizes na internet.

Sem login próprio dentro da aplicação: o uso local depende da conta do sistema operacional; no Codespaces, use somente o encaminhamento privado, autenticado pelo GitHub. Nunca altere a porta para pública. Dados locais não são criptografados pela aplicação; use proteção de disco e backups adequados ao seu ambiente. `.gitignore` exclui banco, backups, `.env` e conteúdos exportados por padrão.

## Métricas

- `secure` e `doubt` contam como acertos; `unanswered` fica fora do denominador. A distribuição temática usa a área principal de questões únicas enviadas no período. Tentativas podem se referir a questões cadastradas antes do período.
- Flashcards são contados por eventos não desfeitos, com primeiras respostas separadas. Recordação observada é `(Difícil + Bom + Fácil) / revisões posteriores`; não é acurácia clínica nem probabilidade do FSRS.
- Instantes persistidos em UTC; períodos, limite diário e dias de atividade usam o fuso IANA configurado, inicialmente `America/Sao_Paulo`.
- Tempo ativo: acumula somente com aba visível, na tela de estudo, com interação nos últimos 30 segundos. Cada incremento é limitado a 1 segundo; cada avaliação aceita no máximo 5 minutos. O navegador informa esse tempo; é uma medida de rotina, não uma medição infalível.
- “Esquecimentos repetidos” significa `lapses >= limiar`, inicialmente 4, conforme lapsos da biblioteca FSRS; não equivale a toda resposta De novo em aprendizagem.
- Hoje, vencidas e projeções de 7/30 dias usam o estado atual dos cartões aprovados. Projeções contam vencimentos atualmente conhecidos, não simulam revisões futuras. Filtro temporal se aplica aos eventos históricos; carga e estados são atuais.
- Tabelas sinalizam menos de 10 tentativas/avaliações como amostra pequena. Zero é distinto de ausência de denominador.

## Backup e exportação

Use **Configurações → Backup completo** para preservar questões, tentativas, notas, objetivos, fontes, vínculos, estados, eventos, versões e uniões. Restauração substitui o acervo em transação e grava uma cópia anterior em `data/backups/`. Formato versionado: `reuma-revisa-backup`, schema 1. Restaure somente backups confiáveis desta versão.

**Conteúdo JSON** não é backup: não contém eventos de estudo/tentativas. Veja [conteudos/README.md](conteudos/README.md) para a separação por área. Não há commits automáticos.

### Anki

Exportações separadas `basic.tsv` e `cloze.tsv` contêm somente notas aprovadas. Sete campos, nesta ordem:

| Posição | Campo | Simples | Cloze |
| --- | --- | --- | --- |
| 1 | ID | Campo de identidade | Campo de identidade |
| 2 | Frente | Pergunta | Texto com `{{c1::...}}` |
| 3 | Resposta | Resposta curta | Resposta-alvo |
| 4 | Explicação | Complemento | Complemento |
| 5 | Evidência | Trecho literal | Trecho literal |
| 6 | Fonte | Identificação | Identificação |
| 7 | Etiquetas | Etiquetas | Etiquetas |

Crie um tipo de nota `Reuma Simples` com esses campos (ID primeiro). Frente: `{{Frente}}`; verso: `{{FrontSide}}<hr>{{Resposta}}<br>{{Explicação}}<br>{{Evidência}}<br>{{Fonte}}`.

Clone o tipo Cloze do Anki para `Reuma Cloze`, configure os mesmos campos e mantenha ID como primeiro campo. Frente: `{{cloze:Frente}}`; verso: `{{cloze:Frente}}<hr>{{Explicação}}<br>{{Evidência}}<br>{{Fonte}}`. Importe com separador tabulação e HTML habilitado; mapeie o último campo para etiquetas se desejar. Use o ID para atualizar notas existentes sem duplicá-las. A prévia de importação deve ser conferida antes de confirmar.

A sintaxe e os campos foram testados por arquivo; **não foi executada uma importação no Anki Desktop**. Não há sincronização de agendamento ou histórico com o Anki.

## Testes e validação

```sh
npm test
npm run check
```

Suíte com testes de fluxo no serviço e HTTP: geração com provedor controlado, edição, aprovação, FSRS, duplicatas/paráfrases, concorrência, cloze, suporte literal, denominadores, fuso, desfazer, backup, persistência, exportação e união reversível. `.github/workflows/tests.yml` executa os testes no GitHub Actions.

Veja [docs/QUALIDADE.md](docs/QUALIDADE.md) para separar testes determinísticos de avaliações do modelo e [docs/ACEITE.md](docs/ACEITE.md) para a matriz de verificação.

## Limitações reais da entrega

- A chave e o modelo da API foram reconhecidos, mas a geração real foi bloqueada por saldo pré-pago esgotado. Após adicionar créditos, reabra a questão pendente e retome a análise. A qualidade clínica e semântica precisa de avaliação com material real. Testes usam dados fictícios explicitamente identificados.
- O acesso HTTP e a sintaxe foram verificados. A inspeção visual automatizada ficou bloqueada por falha do navegador integrado ao anexar a aba; não há teste de ponta a ponta por navegador nesta entrega.
- Para a detecção exata ignorar comentários/gabaritos, use os marcadores de seção documentados. Textos livres sem separação dependem da comparação semântica e da confirmação humana. Pontuação, reordenação de alternativas ou OCR podem exigir confirmação.
- A comparação semântica percorre todo o acervo em lotes, sem índice vetorial. Isso preserva cobertura mas aumenta custo/latência em acervos grandes. Uma falha deixa a análise pendente. Não existe garantia absoluta de deduplicação.
- Uma oclusão por nota. Não há oclusão de imagem, otimização personalizada de parâmetros, login próprio da aplicação ou hospedagem fora do GitHub Codespaces.
- Comentários alternativos em reenvios não atualizam automaticamente a fonte nem os cartões. O material original permanece preservado.
- Melhorias de verso e sobreposição parcial aparecem como propostas/alertas para curadoria; a aplicação não aplica melhorias ou funde explicações automaticamente.
- Recuperação de versão que pertencia a outro objetivo exige usar a ação explícita de mudança de objetivo; não reutiliza silenciosamente um agendamento incompatível.

## Repositório GitHub

O projeto está preparado para o repositório privado `pedroassuncao02/ReumaRevisa`. Confira o modo de uso do Codespaces em [Abrir pelo GitHub Codespaces](#abrir-pelo-github-codespaces). A chave de IA deve ser configurada como segredo privado do Codespaces. A chave e o banco local ficam fora dos commits.

## Referências técnicas

- [ts-fsrs, repositório oficial](https://github.com/open-spaced-repetition/ts-fsrs): API `createEmptyCard`, `fsrs`, `next` da distribuição **5.4.2**. A documentação instalada dessa versão orientou a implementação; a documentação principal pode mostrar APIs de versões posteriores.
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat): JSON Schema estrito, além de validação local antes da persistência.

O conteúdo produzido destina-se a estudo. Não é marcado como recomendação clínica externamente verificada.

No Windows, você também pode iniciar o aplicativo clicando duas vezes em `iniciar.cmd`. Mantenha a janela aberta enquanto usa o navegador; feche-a para encerrar o servidor.

## Abrir pelo GitHub Codespaces

O repositório inclui um ambiente Codespaces que instala dependências, inicia o aplicativo ao abrir o espaço e encaminha a porta 3210 como **privada**. Só você, autenticado no GitHub, pode acessar essa porta. O banco `data/reuma.sqlite` fica no diretório persistente do Codespace e não é incluído nos commits.

1. No repositório GitHub, clique em **Code → Codespaces → Create codespace on main**. Se o Codespace já existir, abra-o em vez de criar outro.

2. Na criação, escolha a chave `OPENAI_API_KEY` quando o GitHub oferecer a opção de configurar o segredo. Se precisar cadastrá-la antes, vá a **GitHub → foto do perfil → Settings → Secrets and variables → Codespaces → New secret**. Nome: `OPENAI_API_KEY`; valor: sua chave. Dê acesso apenas a este repositório. A chave fica nas configurações privadas da sua conta, nunca no repositório.

3. Aguarde o primeiro preparo. O navegador deverá abrir o aplicativo. Se não abrir, no Codespace selecione a aba **Ports** e clique no endereço encaminhado na porta `3210`; mantenha a visibilidade `Private`.

4. Ao voltar depois, reabra o Codespace pelo menu **Code → Codespaces**. Quando estiver parado, use **Resume**. Para parar e liberar a máquina, escolha **Stop codespace**.

Codespaces executa o servidor enquanto o espaço está ativo. O plano do GitHub pode impor cotas ou custos ao uso de Codespaces; confira a cota na sua conta. O segredo é fornecido ao servidor pelo ambiente do Codespaces; a configuração local `.env` não é enviada ao GitHub.



