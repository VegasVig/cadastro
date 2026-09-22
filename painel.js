/* ============================================================
   PAINEL.JS — Painel administrativo
   ============================================================ */

// proteção de rota
if(!Sessao.logado()){ location.href='admin.html'; }
const sessao = Sessao.get();
document.getElementById('usuario-log').textContent = sessao ? ('Olá, '+(sessao.usuario||'admin')) : '';

let TODOS = [];
let filtroStatus = 'Todos';
let paginaAtual = 1;
const POR_PAGINA = 10;
let atual = null; // registro aberto no modal

function sair(){ Sessao.limpar(); location.href='admin.html'; }

/* ---------- Carregar dados ---------- */
async function carregar(){
  document.getElementById('overlay').classList.add('on');
  try{
    const r = await VegasAPI.listar(sessao.token);
    if(r && r.ok){ TODOS = r.dados||[]; }
    else if(r && r.erro==='nao_autorizado'){ sair(); return; }
    else { toast('Não foi possível carregar os cadastros.','erro'); TODOS=[]; }
    atualizarStats(); render();
  }catch(e){ toast('Erro de conexão.','erro'); }
  finally{ document.getElementById('overlay').classList.remove('on'); }
}

/* ---------- Estatísticas ---------- */
function atualizarStats(){
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const semana = new Date(hoje); semana.setDate(semana.getDate()-6);
  let nHoje=0,nSem=0,nPend=0,nAprov=0;
  TODOS.forEach(r=>{
    const d = new Date(r.criado_em); const dd=new Date(d); dd.setHours(0,0,0,0);
    if(dd.getTime()===hoje.getTime()) nHoje++;
    if(dd>=semana) nSem++;
    if(['Novo cadastro','Em análise','Entrevista'].includes(r.status)) nPend++;
    if(r.status==='Aprovado'||r.status==='Contratado') nAprov++;
  });
  document.getElementById('s-total').textContent = TODOS.length;
  document.getElementById('s-hoje').textContent = nHoje;
  document.getElementById('s-semana').textContent = nSem;
  document.getElementById('s-pend').textContent = nPend;
  document.getElementById('s-aprov').textContent = nAprov;
}

/* ---------- Filtro + busca ---------- */
function filtrados(){
  const q = document.getElementById('busca').value.trim().toLowerCase();
  const dataF = document.getElementById('filtro-data').value; // yyyy-mm-dd
  return TODOS.filter(r=>{
    if(filtroStatus!=='Todos' && r.status!==filtroStatus) return false;
    if(dataF){
      const d=new Date(r.criado_em); const iso=d.toISOString().slice(0,10);
      if(iso!==dataF) return false;
    }
    if(q){
      const alvo = [r.id,r.nome,r.cpf,r.telefone,r.celular,r.cidade,r.cargo].join(' ').toLowerCase();
      if(!alvo.includes(q)) return false;
    }
    return true;
  });
}

