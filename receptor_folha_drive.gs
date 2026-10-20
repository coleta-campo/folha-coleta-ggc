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
 *  3. Configurações do projeto > Propriedades do script:
 *       PASTA_RAIZ = <ID da pasta>
 *       CHAVES     = {"<chave longa da equipe 1>":"Equipe_01","<chave da equipe 2>":"Equipe_02"}
 *     (gere cada chave com a função novaChave(), em Executar; mínimo de 16 caracteres)
 *  4. Executar > testeReceptor (autoriza o acesso ao Drive e confere a pasta).
 *  5. Implantar > Nova implantação > Aplicativo da Web:
 *       Executar como: Eu · Quem pode acessar: Qualquer pessoa
 *     Copie o endereço que termina em /exec: é o "Endereço do receptor" da folha.
 *     ("Qualquer pessoa" é necessário porque a folha não envia login Google; quem
 *      protege a pasta é a chave de cada equipe. O receptor só grava: não lista nem
 *      devolve arquivo nenhum.)
 *  6. A cada nova versão deste código: Implantar > Gerenciar implantações > editar >
 *     Nova versão (o endereço /exec continua o mesmo).
 *
 * Protocolo (POST, corpo JSON em texto simples):
 *   {acao:'ping', chave}                                  -> {ok, equipe, pasta, versao}
 *   {acao:'arquivo', chave, caminho, tipo, id, parte, partes, ini, bytes, b64}
 *     parte única: grava direto; várias partes (arquivo > 6 MB): envio retomável
 *     da API do Drive, uma parte por pedido, sem juntar o arquivo na memória.
 *   Arquivo com o mesmo nome na mesma pasta é substituído (o anterior vai à lixeira).
 */
const VERSAO_RECEPTOR = '1.0';
const PARTE_MAX = 8 * 1024 * 1024;                 // bytes por pedido (a folha manda 6 MB)
const INICIO_OK = /^(LC[0-9X]{1,6}|_registros)$/;  // primeira pasta aceita no caminho

function doGet(){ return _json({ok: true, servico: 'receptor da folha de coleta de pontos', versao: VERSAO_RECEPTOR}); }

function doPost(e){
  try {
    const q = JSON.parse(e && e.postData && e.postData.contents || '{}');
    const equipe = _equipe(q.chave);
    if (!equipe) return _json({ok: false, erro: 'chave da equipe não reconhecida'});
    if (q.acao === 'ping') return _json({ok: true, equipe: equipe, pasta: _raiz().getName(), versao: VERSAO_RECEPTOR});
    if (q.acao === 'arquivo') return _json(_arquivo(q, equipe));
    return _json({ok: false, erro: 'ação desconhecida'});
  } catch (err){
    console.error(err);
    return _json({ok: false, erro: String(err && err.message || err)});
  }
}

function _json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function _equipe(chave){
  const c = String(chave || '');
  if (c.length < 16) return null;
  const mapa = JSON.parse(PropertiesService.getScriptProperties().getProperty('CHAVES') || '{}');
  const eq = mapa[c];
  return eq && /^[\w-]{1,40}$/.test(eq) ? eq : null;
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

function _arquivo(q, equipe){
  const segs = _segmentos(q.caminho), nome = segs.pop();
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
function testeReceptor(){
  const r = _raiz();
  const n = Object.keys(JSON.parse(PropertiesService.getScriptProperties().getProperty('CHAVES') || '{}')).length;
  console.log('pasta: ' + r.getName() + ' · equipes com chave: ' + n + ' · receptor ' + VERSAO_RECEPTOR);
  DriveApp.getStorageUsed();                       // força a autorização do Drive
  UrlFetchApp.fetch('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', {muteHttpExceptions: true});
}
