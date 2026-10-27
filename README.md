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
pontos, o mapa da região e o código do receptor. Gerada a folha, o botão
**Compartilhar a folha da equipe** abre a janela de compartilhar do Windows com o arquivo
já anexado e um texto com as instruções de abertura: escolha o **Teams** (o arquivo fica no
OneDrive institucional, só para quem está no chat) ou o Outlook, e os destinatários. Os
destinatários não vêm preenchidos e o envio é seu. Em navegador sem esse recurso, o botão não
aparece e vale o arquivo baixado. O anexo não é protegido pelo PIN: a equipe o apaga depois de
abrir a folha no celular.

**Equipe de campo:** abre `https://coleta-campo.github.io/folha-coleta-ggc/` no Chrome do
celular. Com a folha vazia, aparece **Abrir a folha da equipe**: a equipe escolhe o
`.html` recebido, e pontos, mapa e código do receptor passam para o aparelho.
Na primeira abertura, a folha pede para **criar o PIN de 6 dígitos da equipe**; daí em diante, pede o PIN a
cada abertura e depois de 10 minutos sem uso (ver *Segurança dos dados no celular*, no fim).

**Replanejamento:** o escritório gera de novo a folha da equipe e a envia. No celular,
no alto da folha: *Abrir a folha nova da equipe*. Sendo a mesma campanha e a mesma
equipe, trocam os pontos planejados, o plano, as rotas, o mapa e a viatura; a coleta já
feita (pontos, fotos, trilhas, hodômetro) fica no aparelho.

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

**Fase de teste:** o receptor está numa conta Google pessoal. Todas as equipes, de
qualquer unidade, enviam para a mesma pasta, com um único código da coordenação.

**Pendência:** a adoção pede um repositório comum e institucional do IBGE, na solução
Microsoft 365 (SharePoint ou OneDrive institucional). A folha não depende do Google:
basta um receptor no ambiente Microsoft que siga o mesmo protocolo e grave pelo envio
retomável da API Microsoft Graph. A definição é com a DTI.

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

## Calendário do campo (fim de semana e feriados)
- No planejador: **Início** e **Fim da campanha**, **Dias de deslocamento** na ida e na volta (0 a 5, dias corridos no começo e no fim do período; 0 = sem deslocamento), **Dias de reserva** (manutenção do carro ou remedições: os últimos dias úteis antes da volta), **Fim de semana** (padrão: sem atividades; opções sábado, sábado e domingo), **Feriados** (padrão: sem atividades em feriados e pontos facultativos federais; opções: ponto facultativo é dia de campo; trabalho também em feriados) e **Feriados municipais da área** (um por linha, `dd/mm` ou `dd/mm/aaaa Nome`).
- Nacionais calculados: Lei nº 662/1949 (red. Lei nº 10.607/2002), Lei nº 6.802/1980, Lei nº 14.759/2023, Lei nº 9.093/1995 (Sexta-feira da Paixão; Páscoa por Meeus/Jones/Butcher). Pontos facultativos: Carnaval, Cinzas, Corpus Christi, 28/10, 24 e 31/12 e as emendas da portaria do ano (2026: Portaria MGI nº 11.460/2025, 20/04 e 05/06). Conferir a portaria de cada ano novo.
- Estaduais pela UF da campanha: CE 25/03 (Data Magna); RN 03/10 (Lei estadual nº 8.913/2006). Outras UF: informar na lista municipal.
- Os dias do plano recebem data; início e fim da campanha são preenchidos; no celular, o Plano do dia avisa fim de semana/feriado ou mostra "Hoje é o Dia N".
- O calendário vai na folha da equipe: gerar de novo as folhas das equipes depois de mudá-lo.

