Crie uma aplicação web em português, organizada em um repositório GitHub, para transformar questões comentadas de reumatologia em flashcards de qualidade e estudá-los com o algoritmo FSRS.

Entregue uma aplicação funcional, com persistência de dados, documentação e testes dos fluxos principais. Não se limite a um protótipo visual.

As prioridades são:
1. Qualidade e relevância dos cartões.
2. Ausência de cartões redundantes.
3. Oclusões restritas ao termo central.
4. Rastreabilidade das informações.
5. Revisão com FSRS e estatísticas confiáveis.

## 1. Fluxo principal

Implemente o fluxo:

**Envio da questão → verificação de questão repetida → identificação dos objetivos de aprendizagem → comparação com o acervo → geração de rascunhos → curadoria → aprovação → estudo.**

A aplicação será o ambiente principal de revisão com FSRS. Também deve permitir exportação para o Anki, sem prometer sincronização de histórico ou agendamento entre os sistemas.

Uma questão pode abordar vários temas e gerar cartões em áreas diferentes. Cada cartão, entretanto, deve acrescentar um conhecimento distinto ao acervo.

Não imponha quantidade mínima ou fixa de cartões por questão. Um envio pode resultar em nenhum cartão novo.

## 2. Tela de envio

Inclua:

- Campo grande para colar enunciado, alternativas, gabarito e comentário.
- Campos opcionais para fonte, instituição/banca e ano.
- Seletor opcional de área, com classificação automática quando não preenchido.
- Registro opcional: **“Acertei com segurança”**, **“Acertei com dúvida”**, **“Errei”** ou **“Não respondi”**.
- Campo opcional: **“Qual foi minha dúvida ou erro?”**.
- Botão **“Enviar e criar cartões”**.

Quando houver uma dúvida ou erro informado, priorize os conhecimentos relacionados, sem transformar todos os detalhes da questão em cartões.

Mostre estados de processamento e preserve o texto em caso de falha. Proteja o envio contra cliques repetidos.

## 3. Bloqueio de questões repetidas

Antes de analisar temas ou gerar cartões, verifique se a questão já existe no acervo do usuário.

Compare enunciado e alternativas, desconsiderando diferenças superficiais de espaços, formatação, quebras de linha, numeração e identificação das alternativas. Preserve diferenças relevantes, especialmente negações, valores e condições clínicas.

Comentários, gabaritos ou fontes diferentes não tornam uma questão idêntica em uma questão nova.

Quando a repetição for confirmada:

- Interrompa o processamento antes da geração.
- Não crie questão, cartão ou tentativa adicional.
- Não altere cartões existentes.
- Não contabilize o envio como nova questão nas estatísticas.
- Mostre: **“Essa questão já foi enviada. Nenhum novo cartão foi criado.”**
- Ofereça **“Ver questão enviada”**, com data do primeiro envio e cartões vinculados.

Se houver comentário diferente, ofereça opcionalmente **“Revisar com este novo comentário”**, sem executar a atualização automaticamente.

Use comparação semântica para possíveis repetições com reformulações. Se houver dúvida, apresente a questão semelhante para confirmação, sem descartar automaticamente uma questão potencialmente diferente.

Garanta que envios simultâneos não criem registros duplicados.

## 4. Identificação dos conhecimentos

Antes de escrever cartões, decomponha a questão e o comentário em objetivos de aprendizagem relevantes e independentes.

Para cada candidato, registre:

- Tema ou entidade.
- Aspecto cobrado: diagnóstico, manifestação, exame, tratamento, contraindicação ou outro.
- Condições e qualificadores necessários.
- Pergunta que o estudante deverá responder mentalmente.
- Resposta-alvo.
- Trecho da fonte que sustenta a resposta.

Compare essa representação com o acervo antes de redigir.

Não transforme alternativas incorretas em afirmações verdadeiras. Se faltarem informações essenciais ou houver conflito entre gabarito e comentário, sinalize a pendência.

## 5. Tipos de cartão e princípios gerais

Disponibilize:

### Pergunta e resposta simples

- Frente com pergunta objetiva, compreensível isoladamente.
- Verso com resposta curta e direta.
- Explicação complementar e fonte em campos separados.

### Oclusão de texto — cloze

- Sintaxe compatível com Anki: `{{c1::conteúdo oculto}}`.
- Oclusão apenas da resposta-alvo.
- Contexto suficiente para uma resposta inequívoca.
- Preferência por uma oclusão e um objetivo por nota.

