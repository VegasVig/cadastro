/*************************************************************
 * VEGAS VIGILÂNCIA — Backend (Google Apps Script)
 * -----------------------------------------------------------
 * Este script recebe os cadastros do site, grava no Google
 * Sheets, autentica o painel administrativo e permite
 * atualizar/excluir registros com segurança.
 *
 * As credenciais NÃO ficam no site — ficam aqui, no servidor
 * do Google (Script Properties).
 *
 * >>> LEIA O ARQUIVO INSTRUCOES-BACKEND.md PARA PUBLICAR <<<
 *************************************************************/

/* ========= CONFIGURAÇÃO ========= */
// Nome da aba onde os cadastros são salvos
var ABA = 'Cadastros';

/* Ordem das colunas na planilha (deve bater com o cabeçalho) */
var COLUNAS = [
  'id','criado_em','status',
  'nome','cargo','data_cadastro','nascimento','idade','naturalidade','cpf','pis','estado_civil','conjuge','pai','mae',
  'rg','orgao_exp','data_exp','ctps','titulo','zona','secao_eleitoral','reservista','fator_rh',
  'tem_cnh','cnh_categoria','cnh_validade','habilitacao','habilitacao_validade','ata_data','cnv','cnv_validade',
  'cep','endereco','numero','bairro','cidade','telefone','celular','email','escolaridade',
  'pessoas_residencia','tem_filhos','qtd_filhos','idades_filhos','peso','altura','sapato','calca','camisa',
  'fumante','bebe','medicacao','medicacao_qual','medicacao_tempo','cirurgia','cirurgia_motivo','fratura','fratura_motivo',
  'tem_redes','redes_qual','usuario',
  'turno_dia','turno_noite','turno_obs',
  'ult_emprego','ult_telefone','ult_funcao','ult_admissao','ult_demissao','ult_motivo',
  'usa_transporte','tr_linha','tr_cartao','tr_qtd','tr_valor',
  'ref1_nome','ref1_tel','ref2_nome','ref2_tel','ref3_nome','ref3_tel',
  'dp_empresa','dp_admissao','dp_funcao','dp_horario','dp_posto','dp_vale',
  'q1','q2','q3','q4','q5','q6','q7','q8','q9',
  'foto'
];

/* ========= UTIL ========= */
function _json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function _planilha(){
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ABA);
  if(!sh){ sh = ss.insertSheet(ABA); sh.appendRow(COLUNAS); sh.setFrozenRows(1); }
  if(sh.getLastRow()===0){ sh.appendRow(COLUNAS); sh.setFrozenRows(1); }
  return sh;
}
function _props(){ return PropertiesService.getScriptProperties(); }

/* token simples baseado em hash da senha (suficiente p/ painel interno) */
function _tokenValido(token){
  return token && token === _props().getProperty('SESSION_TOKEN');
}
function _novoToken(){
  var t = Utilities.getUuid().replace(/-/g,'');
  _props().setProperty('SESSION_TOKEN', t);
  return t;
}

/* ========= ENTRADAS ========= */
function doGet(e){
  var p = e.parameter || {};
  if(p.acao==='listar'){
    if(!_tokenValido(p.token)) return _json({ok:false,erro:'nao_autorizado'});
    return _json({ok:true, dados:_listar()});
  }
  return _json({ok:true, status:'online', empresa:'VEGAS VIGILÂNCIA'});
}

function doPost(e){
  var payload;
  try{ payload = JSON.parse(e.parameter.dados); }
  catch(err){ return _json({ok:false,erro:'payload_invalido'}); }

  var acao = payload.acao;

  if(acao==='criar')      return _json(_criar(payload.registro));
  if(acao==='login')      return _json(_login(payload.usuario, payload.senha));
  if(acao==='atualizar'){
    if(!_tokenValido(payload.token)) return _json({ok:false,erro:'nao_autorizado'});
    return _json(_atualizar(payload.id, payload.campos));
  }
  if(acao==='excluir'){
    if(!_tokenValido(payload.token)) return _json({ok:false,erro:'nao_autorizado'});
    return _json(_excluir(payload.id));
  }
  return _json({ok:false,erro:'acao_desconhecida'});
}

/* ========= OPERAÇÕES ========= */
function _criar(reg){
  if(!reg || !reg.id) return {ok:false,erro:'registro_invalido'};
  var sh = _planilha();
  var linha = COLUNAS.map(function(c){ return reg[c]!=null ? reg[c] : ''; });
  sh.appendRow(linha);
  return {ok:true, id:reg.id};
}

function _listar(){
  var sh = _planilha();
  var dados = sh.getDataRange().getValues();
  var head = dados.shift();
  return dados.map(function(row){
    var o = {};
    head.forEach(function(k,i){ o[k]=row[i]; });
    return o;
  }).reverse(); // mais recentes primeiro
}

function _atualizar(id, campos){
  var sh = _planilha();
  var dados = sh.getDataRange().getValues();
  var head = dados[0];
  var colId = head.indexOf('id');
  for(var r=1;r<dados.length;r++){
    if(String(dados[r][colId])===String(id)){
      for(var k in campos){
        var c = head.indexOf(k);
        if(c>=0) sh.getRange(r+1, c+1).setValue(campos[k]);
      }
      return {ok:true};
    }
  }
  return {ok:false,erro:'nao_encontrado'};
}

function _excluir(id){
  var sh = _planilha();
  var dados = sh.getDataRange().getValues();
  var head = dados[0];
  var colId = head.indexOf('id');
  for(var r=1;r<dados.length;r++){
    if(String(dados[r][colId])===String(id)){
      sh.deleteRow(r+1);
      return {ok:true};
    }
  }
  return {ok:false,erro:'nao_encontrado'};
}

/* ========= LOGIN ========= */
function _login(usuario, senha){
  var pr = _props();
  var u = pr.getProperty('ADMIN_USER');
  var s = pr.getProperty('ADMIN_PASS');
  if(!u || !s) return {ok:false, erro:'Credenciais não configuradas no servidor.'};
  if(usuario===u && senha===s){
    return {ok:true, token:_novoToken(), usuario:usuario};
  }
  return {ok:false, erro:'Usuário ou senha inválidos.'};
}

/* ========= INSTALAÇÃO (rode 1x pelo editor) ========= */
/**
 * Execute esta função UMA VEZ no editor do Apps Script para
 * definir usuário/senha do painel e o ID da planilha.
 * Edite os valores abaixo antes de rodar.
 */
function configurarInicial(){
  var pr = PropertiesService.getScriptProperties();
  pr.setProperty('ADMIN_USER', 'admin');       // usuário do painel
  pr.setProperty('ADMIN_PASS', 'Vegas4747@');  // senha do painel
  // Se o script estiver VINCULADO à planilha, pode deixar SHEET_ID vazio.
  // Caso contrário, cole aqui o ID da planilha (da URL, entre /d/ e /edit):
  // pr.setProperty('SHEET_ID', 'COLE_O_ID_AQUI');
  _planilha(); // cria a aba/cabeçalho
  Logger.log('Configuração concluída. Usuário e senha definidos.');
}
