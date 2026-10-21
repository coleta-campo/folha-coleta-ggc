/**
 * Receptor da folha de coleta de pontos GNSS — IBGE · SES-CE · GGC
 * ------------------------------------------------------------------
 * Recebe os arquivos que a folha de campo envia (botão "Enviar ao servidor") e
 * os grava numa pasta do Google Drive, separados por equipe:
 *
 *   <PASTA_RAIZ>/<Equipe>/LCnnn/...            (o pacote LC, no arranjo de entrega)
 *   <PASTA_RAIZ>/<Equipe>/_registros/<aparelho>/registro.json, trilha_<dia>.json
 *
 * Instalação (uma vez, pela coordenação da campanha):
 *  1. Numa conta/drive compartilhado INSTITUCIONAL, crie a pasta que recebe e
 *     copie o ID dela (o trecho do endereço depois de /folders/).
 *  2. script.google.com > Novo projeto > cole este arquivo em Código.gs.
 *  3. Configurações do projeto > Propriedades do script: PASTA_RAIZ = <ID da pasta>.
 *  4. Executar > testeReceptor (autoriza o acesso ao Drive e confere a pasta).
 *  5. Implantar > Nova implantação > Aplicativo da Web:
 *       Executar como: Eu · Quem pode acessar: Qualquer pessoa
 *     ("Qualquer pessoa" é necessário porque a folha não envia login Google; quem
 *      protege a pasta é a chave de cada equipe. O receptor só grava: não lista nem
 *      devolve arquivo nenhum.)
 *  6. Propriedades do script: URL_RECEPTOR = <o endereço que termina em /exec>.
 *     Executar > codigoCoordenacao: o registro mostra o CÓDIGO DA COORDENAÇÃO
 *     (GGC-COORD:…). Cole-o UMA VEZ no planejador (Folhas das equipes > Receptor do
 *     Drive). Daí em diante, cada folha de equipe gerada pelo planejador já sai com a
 *     chave dela, calculada na hora a partir do código LC e do número da equipe:
 *     nada a cadastrar aqui por campanha nem por equipe, e nada a digitar em campo.
 *  7. A cada nova versão deste código: Implantar > Gerenciar implantações > editar >
 *     Nova versão (o endereço /exec continua o mesmo).
 *
 * Chaves das equipes: chave = HMAC-SHA256(SEGREDO, "LCnnn|Equipe_NN"), em hexadecimal,
 * 40 primeiros caracteres (código de autenticação de mensagem; KRAWCZYK; BELLARE;
 * CANETTI, 1997, RFC 2104). O SEGREDO fica só aqui e no planejador da coordenação;
 * a folha da equipe leva apenas a sua chave, que vale só para o seu LC e a sua equipe.
 * Chaves fixas em CHAVES = {"<chave>":"Equipe_01", …} continuam aceitas.
 *
 * Protocolo (POST, corpo JSON em texto simples):
 *   {acao:'ping', chave, lc, equipe}                       -> {ok, equipe, pasta, versao}
 *   {acao:'arquivo', chave, caminho, tipo, id, parte, partes, ini, bytes, b64}
 *     parte única: grava direto; várias partes (arquivo > 6 MB): envio retomável
 *     da API do Drive, uma parte por pedido, sem juntar o arquivo na memória.
 *   Arquivo com o mesmo nome na mesma pasta é substituído (o anterior vai à lixeira).
 *   {acao:'expande', chave, u}                             -> {ok, url, nome, lat, lon}
 *     abre o link curto do Google Maps (maps.app.goo.gl) do hotel e devolve o endereço
 *     longo, de onde saem o nome e as coordenadas (o navegador não pode segui-lo: CORS).
 *     Chave: a da coordenação (HMAC do SEGREDO com "COORD|expande") ou a de uma equipe.
 *     Só segue links do Google Maps; não grava nada. Pede a permissão "Conectar a um
 *     serviço externo" (UrlFetchApp) na primeira execução.
 */
const VERSAO_RECEPTOR = '1.2';
const PARTE_MAX = 8 * 1024 * 1024;                 // bytes por pedido (a folha manda 6 MB)
const INICIO_OK = /^(LC[0-9X]{1,6}|_registros)$/;  // primeira pasta aceita no caminho

function doGet(){ return _json({ok: true, servico: 'receptor da folha de coleta de pontos', versao: VERSAO_RECEPTOR}); }

function doPost(e){
  try {
    const q = JSON.parse(e && e.postData && e.postData.contents || '{}');
    if (q.acao === 'expande'){
      const seg = PropertiesService.getScriptProperties().getProperty('SEGREDO');
      if (!(seg && _iguais(_chaveDe(seg, 'COORD', 'expande'), String(q.chave || ''))) && !_equipe(q))
        return _json({ok: false, erro: 'chave não reconhecida'});
      return _json(_expande(String(q.u || '')));
    }
    const eq = _equipe(q);
    if (!eq) return _json({ok: false, erro: 'chave da equipe não reconhecida'});
    if (q.acao === 'ping') return _json({ok: true, equipe: eq.equipe, lc: eq.lc || '', pasta: _raiz().getName(), versao: VERSAO_RECEPTOR});
    if (q.acao === 'arquivo') return _json(_arquivo(q, eq));
    return _json({ok: false, erro: 'ação desconhecida'});
  } catch (err){
    console.error(err);
    return _json({ok: false, erro: String(err && err.message || err)});
  }
}

