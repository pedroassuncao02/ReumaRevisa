# Matriz de verificação

Entrega local em 25/10/2026. Resultados reais da suíte constam no relatório TESTES.txt. “Controlado” significa IA substituída por fixture determinística; não valida semântica clínica real.

| Critério do pedido | Implementação e evidência |
| --- | --- |
| 1. Envio até estudo | Teste integrado do serviço + teste HTTP; geração controlada |
| 2–3. Repetição e estatísticas | Mensagem exata, snapshot sem mudanças, 1 questão/1 tentativa |
| 4. Temas diferentes | Teste com dois objetivos/áreas no mesmo envio |
| 5. Reutilização por foco | Comparação com acervo e vínculos; teste com suspenso |
| 6. Formato/paráfrase | Normalização determinística e confirmação semântica controlada; qualidade real pendente |
| 7. Aspectos distintos | Teste de exame/tratamento da mesma entidade |
| 8. Detalhes explicativos | Política do gerador/comparador; avaliação de modelo real pendente |
| 9–10. Cloze e termos | Validadores locais e avaliador independente; testes de vazio, extensão, pistas, ambiguidade e nome completo |
| 11. Fonte | Trecho literal ausente bloqueia aprovação; suporte conceitual depende do avaliador e curadoria |
| 12–13. Status | Fila somente aprovados; comparação inclui todos os status |
| 14. Simultaneidade | Serialização de pedidos + UNIQUE no SQLite; teste concorrente |
| 15. Persistência | Fechamento e reabertura de banco em arquivo |
| 16. FSRS | Biblioteca real 5.4.2 gera estabilidade, intervalos e estados nos testes |
| 17. Desfazer | Restaura estado anterior; evento marcado desfeito sai das métricas |
| 18–19. Estatísticas | Denominadores, não respondidas, primeiras revisões, filtros e fronteira UTC/São Paulo |
| 20. Exportação | Sintaxe cloze/IDs/colunas; importação no Anki Desktop não realizada |
| 21. Backup | Restaura relações/histórico; falha transacional mantém banco anterior |
| 22. Privacidade Git | .gitignore e revisão dos arquivos rastreados; sem chave ou dados de estudo incluídos |

Verificação visual em navegador não concluída: o navegador integrado retornou que a aba não pertencia à sessão e não apresentou nenhuma aba disponível. Servidor local respondeu HTTP 200; sintaxe de JavaScript e endpoints foram verificados.

Recursos adicionais implementados: união reversível com histórico de agendamento escolhido, mudança explícita de objetivo com reinicialização ou novo cartão, relatos, suspensão, versões e exportador por área. Sem serviço multiusuário ou sincronização Anki.
