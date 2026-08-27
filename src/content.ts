export const siteConfig = {
  brandName: "Whiteboard para Negócios",
  instagramUrl: "#",
  youtubeUrl: "https://www.youtube.com/playlist?list=PLc8cQ25plUdw",
  facebookUrl: "",
  email: "",
  appsScriptEndpoint: import.meta.env.VITE_APPS_SCRIPT_ENDPOINT ?? "",
  mercadoPagoPublicKey: import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY ?? "",
  defaultMessage:
    "Olá! Quero um vídeo explicativo para meu negócio. Meu segmento é imóveis / pousada / construção.",
  heroYoutubeId: "CiPw7q4zFwg",
  heroVideoTitle: "Vídeos Explicativos: Conquiste Confiança e Venda Mais",
  heroPosterUrl: "https://img.youtube.com/vi/CiPw7q4zFwg/maxresdefault.jpg",
  heroImageUrl: "/hero-whiteboard.png",
  styleSampleUrl: "/samples/whiteboard-process-sample.png",
  founderYoutubeId: "XhGJp1QP-Ok",
  founderPosterUrl: "/samples/ruslan-founder-cover.jpg",
  upworkProfileUrl: "https://www.upwork.com/freelancers/~014b9338393baee899",
};

export const routes = {
  home: "/",
  brief: "/brief",
  checkout: "/checkout",
  orderSuccess: "/order-success",
  scripts: "/roteiros",
  support: "/support",
  feedback: "/feedback",
};

export const paymentStatuses = [
  "PAYMENT_PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const orderStatuses = [
  "DRAFT",
  "PAYMENT_PENDING",
  "IN_QUEUE",
  "IN_PRODUCTION",
  "DELIVERED",
  "REVISION_REQUESTED",
  "CANCELLED",
] as const;

export const crmTabs = [
  "ORDERS",
  "PAYMENTS",
  "BRIEFS",
  "TICKETS",
  "FEEDBACK",
  "CHAT_LOGS",
  "EMAIL_LOG",
  "EVENTS",
];

export const aiChatWidgetChoice = {
  widget: "ai-chat-widget",
  mode: "frontend UI reference only",
  endpoint: "Google Apps Script Web App via VITE_APPS_SCRIPT_ENDPOINT",
  rule: "No LLM API key is exposed in frontend.",
};

export const trustBadges = [
  "★★★★★ 5,0 em projeto concluído no Upwork",
  "Roteiro aprovado antes do pagamento",
  "Preço calculado antes do checkout",
  "Pedido com ID e acompanhamento por email",
];

export const confusedBuyerCards = [
  {
    title: "Antes da conversa",
    text: "O vídeo prepara o cliente antes do primeiro contato.",
  },
  {
    title: "Durante a venda",
    text: "Você usa o vídeo para responder dúvidas frequentes em páginas, anúncios e conversas comerciais.",
  },
  {
    title: "Depois da campanha",
    text: "O mesmo conteúdo pode continuar rodando como post, status ou anúncio.",
  },
];