/* link do Google Maps -> {url longo, nome do lugar, lat, lon} */
const MAPS_OK = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i;
function _expande(u){
  if (!MAPS_OK.test(u) || u.length > 2000) return {ok: false, erro: 'não é um link do Google Maps'};
  let url = u;
  for (let i = 0; i < 6 && /^https:\/\/(maps\.app\.goo\.gl|goo\.gl)\//i.test(url); i++){
    const r = UrlFetchApp.fetch(url, {followRedirects: false, muteHttpExceptions: true});
    const h = r.getHeaders(), loc = h.Location || h.location;
    if (!loc) break;
    url = String(loc);
    const cont = url.match(/^https:\/\/consent\.google\.[a-z.]+\/.*[?&]continue=([^&]+)/i);   // tela de consentimento
    if (cont) url = decodeURIComponent(cont[1]);
  }
  if (!MAPS_OK.test(url)) return {ok: false, erro: 'o link não levou ao Google Maps'};
  const o = {ok: true, url: url, nome: '', lat: null, lon: null};
  const pl = url.match(/\/maps\/place\/([^\/@?]+)/);
  if (pl){ const n = decodeURIComponent(pl[1].replace(/\+/g, ' ')).trim(); if (!/^-?\d|°/.test(n)) o.nome = n; }
  const m = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
    || url.match(/\/maps\/search\/(-?\d+(?:\.\d+)?),\+?(-?\d+(?:\.\d+)?)/)
    || url.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)\+?(-?\d+(?:\.\d+)?)/i)
    || url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m){ o.lat = +m[1]; o.lon = +m[2]; }
  return o;
}

