# Planner ENEM + IFPE 760+

Planner de estudos em HTML, CSS e JavaScript puro, reorganizado a partir do arquivo `Cronograma_SI_UFRPE_localStorage.html`.

O foco do planejamento é Engenharia da Computação, meta 760+, priorizando redação, matemática, ciências da natureza, TRI, revisão espaçada, questões e simulados.

O cronograma foi recalibrado para início real em `08/07/2026` e o ciclo ativo termina no IFPE estimado em `06/12/2026`. Os tópicos já estudados antes da recalibragem ficam marcados como progresso inicial:

- Origem da vida: Abiogênese e biogênese
- Métodos de separação das misturas

Os conteúdos que ficariam depois do IFPE foram preservados em `data/backlog-pos-ifpe.json`, mas não aparecem como obrigação no planner principal. A fila ativa prioriza ENEM 760+: redação, matemática, ciências da natureza, questões, simulados e revisões.

## Estrutura

```text
/
  index.html
  manifest.json
  service-worker.js
  README.md
  /assets
    icon.svg
  /css
    style.css
    calendar.css
    cards.css
    responsive.css
  /data
    backlog-pos-ifpe.json
    cronograma.json
    disciplinas.json
    estatisticas.json
    pesos-enem.json
    feriados.json
  /js
    app.js
    calendar.js
    progress.js
    storage.js
    dashboard.js
    planner.js
    review.js
    sync.js
    countdown.js
```

## Como Executar

Use um servidor local, porque o app carrega JSON com `fetch`.

```bash
npx serve .
```

Ou, com Python:

```bash
python -m http.server 5173
```

Depois abra `http://localhost:5173`.

## Publicar na Vercel

1. Envie a pasta para um repositório GitHub.
2. Na Vercel, clique em `Add New Project`.
3. Importe o repositório.
4. Framework preset: `Other`.
5. Build command: deixe vazio.
6. Output directory: deixe vazio ou use `.`.
7. Deploy.

## Sincronização via GitHub Gist

O app funciona sem banco de dados. Por padrão, todo o progresso fica no LocalStorage do navegador.

Para sincronizar:

1. Crie um Gist privado no GitHub.
2. Gere um Personal Access Token com permissão para Gists.
3. No painel `Sincronização`, informe o token e o ID do Gist.
4. Clique em `Salvar`.
5. Deixe `Sincronizar automaticamente` marcado.

Depois disso, o app baixa o progresso ao abrir, envia automaticamente quando você marca algo e checa atualizações em segundo plano. Os botões `Enviar` e `Baixar` continuam disponíveis para uso manual.

O token fica salvo apenas no LocalStorage do navegador. O arquivo salvo no Gist se chama `progress.json`.

## Como Editar o Cronograma

O arquivo principal é `data/cronograma.json`. Ele contém apenas o plano ativo até o IFPE.

Cada conteúdo possui:

```json
{
  "id": "conteudo-0001",
  "titulo": "Porcentagem, Juros Simples e Compostos",
  "disciplina": "Matemática",
  "prioridade": "alta",
  "pesoEnem": 5,
  "tempoEstimadoMin": 65,
  "questoes": 30,
  "linksAula": [],
  "status": "nao-iniciado",
  "scheduledDate": "2026-07-09",
  "originalDate": "2026-07-22"
}
```

Para adicionar conteúdo, crie um novo objeto em `conteudos` com os mesmos campos. Use um `id` único.

Para mover uma tarefa, altere `scheduledDate`.

Conteúdos fora do ciclo ativo ficam em `data/backlog-pos-ifpe.json`. Para trazer algum deles para o planner, copie o objeto para `cronograma.json`, escolha uma data até `2026-12-06` e ajuste `scheduledDate`.

Para ajustar prioridade, use:

- `alta`
- `media`
- `baixa`

## Revisão Espaçada

Quando um conteúdo é concluído, o app cria revisões automaticamente:

- D+1
- D+7
- D+30

Essas revisões aparecem no calendário e no painel lateral.

## Datas de Prova

As datas usadas estão em `data/cronograma.json`, dentro de `meta`.

O IFPE 2027.1 está marcado como estimativa herdada do cronograma original:

- ENEM dia 1: `2026-11-08`
- ENEM dia 2: `2026-11-15`
- IFPE: `2026-12-06`

Quando houver edital oficial, edite esses campos.