export const niches = [
  {
    id: "imoveis",
    mark: "Imóveis",
    title: "Imóveis",
    eyebrow: "Corretores, imobiliárias e negócios imobiliários",
    description:
      "Conteúdo educativo para publicar entre anúncios de imóveis, explicar dúvidas do comprador e gerar conversas mais qualificadas.",
    reminder:
      "Não substitui fotos, tour ou vídeo do imóvel. Complementa com conteúdo educativo para preparar o comprador.",
    topics: [
      "3 erros que podem custar caro ao comprar um imóvel",
      "Como funciona o financiamento imobiliário?",
      "Seu primeiro imóvel em 5 passos",
    ],
    cta: "Ver demos para imóveis",
  },
  {
    id: "pousadas",
    mark: "Pousadas",
    title: "Pousadas / Turismo",
    eyebrow: "Pousadas, hotéis, guias e experiências locais",
    description:
      "Vídeos curtos para explicar reserva direta, pacotes, logística do hóspede, roteiros locais e experiências.",
    reminder:
      "Não substitui fotos dos quartos, café, piscina ou paisagem. Ajuda a explicar pacotes, reservas e experiências.",
    topics: [
      "Por que reservar direto com a pousada?",
      "Seu fim de semana perfeito começa aqui",
      "5 motivos para escolher esta pousada",
    ],
    cta: "Ver demos para pousadas",
  },
  {
    id: "construcao",
    mark: "Obras",
    title: "Construção / Arquitetura",
    eyebrow: "Construtoras, arquitetos, reformas e engenharia",
    description:
      "Explicações visuais para etapas, custos, planejamento, materiais, prazos e decisões antes do orçamento.",
    reminder:
      "Ideal para explicar etapas, custos, prazos e decisões antes do orçamento.",
    topics: [
      "3 erros que deixam uma obra mais cara",
      "Como funciona uma obra: do projeto à entrega",
      "Reforma sem dor de cabeça: 5 passos para planejar melhor",
    ],
    cta: "Ver demos para construção",
  },
];

export const demos = [
  {
    id: "RE-01",
    niche: "Imóveis",
    nicheLabel: "Para corretores e imobiliárias",
    title: "3 Erros Comuns ao Comprar um Imóvel",
    caption:
      "Conteúdo educativo para corretores publicarem entre anúncios e iniciarem conversas com compradores mais conscientes.",
    youtubeId: "bwxk2DI5Wyo",
  },
  {
    id: "RE-02",
    niche: "Imóveis",
    nicheLabel: "Para corretores e imobiliárias",
    title: "Financiamento Imobiliário: O Guia Para Entender as Etapas",
    caption:
      "Ajuda o comprador a entender etapas, documentos e dúvidas comuns antes do primeiro contato comercial.",
    youtubeId: "ZG7K6UZI_JM",
  },
  {
    id: "RE-03",
    niche: "Imóveis",
    nicheLabel: "Para corretores e imobiliárias",
    title: "Seu Primeiro Imóvel em 5 Passos Simples",
    caption:
      "Transforma uma decisão intimidante em uma sequência simples, útil para Reels, status e follow-up.",
    youtubeId: "V0T9ERrdBKM",
  },
  {
    id: "PO-01",
    niche: "Pousadas / Turismo",
    nicheLabel: "Para pousadas e turismo",
    title: "Por que reservar sua pousada direto com o proprietário?",
    caption:
      "Explica vantagens da reserva direta sem substituir os vídeos bonitos do espaço físico.",
    youtubeId: "7cwkt1vRM4Q",
  },
  {
    id: "PO-02",
    niche: "Pousadas / Turismo",
    nicheLabel: "Para pousadas e turismo",
    title: "Como Planejar o Pacote de Fim de Semana Perfeito",
    caption:
      "Organiza a experiência em uma pequena narrativa para pacotes, datas especiais e campanhas sazonais.",
    youtubeId: "P6g845FFDW4",
  },
  {
    id: "PO-03",
    niche: "Pousadas / Turismo",
    nicheLabel: "Para pousadas e turismo",
    title: "Como Escolher a Pousada Ideal em 5 Passos",
    caption:
      "Ajuda a pousada a explicar diferenciais práticos: localização, atendimento, logística e experiência.",
    youtubeId: "Rn-00Hcu8x0",
  },
  {
    id: "CON-01",
    niche: "Construção / Arquitetura",
    nicheLabel: "Para construção, reforma e arquitetura",
    title: "3 Erros Que Deixam Sua Obra Mais Cara",
    caption:
      "Educa o cliente antes do orçamento e mostra valor profissional sem depender só de antes/depois.",
    youtubeId: "c6IhLxim_i8",
  },
  {
    id: "CON-02",
    niche: "Construção / Arquitetura",
    nicheLabel: "Para construção, reforma e arquitetura",
    title: "Como uma Obra Funciona: Do Projeto à Entrega",
    caption:
      "Explica etapas e reduz insegurança de quem está prestes a contratar uma obra ou reforma.",
    youtubeId: "N5zmLtr9dRI",
  },
  {
    id: "CON-03",
    niche: "Construção / Arquitetura",
    nicheLabel: "Para construção, reforma e arquitetura",
    title: "Reforma Sem Dor de Cabeça: 5 Passos Essenciais",
    caption:
      "Bom para arquitetos, engenheiros e empresas que querem atrair clientes mais preparados.",
    youtubeId: "5MjpeeFRDJQ",
  },
].map((demo) => ({
  ...demo,
  videoUrl: `https://www.youtube.com/embed/${demo.youtubeId}`,
  thumbnailUrl: `https://img.youtube.com/vi/${demo.youtubeId}/maxresdefault.jpg`,
  thumbnailFallbackUrl: `https://img.youtube.com/vi/${demo.youtubeId}/hqdefault.jpg`,
}));