function _json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* {equipe, lc}: chave fixa (CHAVES) ou chave calculada do LC e da equipe (SEGREDO) */
function _equipe(q){
  const c = String(q.chave || ''), P = PropertiesService.getScriptProperties();
  if (c.length < 16) return null;
  const mapa = JSON.parse(P.getProperty('CHAVES') || '{}'), fixa = mapa[c];
  if (fixa && /^[\w-]{1,40}$/.test(fixa)) return {equipe: fixa, lc: ''};
  const seg = P.getProperty('SEGREDO'), lc = String(q.lc || ''), equipe = String(q.equipe || '');
  if (!seg || !/^LC(\d{1,6}|X{1,6})$/.test(lc) || !/^Equipe_\d{2}$/.test(equipe)) return null;
  return _iguais(_chaveDe(seg, lc, equipe), c) ? {equipe: equipe, lc: lc} : null;
}
function _chaveDe(seg, lc, equipe){
  return Utilities.computeHmacSha256Signature(lc + '|' + equipe, seg)
    .map(function(b){ return ('0' + (b & 255).toString(16)).slice(-2); }).join('').slice(0, 40);
}
function _iguais(a, b){                             // comparação em tempo constante
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function _raiz(){
  const id = PropertiesService.getScriptProperties().getProperty('PASTA_RAIZ');
  if (!id) throw new Error('receptor sem PASTA_RAIZ configurada');
  return DriveApp.getFolderById(id);
}

/* caminho relativo, só nomes simples; nada de "..", barra no início ou caracteres de controle */
function _segmentos(caminho){
  const s = String(caminho || '').split('/');
  if (s.length < 2 || s.length > 8) throw new Error('caminho fora do padrão: ' + caminho);
  s.forEach(function(x){
    if (!x || x === '.' || x === '..' || x.length > 150 || /[\\:*?"<>|\u0000-\u001f]/.test(x))
      throw new Error('caminho fora do padrão: ' + caminho);
  });
  if (!INICIO_OK.test(s[0])) throw new Error('caminho deve começar pelo código LC da campanha');
  return s;
}

/* pastas criadas sob trava: dois pedidos ao mesmo tempo não duplicam a pasta */
function _pasta(segs){
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    let p = _raiz();
    segs.forEach(function(nome){
      const it = p.getFoldersByName(nome);
      p = it.hasNext() ? it.next() : p.createFolder(nome);
    });
    return p;
  } finally { trava.releaseLock(); }
}

/* depois de gravado o novo, os de mesmo nome na pasta vão à lixeira */
function _trocaAntigos(pasta, nome, idNovo){
  const it = pasta.getFilesByName(nome);
  while (it.hasNext()){ const f = it.next(); if (f.getId() !== idNovo) f.setTrashed(true); }
}

function _arquivo(q, eq){
  const equipe = eq.equipe, segs = _segmentos(q.caminho);
  if (eq.lc && segs[0] !== eq.lc && segs[0] !== '_registros') throw new Error('caminho deve começar por ' + eq.lc + ' (o LC da chave desta equipe)');
  const nome = segs.pop();
  const partes = Math.max(1, q.partes | 0), k = q.parte | 0, ini = q.ini | 0, total = q.bytes | 0;
  const tipo = /^[\w.+-]+\/[\w.+-]+$/.test(q.tipo || '') ? q.tipo : 'application/octet-stream';
  const bytes = Utilities.base64Decode(String(q.b64 || ''));
  if (bytes.length > PARTE_MAX) throw new Error('parte grande demais');
  if (k < 0 || k >= partes) throw new Error('parte fora da sequência');
  const caminhoFinal = [equipe].concat(segs);

  if (partes === 1){
    const pasta = _pasta(caminhoFinal);
    const f = pasta.createFile(Utilities.newBlob(bytes, tipo, nome));
    _trocaAntigos(pasta, nome, f.getId());
    return {ok: true, completo: true, id: f.getId(), bytes: bytes.length};
  }

  // várias partes: envio retomável da API do Drive (v3)
  const cache = CacheService.getScriptCache(), ck = 'up_' + String(q.id || '').replace(/\W/g, '').slice(0, 40);
  if (ck === 'up_') throw new Error('envio sem identificador');
  let s = JSON.parse(cache.get(ck) || 'null');
  if (k === 0 && !s){
    const pasta = _pasta(caminhoFinal);
    s = {url: _sessaoDrive(pasta.getId(), nome, tipo, total), pasta: pasta.getId(), nome: nome, recebido: 0};
    cache.put(ck, JSON.stringify(s), 21600);
  }
  if (!s) throw new Error('o envio deste arquivo expirou — toque de novo em Enviar');
  if (ini < s.recebido) return {ok: true, completo: false, recebido: s.recebido};   // parte repetida
  if (ini !== s.recebido) throw new Error('parte fora de ordem');
  const fim = ini + bytes.length - 1;
  const r = UrlFetchApp.fetch(s.url, {method: 'put', contentType: tipo, payload: bytes, followRedirects: false,
    muteHttpExceptions: true, headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      'Content-Range': 'bytes ' + ini + '-' + fim + '/' + total}});
  const cod = r.getResponseCode();
  if (cod === 308){
    s.recebido = fim + 1; cache.put(ck, JSON.stringify(s), 21600);
    return {ok: true, completo: false, recebido: s.recebido};
  }
  if (cod === 200 || cod === 201){
    const id = JSON.parse(r.getContentText()).id;
    cache.remove(ck);
    _trocaAntigos(DriveApp.getFolderById(s.pasta), s.nome, id);
    return {ok: true, completo: true, id: id, bytes: total};
  }
  throw new Error('o Drive recusou a parte (' + cod + '): ' + r.getContentText().slice(0, 200));
}

function _sessaoDrive(pastaId, nome, tipo, total){
  const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
              'X-Upload-Content-Type': tipo, 'X-Upload-Content-Length': String(total)},
    payload: JSON.stringify({name: nome, parents: [pastaId]})});
  if (r.getResponseCode() !== 200) throw new Error('o Drive não abriu o envio (' + r.getResponseCode() + '): ' + r.getContentText().slice(0, 200));
  const h = r.getAllHeaders();
  return h.Location || h.location;
}

/* ---------- utilidades para a instalação (Executar no editor) ---------- */
function novaChave(){
  const c = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  console.log('chave nova (40 caracteres): ' + c);
  return c;
}
/* Código da coordenação: GGC-COORD:<id da implantação>:<SEGREDO>. Vai só para o planejador. */
function codigoCoordenacao(){
  const P = PropertiesService.getScriptProperties();
  let seg = P.getProperty('SEGREDO');
  if (!seg){ seg = novaChave(); P.setProperty('SEGREDO', seg); }
  const url = P.getProperty('URL_RECEPTOR') || ScriptApp.getService().getUrl() || '';
  const m = url.match(/\/macros\/s\/([\w-]+)\/exec/);
  if (!m) throw new Error('defina a propriedade URL_RECEPTOR com o endereço /exec da implantação');
  const c = 'GGC-COORD:' + m[1] + ':' + seg;
  console.log('código da coordenação (cole no planejador, uma vez): ' + c);
  return c;
}
/* teste da expansão de link (rode uma vez para autorizar o acesso externo) */
function testeExpande(){
  console.log(JSON.stringify(_expande('https://maps.app.goo.gl/nujvZh17dyaN4QbQ7')));
}

function testeReceptor(){
  const r = _raiz();
  const n = Object.keys(JSON.parse(PropertiesService.getScriptProperties().getProperty('CHAVES') || '{}')).length;
  console.log('pasta: ' + r.getName() + ' · equipes com chave: ' + n + ' · receptor ' + VERSAO_RECEPTOR);
  DriveApp.getStorageUsed();                       // força a autorização do Drive
  UrlFetchApp.fetch('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', {muteHttpExceptions: true});
}