## Segurança dos dados no celular (PIN da folha)
- A folha de campo (não o planejador) pede um PIN de 6 dígitos na primeira abertura e a cada abertura. Sem PIN fraco (todos iguais ou em sequência).
- Criptografados no aparelho (AES-256-GCM; chave de dados aleatória, embrulhada pela chave do PIN — PBKDF2-HMAC-SHA-256, 600 000 iterações, sal aleatório): registro (campanha, integrantes, veículo, chave de envio), fotos, originais, RINEX/PPP, trilhas, sugestões dos campos. Não criptografados: mapa da área, blocos Esri, trajetos planejados.
- Tranca sozinha: 10 min sem uso (não com a navegação aberta) ou 2 min fora da tela; botão Trancar na barra. Com envio ou trilha rodando, só cobre a tela (o trabalho segue).
- 5 PINs errados: espera de 30 s, dobrando até 5 min. "Esqueci o PIN" apaga os dados da folha no celular (o kit da equipe reaplica o plano ao reabrir).
- Dados antigos sem PIN são criptografados na criação do PIN.
- Limpeza após envio conferido: dos dias arquivados, apaga fotos originais e RINEX (só de pontos com PPP) cuja cópia no Drive foi confirmada (tamanho + FNV-1a). Fotos de 1280 px ficam. Nomes reservados e editadas não refeitas, para nada no Drive ser sobrescrito.
- Continua exposto: arquivos exportados na pasta Download e o próprio HTML da folha da equipe (traz o plano e os integrantes).

## Formulário de campo da CCAR (versão 6)
- A folha preenche o formulário "Determinações GNSS – registro de dados de campo" (versão 6) com o que registrou e o grava no pacote como `Formulários/PPPP_Form.jpg`; também sai em PDF ou imagem pelo cartão do ponto (*Mais deste ponto*).
- Do registro: projeto, campanha, estação, arquivo de dados, localidade, município/UF, operadores, data, dia juliano, receptor e antena com nº de série (cabeçalho do RINEX), taxa, estático/PPP, tipo de ponto (checagem marca o controle conforme o uso), horários, altura no início e no fim, descrição, fotos, croqui e situação.
- Digitado no cartão: PDOP de início (etapa 1) e de fim (etapa 3), coordenada de término lida na tela do receptor (etapa 3; em branco, vale a do celular, medida sozinha ao iniciar a ocupação, com observação) e o diagrama de altura da antena (etapa 1; repete o do ponto anterior).
- Faixa, Foto e Folha MI ficam em branco (outro tipo de planejamento). O relatório do ponto segue no PDF dos relatórios dos pontos.

## Atuação em campo (o que a equipe faz)
A folha da equipe abre no **Dia de campo**. O trabalho se resume a três telas:
1. **Hoje** (no alto): os pontos do dia do plano, com ✓ nos coletados, e o botão **Navegar até** o próximo. Sem plano do dia montado no hotel, vale o dia de hoje no plano da campanha; os pendentes de dias anteriores aparecem abaixo. Em dia sem atividades, de reserva ou fora da campanha, só o pendente mais perto.
2. **Navegação**: ao chegar, **Cheguei — começar o ponto aqui** (fica verde perto do ponto).
3. **Cartão do ponto**, em três etapas: **1** altura e montagem da antena, PDOP no início, **Iniciar a ocupação** (a posição do celular é medida sozinha); **2** enquanto o receptor rastreia, as fotos F1–F4 num toque só (a câmera fica aberta e pede uma depois da outra — norte, sul, oeste, leste —, dizendo de onde ficar e para onde apontar; *Parar* interrompe e *Continuar as fotos* retoma de onde parou), a vista de cima e a descrição; **3** ao terminar, PDOP no fim, coordenada de término e **Terminar e navegar ao próximo**.

O que o sistema deduz ou se faz no hotel — identificador, tipo, finalidade, materialização, município, receptor, antena, horários do rastreio, PPP, temperatura, relatório do ponto, formulário, remover — fica em **Mais deste ponto**, fechado.

**No hotel**, aba *Fechar o dia*, em 4 passos: **1** ler os RINEX do dia; **2** completar com a internet (município e relatórios); **3** enviar ao servidor; **4** ocorrências e arquivar o dia. Arquivos para baixar, IBGE-PPP, PIN e troca de aparelho ficam em quadros fechados abaixo.
