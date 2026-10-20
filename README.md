# Folha de campo — coleta de pontos (GGC/SES-CE) · publicação web

Esta pasta contém a folha de coleta de pontos e o planejador da campanha, prontos
para serem publicados no GitHub Pages. Os arquivos são:

- `index.html`: a folha de campo, para o celular. É o endereço principal e pode ser
  instalada como aplicativo;
- `planejador.html`: o planejador da campanha, para o computador do escritório;
- `sw.js`: o service worker, que guarda a folha no aparelho para abrir sem internet;
- `manifest.webmanifest`: permite instalar a folha na tela inicial;
- `icone-192.png` e `icone-512.png`: os ícones.

**O que fica público:** só o código da folha. Nenhum dado de campanha, ponto
planejado, chave ou foto vai para o repositório. Os dados ficam no celular e, com
internet, seguem para o receptor do Drive institucional (ver abaixo).

## 1. Publicar (uma vez)

1. Use uma conta ou organização **institucional** no GitHub, a combinar com a DTI.
2. Crie um repositório público, por exemplo `folha-coleta-ggc`.
3. *Add file > Upload files*: envie todos os arquivos desta pasta.
4. *Settings > Pages > Build and deployment*: *Source* = *Deploy from a branch*;
   *Branch* = `main`, pasta `/ (root)`; *Save*.
5. Em alguns minutos a folha fica em `https://<conta>.github.io/folha-coleta-ggc/`.

**Publicação atual (fase de teste):** organização `coleta-campo`, repositório
`folha-coleta-ggc`:

- folha de campo: https://coleta-campo.github.io/folha-coleta-ggc/
- planejador: https://coleta-campo.github.io/folha-coleta-ggc/planejador.html

## 2. Atualizar

1. Rode `gera_github.py`. Ele refaz esta pasta a partir de `folha_coleta_pontos.html`
   e de `planejador_campanha.html`.
2. Copie os arquivos para a cópia local do repositório (clone do GitHub Desktop, fora
   do Google Drive): `F:\DRONES_ODM_GOV\FERRAMENTAS_CAMPO\folha-coleta-ggc\folha-coleta-ggc`.
3. No GitHub Desktop: escreva o resumo da mudança, **Commit to main** e **Push origin**.
   Sem o Desktop, dá para reenviar `index.html`, `planejador.html` e `sw.js` pela página
   do repositório (*Add file > Upload files*).
4. O site muda em 1 a 2 minutos. Cada aparelho confere a versão sempre que abre a
   folha com internet.

## 3. Quem usa e como

**Escritório:** abre `https://coleta-campo.github.io/folha-coleta-ggc/planejador.html` no
Chrome do computador e não baixa nada. Carrega os pontos, prepara o mapa offline,
planeja a campanha e gera a **folha de cada equipe**, um arquivo `.html` com os
pontos, o mapa da região e o código do receptor. Esse arquivo segue para a equipe
pelo Drive, Teams ou WhatsApp.

**Equipe de campo:** abre `https://coleta-campo.github.io/folha-coleta-ggc/` no Chrome do
celular. Com a folha vazia, aparece **Abrir a folha da equipe**: a equipe escolhe o
`.html` recebido, e pontos, mapa e código do receptor passam para o aparelho.

O planejador e a folha guardam os dados separados: abrir um não mexe no outro.

## 4. No celular

1. Abra o endereço no Chrome, **com internet**, uma vez.
2. Menu ⋮ > *Instalar app* (ou *Adicionar à tela inicial*).
3. Daí em diante a folha abre pelo ícone, com ou sem internet. A coleta continua
   gravada no aparelho, como antes.

**Localização:** aberta por `https://`, a folha pede a permissão de localização
normalmente. O bloqueio da folha aberta como arquivo (`content://`) não acontece.

**Endereço novo = armazenamento novo.** O que estava na folha aberta como arquivo
não aparece no endereço publicado. Para levar os dados:

1. Na folha antiga: *Cópia completa*.
2. Na folha publicada: *Fechar o dia > Retomar ou trocar de aparelho > Abrir um
   registro salvo*, e escolha o ZIP.
3. Carregue de novo o pacote do mapa da área.

## 5. Receptor do Drive (envio dos dados)

O arquivo `receptor_folha_drive.gs` é um Apps Script. Ele recebe os arquivos que a
folha envia e grava na pasta da campanha, separados por equipe:

    <pasta>/<Equipe_NN>/LCnnn/...                 o pacote LC, no arranjo de entrega
    <pasta>/<Equipe_NN>/_registros/<aparelho>/    registro.json e trilhas com hora

A instalação passo a passo está no cabeçalho do próprio `.gs`. Em resumo:

1. Crie a pasta no Drive institucional.
2. Crie o projeto Apps Script e cole o código.
3. Defina a propriedade `PASTA_RAIZ`.
4. Rode `testeReceptor`.
5. Implante como *Aplicativo da Web* (*Executar como: Eu*; *Quem pode acessar:
   Qualquer pessoa*).
6. Defina `URL_RECEPTOR` (o endereço `/exec`) e rode `codigoCoordenacao`: o registro
   mostra o **código da coordenação** (`GGC-COORD:…`).

**No planejador**, uma vez por computador: *Folhas das equipes > Envio ao Drive* e
cole o código da coordenação. Cada folha de equipe gerada daí em diante já sai com a
chave dela, calculada na hora a partir do código LC e do número da equipe
(HMAC-SHA256; KRAWCZYK; BELLARE; CANETTI, 1997). Não há nada a cadastrar no receptor
por campanha ou por equipe. O segredo da coordenação fica só no receptor e no
navegador do planejador. A folha da equipe leva só a chave dela, que vale só para o
seu LC e a sua equipe.

**No celular:** *Fechar o dia > Enviar ao servidor*, *Testar a ligação* e *Enviar ao
servidor*. Não há código a digitar.

**Como o envio funciona:**

- O que já foi enviado e não mudou não sai de novo.
- Arquivo grande vai em partes de 6 MB.
- Se a conexão cair, toque de novo e só o que faltou é mandado.
- Arquivo de mesmo nome é substituído; o anterior vai à lixeira do Drive.

**Cuidados**

- A pasta deve ficar em conta ou drive compartilhado **institucional**, com acesso
  restrito à coordenação. Não use conta pessoal.
- O código da coordenação não vai para o repositório nem para grupos de mensagens.
  Cada equipe recebe só a sua chave, dentro da folha dela.
- Fotos de campo podem mostrar pessoas e imóveis. O tratamento segue a POSIC do
  IBGE e a LGPD. A hospedagem e o receptor passam pela validação da DTI (seção 12
  do documento *Padrão de dados das campanhas LC*).

## Referência

KRAWCZYK, H.; BELLARE, M.; CANETTI, R. **HMAC**: keyed-hashing for message
authentication. RFC 2104. [S. l.]: IETF, 1997. Disponível em:
https://www.rfc-editor.org/rfc/rfc2104. Acesso em: 20 out. 2026.