Oclusão de texto é obrigatória; oclusão de imagem fica fora do escopo inicial.

Para ambos os tipos:

- Aplique o princípio da informação mínima.
- Evite perguntas vagas, listas extensas e múltiplas perguntas no mesmo cartão.
- Não copie parágrafos do comentário.
- Não use referências como “neste caso” ou “o paciente acima” sem fornecer o contexto.
- Não use múltipla escolha como formato principal.
- Não gere versões simples e cloze para testar o mesmo conhecimento.
- Priorize conceitos reutilizáveis em outras questões.

Preserve condições e exceções relevantes. Não confunda critérios de classificação com diagnóstico clínico nem transforme associações em regras absolutas.

## 6. Curadoria rigorosa das oclusões

Primeiro defina o conhecimento a ser recordado; depois escreva a frase e escolha o trecho oculto. Não gere cloze simplesmente apagando palavras do comentário.

### Seleção do termo central

A oclusão deve conter somente uma entidade, nome, conceito, valor ou expressão técnica curta que constitua a resposta.

- Nunca oculte uma frase inteira, explicação, justificativa ou lista.
- Deixe visíveis as condições clínicas necessárias.
- Mantenha fora da oclusão palavras introdutórias como “é”, “apresenta” ou “é caracterizado por”, quando não integrarem o conceito.
- Não oculte conectivos, palavras irrelevantes ou termos genéricos.
- Não fragmente um nome técnico para encurtá-lo.
- Prefira de uma a cinco palavras como orientação, não como limite absoluto.
- Oclusões maiores devem receber alerta de revisão.
- Para números, preserve unidades e operadores conforme necessário para uma resposta inequívoca.

Se o conhecimento não puder ser testado adequadamente com uma expressão curta, use pergunta e resposta simples.

### Qualidade do texto visível

- Deve delimitar uma resposta suficientemente inequívoca.
- Deve funcionar sem consultar a questão original.
- Não deve repetir a resposta nem revelar sinônimos, siglas ou iniciais que a entreguem.
- Não deve conter detalhes sem função.
- Deve deixar explicações adicionais em campo separado no verso.
- Dicas de categoria só podem ser usadas quando necessárias para reduzir ambiguidade.

### Exemplos de estrutura

Inadequado — oclusão extensa:
“A capital do Brasil é {{c1::Brasília, cidade localizada no Distrito Federal}}.”

Adequado — resposta central:
“A capital do Brasil é {{c1::Brasília}}.”

Inadequado — várias respostas possíveis:
“Uma cidade brasileira é {{c1::Brasília}}.”

Inadequado — informação irrelevante:
“A capital {{c1::do}} Brasil é Brasília.”

Aplique esses princípios ao conteúdo médico sem remover qualificadores necessários.

### Avaliação separada da geração

Execute uma segunda etapa de avaliação para verificar:

1. Há um único objetivo relevante?
2. A oclusão contém apenas a resposta-alvo?
3. A fonte sustenta essa resposta?
4. O texto visível delimita a resposta?
5. O contexto necessário permanece visível?
6. Existem pistas artificiais?
7. O cartão funciona isoladamente?
8. O conhecimento já está coberto no acervo?

Para avaliar ambiguidade, considere primeiro apenas o texto visível e procure outras respostas plausíveis. Sinônimos equivalentes são aceitáveis; conceitos diferentes igualmente válidos indicam falha.

Reescreva candidatos inadequados e reavalie. Após duas tentativas sem resultado satisfatório, converta para pergunta simples ou encaminhe para revisão manual. Não force cloze.

A etapa avaliadora deve receber critérios explícitos e produzir resultado estruturado; não basta o gerador declarar que seu cartão está adequado.

### Verificações automáticas

Valide sintaxe, oclusões vazias, existência de contexto, repetição da resposta, quantidade de palavras ocultas e proporção entre trecho oculto e texto total.

Use extensão e proporção como alertas, não como prova isolada de qualidade. Não permita aprovação em lote com alertas pendentes.

## 7. Deduplicação por objetivo de aprendizagem

Compare candidatos com todo o acervo, incluindo aprovados, rascunhos e suspensos, independentemente de área ou formato.

Faça a comparação antes de gerar e novamente antes de salvar. Considere também sugestões do mesmo envio e cartões efetivamente produzidos por notas cloze.

Considere redundantes cartões que exigem recuperar essencialmente o mesmo conhecimento, mesmo quando:

- A redação ou a fonte muda.
- Um é simples e outro é cloze.
- A vinheta muda sem alterar o conhecimento necessário.
- Um contém explicação mais extensa.
- A relação aparece em ordem inversa sem acrescentar uma habilidade relevante.

Use o critério:

**“Quem domina o cartão existente precisa aprender uma informação ou distinção adicional para responder ao novo?”**

Se não, não crie outro cartão. Se sim, explicite a diferença relevante, sustentada pela fonte.

Não confunda mesma doença com mesmo objetivo: diagnóstico, tratamento e contraindicação podem ser conhecimentos diferentes.

### Decisões possíveis

- **Mesmo foco:** vincular a nova questão ao cartão existente.
- **Explicação melhor:** propor melhoria do verso ou da fonte.
- **Sobreposição parcial:** extrair somente a informação adicional e avaliar sua relevância.
- **Conhecimento distinto:** gerar rascunho.
- **Conflito:** encaminhar para revisão, sem criar afirmações concorrentes automaticamente.
- **Incerteza:** manter pendente e fora da fila de estudo.

Um detalhe apenas explicativo deve ir para o verso. Uma condição ou exceção que altera uma decisão pode justificar um cartão específico.

Não acumule vários objetivos em um cartão para evitar duplicação.

Registre a recorrência de um conhecimento pelo número de questões vinculadas, não pela criação de cartões repetidos.

Combine busca textual, representação estruturada e similaridade semântica. Não dependa de um único limiar, dos cartões recentes ou de uma única área.

Se a busca estiver indisponível ou desatualizada, mantenha as propostas pendentes e informe que a deduplicação não foi concluída.

## 8. Revisão e aprovação

Todo cartão gerado entra como rascunho, fora da fila de estudo.

Na prévia, mostre:

- Conteúdo do cartão.
- Termo ocultado, destacado separadamente.
- Objetivo de aprendizagem.
- Trecho de evidência.
- Área e etiquetas.
- Alertas.
- Cartões semelhantes e decisão sugerida.

Ofereça **aprovar**, **editar**, **descartar**, **vincular a existente** e **converter o tipo de cartão**.

Permita selecionar outro trecho para ocluir. A aprovação em lote deve se restringir aos cartões selecionados sem pendências.

Para propostas próximas de cartões existentes, mostre:

**“Este cartão acrescenta: [distinção específica].”**

Se não for possível justificar a novidade, mantenha a proposta pendente.

Apresente um resumo por envio, como:
“8 objetivos identificados: 3 cartões novos sugeridos, 4 já cobertos e 1 atualização proposta.”

Registre motivos de descarte para evitar repetir sugestões rejeitadas no mesmo contexto.

## 9. Organização por área

Crie áreas editáveis, inicialmente:

- Artrite reumatoide.
- Espondiloartrites e artrite psoriásica.
- Lúpus e síndrome antifosfolípide.
- Síndrome de Sjögren.
- Esclerose sistêmica.
- Miopatias inflamatórias.
- Vasculites.
- Artrites por cristais.
- Osteoartrite.
- Osteoporose e metabolismo ósseo.
- Reumatologia pediátrica.
- Doenças autoinflamatórias.
- Dor musculoesquelética e fibromialgia.
- Infecções e diagnósticos diferenciais.
- Farmacologia e terapêutica.
- Outros temas.

Cada questão possui uma área principal e etiquetas para os demais temas. Cada cartão recebe sua própria classificação, que pode diferir da área principal da questão.

Use etiquetas e vínculos para conteúdos transversais, sem duplicar registros.

Inclua busca e filtros por área, etiquetas, fonte, status e pendências.

Organize as exportações no repositório por área, com identificadores estáveis, por exemplo:

```text
conteudos/
  artrite-reumatoide/
    questoes.json
    notas.json
  vasculites/
    questoes.json
    notas.json
```

Cada registro deve aparecer uma única vez na exportação principal; referências entre áreas devem usar identificadores.

Separe código, conteúdo exportado e dados pessoais de estudo. Enviar uma questão não deve produzir commit ou publicação automática.

## 10. Revisão com FSRS

Use uma biblioteca FSRS mantida, verificando sua documentação e registrando a versão.

Implemente agendamento real pelo algoritmo, sem simular FSRS com intervalos fixos.

Inclua:

- Fila de cartões novos e revisões previstas.
- Resposta oculta até o usuário revelá-la.
- Avaliações **“De novo”**, **“Difícil”**, **“Bom”** e **“Fácil”**.
- Retenção desejada configurável.
- Limite diário de cartões novos.
- Estado de agendamento por cartão efetivo.
- Histórico persistente de revisões.
- Datas e fuso horário consistentes.
- Proteção contra avaliações duplicadas.
- Opção de desfazer a última avaliação, restaurando o estado anterior.

Se uma nota produzir vários cartões cloze, cada cartão deve ter identificador e estado FSRS próprios.

Use parâmetros padrão inicialmente. Só ofereça otimização personalizada se estiver implementada e houver histórico suficiente.

## 11. Manutenção dos cartões

Durante o estudo, inclua **“Reportar problema no cartão”**:

- Ambiguidade.
- Resposta longa.
- Falta de contexto.
- Possível erro.
- Possível desatualização.
- Duplicação.
- Outro.

Encaminhe para uma fila de correção e permita suspensão temporária.

Identifique esquecimentos repetidos com regra transparente e configurável. Sugira reformulação, divisão ou estudo prévio, sem reescrever automaticamente.

Mantenha histórico de alterações e recuperação de versões.

Atualizações que preservem o objetivo devem manter o histórico de revisão. Se o conhecimento cobrado mudar substancialmente, ofereça criar novo cartão ou reiniciar o agendamento, mediante escolha explícita.

Disponibilize auditoria de redundâncias existentes. Não exclua, una ou sobrescreva cartões silenciosamente. Uniões devem preservar fontes, permitir desfazer e definir explicitamente qual histórico de agendamento será mantido, sem misturá-los automaticamente.

## 12. Fontes e confiabilidade

Preserve a questão original, o comentário e os trechos que sustentam cada cartão.

Quando disponíveis, registre:

- Fonte e ano.
- Referência citada.
- Versão ou ano de diretriz.
- Data da última verificação efetiva.

Não invente dados, referências ou recomendações. Diferencie informações extraídas do material enviado de complementações externas verificadas.

Não marque conteúdo como verificado apenas por ter sido gerado ou aprovado.

Sinalize contradições e possível desatualização. Permita localizar cartões vinculados a determinada fonte para facilitar atualizações.

## 13. Estatísticas de estudo

Crie uma aba **“Estatísticas”**, com filtros por período, área e etiquetas.

Separe claramente desempenho nas questões das avaliações de recordação dos flashcards.

### Questões e tentativas

Diferencie questão única de tentativa de resolução.

As opções “Acertei com segurança” e “Acertei com dúvida” contam como acerto, mas devem permanecer separadas na apresentação. “Não respondi” não entra na taxa de acerto.

Reenvios não geram tentativas. Ofereça **“Registrar nova tentativa”** na questão existente.

Mostre:

- Questões únicas por área, em quantidade e percentual.
- Questões distintas respondidas no período por área.
- Número de tentativas.
- Acertos com segurança, acertos com dúvida e erros.
- Taxa de acerto total e por área.
- Evolução ao longo do tempo.

Mostre sempre o denominador, por exemplo: **“Vasculites: 24 de 120 questões — 20%”**.

Use a área principal para distribuições que devem totalizar 100%. Explique que etiquetas podem se sobrepor. Não confunda distribuição temática com desempenho.

### Flashcards

Mostre quantidade e percentual de:

- **De novo:** não recordou.
- **Difícil:** recordou com dificuldade.
- **Bom:** recordou adequadamente.
- **Fácil:** recordou com facilidade.

Calcule sobre eventos de revisão, não sobre cartões únicos. Mostre também quantos cartões distintos foram estudados.

Separe primeiras respostas a cartões novos das revisões posteriores.

Se exibir taxa de recordação observada, defina-a como a proporção de “Difícil”, “Bom” e “Fácil” nas revisões consideradas. Informe que depende de autoavaliação e não equivale à taxa de acerto nas questões nem à probabilidade estimada pelo FSRS.

### Rotina e carga

Inclua:

- Revisões por dia e semana.
- Cartões novos estudados.
- Dias com atividade.
- Tempo ativo e tempo médio por revisão.
- Revisões previstas para hoje.
- Revisões vencidas.
- Carga estimada para os próximos 7 e 30 dias.
- Cartões aprovados, nunca estudados, em estudo e suspensos por área, com definições claras.

Desconsidere tempo em segundo plano e pausas prolongadas segundo regra documentada. Identifique projeções como estimativas.