export const howItWorks = [
  "Você envia texto, oferta ou ideia.",
  "Nós criamos o texto de narração.",
  "Você revisa e aprova o conteúdo.",
  "Produzimos o vídeo no formato escolhido.",
  "Entregamos o link final.",
];

export const orderFlow = [
  "Briefing",
  "Texto de narração",
  "Aprovação",
  "Pagamento",
  "ID do pedido",
  "Produção",
];

export const packages = [
  {
    id: "basic-30",
    name: "Basic 30s",
    badge: "Teste rápido",
    price: 149,
    priceLabel: "R$ 149",
    durationLabel: "30 segundos",
    formatLabel: "1 formato: 9:16 ou 16:9",
    deliveryLabel: "Entrega: até 2 dias",
    deliveryDays: 2,
    dualFormatPrice: 40,
    expressPrice: 80,
    recommended: false,
    summary: "Para testar uma oferta simples, responder uma dúvida frequente ou criar um primeiro Reels explicativo.",
    items: [
      "Roteiro criado a partir do seu texto",
      "Visual gerado a partir da narração",
      "Visual whiteboard em cores",
      "Narração masculina ou feminina à escolha",
      "Trilha leve e edição final",
    ],
    cta: "Pedir vídeo de 30s",
  },
  {
    id: "standard-60",
    name: "Standard 60s",
    badge: "Mais vendido",
    price: 297,
    priceLabel: "R$ 297",
    durationLabel: "60 segundos",
    formatLabel: "1 formato: 9:16 ou 16:9",
    deliveryLabel: "Entrega: até 3 dias",
    deliveryDays: 3,
    dualFormatPrice: 70,
    expressPrice: 100,
    revisionsLabel: "1 rodada de ajustes",
    recommended: true,
    summary: "Para explicar uma solução com começo, problema, argumento e chamada para ação.",
    items: [
      "Roteiro comercial completo",
      "Estrutura visual baseada no VO aprovado",
      "Visual whiteboard em cores",
      "Narração masculina ou feminina à escolha",
      "Música, edição final e arquivo pronto",
    ],
    cta: "Pedir vídeo de 60s",
  },
  {
    id: "premium-120",
    name: "Premium 120s",
    badge: "Explicador completo",
    price: 597,
    priceLabel: "R$ 597",
    durationLabel: "120 segundos",
    formatLabel: "1 formato: 9:16 ou 16:9",
    deliveryLabel: "Entrega: 3 a 5 dias",
    deliveryDays: 5,
    dualFormatPrice: 120,
    expressPrice: 150,
    revisionsLabel: "2 rodadas de ajustes",
    recommended: false,
    summary:
      "Para um vídeo mais completo: tutorial, processo, serviço com várias etapas ou apresentação de campanha.",
    items: [
      "Roteiro detalhado e estrutura de venda",
      "Estrutura visual detalhada a partir do VO",
      "Visual whiteboard com cenas extras",
      "Narração masculina ou feminina à escolha",
      "Legendas, música e sound design",
      "Arquivo final no formato escolhido",
    ],
    cta: "Pedir vídeo de 120s",
  },
];