/* ---------- Render tabela ---------- */
const CLASSE_STATUS = {
  'Novo cadastro':'st-novo','Em análise':'st-analise','Entrevista':'st-entrevista',
  'Aprovado':'st-aprovado','Reprovado':'st-reprovado','Contratado':'st-contratado'
};
function render(){
  const lista = filtrados();
  const tbody = document.getElementById('tbody');
  const vazio = document.getElementById('vazio');
  const totalPag = Math.max(1, Math.ceil(lista.length/POR_PAGINA));
  if(paginaAtual>totalPag) paginaAtual=totalPag;
  const ini=(paginaAtual-1)*POR_PAGINA;
  const pagina = lista.slice(ini, ini+POR_PAGINA);

  tbody.innerHTML='';
  vazio.classList.toggle('hidden', lista.length>0);

  pagina.forEach(r=>{
    const tr=document.createElement('tr');
    tr.onclick=()=>abrirModal(r.id);
    tr.innerHTML = `
      <td><b>${r.id||'—'}</b></td>
      <td>${esc(r.nome)}</td>
      <td>${esc(r.cargo)}</td>
      <td>${esc(r.cidade)}</td>
      <td>${esc(r.celular||r.telefone)}</td>
      <td>${formatarDataHora(r.criado_em)}</td>
      <td><span class="status-tag ${CLASSE_STATUS[r.status]||'st-novo'}">${esc(r.status)}</span></td>
      <td><button class="btn btn-neutro btn-sm" onclick="event.stopPropagation();abrirModal('${r.id}')">Ver</button></td>`;
    tbody.appendChild(tr);
  });
  renderPaginacao(totalPag);
}
function renderPaginacao(total){
  const p=document.getElementById('paginacao'); p.innerHTML='';
  if(total<=1) return;
  const btn=(txt,pag,dis,on)=>{ const b=document.createElement('button'); b.textContent=txt; b.disabled=!!dis; if(on)b.classList.add('on'); b.onclick=()=>{paginaAtual=pag;render();}; return b; };
  p.appendChild(btn('‹',paginaAtual-1,paginaAtual===1));
  for(let i=1;i<=total;i++) p.appendChild(btn(i,i,false,i===paginaAtual));
  p.appendChild(btn('›',paginaAtual+1,paginaAtual===total));
}
function esc(s){ return (s==null?'':String(s)).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }

/* ---------- Eventos filtros/busca ---------- */
document.getElementById('busca').addEventListener('input', ()=>{paginaAtual=1;render();});
document.getElementById('filtro-data').addEventListener('change', ()=>{paginaAtual=1;render();});
document.querySelectorAll('#filtros-status .chip').forEach(c=>{
  c.onclick=()=>{
    document.querySelectorAll('#filtros-status .chip').forEach(x=>x.classList.remove('on'));
    c.classList.add('on'); filtroStatus=c.dataset.f; paginaAtual=1; render();
  };
});

