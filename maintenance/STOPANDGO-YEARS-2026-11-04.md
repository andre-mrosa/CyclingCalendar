# Quarentena e anos das provas Stop and Go

## Limpeza autorizada

Em 4 de novembro de 2026, às 15:56 UTC, foram inventariados os 67 registos então em quarentena e as suas 71 traduções. Foi criada uma cópia local completa, com SHA-256, em `.qa-tools/quarantine-2026-11-04/backup.json`, excluída do Git e da publicação.

A eliminação usou uma transação Serializable com bloqueio dos IDs, verificação de fonte/updatedAt/traduções contra o backup e condição de permanência em quarentena. A transação confirmou 67 eliminações, quarentena vazia e 1 704 provas públicas antes e depois. Não alterou dados pessoais de utilizadores nem provas públicas. O resultado e o inventário ficam na mesma pasta local.

## Auditoria dos anos

Todos os 67 registos antigos tinham sortDate em 2026. Em 13 casos, o próprio título/URL refere 2018–2022; por exemplo, «Ultra Trail do Marão 2019» estava guardado como 2026. Estes registos não tinham lastVerifiedAt/lastVerifiedSource: não são prova de uma nova leitura feita pelo scraper atual. Nas 185 provas públicas com fonte Stop and Go, a comparação de anos explícitos em títulos/URLs não encontrou conflitos, o que por si só não certifica as datas na origem.

O parser atual lê o ano explícito no cabeçalho da prova e não preenche o ano corrente quando este falta. A auditoria encontrou, porém, uma lacuna depois da descoberta: pertencer à listagem ou ter um ano permitido no URL podia permitir importar uma prova cujo ano real ficava fora das épocas pedidas.

A fronteira de gravação passa agora a validar o ano inicial/final lido no cabeçalho contra as épocas solicitadas. Uma prova de 2028 não é importada numa recolha 2026–2027. Intervalos válidos entre dezembro/janeiro são admitidos quando abrangem uma época pedida. Datas sem ano, impossíveis, invertidas ou intervalos de séries continuam por confirmar; o comportamento especial de Date.UTC para anos 0000–0099 não pode transformá-los silenciosamente em 1900–1999.

Testes específicos cobrem anos históricos, HTML com dia/mês/ano separados, título/URL divergentes do cabeçalho, ano ausente, futuro fora do âmbito, anos bissextos e passagem de ano. Também testam o scraper completo com uma listagem que aponta para uma época diferente, verificando que não chega à gravação.

## Limite da validação ao vivo

O estado operacional consultado nesta auditoria regista HTTP 403 de Stop and Go, com nova consulta permitida apenas em 5 de novembro de 2026, às 15:15 UTC. Não foram feitos pedidos diretos adicionais nem tentativas de contornar a recusa. Esta revisão valida o código, regressões e dados guardados; a comparação integral com as páginas de origem continua dependente de a fonte voltar a permitir o acesso.
