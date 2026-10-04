# Nildo — Produtos & Utilidades Domésticas

Catálogo digital **PWA instalável**, acessível e responsivo, com carrinho de compras e envio de pedido pelo WhatsApp. Inclui painel de gestão em `/gestao` com autenticação, cadastro/edição/exclusão de produtos, preço, várias fotos, categorias, visibilidade, destaques e configuração do número do WhatsApp. **Não cobra pagamentos pelo site.**

## Prévia local (Node.js 20+)

```bash
cp .env.example .env
# Edite .env e defina ADMIN_PASSWORD e SESSION_SECRET (mínimo 32 caracteres).
npm run dev
# Acesse http://localhost:3000
# Gestão: http://localhost:3000/gestao
npm test
```

Sem o Redis configurado, o ambiente local usa `data/catalog.local.json` para armazenar alterações. Esse arquivo é ignorado pelo Git. O catálogo inicial está em `data/catalog.json`.

## Colocar na Vercel (recomendado)

1. O projeto está em https://github.com/msdetrano/nildoprodutos, com os arquivos na raiz. NÃO envie seu `.env`.
2. Na Vercel: **Add New → Project → Import Git Repository**. Selecione o repositório e configure Framework Preset como **Other**; não há build obrigatório, pois a interface está em `public/` e a API usa Node.js Serverless em `api/`.
3. Crie um banco **Upstash Redis** (plano gratuito disponível, conforme condições do fornecedor) e copie as credenciais REST. Na Vercel → Project Settings → Environment Variables, configure:

| Variável | Uso |
|---|---|
| `UPSTASH_REDIS_REST_URL` | endpoint HTTPS REST do Redis |
| `UPSTASH_REDIS_REST_TOKEN` | token REST secreto do Redis |
| `ADMIN_PASSWORD` | sua senha longa e única para `/gestao` |
| `SESSION_SECRET` | segredo aleatório com pelo menos 32 caracteres, diferente da senha |
| `WHATSAPP_NUMBER` | número inicial do Nildo: `5514996437437`. Também configurável pela gestão |

4. Faça o deploy. Abra `https://nildoprodutos.vercel.app/gestao` e entre com sua senha; confirme o WhatsApp pré-configurado (+55 14 99643-7437) e edite os preços dos produtos.
5. Em Vercel → Domains, cadastre `nildoprodutos.vercel.app`, se o nome estiver disponível na sua conta. O projeto não reserva esse domínio automaticamente.

**Importante:** em produção o catálogo inicial funciona sem Redis, mas o painel só permite salvar produtos, fotos e configurações quando o Redis está conectado. Isso evita perder alterações no sistema de arquivos temporário da Vercel.

### Git

```bash
git init
git add .
git commit -m "feat: catálogo PWA Nildo com painel de gestão e pedidos WhatsApp"
git branch -M main
git remote add origin https://github.com/msdetrano/nildoprodutos.git
git push -u origin main
```

## Como funciona

- Loja: busca tolerante a acentos; filtros por categoria; classificação; fonte ajustável; detalhes com galeria; botão **Adicionar ao pedido**; botão flutuante **Enviar pedido** sempre visível (com quantidade), inclusive no celular; carrinho com quantidades e totais estimados; botão de WhatsApp gera mensagem com todos os itens e observações.
- Na página de detalhes, **Pedir somente este** envia um único produto sem usar o carrinho.
- Produto sem valor tem o aviso **Consulte o preço**. O Nildo confirma o valor final com o cliente no WhatsApp.
- Gestão: senha no servidor, sessão em cookie HTTPOnly/SameSite Strict, proteção básica contra tentativas de senha e validações na API. O conteúdo pode ser editado por qualquer dispositivo com a senha.
- Fotos: escolha imagens do aparelho (compactação local e armazenamento Redis por imagem) ou informe URLs HTTPS. Máximo de oito fotos por item.
- PWA: `manifest.webmanifest`, ícones 192/512, service worker para catálogo consultável offline após a primeira visita. Em Android, normalmente é possível usar **Instalar**. No iPhone: menu Compartilhar → Adicionar à Tela de Início.
- Dados do carrinho ficam apenas no navegador do cliente. Nenhum pagamento ou conta de usuário é coletado. O nome e a observação só entram na mensagem do WhatsApp quando informados.

