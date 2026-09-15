/* ============================================================
   UTILIDADES — VEGAS VIGILÂNCIA
   ============================================================ */

/* ---------- Toast ---------- */
function toast(msg, tipo){
  let t = document.getElementById('vg-toast');
  if(!t){ t = document.createElement('div'); t.id='vg-toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast ' + (tipo||'') + ' on';
  clearTimeout(t._to);
  t._to = setTimeout(()=>{ t.className = 'toast ' + (tipo||''); }, 3200);
}

/* ---------- Máscaras ---------- */
function mascaraCPF(v){
  v = v.replace(/\D/g,'').slice(0,11);
  return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}
function mascaraCEP(v){
  v = v.replace(/\D/g,'').slice(0,8);
  return v.replace(/(\d{5})(\d)/,'$1-$2');
}
function mascaraTel(v){
  v = v.replace(/\D/g,'').slice(0,11);
  if(v.length<=10) return v.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2');
  return v.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2');
}
function mascaraData(v){
  v = v.replace(/\D/g,'').slice(0,8);
  return v.replace(/(\d{2})(\d)/,'$1/$2').replace(/(\d{2})(\d)/,'$1/$2');
}
function mascaraMoney(v){
  v = v.replace(/\D/g,'');
  v = (parseInt(v||'0',10)/100).toLocaleString('pt-BR',{minimumFractionDigits:2});
  return 'R$ ' + v;
}
function aplicarMascara(el, fn){
  el.addEventListener('input', ()=>{ const p=el.selectionStart; el.value = fn(el.value); });
}

/* ---------- Validações ---------- */
function validaCPF(cpf){
  cpf = (cpf||'').replace(/\D/g,'');
  if(cpf.length!==11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let s=0; for(let i=0;i<9;i++) s+=parseInt(cpf[i])*(10-i);
  let d1=(s*10)%11; if(d1===10) d1=0; if(d1!==parseInt(cpf[9])) return false;
  s=0; for(let i=0;i<10;i++) s+=parseInt(cpf[i])*(11-i);
  let d2=(s*10)%11; if(d2===10) d2=0; return d2===parseInt(cpf[10]);
}
function validaEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e||'').trim()); }
function validaData(v){
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((v||'').trim()); if(!m) return false;
  const d=+m[1], mo=+m[2], y=+m[3];
  if(mo<1||mo>12||d<1||d>31||y<1900||y>2100) return false;
  const dt=new Date(y,mo-1,d); return dt.getDate()===d && dt.getMonth()===mo-1;
}
function validaTel(v){ return (v||'').replace(/\D/g,'').length>=10; }

/* ---------- Idade a partir de data BR ---------- */
function calcularIdade(dataBR){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec((dataBR||'').trim()); if(!m) return '';
  const nasc=new Date(+m[3],+m[2]-1,+m[1]); if(isNaN(nasc)) return '';
  const hoje=new Date(); let idade=hoje.getFullYear()-nasc.getFullYear();
  const mm=hoje.getMonth()-nasc.getMonth();
  if(mm<0||(mm===0&&hoje.getDate()<nasc.getDate())) idade--;
  return idade>=0&&idade<130 ? String(idade) : '';
}

/* ---------- Busca CEP (ViaCEP) ---------- */
async function buscarCEP(cep){
  cep=(cep||'').replace(/\D/g,''); if(cep.length!==8) return null;
  try{
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const j = await r.json();
    if(j.erro) return null;
    return { endereco:j.logradouro||'', bairro:j.bairro||'', cidade:j.localidade||'', uf:j.uf||'' };
  }catch(e){ return null; }
}

/* ---------- ID e data ---------- */
function gerarID(){
  const d=new Date();
  const p=n=>String(n).padStart(2,'0');
  const base = `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`;
  const rand = Math.floor(1000+Math.random()*9000);
  return `${VEGAS_CONFIG.PREFIXO_ID}-${base}-${rand}`;
}
function agoraISO(){ return new Date().toISOString(); }
function formatarDataHora(iso){
  try{ const d=new Date(iso); return d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}); }
  catch(e){ return iso||''; }
}
function hojeBR(){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;
}

/* ============================================================
   CAMADA DE API  —  fala com o Google Apps Script.
   Em MODO_DEMO usa localStorage para que tudo funcione sem
   backend (útil para testar antes de publicar o Apps Script).
   ============================================================ */
