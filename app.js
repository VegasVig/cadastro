/* ============================================================
   APP.JS — Formulário público de cadastro
   ============================================================ */
document.getElementById('ano').textContent = new Date().getFullYear();

let passoAtual = 1;
const TOTAL = 6;
let fotoBase64 = '';
let ultimoRegistro = null;

const form = document.getElementById('form');

/* ---------- Inicialização ---------- */
function iniciarCadastro(){
  document.getElementById('tela-inicio').classList.add('hidden');
  document.getElementById('tela-form').classList.remove('hidden');
  form.data_cadastro.value = hojeBR();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- Máscaras ---------- */
const MASKS = { cpf:mascaraCPF, cep:mascaraCEP, tel:mascaraTel, data:mascaraData, money:mascaraMoney };
document.querySelectorAll('[data-mask]').forEach(el=>{
  aplicarMascara(el, MASKS[el.dataset.mask]);
});

/* ---------- Idade automática ---------- */
form.nascimento.addEventListener('input', ()=>{ form.idade.value = calcularIdade(form.nascimento.value); });

/* ---------- Passagens: campos de valor por trecho (ida/volta) ---------- */
function gerarCamposPassagem(){
  const qtdEl = document.getElementById('tr_qtd');
  const box   = document.getElementById('tr_valores_box');
  const grid  = document.getElementById('tr_valores');
  if(!qtdEl||!box||!grid) return;
  let n = parseInt((qtdEl.value||'').replace(/\D/g,''),10);
  if(!n || n<1){ box.style.display='none'; grid.innerHTML=''; return; }
  if(n>6) n=6;                                   // limite de segurança
  // guarda valores já digitados para não perder ao regenerar
  const antigos={};
  grid.querySelectorAll('input').forEach(i=>antigos[i.name]=i.value);
  let html='';
  for(let i=1;i<=n;i++){
    html+=`<div class="campo"><label>Valor ida ${n>1?i:''} <span class="req">*</span></label>
      <input name="tr_ida_${i}" data-mask="money" inputmode="numeric" placeholder="R$ 0,00" required>
      <div class="msg-erro">Informe o valor.</div></div>`;
  }
  for(let i=1;i<=n;i++){
    html+=`<div class="campo"><label>Valor volta ${n>1?i:''} <span class="req">*</span></label>
      <input name="tr_volta_${i}" data-mask="money" inputmode="numeric" placeholder="R$ 0,00" required>
      <div class="msg-erro">Informe o valor.</div></div>`;
  }
  grid.innerHTML=html;
  box.style.display='';
  // aplica máscara e restaura valores anteriores
  grid.querySelectorAll('input[data-mask]').forEach(el=>{
    aplicarMascara(el, MASKS[el.dataset.mask]);
    if(antigos[el.name]!==undefined) el.value=antigos[el.name];
    el.addEventListener('input', ()=>limparErro(el));
  });
}
const _trQtd = document.getElementById('tr_qtd');
if(_trQtd){
  _trQtd.addEventListener('input', ()=>{ _trQtd.value=_trQtd.value.replace(/\D/g,''); gerarCamposPassagem(); });
}

/* ---------- CEP automático ---------- */
form.cep.addEventListener('blur', async ()=>{
  const cep = form.cep.value.replace(/\D/g,'');
  if(cep.length!==8) return;
  const r = await buscarCEP(cep);
  if(r){
    if(!form.endereco.value) form.endereco.value = r.endereco;
    if(!form.bairro.value) form.bairro.value = r.bairro;
    if(!form.cidade.value) form.cidade.value = r.cidade + (r.uf?(' / '+r.uf):'');
    limparErro(form.endereco); limparErro(form.cidade);
  }
});

/* ---------- Campos condicionais (mostrar quando "Sim") ---------- */
function aplicarCondicionais(){
  document.querySelectorAll('[data-cond]').forEach(bloco=>{
    const [campo,val] = bloco.dataset.cond.split('=');
    const marcado = form.querySelector(`[name="${campo}"]:checked`);
    const on = marcado && marcado.value===val;
    if(bloco.classList.contains('grid')){ bloco.style.display = on?'grid':'none'; }
    else { bloco.classList.toggle('on', on); if(!on) bloco.style.display=''; }
  });
}
form.addEventListener('change', e=>{ if(e.target.type==='radio') aplicarCondicionais(); });
aplicarCondicionais();

/* ---------- Foto ---------- */
document.getElementById('foto-input').addEventListener('change', e=>{
  const file = e.target.files[0]; if(!file) return;
  if(file.size > 6*1024*1024){ toast('Foto muito grande (máx. 6 MB).','erro'); return; }
  const reader = new FileReader();
  reader.onload = ev=>{
    // redimensiona para no máx 600px de largura (leve p/ Sheets e PDF)
    const img = new Image();
    img.onload = ()=>{
      const max=600, esc = Math.min(1, max/img.width);
      const cv=document.createElement('canvas');
      cv.width=img.width*esc; cv.height=img.height*esc;
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
      fotoBase64 = cv.toDataURL('image/jpeg',0.82);
      const pv = document.getElementById('foto-preview');
      pv.innerHTML = `<img src="${fotoBase64}" alt="Foto">`;
      document.getElementById('foto-remover').classList.remove('hidden');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});
function removerFoto(){
  fotoBase64=''; document.getElementById('foto-input').value='';
  document.getElementById('foto-preview').innerHTML='Nenhuma foto<br>selecionada';
  document.getElementById('foto-remover').classList.add('hidden');
}

/* ---------- Erros de campo ---------- */
function marcarErro(el, msg){
  el.classList.add('erro');
  const m = el.closest('.campo')?.querySelector('.msg-erro');
  if(m){ if(msg) m.textContent=msg; m.classList.add('on'); }
}
function limparErro(el){
  el.classList.remove('erro');
  const m = el.closest('.campo')?.querySelector('.msg-erro');
  if(m) m.classList.remove('on');
}
form.querySelectorAll('input,select,textarea').forEach(el=>{
  el.addEventListener('input', ()=>limparErro(el));
});

/* ---------- Validação por etapa ---------- */
function validarPasso(p){
  let ok=true; let primeiro=null;
  const bloco = document.querySelector(`.passo[data-passo="${p}"]`);
  if(!bloco) return true;

  bloco.querySelectorAll('[required]').forEach(el=>{
    // ignora campos dentro de condicionais ocultas
    const cond = el.closest('.condicional');
    if(cond && !(cond.classList.contains('on')||cond.style.display==='grid')) return;
    if(el.offsetParent===null && !cond) { /* visível */ }

    let val = (el.value||'').trim();
    let campoOk = !!val;

    if(campoOk && el.name==='cpf') campoOk = validaCPF(val);
    if(campoOk && el.name==='email') campoOk = validaEmail(val);
    if(campoOk && el.name==='nascimento') campoOk = validaData(val);
    if(campoOk && (el.name==='celular'||el.name.endsWith('_tel'))) campoOk = validaTel(val);

    if(!campoOk){ marcarErro(el); ok=false; if(!primeiro) primeiro=el; }
    else limparErro(el);
  });

  // etapa 6: consentimento
  if(p===6){
    if(!form.consent.checked){
      document.getElementById('erro-consent').classList.add('on');
      ok=false;
    } else document.getElementById('erro-consent').classList.remove('on');
  }

  if(!ok && primeiro){ primeiro.scrollIntoView({block:'center',behavior:'smooth'}); primeiro.focus({preventScroll:true}); toast('Verifique os campos destacados.','erro'); }
  return ok;
}

/* ---------- Navegação ---------- */
function mostrarPasso(p){
  document.querySelectorAll('.passo').forEach(el=>el.classList.add('hidden'));
  document.querySelector(`.passo[data-passo="${p}"]`).classList.remove('hidden');

  document.querySelectorAll('.etapa').forEach(e=>{
    const n=+e.dataset.e;
    e.classList.toggle('ativa', n===p);
    e.classList.toggle('feita', n<p);
  });
  document.getElementById('barra').style.width = Math.round(p/TOTAL*100)+'%';

  document.getElementById('btn-voltar').style.visibility = p>1 ? 'visible':'hidden';
  document.getElementById('btn-continuar').classList.toggle('hidden', p===TOTAL);
  document.getElementById('btn-finalizar').classList.toggle('hidden', p!==TOTAL);
  window.scrollTo({top:0,behavior:'smooth'});
}
function avancarPasso(){
  if(!validarPasso(passoAtual)) return;
  if(passoAtual<TOTAL){ passoAtual++; mostrarPasso(passoAtual); }
}
function voltarPasso(){ if(passoAtual>1){ passoAtual--; mostrarPasso(passoAtual); } }

/* ---------- Coletar dados ---------- */
function coletar(){
  const fd = new FormData(form);
  const dados = {};
  for(const [k,v] of fd.entries()) dados[k]=v;
  // radios não incluídos se não marcados — garante presença
  form.querySelectorAll('input[type=radio]').forEach(r=>{
    if(r.checked) dados[r.name]=r.value;
    else if(!(r.name in dados)) dados[r.name]=dados[r.name]||'';
  });
  delete dados.consent;
  dados.foto = fotoBase64 || '';
  return dados;
}

/* ---------- Finalizar / enviar ---------- */
async function finalizar(){
  if(!validarPasso(6)) return;

  const dados = coletar();
  const id = gerarID();
  const criadoEm = agoraISO();
  ultimoRegistro = {
    id,
    criado_em: criadoEm,
    status: VEGAS_CONFIG.STATUS[0],
    ...dados,
    // campos do departamento pessoal (uso interno) — vazios no cadastro público
    dp_empresa:'', dp_admissao:'', dp_funcao:'', dp_horario:'', dp_posto:'', dp_vale:''
  };

  const ov = document.getElementById('overlay');
  document.getElementById('overlay-txt').textContent = 'Enviando seu cadastro…';
  ov.classList.add('on');

  try{
    const r = await VegasAPI.criar(ultimoRegistro);
    if(!r || !r.ok) throw new Error(r && r.erro || 'Falha no envio');

    document.getElementById('overlay-txt').textContent = 'Registrando seu cadastro…';
    // pequena pausa para o usuário perceber a etapa
    await new Promise(res=>setTimeout(res,400));

    ov.classList.remove('on');
    // tela de confirmação
    document.getElementById('tela-form').classList.add('hidden');
    document.getElementById('tela-ok').classList.remove('hidden');
    document.getElementById('conf-id').textContent = '#'+id;
    document.getElementById('conf-data').textContent = 'Registrado em ' + formatarDataHora(criadoEm);
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(err){
    ov.classList.remove('on');
    toast('Não foi possível enviar. Verifique sua conexão e tente novamente.','erro');
    console.error(err);
  }
}

function novoCadastro(){
  location.reload();
}

/* aviso de saída se houver dados */
window.addEventListener('beforeunload', e=>{
  if(passoAtual>1 && !document.getElementById('tela-ok').classList.contains('hidden')===false){
    // só avisa se estiver no meio do formulário
  }
});
