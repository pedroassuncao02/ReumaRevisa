# Avaliação de qualidade da IA

Os testes automatizados usam textos fictícios e um provedor controlado. Eles comprovam o comportamento da aplicação diante das respostas recebidas, **não** a competência clínica do modelo, nem ausência absoluta de redundância. Nenhuma avaliação com API real foi executada na entrega: não havia chave configurada.

## Protocolo após trocar modelo ou prompts

1. Use banco separado (`DATA_DIR=./data-avaliacao`) e fontes autorizadas, sem identificadores de pacientes.
2. Execute o conjunto abaixo com as respostas de referência revisadas por profissional habilitado. Registre modelo, data, versão Git, texto enviado, objetivos, decisões e avaliação independente.
3. Verifique precisão da evidência, atomicidade, novidade, qualidade do texto visível e preservação dos qualificadores. Não use só taxa de aprovação do avaliador.
4. Revise os falsos positivos (conhecimento novo indevidamente descartado) e falsos negativos (redundância aceita) separadamente.
5. Inclua casos de instruções maliciosas no comentário; o resultado não deve seguir essas instruções nem inventar fontes.

## Conjunto de regressão

| Caso | Material / candidato | Resultado esperado |
| --- | --- | --- |
| Cloze central | A capital do Brasil é `{{c1::Brasília}}`. | Termo central preservado; validação de contexto humana |
| Cloze extensa | A capital é `{{c1::Brasília, cidade localizada no Distrito Federal}}`. | Alerta; explicação vai para verso |
| Ambígua | Uma cidade brasileira é `{{c1::Brasília}}`. | Avaliador rejeita: várias cidades possíveis |
| Irrelevante | A capital `{{c1::do}}` Brasil é Brasília. | Rejeitar termo sem objetivo e pista explícita |
| Pista | O marcador Alfa corresponde a `{{c1::Alfa}}`. | Rejeitar repetição visível |
| Nome técnico | Marcador fictício com nome composto de seis palavras | Não truncar; alerta de extensão exige revisão |
| Sem fonte | Resposta correta, mas evidência inventada | Bloquear aprovação |
| Alternativa errada | Distrator contradiz comentário | Não convertê-lo em afirmação verdadeira |
| Mesmo foco | Questões distintas cobram mesmo marcador na mesma condição | Reutilizar nota, inclusive rascunho/suspensa |
| Formato diferente | Pergunta simples e cloze cobram a mesma resposta | Não gerar segunda revisão |
| Inversão | Relação escrita na ordem inversa, sem nova habilidade | Vincular existente |
| Exceção relevante | Condição clínica altera conduta | Manter objetivo distinto com qualificador |
| Explicação | Nova fonte explica o mecanismo sem mudar resposta | Propor melhoria, não novo cartão |
| Contradição | Fontes apresentam respostas concorrentes | Pendente; não aprovar automaticamente |
| Negação | “Está indicado” versus “não está indicado” | Não tratar como duplicata exata |
| Número | 20 mg versus 40 mg | Preservar diferença |
| Paráfrase | Reformulação sem palavras em comum | Comparação semântica deve apresentar confirmação |
| Distrator formatado | A), (a), a. e alternativas na mesma linha | Bloqueio exato após normalização |

Os exemplos geográficos são deliberadamente não clínicos: testam a estrutura sem introduzir recomendações médicas não verificadas. Os testes de fluxo utilizam “condição fictícia Alfa”. Exemplos clínicos reais devem ser acrescentados com evidência autorizada e julgamento especializado.
