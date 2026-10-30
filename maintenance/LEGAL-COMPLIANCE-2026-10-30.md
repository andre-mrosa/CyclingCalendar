# Avaliação complementar e redução de risco — 30/10/2026

## Conclusão delimitada

O modelo atual publica um índice factual, gratuito, com ligações para confirmar e efetuar inscrições na origem. Não há no código inspecionado publicidade, pagamentos, inscrições próprias, listagens de participantes ou publicação de descrições/cartazes/percursos importados. Isto é relevante para a análise e reduz a exposição relativamente à versão antiga. Não é uma prova de conformidade jurídica integral nem uma conclusão de que toda a recolha é ilícita ou exige sempre licença.

Esta avaliação complementa `LEGAL-REVIEW-2026-10-30.md`. As observações anteriores sobre envio direto de localização deixam de descrever o código agora preparado: foi substituído pelo serviço intermédio abaixo. O relatório de setembro descreve uma versão suspensa que copiava conteúdos extensos; não deve ser lido como inventário da versão atual.

## Factos, bases de dados e condições das fontes

- Datas, localidades e outros factos não se tornam automaticamente obras protegidas por estarem num website. O TJUE distingue investimento na criação dos dados de investimento autónomo na obtenção, verificação ou apresentação de uma base de dados. Não é correto presumir que qualquer calendário tem direito sui generis: os requisitos e o investimento precisam de ser demonstrados. [TJUE, C-46/02](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:62002CJ0046).
- Também não é correto concluir que selecionar só factos resolve sempre a extração de uma base protegida. Volume, repetição, conteúdo retirado, investimento demonstrável e interferência com a exploração normal são elementos da análise. Não existe aqui uma percentagem universal que certifique licitude. [TJUE, C-203/02](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=celex:62002CJ0203_SUM).
- Limitações contratuais podem ser relevantes mesmo para uma base sem aquela proteção; o TJUE deixa expressamente a aplicação do direito nacional em aberto. A mera existência de uma proibição no rodapé também não prova, por si só, que toda a cláusula vincula este projeto ou proíbe a utilização de factos isolados. Aceitação, âmbito e validade têm de ser avaliados. [TJUE, C-30/14](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:62014CA0030).
- A referência à fonte, a gratuitidade e encaminhar inscrições para o organizador são elementos favoráveis do modelo concreto; não substituem a análise dos direitos/condições aplicáveis. Não se deve atribuir uma licença inexistente às fontes. A allowlist do código traduz uma decisão operacional do proprietário, não autorizações dos titulares.

### Leitura das fontes