## Catálogo Aylag: quatro galerias verificadas

O projeto contém **62 cartões**, dos quais **60 representam todas as fotografias de produto carregadas nas quatro páginas indicadas** (não inclui banners de divulgação) e **2 são itens adicionais anteriormente identificados na página inicial da Aylag**.

| Galeria do fabricante | Fotos capturadas |
|---|---:|
| https://www.aylag.com.br/casa-limpeza | 25 |
| https://www.aylag.com.br/lavanderia | 14 |
| https://www.aylag.com.br/automotivo-profissional | 8 |
| https://www.aylag.com.br/cosmeticos | 13 |
| **Total** | **60** |

**Limite da origem:** 38 fotos possuem identificação textual confiável; **22 outras aparecem na galeria do Wix sem nome/volume acessível**. As 22 entram como cartão de foto com referência Cxx/Lxx/Axx/Sxx, aviso **Verificar apresentação** e foto oficial. O cliente pode pedi-las usando esse código, e o pedido de WhatsApp inclui o link da imagem para o Nildo identificar. O Nildo deve alterar os nomes e tamanhos na Gestão quando os conferir na embalagem/material do fabricante. Nenhum nome ou preço foi fabricado. Veja `data/aylag-galleries.json` com origem, código, URL e nível de identificação de cada fotografia.

A Aylag menciona no site possuir mais de 100 itens no portfólio completo, mas isso **não significa que mais de 100 fotografias estejam carregadas nas quatro páginas fornecidas**. A área de marketing do fabricante também disponibiliza fotos/catálogo para divulgação em https://www.aylag.com.br/download-produtos. Fotos externas dependem de o fabricante manter os endereços Wix. A atualização é um instantâneo, não uma sincronização automática.

## Estrutura

```text
public/                  # PWA, página inicial, painel, estilos e ícones
api/catalog.js            # catálogo público
api/auth.js               # login, sessão, sair
api/admin/products.js     # CRUD + configurações (protegido)
api/admin/upload.js       # upload protegido e compactado
api/image.js              # imagens salvas no Redis
api/_lib.mjs              # armazenamento, validação, autenticação
data/catalog.json         # 62 cartões: 60 fotos das galerias + 2 extras
scripts/dev.mjs           # servidor local sem dependências
scripts/seed.mjs          # confere a integridade do catálogo de fotos
```

## Segurança e limitações

O fluxo só **abre o WhatsApp com o pedido preenchido**; o cliente deve conferir e apertar enviar. Não existe checkout nem confirmação automática do recebimento. O botão de pedido só é liberado depois que o número válido for configurado. Cadastros e fotos novos precisam de Redis na Vercel. Não exponha `.env`, segredo de sessão ou token Redis no HTML/GitHub. Em caso de muito volume de fotos, considere futuramente migrá-las para Vercel Blob ou outro armazenamento dedicado.

Há uma página explicativa em `/privacidade` e uma validação automática no GitHub Actions (`.github/workflows/ci.yml`). A arte promocional opcional está em `public/img/divulgacao.png`; ela é ilustrativa e não representa uma lista de preços reais.

## Prévia independente (sem publicar)

O arquivo `PREVIA_INTERATIVA.html` na raiz pode ser aberto diretamente em um navegador para conhecer o catálogo, busca, carrinho e o novo botão fixo **Enviar pedido**. Esta demonstração usa os mesmos 62 cartões atuais e não oferece a edição real de `/gestao`; para testar a gestão execute `npm run dev`. As fotos vêm das URLs públicas do fabricante e dependem de acesso à internet.

A página pública foi simplificada para apresentar busca, categorias, catálogo e botão flutuante de envio já na primeira dobra da tela.