export const orderPlans = [
  { id: "single", label: "1 vídeo", quantity: 1, discount: 0, note: "Pedido avulso" },
  { id: "monthly_4", label: "4 vídeos / mês", quantity: 4, discount: 0.1, note: "10% de desconto" },
  { id: "monthly_8", label: "8 vídeos / mês", quantity: 8, discount: 0.15, note: "15% de desconto" },
] as const;

export const formatOptions = [
  {
    title: "Formato principal",
    text: "Escolha 9:16 para Reels, Stories e Shorts ou 16:9 para YouTube, site e apresentações.",
  },
  {
    title: "Formato adicional",
    text: "Escolha 9:16 + 16:9 no brief. A adaptação é calculada por vídeo antes do checkout.",
  },
  {
    title: "Plano mensal no mesmo pacote",
    text: "O mesmo vídeo de 30s, 60s ou 120s pode ser contratado uma vez ou em plano de 4 ou 8 vídeos por mês.",
  },
];

export const lowTouchSteps = [
  {
    title: "Você envia o básico",
    text: "Pode ser um texto bruto, um resumo da oferta, fatos importantes ou uma lista de pontos que precisam aparecer.",
  },
  {
    title: "Nós organizamos a mensagem",
    text: "Transformamos isso em texto de narração, gancho, ritmo da mensagem e chamada para ação.",
  },
  {
    title: "Você aprova uma vez",
    text: "A aprovação acontece antes da animação para evitar retrabalho e excesso de mensagens.",
  },
  {
    title: "Você recebe pronto",
    text: "Entrega por link com o formato combinado para publicar no canal escolhido.",
  },
];

export const useCases = [
  {
    title: "Reels, Stories e Shorts",
    text: "Eduque em poucos segundos antes da pessoa chamar no Direct ou clicar no anúncio.",
    icon: "play",
  },
  {
    title: "Página de venda",
    text: "Explique oferta, processo e benefícios quando texto e fotos não bastam.",
    icon: "page",
  },
  {
    title: "Anúncios pagos",
    text: "Transforme uma dúvida comum em criativo claro para tráfego e remarketing.",
    icon: "target",
  },
  {
    title: "Follow-up comercial",
    text: "Envie uma explicação pronta depois do primeiro contato ou orçamento.",
    icon: "message",
  },
  {
    title: "Conteúdo educativo",
    text: "Publique entre posts promocionais para aumentar clareza e confiança.",
    icon: "board",
  },
  {
    title: "Processos complexos",
    text: "Mostre etapas, custos, prazos e decisões sem depender de textos longos.",
    icon: "steps",
  },
];

export const included = [
  "Roteiro criado ou melhorado a partir do texto enviado",
  "Conceito visual e estrutura do vídeo",
  "Animação em estilo whiteboard",
  "Edição final",
  "Narração masculina ou feminina à escolha",
  "Legendas incluídas no pacote Premium",
  "Formato 9:16 ou 16:9 conforme pacote",
  "Entrega expressa quando houver disponibilidade",
];

export const whyItems = [
  {
    title: "Simplifica ideias complexas",
    text: "Processos, etapas, custos e decisões ficam mais fáceis de acompanhar.",
  },
  {
    title: "Apoia conteúdo educativo",
    text: "Ajuda a publicar algo útil entre posts promocionais.",
  },
  {
    title: "Complementa fotos e vídeos reais",
    text: "Não compete com imagens do produto. Explica aquilo que precisa de contexto.",
  },
];

