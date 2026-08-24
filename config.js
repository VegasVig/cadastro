/* ============================================================
   CONFIGURAÇÃO DO SISTEMA — VEGAS VIGILÂNCIA
   ------------------------------------------------------------
   >>> ÚNICO LUGAR QUE VOCÊ PRECISA EDITAR APÓS PUBLICAR O
       GOOGLE APPS SCRIPT <<<
   Cole abaixo a URL do Web App gerada no passo do backend
   (termina em /exec). Enquanto estiver vazia, o sistema roda
   em MODO DEMONSTRAÇÃO (salva no próprio navegador).
   ============================================================ */

const VEGAS_CONFIG = {
  // Ex.: "https://script.google.com/macros/s/AKfycb..../exec"
  API_URL: "https://script.google.com/macros/s/AKfycbwHxqTIez2TrnrvFhtutqlIxSMMdgdh_vgLiSsht3c94NDsT2X6Uvz1kM2bXAI2QQEQ/exec",

  // Nome exibido / prefixo do ID
  EMPRESA: "VEGAS VIGILÂNCIA",
  PREFIXO_ID: "VG",

  // Caminho da logo (relativo à pasta frontend)
  LOGO_BRANCA: "./assets/logo-vegas-branca.png",
  LOGO_ESCURA: "./assets/logo-vegas-escura.png",

  // Itens de status disponíveis
  STATUS: ["Novo cadastro","Em análise","Entrevista","Aprovado","Reprovado","Contratado"],

  // Empresas do grupo (departamento pessoal)
  EMPRESAS_GRUPO: ["VEGAS ALARMES","VEGAS VIGILÂNCIA","VEGAS TECNOLOGIA","VEGAS SERVIÇOS","VEGAS MONITORAMENTO","VEGAS FILIAL NITERÓI"]
};

// Detecta se está em modo demonstração (sem backend configurado)
VEGAS_CONFIG.MODO_DEMO = !VEGAS_CONFIG.API_URL;