/* ---------- Modal detalhes / edição ---------- */
function abrirModal(id){
  atual = TODOS.find(r=>r.id===id); if(!atual) return;
  const r=atual;
  document.getElementById('m-titulo').textContent = `${r.nome||'Candidato'} — ${r.id}`;

  const item=(k,v)=>`<div class="det-item"><div class="k">${k}</div><div class="v">${esc(v)||'—'}</div></div>`;
  const secao=t=>`<div class="det-secao">${t}</div>`;

  const foto = r.foto ? `<div style="grid-column:1/-1;text-align:center;margin-bottom:6px"><img class="det-foto" src="${r.foto}" alt="Foto"></div>` : '';

  const statusSel = `<div class="det-item" style="grid-column:1/-1">
      <div class="k">Status do candidato</div>
      <select id="edit-status" style="margin-top:6px;padding:9px 12px;border:1.5px solid var(--cinza-300);border-radius:8px;width:100%;font-family:inherit">
        ${VEGAS_CONFIG.STATUS.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}
      </select></div>`;

  const perguntas = [
    'Fale um pouco sobre você.','Por que deseja trabalhar conosco?','Experiências anteriores.',
    'Pressão e prazos.','Pontos fortes.','Pontos a desenvolver.','Aprender novas funções.',
    'Início imediato.','Situação estressante.'
  ];
  const qHtml = perguntas.map((p,i)=>item(`${i+1}. ${p}`, r['q'+(i+1)])).join('');

  // campos do departamento pessoal — editáveis
  const dpEmpresa = `<option value="">—</option>`+VEGAS_CONFIG.EMPRESAS_GRUPO.map(e=>`<option ${r.dp_empresa===e?'selected':''}>${e}</option>`).join('');
  const dp = `
    <div class="det-item"><div class="k">Empresa Vegas</div><select id="dp_empresa" style="margin-top:4px;padding:8px;border:1.5px solid var(--cinza-300);border-radius:8px;width:100%">${dpEmpresa}</select></div>
    <div class="det-item"><div class="k">Data de admissão</div><input id="dp_admissao" value="${esc(r.dp_admissao)}" style="margin-top:4px;padding:8px;border:1.5px solid var(--cinza-300);border-radius:8px;width:100%"></div>
    <div class="det-item"><div class="k">Função</div><input id="dp_funcao" value="${esc(r.dp_funcao)}" style="margin-top:4px;padding:8px;border:1.5px solid var(--cinza-300);border-radius:8px;width:100%"></div>
    <div class="det-item"><div class="k">Horário de trabalho</div><input id="dp_horario" value="${esc(r.dp_horario)}" style="margin-top:4px;padding:8px;border:1.5px solid var(--cinza-300);border-radius:8px;width:100%"></div>
    <div class="det-item"><div class="k">Posto de serviço</div><input id="dp_posto" value="${esc(r.dp_posto)}" style="margin-top:4px;padding:8px;border:1.5px solid var(--cinza-300);border-radius:8px;width:100%"></div>
    <div class="det-item"><div class="k">Vales transportes</div><input id="dp_vale" value="${esc(r.dp_vale)}" style="margin-top:4px;padding:8px;border:1.5px solid var(--cinza-300);border-radius:8px;width:100%"></div>`;

  document.getElementById('m-body').innerHTML = `<div class="det-grid">
    ${foto}
    ${statusSel}
    ${secao('Dados pessoais')}
    ${item('Nome',r.nome)}${item('Cargo desejado',r.cargo)}
    ${item('Nascimento',r.nascimento)}${item('Idade',r.idade)}
    ${item('CPF',r.cpf)}${item('PIS',r.pis)}
    ${item('Naturalidade',r.naturalidade)}${item('Estado civil',r.estado_civil)}
    ${item('Pai',r.pai)}${item('Mãe',r.mae)}${item('Cônjuge',r.conjuge)}
    ${item('Tem filhos',r.tem_filhos)}${item('Quantos',r.qtd_filhos)}${item('Idade dos filhos',r.idades_filhos)}

    ${secao('Documentação')}
    ${item('RG',r.rg)}${item('Órgão exp.',r.orgao_exp)}${item('Data exp.',r.data_exp)}
    ${item('CTPS',r.ctps)}${item('Título',r.titulo)}${item('Zona/Seção',(r.zona||'—')+' / '+(r.secao_eleitoral||'—'))}
    ${item('Reservista',r.reservista)}${item('Fator RH',r.fator_rh)}
    ${item('CNH',r.tem_cnh)}${item('Cat. CNH',r.cnh_categoria)}${item('Val. CNH',r.cnh_validade)}
    ${item('ATA',r.ata_data)}${item('CNV',r.cnv)}${item('Val. CNV',r.cnv_validade)}

    ${secao('Endereço e contato')}
    ${item('Endereço',(r.endereco||'')+(r.numero?', '+r.numero:''))}${item('Bairro',r.bairro)}
    ${item('Cidade',r.cidade)}${item('CEP',r.cep)}
    ${item('Telefone',r.telefone)}${item('Celular',r.celular)}
    ${item('E-mail',r.email)}${item('Escolaridade',r.escolaridade)}

    ${secao('Informações pessoais e uniforme')}
    ${item('Pessoas na residência',r.pessoas_residencia)}${item('Peso/Altura',(r.peso||'—')+' / '+(r.altura||'—'))}
    ${item('Sapato',r.sapato)}${item('Calça',r.calca)}${item('Camisa',r.camisa)}

    ${secao('Saúde e hábitos')}
    ${item('Fumante',r.fumante)}${item('Bebe socialmente',r.bebe)}
    ${item('Medicação',r.medicacao)}${item('Qual/tempo',(r.medicacao_qual||'—')+' / '+(r.medicacao_tempo||'—'))}
    ${item('Cirurgia',r.cirurgia)}${item('Motivo',r.cirurgia_motivo)}
    ${item('Fratura',r.fratura)}${item('Motivo',r.fratura_motivo)}
    ${item('Redes sociais',r.tem_redes)}${item('Qual',r.redes_qual)}${item('Usuário',r.usuario)}

    ${secao('Disponibilidade e experiência')}
    ${item('Turno dia',r.turno_dia)}${item('Turno noite',r.turno_noite)}
    ${item('Obs. disponibilidade',r.turno_obs)}
    ${item('Último emprego',r.ult_emprego)}${item('Telefone',r.ult_telefone)}
    ${item('Função',r.ult_funcao)}${item('Admissão',r.ult_admissao)}
    ${item('Demissão',r.ult_demissao)}${item('Motivo saída',r.ult_motivo)}

    ${secao('Transporte')}
    ${item('Usa transporte',r.usa_transporte)}${item('Linha',r.tr_linha)}
    ${item('Cartão',r.tr_cartao)}${item('Qtd ônibus',r.tr_qtd)}
    ${passagensItens(r).map(([lbl,val])=>item(lbl,val)).join('')}
    ${item('Total passagens (ida+volta)',passagensTotal(r))}

    ${secao('Contatos de referência')}
    ${item('Contato 1',(r.ref1_nome||'—')+' — '+(r.ref1_tel||''))}
    ${item('Contato 2',(r.ref2_nome||'—')+' — '+(r.ref2_tel||''))}
    ${item('Contato 3',(r.ref3_nome||'—')+' — '+(r.ref3_tel||''))}

    ${secao('Questionário — Processo seletivo')}
    ${qHtml}

    ${secao('Departamento pessoal (uso interno — editável)')}
    ${dp}
  </div>`;
  document.getElementById('modal').classList.add('on');
}
function fecharModal(){ document.getElementById('modal').classList.remove('on'); atual=null; }
document.getElementById('modal').addEventListener('click', e=>{ if(e.target.id==='modal') fecharModal(); });

