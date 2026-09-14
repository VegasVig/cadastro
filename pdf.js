/* ============================================================
   PDF.JS — Geração da ficha em PDF (A4) com jsPDF
   Documento oficial: cabeçalho com logo, foto, todas as seções,
   questionário, campos do departamento pessoal, paginação.
   ============================================================ */

// cache da logo em base64 (para o cabeçalho do PDF)
let _logoPDF = null;
function carregarLogoPDF(){
  return new Promise(res=>{
    if(_logoPDF){ res(_logoPDF); return; }
    const img = new Image(); img.crossOrigin='anonymous';
    img.onload = ()=>{
      const cv=document.createElement('canvas'); cv.width=img.width; cv.height=img.height;
      cv.getContext('2d').drawImage(img,0,0);
      _logoPDF = { data: cv.toDataURL('image/png'), w:img.width, h:img.height };
      res(_logoPDF);
    };
    img.onerror = ()=>res(null);
    img.src = VEGAS_CONFIG.LOGO_ESCURA;
  });
}

const COR = { navy:[22,23,25], navy2:[42,45,49], dourado:[158,164,173], texto:[28,30,33], suave:[92,98,107], linha:[224,227,232], cinza:[245,246,248] };

async function gerarPDF(reg, baixar){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p','mm','a4');
  const PW = 210, PH = 297, MX = 14;
  let y = 0;
  const logo = await carregarLogoPDF();

  const nomeArq = `Ficha_Cadastro_Vegas_${(reg.nome||'candidato').replace(/[^\w]+/g,'_').slice(0,30)}_${reg.id}.pdf`;

  /* ---------- Formata qualquer data para dd/mm/aaaa ----------
     Aceita: já em dd/mm/aaaa, ISO (2026-08-24T03:00:00.000Z),
     objeto Date ou aaaa-mm-dd. Se não reconhecer, devolve como está. */
  function dataBR(v){
    if(v==null || v==='') return '';
    if(v instanceof Date && !isNaN(v)){
      var p=function(n){return String(n).padStart(2,'0');};
      return p(v.getDate())+'/'+p(v.getMonth()+1)+'/'+v.getFullYear();
    }
    var s=String(v).trim();
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;              // já BR
    var iso=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);                // ISO ou aaaa-mm-dd
    if(iso) return iso[3]+'/'+iso[2]+'/'+iso[1];
    var d=new Date(s);
    if(!isNaN(d)){
      var q=function(n){return String(n).padStart(2,'0');};
      return q(d.getDate())+'/'+q(d.getMonth()+1)+'/'+d.getFullYear();
    }
    return s;
  }

  /* ---------- Cabeçalho (repete em cada página) ---------- */
  function cabecalho(){
    doc.setFillColor(...COR.navy); doc.rect(0,0,PW,26,'F');
    doc.setFillColor(...COR.dourado); doc.rect(0,26,PW,1.2,'F');
    if(logo){
      const h=10, w=logo.w/logo.h*h;
      // logo escura sobre fundo escuro não apareceria; desenhamos versão branca via texto + retângulo
      // então usamos texto estilizado da marca no cabeçalho
    }
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold'); doc.setFontSize(17);
    doc.text('VEGAS', MX, 12);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    doc.setTextColor(...COR.dourado);
    doc.text('VIGILÂNCIA E SEGURANÇA', MX, 17);
    doc.setTextColor(255,255,255); doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text('FICHA DE CADASTRO', PW-MX, 11, {align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
    doc.setTextColor(...COR.dourado);
    doc.text('Recrutamento e Seleção', PW-MX, 15.5, {align:'right'});
    doc.setTextColor(200,204,210); doc.setFontSize(7);
    doc.text('Protocolo: '+reg.id, PW-MX, 20, {align:'right'});
    doc.text('Emitido: '+formatarDataHora(reg.criado_em||agoraISO()), PW-MX, 23.5, {align:'right'});
  }

  /* ---------- Rodapé + paginação ---------- */
  function rodape(pag){
    doc.setDrawColor(...COR.linha); doc.setLineWidth(0.2);
    doc.line(MX, PH-12, PW-MX, PH-12);
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...COR.suave);
    doc.text('Vegas Vigilância e Segurança — Documento gerado eletronicamente', MX, PH-8);
    doc.text('Página '+pag, PW-MX, PH-8, {align:'right'});
  }

  let pagina=1;
  const TOPO=34, BASE=PH-16;
  y=TOPO; cabecalho();

  function novaPagina(){ rodape(pagina); doc.addPage(); pagina++; cabecalho(); y=TOPO; }
  function garantir(alt){ if(y+alt>BASE) novaPagina(); }

  /* ---------- Título de seção ---------- */
  function secao(txt){
    garantir(12);
    doc.setFillColor(...COR.navy2); doc.rect(MX, y, PW-2*MX, 7, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(255,255,255);
    doc.text(txt.toUpperCase(), MX+3, y+4.8);
    y+=7+2;
  }

  /* ---------- Linha de campos (2 colunas) ---------- */
  function campos(lista){
    // lista = [ [label,valor,span], ... ] span 1 ou 2
    const colW = (PW-2*MX);
    let x=MX, usado=0;
    lista.forEach(([lab,val,span])=>{
      span = span||1;
      const w = span===2 ? colW : colW/2;
      const valor = (val==null||val==='')? '—' : String(val);
      // altura conforme wrap
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
      const linhasV = doc.splitTextToSize(valor, w-6);
      const alt = Math.max(11, 6 + linhasV.length*4);

      if(usado>0 && (usado + w > colW+0.5)){ x=MX; usado=0; y+= _ultAlt; }
      if(usado===0){ garantir(alt); _linhaY=y; }
      // fundo
      doc.setFillColor(...COR.cinza); doc.rect(x, _linhaY, w-2, alt-1.5, 'F');
      doc.setDrawColor(...COR.linha); doc.setLineWidth(0.2); doc.rect(x, _linhaY, w-2, alt-1.5,'S');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(...COR.suave);
      doc.text(lab.toUpperCase(), x+2.5, _linhaY+4);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...COR.texto);
      doc.text(linhasV, x+2.5, _linhaY+8.5);

      x += w; usado += w; _ultAlt = alt;
      if(span===2 || usado>=colW-0.5){ x=MX; usado=0; y+=alt; }
    });
    if(usado>0){ y+=_ultAlt; x=MX; }
    y+=2;
  }
  let _linhaY=0,_ultAlt=0;

  /* ---------- Bloco de pergunta/resposta ---------- */
  function perguntaResposta(num, pergunta, resposta){
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
    const linhasP = doc.splitTextToSize(num+'. '+pergunta, PW-2*MX-4);
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    const linhasR = doc.splitTextToSize((resposta&&resposta.trim())?resposta:'—', PW-2*MX-6);
    const alt = 5 + linhasP.length*4 + 2 + linhasR.length*4.2 + 4;
    garantir(alt);
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...COR.navy);
    doc.text(linhasP, MX+2, y+4);
    let yy = y+4 + linhasP.length*4 + 2;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...COR.texto);
    doc.text(linhasR, MX+4, yy);
    y += alt;
    doc.setDrawColor(...COR.linha); doc.setLineWidth(0.15); doc.line(MX, y-1, PW-MX, y-1);
  }

  /* ================= CONTEÚDO ================= */

  // Faixa de foto (topo da 1ª página) — ocupa sua própria altura,
  // então os campos abaixo nunca ficam sobrepostos a ela.
  if(reg.foto){
    try{
      const fw=28, fh=35;
      const fx=PW-MX-fw, fy=y;
      // rótulo à esquerda da foto
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...COR.suave);
      doc.text('FOTO DO CANDIDATO', MX, fy+5);
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...COR.suave);
      doc.text(reg.nome||'', MX, fy+10);
      // moldura + imagem
      doc.setFillColor(255,255,255); doc.rect(fx-0.8, fy-0.8, fw+1.6, fh+1.6, 'F');
      doc.addImage(reg.foto, 'JPEG', fx, fy, fw, fh);
      doc.setDrawColor(...COR.navy2); doc.setLineWidth(0.5); doc.rect(fx, fy, fw, fh, 'S');
      y += fh + 4; // reserva o espaço da foto
    }catch(e){ console.warn('foto pdf', e); }
  }

  secao('Dados pessoais');
  campos([
    ['Nome completo', reg.nome, 2],
    ['Cargo desejado', reg.cargo],
    ['Data do cadastro', dataBR(reg.data_cadastro)],
    ['Data de nascimento', dataBR(reg.nascimento)],
    ['Idade', reg.idade],
    ['CPF', reg.cpf],
    ['PIS', reg.pis],
    ['Naturalidade', reg.naturalidade],
    ['Estado civil', reg.estado_civil],
    ['Nome do pai', reg.pai],
    ['Nome da mãe', reg.mae],
    ['Nome do cônjuge', reg.conjuge, 2],
  ]);

  secao('Documentação');
  campos([
    ['RG', reg.rg],['Órgão expedidor', reg.orgao_exp],
    ['Data de expedição', dataBR(reg.data_exp)],['Carteira profissional', reg.ctps],
    ['Título de eleitor', reg.titulo],['Zona / Seção', (reg.zona||'—')+' / '+(reg.secao_eleitoral||'—')],
    ['Cert. Reservista', reg.reservista],['Fator RH', reg.fator_rh],
    ['Possui CNH', reg.tem_cnh],['Categoria CNH', reg.cnh_categoria],
    ['Validade CNH', dataBR(reg.cnh_validade)],['Habilitação', reg.habilitacao],
    ['Data ATA', dataBR(reg.ata_data)],['CNV', reg.cnv],['Validade CNV', dataBR(reg.cnv_validade)],
    ['Validade habilitação', dataBR(reg.habilitacao_validade)],
  ]);

  secao('Endereço e contato');
  campos([
    ['Endereço', reg.endereco, 2],
    ['Número', reg.numero],['Bairro', reg.bairro],
    ['Cidade', reg.cidade],['CEP', reg.cep],
    ['Telefone', reg.telefone],['Celular', reg.celular],
    ['E-mail', reg.email, 2],
  ]);

  secao('Formação e informações pessoais');
  campos([
    ['Escolaridade', reg.escolaridade],['Fator RH', reg.fator_rh],
    ['Pessoas na residência', reg.pessoas_residencia],['Possui filhos', reg.tem_filhos],
    ['Qtd. filhos', reg.qtd_filhos],['Idades dos filhos', reg.idades_filhos],
  ]);

  secao('Informações para uniforme');
  campos([
    ['Peso', reg.peso],['Altura', reg.altura],['Sapato', reg.sapato],
    ['Calça', reg.calca],['Camisa', reg.camisa],
  ]);

  secao('Saúde e hábitos');
  campos([
    ['Fumante', reg.fumante],['Bebe socialmente', reg.bebe],
    ['Medicação (6 meses)', reg.medicacao],['Qual medicação', reg.medicacao_qual],
    ['Por quanto tempo', reg.medicacao_tempo],['Já fez cirurgia', reg.cirurgia],
    ['Motivo cirurgia', reg.cirurgia_motivo, 2],
    ['Já fraturou osso', reg.fratura],['Motivo fratura', reg.fratura_motivo],
    ['Possui redes sociais', reg.tem_redes],['Qual rede', reg.redes_qual],
    ['Usuário', reg.usuario, 2],
  ]);

  secao('Disponibilidade e experiência');
  campos([
    ['Turno dia', reg.turno_dia],['Turno noite', reg.turno_noite],
    ['Obs. disponibilidade', reg.turno_obs, 2],
    ['Último emprego', reg.ult_emprego],['Telefone', reg.ult_telefone],
    ['Função', reg.ult_funcao],['Admissão', dataBR(reg.ult_admissao)],
    ['Demissão', dataBR(reg.ult_demissao)],['Motivo da saída', reg.ult_motivo],
  ]);

  secao('Transporte');
  campos([
    ['Vai utilizar transporte', reg.usa_transporte],['Linha', reg.tr_linha],
    ['Nº do cartão', reg.tr_cartao],['Qtd. ônibus', reg.tr_qtd],
    ...passagensItens(reg),
    ['Total passagens (ida+volta)', passagensTotal(reg), 2],
  ]);

  secao('Contatos de referência');
  campos([
    ['Contato 1', reg.ref1_nome],['Telefone 1', reg.ref1_tel],
    ['Contato 2', reg.ref2_nome],['Telefone 2', reg.ref2_tel],
    ['Contato 3', reg.ref3_nome],['Telefone 3', reg.ref3_tel],
  ]);

  // Questionário
  secao('Questionário — Processo seletivo');
  garantir(14);
  doc.setFillColor(...COR.cinza); doc.rect(MX,y,PW-2*MX,10,'F');
  doc.setFont('helvetica','italic'); doc.setFontSize(7.8); doc.setTextColor(...COR.suave);
  doc.text(doc.splitTextToSize('Política da Qualidade: "A VEGAS tem como compromissos fundamentais a excelência no atendimento aos clientes e o constante aperfeiçoamento dos serviços prestados."', PW-2*MX-4), MX+2, y+4);
  y+=12;
  const perguntas = [
    'Fale um pouco sobre você.',
    'Por que você deseja trabalhar conosco?',
    'Fale sobre suas experiências profissionais anteriores.',
    'Como você lida com pressão e prazos curtos?',
    'O que você considera ser seus pontos fortes?',
    'Quais são seus principais pontos a desenvolver?',
    'Você está disposto(a) a aprender novas funções e participar de treinamentos?',
    'Tem disponibilidade para início imediato? Se não, em quanto tempo?',
    'Descreva uma situação de trabalho estressante que viveu. Como lidou com ela?'
  ];
  perguntas.forEach((p,i)=> perguntaResposta(i+1, p, reg['q'+(i+1)]||''));

  // Departamento pessoal (uso interno)
  secao('Preenchimento do setor de departamento pessoal (uso interno)');
  campos([
    ['Empresa Vegas', reg.dp_empresa],['Data de admissão', dataBR(reg.dp_admissao)],
    ['Função', reg.dp_funcao],['Horário de trabalho', reg.dp_horario],
    ['Posto de serviço', reg.dp_posto],['Vales transportes', reg.dp_vale],
    ['Status atual', reg.status, 2],
  ]);

  // Assinatura
  garantir(24);
  y+=6;
  doc.setDrawColor(...COR.texto); doc.setLineWidth(0.3);
  doc.line(MX, y, MX+70, y); doc.line(PW-MX-70, y, PW-MX, y);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...COR.suave);
  doc.text('Assinatura do candidato', MX, y+4);
  doc.text('Responsável — Vegas Vigilância', PW-MX-70, y+4);

  rodape(pagina);

  if(baixar) doc.save(nomeArq);
  return { doc, nomeArq };
}