const VegasAPI = {
  DEMO_KEY:'vegas_cadastros_demo',

  _lerDemo(){ try{ return JSON.parse(localStorage.getItem(this.DEMO_KEY)||'[]'); }catch(e){ return []; } },
  _salvarDemo(arr){ localStorage.setItem(this.DEMO_KEY, JSON.stringify(arr)); },

  // Envia via form-urlencoded evita preflight CORS no Apps Script
  async _post(payload){
    const body = new URLSearchParams({ dados: JSON.stringify(payload) });
    const r = await fetch(VEGAS_CONFIG.API_URL, { method:'POST', body });
    return r.json();
  },
  async _get(params){
    const url = VEGAS_CONFIG.API_URL + '?' + new URLSearchParams(params);
    const r = await fetch(url);
    return r.json();
  },

  /* Criar cadastro */
  async criar(registro){
    if(VEGAS_CONFIG.MODO_DEMO){
      const arr=this._lerDemo(); arr.unshift(registro); this._salvarDemo(arr);
      return { ok:true, id:registro.id };
    }
    return this._post({ acao:'criar', registro });
  },

  /* Listar (admin) */
  async listar(token){
    if(VEGAS_CONFIG.MODO_DEMO){ return { ok:true, dados:this._lerDemo() }; }
    return this._get({ acao:'listar', token });
  },

  /* Atualizar (status / dep. pessoal / edição) */
  async atualizar(id, campos, token){
    if(VEGAS_CONFIG.MODO_DEMO){
      const arr=this._lerDemo(); const i=arr.findIndex(x=>x.id===id);
      if(i>=0){ arr[i]={...arr[i],...campos}; this._salvarDemo(arr); }
      return { ok:true };
    }
    return this._post({ acao:'atualizar', id, campos, token });
  },

  /* Excluir */
  async excluir(id, token){
    if(VEGAS_CONFIG.MODO_DEMO){
      let arr=this._lerDemo(); arr=arr.filter(x=>x.id!==id); this._salvarDemo(arr);
      return { ok:true };
    }
    return this._post({ acao:'excluir', id, token });
  },

  /* Login admin */
  async login(usuario, senha){
    if(VEGAS_CONFIG.MODO_DEMO){
      // credenciais demo
      if(usuario==='admin' && senha==='Vegas4747@')
        return { ok:true, token:'DEMO-TOKEN', usuario };
      return { ok:false, erro:'Usuário ou senha inválidos.' };
    }
    return this._post({ acao:'login', usuario, senha });
  }
};

/* ---------- Sessão admin ---------- */
const Sessao = {
  set(token,usuario){ sessionStorage.setItem('vegas_admin', JSON.stringify({token,usuario,t:Date.now()})); },
  get(){ try{ return JSON.parse(sessionStorage.getItem('vegas_admin')); }catch(e){ return null; } },
  limpar(){ sessionStorage.removeItem('vegas_admin'); },
  logado(){ const s=this.get(); return !!(s&&s.token); }
};

/* ---------- Passagens (ida e volta por trecho) ----------
   O formulário gera tr_ida_1..N e tr_volta_1..N conforme a
   quantidade de ônibus. Estas duas funções leem esses campos
   e são usadas pelo painel e pelo PDF. Cadastros antigos, que
   tinham só tr_valor, continuam aparecendo certo.            */

function valorPassagem(v){
  if(typeof v === 'number') return v;
  const s = String(v==null?'':v).replace(/\D/g,'');
  return s ? parseInt(s,10)/100 : 0;
}

function moedaBR(n){
  return 'R$ ' + (Number(n)||0).toLocaleString('pt-BR',
    {minimumFractionDigits:2, maximumFractionDigits:2});
}

/* devolve [[rótulo, valor], ...] para o painel e para o PDF */
function passagensItens(r){
  r = r || {};
  const qtd = Math.min(parseInt(String(r.tr_qtd||'').replace(/\D/g,''),10) || 0, 6);
  const itens = [];

  ['ida','volta'].forEach(trecho=>{
    for(let i=1;i<=6;i++){
      const v = r['tr_'+trecho+'_'+i];
      if(v===undefined || v===null || String(v).trim()==='') continue;
      const nome = trecho==='ida' ? 'Ida' : 'Volta';
      itens.push([qtd>1 ? nome+' '+i : nome, moedaBR(valorPassagem(v))]);
    }
  });

  /* cadastro feito antes da mudança */
  if(!itens.length && r.tr_valor) itens.push(['Valor da passagem', r.tr_valor]);

  return itens;
}

/* soma do dia: todas as idas mais todas as voltas */
function passagensTotal(r){
  r = r || {};
  let soma = 0, achou = false;

  ['ida','volta'].forEach(trecho=>{
    for(let i=1;i<=6;i++){
      const v = r['tr_'+trecho+'_'+i];
      if(v===undefined || v===null || String(v).trim()==='') continue;
      soma += valorPassagem(v); achou = true;
    }
  });

  if(!achou){
    /* cadastro antigo: valor único vezes a quantidade, ida e volta */
    const qtd = parseInt(String(r.tr_qtd||'').replace(/\D/g,''),10) || 0;
    const unit = valorPassagem(r.tr_valor);
    if(unit && qtd) return moedaBR(unit * qtd * 2);
    return '—';
  }
  return moedaBR(soma);
}
