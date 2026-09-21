# Relatório de QA e Auditoria Completa: Cycling Calendar 🔎

Após uma análise profunda ("a pente fino") a toda a arquitetura da aplicação, base de dados, SSR/Client Components, Scrapers, rotas de API e lógica de unificação, identifiquei vários problemas (desde bugs críticos a oportunidades de melhoria de UX e compliance). 

Nenhum destes anula os pontos do teu atual `SITE_REVIEW.md` (que foca muito na UI/UX), mas aprofundam questões sistémicas que podem causar *crashes* na aplicação e problemas de dados a médio prazo.

---

## 🛑 P0: Riscos de Crash e Segurança (Crítico)

### 1. Crashes Silenciosos (500 Error) nas Páginas das Provas
**Local:** `app/events/[id]/page.js` (linhas 77 e 79)
**Problema:** O código utiliza `JSON.parse(event.extraLinks)` e `JSON.parse(event.gpxData)` sem qualquer bloco `try/catch`. Embora os scrapers gravem JSON válido, se um administrador alterar a base de dados manualmente e esquecer-se de uma aspa, ou se uma migração parcial falhar, o JSON torna-se inválido.
**Consequência:** A página da prova crasha completamente (Erro 500) para todos os utilizadores que tentarem abrir aquele evento específico.
**Solução:** Envolver os parses num `try/catch` seguro:
```javascript
let extraLinks = [];
try { extraLinks = typeof event.extraLinks === 'string' ? JSON.parse(event.extraLinks) : event.extraLinks || []; } catch { }
```

### 2. DDoS e Database Bloat no Tracker Analítico
**Local:** `app/api/analytics/track/route.js`
**Problema:** A rota de POST que capta a telemetria/analítica não tem autenticação, validação rígida ou *rate-limiting*.
**Consequência:** Um bot ou utilizador malicioso pode fazer um loop com um script simples para enviar 1.000 requests por segundo, criando milhões de `AnalyticsSession` na base de dados (`prisma.analyticsSession.upsert`), esgotando as ligações do PostgreSQL (Connection Pool Exhaustion) e o armazenamento.
**Solução:** Implementar um Rate Limit básico no Edge ou via Upstash Redis (ex: máx. 20 pings por minuto por IP) e limitar o tamanho das strings.

---

## ⚠️ P1: Lógica de Negócio e Compliance (Elevado)

### 3. Fuga de Dados Pessoais (GDPR) após Eliminação de Conta
**Local:** `app/api/webhooks/clerk/route.js` (linha 53)
**Problema:** Quando o utilizador elimina a conta, o webhook assinala a `AccountDeletionRequest` como "PROCESSED". No entanto, a tabela `AnalyticsSession` mantém os campos `userId` e `userEmail` preenchidos com o rasto exato de cliques desse utilizador.
**Consequência:** Violação dos princípios de minimização de dados do RGPD (Direito ao Esquecimento).
**Solução:** Quando o evento `user.deleted` chega, deves fazer *anonymize* das sessões:
```javascript
await prisma.analyticsSession.updateMany({
    where: { userId },
    data: { userId: null, userEmail: null }
});
```

### 4. Falha Matemática no Algoritmo de Deduplicação
**Local:** `app/lib/merging/eventMatcher.js` -> `calculateTokenSimilarity()`
**Problema:** A verificação de *sub-palavras* no Jaccard Index adiciona `0.8` aos tokens semelhantes. No entanto, se o candidato tiver a palavra `"granfondo"`, mas a prova original tiver `"gran"`, `"fon"`, e `"do"`, o ciclo `for` interno fará *match* com o mesmo token múltiplas vezes.
**Consequência:** Um evento que não tenha nada a ver com o outro pode atingir um coeficiente de similaridade altíssimo (`>1.0` antes de ser capado) devido a contagens duplicadas.
**Solução:** Os tokens que já deram `match` no Set `tokens2` devem ser removidos (`tokens2.delete(t2)`) mal façam o primeiro *match*.

### 5. Falsos Positivos ao Fazer Merge por Localidade (O Efeito "BTT")
**Local:** `app/lib/merging/eventMatcher.js` -> `loc1.includes(loc2)`
**Problema:** O texto extraído em `existingEvent.details` inclui muitas vezes a disciplina (ex: `"Azabuxo | BTT"`). O filtro `normalizeText` não limpa a palavra `"BTT"`. Logo, se a prova candidata apenas disser `"BTT"`, a localização `loc1` fará *include* em `loc2`.
**Consequência:** Provas em locais completamente diferentes no mesmo dia podem ser fundidas se ambas tiverem apenas `"BTT"` ou `"Estrada"` nas suas *details*.
**Solução:** Remover disciplinas (`xcm, xco, btt, estrada, gravel, pista`) do comparador de localidade em `normalizeText` quando se está a calcular localização.

---

## 🔧 P2: Bugs Subtis e Performance (Médio)

### 6. Incompatibilidade de Browser com `AbortSignal` (Crashes no Frontend)
**Local:** `app/components/CalendarView.js` (linha 33)
**Problema:** A rota utiliza `fetch(url, { signal: AbortSignal.timeout(15000) })`. O `AbortSignal.timeout` é relativamente recente e não existe nativamente no iOS/Safari <= 15.4. Uma vez que corre no Client Component, os utilizadores em iPhones com 2 anos vão ver o site em ecrã branco (Erro de JS).
**Solução:** Utilizar um `AbortController` com `setTimeout` (comportamento 100% retro-compatível):
```javascript
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), 15000);
const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
```

### 7. Bloco Catch Silencioso nas Classificações
**Local:** `app/lib/scrapers/classificacoes.js` (linhas 247 e 252)
**Problema:** Os blocos `try { JSON.parse() } catch (e) {}` estão vazios. 
**Consequência:** Se o esquema do JSON do portal `classificacoes.net` mudar as respostas de um array de links para um objeto, a variável permanecerá vazia e a integração vai falhar em silêncio. Um administrador nunca vai saber que o scraper parou de obter links porque não há *logs*.
**Solução:** Usar `logError` (como fazes no resto da app) mesmo nestes *try/catch* periféricos.

### 8. Consultas de Base de Dados sem Indexação ('LIKE' cego)
**Local:** `app/api/events/route.js`
**Problema:** Para filtrar por "Fonte" ou "Ano", são usados queries pesados `source: { contains: src }` e `date: { contains: year }`. 
**Atenuante:** Felizmente, o cabeçalho `'Cache-Control': 'public, s-maxage=300'` permite ao Vercel Edge atenuar o problema. No entanto, se tiveres uma quebra de *cache*, a base de dados vai sofrer um pico de CPU ao fazer varrimento integral à tabela.
**Solução:** Armazenar o ano de realização num campo `Int` indexado `year` para facilitar os pedidos diretos.

---