export const comparison = [
  {
    option: "Fazer sozinho",
    tradeoff:
      "Pode funcionar no começo, mas exige tempo para roteiro, visual, edição, exportação e revisão.",
  },
  {
    option: "Freelancer barato",
    tradeoff:
      "Pode resolver um vídeo pontual, mas geralmente exige mais direção, revisão e controle de qualidade.",
  },
  {
    option: "Agência genérica",
    tradeoff:
      "Produz vários formatos, mas pode não focar no trabalho específico de explicar serviços complexos em vídeos curtos.",
  },
  {
    option: "Ferramenta de IA",
    tradeoff:
      "Ajuda a rascunhar, mas ainda precisa de estratégia, roteiro, revisão e adaptação para o seu negócio.",
  },
  {
    option: "Este serviço focado",
    tradeoff:
      "Parte de uma mensagem de negócio, transforma em roteiro explicativo e organiza pacotes para teste ou recorrência.",
    featured: true,
  },
];

export const proofItems = [
  {
    title: "Veja antes de comprar",
    text: "Assista aos exemplos na própria página e avalie ritmo, desenho, narração e aplicação por nicho.",
  },
  {
    title: "Aprove antes de produzir",
    text: "O texto de narração fica visível e editável antes do checkout e do início da animação.",
  },
  {
    title: "Acompanhe sem mensagens perdidas",
    text: "Depois do pagamento, você recebe um ID para acompanhar o pedido com o mesmo email do brief.",
  },
];

export const testimonial = {
  platform: "Upwork",
  rating: "5.0",
  project: "Vídeo corporativo para empresas de serviços locais",
  period: "2 a 3 de agosto de 2026",
  price: "Projeto concluído",
  quote:
    "Ruslan foi além do esperado com nosso vídeo de animação whiteboard. Entregou no prazo, comunicou-se com clareza durante todo o processo e realizou cada revisão com rapidez, exatamente como solicitado.",
  highlights: [
    "Compromisso com a qualidade",
    "Comunicação clara",
    "Responsável pelos resultados",
  ],
};

export const featuredCase = {
  title: "De uma mensagem técnica a uma história visual sobre autoridade local",
  challenge:
    "Explicar por que autoridade e posicionamento no Google podem gerar leads qualificados sem depender apenas de anúncios.",
  solution:
    "O texto enviado pelo cliente foi reorganizado em uma narrativa visual direta, com ritmo pensado para facilitar a compreensão.",
  created:
    "Vídeo whiteboard de aproximadamente 2min24s, com ilustrações e ícones personalizados, animação desenhada à mão, sincronização com a locução e entrega em Full HD.",
  note: "Este caso apresenta o processo e a solução visual. Não são atribuídos resultados comerciais que não tenham sido medidos.",
  youtubeId: "_qE_WoMz5FU",
};

export const founderProof = {
  title: "Quem vai criar seu vídeo",
  text:
    "Eu sou Ruslan, artista de animação whiteboard. Organizo a mensagem, estruturo a história visual, crio as ilustrações e acompanho pessoalmente a produção do seu vídeo.",
  details: [
    "Roteiro e história visual",
    "Ilustrações personalizadas",
    "Sincronização com a locução",
    "Versões em português e outros idiomas",
  ],
};

export const testimonialProofBlocks = [
  {
    icon: "delivery",
    title: "Entrega no prazo",
    text: "O review confirma que o vídeo foi entregue dentro do combinado, um ponto crítico para campanhas e lançamentos.",
  },
  {
    icon: "communication",
    title: "Comunicação clara",
    text: "O cliente destaca acompanhamento durante o processo, reduzindo a insegurança de contratar produção remota.",
  },
  {
    icon: "revision",
    title: "Revisões rápidas",
    text: "Ajustes foram tratados de forma objetiva, exatamente o que um negócio precisa para não perder tempo.",
  },
  {
    icon: "result",
    title: "Resultado acima do esperado",
    text: "O feedback não fala só de entrega técnica: ele reforça qualidade percebida e vontade de contratar novamente.",
  },
];