/* ---------- Salvar edição (status + dep. pessoal) ---------- */
async function salvarEdicao(){
  if(!atual) return;
  const campos = {
    status: document.getElementById('edit-status').value,
    dp_empresa: document.getElementById('dp_empresa').value,
    dp_admissao: document.getElementById('dp_admissao').value,
    dp_funcao: document.getElementById('dp_funcao').value,
    dp_horario: document.getElementById('dp_horario').value,
    dp_posto: document.getElementById('dp_posto').value,
    dp_vale: document.getElementById('dp_vale').value,
  };
  document.getElementById('overlay').classList.add('on');
  try{
    const r = await VegasAPI.atualizar(atual.id, campos, sessao.token);
    if(r && r.ok){
      Object.assign(atual, campos);
      toast('Alterações salvas.','ok');
      atualizarStats(); render(); fecharModal();
    } else toast('Não foi possível salvar.','erro');
  }catch(e){ toast('Erro de conexão.','erro'); }
  finally{ document.getElementById('overlay').classList.remove('on'); }
}

/* ---------- Excluir ---------- */
async function excluirAtual(){
  if(!atual) return;
  if(!confirm(`Excluir definitivamente o cadastro de ${atual.nome} (${atual.id})?\nEsta ação não pode ser desfeita.`)) return;
  document.getElementById('overlay').classList.add('on');
  try{
    const r = await VegasAPI.excluir(atual.id, sessao.token);
    if(r && r.ok){
      TODOS = TODOS.filter(x=>x.id!==atual.id);
      toast('Cadastro excluído.','ok');
      atualizarStats(); render(); fecharModal();
    } else toast('Não foi possível excluir.','erro');
  }catch(e){ toast('Erro de conexão.','erro'); }
  finally{ document.getElementById('overlay').classList.remove('on'); }
}

/* ---------- PDF ---------- */
function baixarPDFAtual(){ if(atual) gerarPDF(atual, true); }

/* start */
carregar();