### Temas que precisam de atenção

Apresente tabela por área com:

- Taxa de acerto e número de tentativas.
- Percentual de “De novo” e número de avaliações.
- Cartões com esquecimentos repetidos.
- Revisões vencidas.

Permita ordenar por essas métricas. Sinalize amostras pequenas. Não equipare volume de estudo a domínio nem crie um índice único de domínio sem metodologia explícita.

Use gráficos simples e explicações curtas. Diferencie zero de ausência de dados.

Atualize as métricas ao desfazer avaliações. Preserve eventos históricos ao editar ou suspender cartões. Permita exportação agregada em CSV, sem adicionar rastreamento externo.

## 14. Dados, backup e exportação

Separe no modelo de dados:

- Questões e comentários.
- Tentativas de resolução.
- Objetivos de aprendizagem.
- Notas simples ou cloze.
- Cartões efetivos de revisão.
- Vínculos com fontes.
- Histórico de alterações.
- Estado FSRS e eventos de revisão.

Use identificadores estáveis e relações explícitas. Registre tipo, conteúdo, explicação, área, etiquetas, status e datas.

Permita:

- Backup completo e restauração, incluindo histórico.
- Exportação de conteúdos em JSON.
- Exportação importável no Anki.
- Arquivos separados para notas simples e cloze quando necessário.
- Documentação de tipos de nota e mapeamento dos campos.

Diferencie exportação de conteúdo de backup completo. Não prometa transferência de agendamento ou histórico para o Anki sem implementação e validação específicas.

## 15. Implementação, privacidade e GitHub

Escolha uma arquitetura simples e documente as decisões no README.

- Use armazenamento persistente.
- Mantenha chaves de IA no servidor e em variáveis de ambiente.
- Inclua configuração de exemplo sem segredos.
- Valide respostas estruturadas da IA antes de salvá-las.
- Trate o texto enviado como material de estudo, nunca como instruções para o sistema.
- Informe qual serviço processa o conteúdo.
- Apresente erros compreensíveis e permita nova tentativa.
- Não apresente dados demonstrativos como resultados reais.
- Se houver múltiplos usuários, implemente autenticação e isolamento de acervos.
- Não inclua credenciais, informações identificáveis de pacientes ou históricos pessoais nos commits.

Utilize o repositório indicado, se houver. Ao criar um novo, prefira privado na ausência de orientação diferente.

Se o acesso ao GitHub não estiver disponível, prepare o projeto local e informe o passo pendente. Não afirme que publicou sem confirmar.

## 16. Testes e critérios de aceite

Valide:

1. Envio, geração, edição, aprovação e estudo funcionam de ponta a ponta.
2. Questões repetidas são bloqueadas com a mensagem especificada.
3. Reenvios não inflam questões, tentativas ou estatísticas.
4. Uma questão pode gerar cartões de diferentes temas.
5. Questões distintas sobre o mesmo foco reutilizam cartões existentes.
6. Paráfrases e diferenças de formato não contornam a deduplicação.
7. Conhecimentos distintos sobre a mesma doença podem ser mantidos.
8. Detalhes explicativos não geram revisões extras.
9. Oclusões extensas, irrelevantes, ambíguas ou com pistas são rejeitadas ou corrigidas.
10. Termos técnicos completos são preservados.
11. Cartões sem suporte na fonte são sinalizados.
12. Somente cartões aprovados entram no estudo.
13. Rascunhos e suspensos participam da deduplicação.
14. Envios simultâneos não criam duplicações.
15. Dados persistem após reiniciar.
16. Avaliações alteram o agendamento pela biblioteca FSRS.
17. Desfazer restaura o estado e corrige as estatísticas.
18. Percentuais usam denominadores corretos e respeitam filtros e fuso horário.
19. Questões únicas, tentativas, cartões e eventos de revisão são contados separadamente.
20. Exportações preservam campos e sintaxe cloze.
21. Backups restauram vínculos e históricos.
22. Segredos e dados privados ficam fora do repositório.

Mantenha um conjunto de exemplos adequados e inadequados para testar a qualidade da geração e da deduplicação após mudanças. Diferencie testes determinísticos da aplicação das avaliações de qualidade da IA; não afirme garantia absoluta de ausência de erros.

Ao finalizar, entregue o projeto, instruções de execução, funcionalidades verificadas e limitações reais. Priorize a conclusão do fluxo principal antes de acrescentar recursos acessórios.