export const buyerSafetyBlocks = [
  {
    title: "Antes de animar",
    text: "Roteiro, formato e direção visual são alinhados para evitar surpresa no final.",
  },
  {
    title: "Durante a produção",
    text: "O pedido segue um fluxo com briefing, pagamento, ID do pedido e prazo definido.",
  },
  {
    title: "Na entrega",
    text: "Você recebe o link final e os arquivos no formato combinado para publicar.",
  },
];

export const proofObjections = [
  {
    icon: "TXT",
    doubt: "Tenho só uma ideia solta",
    answer: "Você envia texto, resumo ou tópicos. O texto de narração e a estrutura da mensagem são organizados para aprovação.",
  },
  {
    icon: "9:16",
    doubt: "Não sei qual formato escolher",
    answer: "Definimos 9:16 para Reels/Stories/Shorts ou 16:9 para YouTube, site e apresentações.",
  },
  {
    icon: "24h",
    doubt: "Preciso de rapidez",
    answer: "A entrega padrão fica clara no pacote, e a opção expressa entra antes do pagamento.",
  },
  {
    icon: "ID",
    doubt: "Não quero pedido perdido",
    answer: "O fluxo prevê confirmação, pagamento, ID do pedido, produção e entrega por link.",
  },
];

export const salesFlowSteps = [
  "Escolha do pacote",
  "Brief simples",
  "Prévia editorial",
  "Aprovação do cliente",
  "Checkout",
  "Pedido com ID",
];

export const briefInputTypes = [
  {
    id: "ready_text",
    label: "Tenho texto ou informações",
    description: "Cole fatos, um rascunho ou um texto que precisa ser adaptado sem mudar as informações.",
    result: "Você recebe um VO mais claro, ajustado à duração e fiel ao conteúdo enviado.",
    fieldLabel: "Texto, fatos ou informações do vídeo",
    placeholder:
      "Ex.: Nossa pousada fica a 5 minutos do centro histórico de Paraty. O café da manhã está incluído e o atendimento funciona até as 22h. Quero destacar localização, comodidade e atendimento, sem prometer serviços que não oferecemos.",
    helper:
      "Use este modo quando os fatos já existem. Inclua nomes, etapas, benefícios, condições e limites que não podem ser alterados.",
  },
  {
    id: "idea",
    label: "Tenho apenas uma ideia",
    description: "Explique o objetivo, o público e a mensagem principal; o sistema desenvolve a abordagem.",
    result: "Você recebe uma estrutura, um ângulo de comunicação e um VO completo para aprovar.",
    fieldLabel: "Ideia, objetivo e público do vídeo",
    placeholder:
      "Ex.: Quero atrair casais que planejam um fim de semana em Paraty. O vídeo deve mostrar que organizar a viagem pode ser simples e terminar convidando o público a conhecer nossa pousada.",
    helper:
      "Para um resultado melhor, diga para quem é o vídeo, o que essa pessoa precisa entender e qual ação deve realizar no final.",
  },
] as const;

export const supportIssueTypes = [
  "Ajuste no vídeo",
  "Problema com entrega",
  "Problema com pagamento",
  "Qualidade do vídeo",
  "Pedido incorreto",
  "Outro",
];

export const emailTemplates = [
  "Order confirmation",
  "Payment confirmation",
  "Roteiro/visual approval request",
  "Final delivery",
  "Ticket created",
  "Feedback request",
  "Feedback reminder 1",
  "Feedback reminder 2",
  "Portfolio permission confirmation",
];