| Fonte | Situação verificada | O que permanece dependente de apreciação jurídica |
| --- | --- | --- |
| FPC | Calendário factual e ligações; não foi demonstrada uma licença geral de reutilização. | Eventual proteção da compilação de calendários de terceiros, volume e repetição. Ausência de licença encontrada não prova automaticamente proibição. |
| Cabreira | [Aviso legal, secção 3](https://cabreirasolutions.com/aviso-legal/) reserva conteúdos e exige autorização escrita para os usos descritos. | Distinguir os factos das provas que organiza das obras e da eventual base protegida; aplicabilidade das condições ao acesso concreto. |
| Stop and Go | [Termos 14.1–14.3](https://stopandgo.net/terms) referem também bases/estruturas de dados e uma licença de uso pessoal. | Proteção efetiva da base, alcance da recolha e validade/oponibilidade das condições. |
| Apedalar | [Termos, secção 7](https://apedalar.pt/termos-e-condicoes) restringem reprodução/distribuição/modificação dos conteúdos. | Mesmo exame de factos versus conteúdo/base protegida e enquadramento contratual. |
| Recorde Pessoal | Não foi demonstrada uma autorização geral; política de privacidade não é uma licença. | Direitos efetivamente aplicáveis e termos que vinculem o uso concreto. |

Não foram enviados pedidos, aceites condições novas, obtidas licenças ou alterada a disponibilidade das fontes nesta revisão. Não foram contornados bloqueios. Para reduzir a incerteza residual, pode pedir-se um acordo delimitado a campos factuais/frequência/atribuição, ou obter parecer sobre este modelo concreto; isso não significa presumir ilicitude à partida.

## Evidência de minimização e limpeza autorizada

Inspeção em leitura da BD e dos ficheiros atualmente versionados:

- Os campos antigos de descrição/programa/imagens/GPX de Event tinham zero bytes na medição anterior; a inspeção complementar de 3.371 traduções antigas encontrou zero bytes nos campos description/programa. As traduções não são usadas na publicação atual.
- `git ls-files public/media/events` não devolveu ficheiros atualmente versionados. Isto não comprova que nunca tenham existido cópias no histórico Git ou fora do projeto.
- Foram encontrados 26 registos de estatísticas individuais antigas, 53 eventos associados e 1.130 logs com mais de trinta dias. Após autorização explícita do proprietário, foi aplicado um plano limitado aos IDs identificados. Verificação posterior: zero sessões/eventos antigos e zero logs com mais de trinta dias; mantiveram-se os 34 grupos de contagens agregadas, contas, favoritos e provas.
- Trata-se de limpeza pontual autorizada. Não se configurou, por essa autorização, um novo apagamento recorrente de dados de produção.

## Alterações concretas de proteção

- **Base de dados:** ativada a validação de certificado e hostname TLS pelo cliente PostgreSQL; parâmetros de URL que desligariam essa política são neutralizados. Confirmada ligação real de leitura após a alteração. A cifragem sem verificação de identidade não é apresentada como equivalente a este controlo.
- **Localização:** pesquisa/GPS passam por POST ao próprio servidor. Coordenadas são arredondadas a duas casas decimais no cliente e novamente no servidor. O pedido a Nominatim não recebe cookies, token de conta ou IP encaminhado do visitante. A aplicação não grava as consultas/coordenadas na BD; há apenas uma reserva operacional sem dados de localização. Respostas regionais reduzidas podem ficar em memória até uma hora, com chaves hash, sem associação à conta e com limite de tamanho.
- **Utilização do fornecedor geográfico:** reserva global em PostgreSQL impede pedidos simultâneos de instâncias diferentes e aplica intervalo superior a um segundo após terminar cada pedido. Timeout, identificação da aplicação, recusa de redirecionamentos e atribuição OpenStreetMap. A política exige controlo por aplicação, não apenas por visitante. [Condições Nominatim](https://operations.osmfoundation.org/policies/nominatim/).
- **Referências HTTP:** `Referrer-Policy: strict-origin` deixa de enviar o caminho/query completos também em navegação para a mesma origem; os feeds privados mantêm `no-referrer`.
- **Email:** inspecionado o domínio autenticado no Resend: `cyclingcalendar.pt`, verificado, região de envio Ireland/eu-west-1. A configuração inicial permitia fallback de entrega sem TLS. Após autorização específica do proprietário, foi selecionado e confirmado **Enforced TLS**. Servidores destinatários sem TLS passam a falhar a entrega. Não foi enviado email nesta operação.
- **Rastreio de email:** a interface mostrou configuração inicial de novo subdomínio de tracking, sem um subdomínio já configurado na lista inspecionada. Não foi ativado rastreio. Não se afirma que esta observação substitui auditoria a todas as opções do fornecedor ou prova ausência de logs técnicos de entrega.
- Atualizadas as explicações públicas e o aviso de localização nas quatro línguas para corresponder ao novo percurso; continuou disponível a alternativa manual, sem GPS/pesquisa externa.

## Tratamento de dados e fornecedores

Não se confirmou a ausência de contratos; pelo contrário, os documentos padrão consultados incorporam DPAs e mecanismos de transferência:

| Serviço | Evidência documental pública | Limite da verificação |
| --- | --- | --- |
| Vercel | [Termos](https://vercel.com/legal/terms) incorporam o [DPA](https://vercel.com/legal/dpa), que inclui cláusulas contratuais-tipo quando aplicáveis. | Não foi feita auditoria à conta, planos, subcontratantes ou localização de todas as funções/logs/backups. O plano Hobby restringe usos comerciais. |
| Clerk | [Termos](https://clerk.com/legal/standard-terms) e [DPA](https://clerk.com/legal/dpa) incorporados; este descreve DPF e cláusulas-tipo de fallback. | Confirmar que a titularidade/versão contratual correspondem à conta e manter controlo dos acessos do operador. |
| Resend | [DPA](https://resend.com/legal/dpa) integra o acordo e prevê cláusulas-tipo para transferências relevantes. | A região de envio Irlanda não demonstra que todo o conteúdo, logs e suporte ficam no EEE; os documentos do serviço descrevem também tratamento nos EUA. |
| Neon/Databricks | [Condições Neon](https://neon.com/platform-terms) remetem para o [MCSA](https://www.databricks.com/legal/mcsa); [documentos de tratamento](https://www.databricks.com/dpa). As versões anteriores de Neon também incorporavam DPA. | Registar a versão efetivamente aplicável à conta e distinguir localização da BD de suporte, logs e cópias. |
| Google Calendar | Integração opcional autorizada pelo utilizador, com tokens obtidos via Clerk e revogação no Google. | As permissões concedidas no projeto Google/Clerk não foram alteradas. A consulta de calendário principal de versões anteriores continua descrita na política; não se afirma que só lê eventos do calendário dedicado. |
| OpenStreetMap/Nominatim | [Política de privacidade](https://osmfoundation.org/wiki/Privacy_Policy), condições de API e atribuição. | Serviço externo solicitado facultativamente; localização aproximada continua a ser informação que requer transparência, mesmo sem o IP direto do visitante. |
| Caixa de correio do responsável | Recebe as mensagens enviadas pelo formulário. | Prazo efetivo de guarda, proteção da caixa e contratos aplicáveis dependem da conta do responsável; não se assumiu uma configuração que não foi auditada. |

Não foi necessário nem executado um novo aceite de contratos. A existência do DPA padrão não elimina as obrigações do responsável sobre finalidade, segurança, direitos e transferências concretas. [CEPD — subcontratação](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_pt).

## Obrigações operacionais documentadas

O registo em `PRIVACY-OPERATIONS.md` identifica finalidades, categorias, destinatários, conservação, direitos e resposta a incidentes. É documentação interna do modelo observado; não é uma lista de utilizadores nem deve receber tokens, mensagens ou localizações individuais.

Confirmados em código: estatísticas agregadas apenas com consentimento, controlo de origem das preferências, cookies protegidos, identidade administrativa validada no servidor, validação de assinatura no webhook de eliminação, limpeza dos dados de atividade do utilizador, revogação de subscrições privadas e desativação de push por conta/dispositivo.

O site inspecionado é apresentado como projeto gratuito e não comercial. Não foram detetados pagamentos, publicidade ou intermediação de inscrições. Não se presume por isso dispensa geral de RGPD. A aplicação das obrigações de identificação de atividade económica do [DL 7/2004, artigos 3 e 10](https://diariodarepublica.pt/dr/detalhe/decreto-lei/7-2004-240775) depende do enquadramento real; não se publicaram NIF/morada pessoais sem essa validação. Monetização, patrocínios ou exploração profissional exigem reavaliar este pressuposto.

## Validação técnica desta alteração

`npm test`: 286 testes aprovados, incluindo o comportamento efetivo do cliente PostgreSQL, minimização das respostas geográficas, reserva global entre instâncias, cache, falhas do fornecedor e rejeição de pedidos de outra origem. `npm run lint` e `npm run build` concluídos sem erros. A ligação real de leitura à BD confirmou validação TLS e a limpeza autorizada; o Resend mostrou a opção guardada «Enforced». Não foi enviado email nem testada a localização real de uma pessoa.

## Limites da avaliação

Sem garantia de risco zero, licença presumida das fontes, confirmação de contratos particulares ou parecer jurídico português. Não foram auditados todos os dados, todas as contas/credenciais, todo o histórico Git, backups ou cópias já recebidas por terceiros. As medidas implementadas reduzem riscos concretos; não substituem a apreciação jurídica dos pontos que dependem de factos externos ao código.
