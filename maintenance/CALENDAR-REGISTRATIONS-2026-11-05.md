# Inscrições na vista de calendário pessoal

As minhas provas, na vista Calendário, mostra as aberturas e os fechos de inscrições efetivamente guardados no Google Calendar. A data e a hora vêm da entrada Google, convertidas para Europe/Lisbon, e não da data da prova nem de uma previsão mais recente ainda não exportada. Só aparecem entradas identificadas pela app; inscrições apenas anunciadas na fonte não são adicionadas automaticamente.

O mês e cada dia mostram inscrições com um estilo distinto das provas. Ao selecionar um dia, a lista de inscrições mostra o tipo, a hora e a ligação à prova. Na apresentação mobile existe um indicador próprio. As inscrições aparecem tanto em Todas as provas como em Google Calendar, mesmo se só o lembrete estiver guardado e a prova não. Os filtros usam a data do lembrete, incluindo quando a abertura ocorre no ano anterior à prova. Os contadores e as exportações de provas continuam a referir-se às provas.

Identificadores antigos com underscore e novos com hífen são reconhecidos. Aliases da mesma prova no mesmo dia/hora são deduplicados. Aberturas mensais mantêm indicação de previsão. Entradas Google de dia inteiro continuam a ser mostradas como tal, sem inventar uma hora.

A cópia offline pessoal guarda apenas identificação, tipo, título, data e hora das inscrições da última sincronização. Trocar de conta ou sair limpa esta cópia juntamente com os estados pessoais. O leitor offline mostra os lembretes na vista de calendário pessoal.

Testes cobrem datas independentes da prova, inscrições sem prova exportada, exclusão de inscrições não guardadas, aliases, deduplicação, mudança de ano, filtros, hora de verão e limpeza das cópias pessoais.