export const faq = [
  {
    question: "Quanto custa um vídeo?",
    answer:
      "Os pacotes começam em R$ 149 para 30s, R$ 297 para 60s e R$ 597 para 120s. No brief você pode escolher 1, 4 ou 8 vídeos e ver o preço final com desconto, formato adicional e urgência.",
  },
  {
    question: "Eu preciso escrever o roteiro?",
    answer:
      "Não. Se você já tem fatos, um rascunho ou um texto, escolha 'Tenho texto ou informações' para adaptar o conteúdo sem alterar os dados. Se tem apenas um objetivo, escolha 'Tenho apenas uma ideia' para desenvolver a abordagem e o VO. O visual é produzido a partir do texto de narração aprovado.",
  },
  {
    question: "Qual é a diferença entre texto e ideia?",
    answer:
      "No modo de texto, suas informações são a fonte principal: o conteúdo é organizado e ajustado à duração, sem inventar fatos. No modo de ideia, você informa público, objetivo e mensagem; o sistema tem mais liberdade para criar o ângulo, a estrutura e a chamada final. Em planos mensais, ambos geram todos os temas e o VO completo do primeiro vídeo antes do pagamento.",
  },
  {
    question: "Posso enviar um PDF ou link como base?",
    answer:
      "A prévia não lê arquivos nem páginas externas automaticamente. Para garantir que você veja e aprove a base usada antes do pagamento, cole no campo apenas os fatos, trechos ou pontos relevantes. Assim, os demais VOs do plano serão criados depois do pagamento a partir da mesma base já aprovada.",
  },
  {
    question: "Recebo vídeo para Instagram e YouTube?",
    answer:
      "Cada pacote inclui um formato principal, 9:16 ou 16:9. Se precisar das duas versões, selecione 9:16 + 16:9 no brief e veja o adicional antes do checkout.",
  },
  {
    question: "Posso escolher a voz da narração?",
    answer:
      "Sim. A narração pode seguir voz masculina ou feminina, definida no briefing antes da produção.",
  },
  {
    question: "As legendas estão incluídas?",
    answer:
      "As legendas estão incluídas no Premium. Nos demais pacotes, podem ser combinadas como adicional se forem necessárias.",
  },
  {
    question: "Whiteboard substitui fotos e vídeos reais?",
    answer:
      "Não. Para imóveis e pousadas, fotos, tours e vídeos reais continuam importantes. Whiteboard entra para explicar processo, dúvidas, vantagens e decisões que a imagem sozinha não comunica.",
  },
  {
    question: "Serve para anúncios?",
    answer:
      "Sim, pode ser usado em anúncios, Instagram, YouTube e site, desde que o roteiro seja pensado para o objetivo da campanha e o formato de exportação seja definido no briefing.",
  },
  {
    question: "Posso pedir alterações?",
    answer:
      "No Basic não há rodada de revisão inclusa. O Standard inclui 1 rodada de ajustes e o Premium inclui 2 rodadas. A aprovação do roteiro antes da animação ajuda a evitar retrabalho.",
  },
  {
    question: "Quanto tempo demora?",
    answer:
      "A entrega padrão é de até 2 dias para 30s, até 3 dias para 60s e de 3 a 5 dias para 120s. A opção expressa de 24 horas aparece no brief quando selecionada.",
  },
  {
    question: "Como funciona o pagamento?",
    answer:
      "Depois de revisar o escopo, o preço e o texto de narração do primeiro vídeo, você segue para o checkout. O pedido recebe um número de acompanhamento e a confirmação é enviada para o email informado.",
  },
  {
    question: "O que acontece depois do primeiro vídeo?",
    answer:
      "No plano mensal, você aprova 4 ou 8 temas e o texto do primeiro vídeo antes do checkout. Depois da confirmação do pagamento, os demais textos são gerados para sua revisão dentro do mesmo pedido.",
  },
  {
    question: "Você garante vendas ou viralização?",
    answer:
      "Não. Nenhum vídeo pode garantir sozinho vendas, alcance ou viralização. O trabalho foca em clareza, estrutura pensada para manter a atenção e narrativa visual fácil de acompanhar. O resultado também depende da oferta, do público, da distribuição e da campanha.",
  },
];
