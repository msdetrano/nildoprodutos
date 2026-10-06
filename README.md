# Nildo — Produtos & Utilidades Domésticas

Catálogo PWA com 62 produtos, quatro categorias, gestão em `/gestao` e pedido pelo WhatsApp **+55 14 99643-7437**. Os valores publicados são preços finais por unidade da tabela de venda fornecida. O catálogo inicial tem 55 anúncios ativos: seis apresentações sem preço permanecem ocultas, e uma referência duplicada do amaciante Rende Mais 2L foi ocultada. Não há pagamentos pelo site.

## Publicar o repositório existente na Vercel

1. No painel da Vercel, escolha **Add New → Project → Import Git Repository**.
2. Selecione **msdetrano/nildoprodutos** e clique em **Import**.
3. Use estas configurações:

| Campo | Valor |
|---|---|
| Project Name | `nildoprodutos` |
| Framework Preset | `Other` |
| Root Directory | raiz do repositório, `./` |
| Build Command | `npm run build` |
| Output Directory | `public` |
| Node.js | `22.x` |

O `vercel.json` já define framework, build, pasta pública, rotas e inclusão do catálogo nas funções. Não escolha a pasta `public` como Root Directory: a API está em `api/` na raiz.

**Se aparecer “A repository named nildoprodutos already exists”, você abriu o fluxo de clonar um template. Volte ao painel e use Import Git Repository. Não é necessário criar outro repositório.** Se a lista estiver vazia, use Configure GitHub App e permita acesso a este repositório.

4. Clique em **Deploy**. O catálogo e o WhatsApp funcionam sem banco de dados e sem senha administrativa.
5. Para ativar a gestão, adicione as variáveis abaixo em **Settings → Environment Variables** e faça **Redeploy**:

| Variável | Valor a configurar |
|---|---|
| `ADMIN_PASSWORD` | senha longa e única escolhida por você; nenhuma senha real vem no código |
| `SESSION_SECRET` | segredo aleatório com pelo menos 32 caracteres, diferente da senha |
| `UPSTASH_REDIS_REST_URL` | URL HTTPS REST do seu banco Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | token REST do mesmo banco |
| `WHATSAPP_NUMBER` | opcional: `5514996437437`; o catálogo já usa esse número |

Use Production e Preview conforme os ambientes que utilizar. Não cole segredos no GitHub. Sem Redis, a gestão não pode salvar alterações ou fotos na Vercel. A senha de `/gestao` é exatamente o valor de `ADMIN_PASSWORD`.

O endereço esperado é `https://nildoprodutos.vercel.app`, sujeito à disponibilidade. Confira o domínio atribuído pela Vercel. Depois da importação, novos pushes na branch `main` disparam novos deploys.

## Verificar a publicação

- `/`: busca, categorias e 55 cartões do catálogo inicial.
- `/api/catalog`: JSON público do catálogo.
- `/gestao`: login administrativo; uma senha errada não libera a API.
- `/privacidade`: política de privacidade.
- Adicione produtos, toque em **Enviar pedido** e confira a mensagem no WhatsApp antes de enviá-la.
- Teste salvar um produto na gestão com Redis configurado e confirme a mudança no catálogo.

## Executar localmente

Requer Node.js 22.

```bash
npm ci
cp .env.example .env
# Configure ADMIN_PASSWORD e SESSION_SECRET para testar o painel.
npm run dev
```

Acesse `http://localhost:3000` e `/gestao`. Alterações locais ficam em `data/catalog.local.json`, ignorado pelo Git. Em produção os dados persistem no Redis.

```bash
npm run build
```

O build confere a sintaxe, os arquivos do PWA, a integridade do catálogo e os testes. A validação também roda no GitHub Actions.

## Estrutura

- `public/`: páginas, estilos, carrinho, ícones e service worker.
- `api/`: cinco funções HTTP públicas ou protegidas por sessão.
- `lib/catalog.mjs`: armazenamento, autenticação e validação compartilhados.
- `data/catalog.json`: catálogo inicial.
- `data/aylag-galleries.json`: origem das 60 fotos das quatro galerias Aylag.
- `scripts/`: servidor local e validações.
- `tests/`: testes de catálogo, pedidos, API e cache offline.

O catálogo é um instantâneo com 60 fotos das galerias e dois itens adicionais. As 22 fotos anteriormente sem nome foram identificadas pelos rótulos oficiais e pelo catálogo do fabricante. As referências de pesquisa estão em `data/aylag-galleries.json`. A migração `2026-10-06-retail-v1` aplica os preços finais uma vez aos produtos já salvos e corrige os textos e fotos originais. Depois de salvar pela gestão, os preços editados prevalecem. Textos e fotos personalizados são preservados. As gravações no Redis usam comparação atômica para impedir sobrescrita por sessões concorrentes. As 62 fotos verificadas estão no próprio projeto, em `public/assets/products/`, com os bytes originais preservados. A prévia HTML independente é uma demonstração; a versão para publicar é a pasta `public` junto da API.

O carrinho fica no aparelho do cliente. O service worker guarda apenas a loja e o catálogo público; login e gestão sempre consultam o servidor. O WhatsApp abre com o pedido preenchido, e o cliente confirma o envio no aplicativo.

A coluna Valor venda é arredondada para centavos (meio para cima), sem acrescentar IPI, margem ou frete. Códigos e referências dos valores finais estão em `data/retail-prices.json`; custos de compra não são publicados.
