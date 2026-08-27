import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { trackEvent } from "./analytics";
import {
  aiChatWidgetChoice,
  briefInputTypes,
  buyerSafetyBlocks,
  comparison,
  confusedBuyerCards,
  demos,
  faq,
  featuredCase,
  formatOptions,
  founderProof,
  howItWorks,
  included,
  lowTouchSteps,
  niches,
  orderPlans,
  orderFlow,
  packages,
  proofObjections,
  proofItems,
  routes,
  salesFlowSteps,
  siteConfig,
  supportIssueTypes,
  testimonial,
  testimonialProofBlocks,
  trustBadges,
  useCases,
  whyItems,
} from "./content";
import {
  createFeedback,
  createOrder,
  createPayment,
  createTicket,
  approveVideoScripts,
  calculateOrderPricing,
  generateRoteiro,
  getBriefTextLimit,
  getOrder,
  getPackage,
  getVideoScripts,
  lookupOrder,
} from "./salesFlow";
import { getChatSessionId, sendAiChatMessage } from "./aiFlow";
import { ApiClientError } from "./apiClient";
import type {
  BriefFormData,
  BriefInputType,
  OrderRecord,
  PackageId,
  PlanId,
  RoteiroGeneration,
  VideoScriptReview,
  PaymentMethod,
} from "./salesFlow";
import type { AiRateLimitStatus, SafeOrderStatus } from "./apiContracts";

type Demo = (typeof demos)[number];

const packageIds = packages.map((pack) => pack.id) as PackageId[];

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function getUserError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir esta etapa. Tente novamente.";
}

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getQuotaFromError(error: unknown): AiRateLimitStatus | null {
  if (!(error instanceof ApiClientError) || (!error.details && error.code !== "RATE_LIMITED")) return null;
  const details = error.details ?? {};
  const limit = Number(details.limit) || 5;
  const retryAfterSeconds = Number(details.retryAfterSeconds) || 3600;
  return {
    limit,
    used: Number(details.used) || limit,
    remaining: Math.max(0, Number(details.remaining) || 0),
    retryAfterSeconds,
    resetAt: typeof details.resetAt === "string" && details.resetAt
      ? details.resetAt
      : new Date(Date.now() + retryAfterSeconds * 1000).toISOString(),
  };
}

const orderStatusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  PLAN_APPROVED: "Plano aprovado",
  PAYMENT_PENDING: "Aguardando pagamento",
  SCRIPT_GENERATION_PENDING: "Criando roteiros",
  SCRIPT_REVIEW: "Roteiros prontos para revisão",
  SCRIPTS_APPROVED: "Roteiros aprovados",
  IN_QUEUE: "Na fila de produção",
  IN_PRODUCTION: "Em produção",
  DELIVERED: "Entregue",
  REVISION_REQUESTED: "Ajustes solicitados",
  CANCELLED: "Cancelado",
};

const paymentStatusLabels: Record<string, string> = {
  PAYMENT_PENDING: "Aguardando pagamento",
  PAID: "Pago",
  FAILED: "Não aprovado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const appBasePath = normalizeBasePath(import.meta.env.BASE_URL ?? "/");

function normalizeBasePath(value: string) {
  if (!value || value === "/") return "";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

function toBrowserPath(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${appBasePath}${path}`;
}

function currentRoutePath() {
  const pathname = window.location.pathname;
  if (appBasePath && pathname === appBasePath) return "/";
  return appBasePath && pathname.startsWith(`${appBasePath}/`)
    ? pathname.slice(appBasePath.length) || "/"
    : pathname;
}

function publicReturnBaseUrl() {
  return `${window.location.origin}${appBasePath}`;
}

function routeTo(path: string) {
  window.history.pushState({}, "", toBrowserPath(path));
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getQueryParam(name: string) {
  return new URLSearchParams(window.location.search).get(name);
}

function packageHref(packageId: PackageId) {
  return `${routes.brief}?package=${packageId}`;
}

function PrimaryLink({
  href,
  children,
  className = "",
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      className={`cta ${className}`}
      href={toBrowserPath(href)}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
        routeTo(href);
      }}
    >
      <span className="cta-dot" aria-hidden="true" />
      {children}
    </a>
  );
}

function SectionIntro({
  eyebrow,
  title,
  children,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={`section-intro ${align === "center" ? "centered" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

function SiteNav({ onChatOpen }: { onChatOpen: () => void }) {
  return (
    <nav className="nav" aria-label="Navegação principal">
      <a
        className="brand"
        href={routes.home}
        aria-label="Ir para o início"
        onClick={(event) => {
          event.preventDefault();
          routeTo(routes.home);
        }}
      >
        <span className="brand-mark" aria-hidden="true">W</span>
        {siteConfig.brandName}
      </a>
      <div className="nav-links">
        <a href={`${routes.home}#demos`}>Demos</a>
        <a href={`${routes.home}#pacotes`}>Pacotes</a>
        <a
          href={routes.support}
          onClick={(event) => {
            event.preventDefault();
            routeTo(routes.support);
          }}
        >
          Suporte
        </a>
        <button className="nav-chat" type="button" onClick={onChatOpen}>
          Assistente
        </button>
      </div>
    </nav>
  );
}

function HeroVideoCard() {
  const [isPlaying, setIsPlaying] = useState(false);
  const heroEmbedUrl = `https://www.youtube.com/embed/${siteConfig.heroYoutubeId}?autoplay=1&rel=0`;

  return (
    <div className="hero-video-card" aria-label="Exemplo de vídeo explicativo">
      <div className="video-frame">
        {isPlaying ? (
          <iframe
            src={heroEmbedUrl}
            title={siteConfig.heroVideoTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="hero-poster"
            onClick={() => {
              setIsPlaying(true);
              trackEvent("demo_video_click", { demo_topic: "hero-youtube", niche: "general" });
            }}
            aria-label={`Assistir: ${siteConfig.heroVideoTitle}`}
          >
            <img
              src={siteConfig.heroPosterUrl}
              alt={siteConfig.heroVideoTitle}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = siteConfig.heroImageUrl;
              }}
            />
            <span className="play-badge hero-play" aria-hidden="true">▶</span>
          </button>
        )}
        <div className="video-label">
          <span>Exemplo no YouTube</span>
          <strong>Imóveis • Pousadas • Construção</strong>
        </div>
      </div>
    </div>
  );
}

function Hero({ onChatOpen }: { onChatOpen: () => void }) {
  return (
    <header className="hero" id="topo">
      <SiteNav onChatOpen={onChatOpen} />

      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Whiteboard profissional para negócios no Brasil</p>
          <h1>Transforme sua oferta em vídeos curtos para Instagram, YouTube e anúncios</h1>
          <p className="hero-lede">
            Criamos vídeos em estilo whiteboard para explicar serviços, processos e diferenciais
            com roteiro, visual, aprovação antes do pagamento e entrega pronta para publicar.
          </p>
          <p className="package-line">
            Escolha 30, 60 ou 120 segundos. Envie um texto para o vídeo ou uma ideia,
            receba o texto de narração e, no plano mensal, os temas do mês para aprovar antes do checkout.
          </p>
          <div className="hero-actions">
            <PrimaryLink
              href={packageHref("standard-60")}
              onClick={() => trackEvent("primary_cta_click", { cta_location: "hero" })}
            >
              Pedir vídeo
            </PrimaryLink>
            <button className="secondary-link button-link" type="button" onClick={onChatOpen}>
              Falar com assistente
            </button>
          </div>
        </div>
        <HeroVideoCard />
      </div>
    </header>
  );
}

function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Benefícios rápidos">
      {trustBadges.map((badge) => (
        <span key={badge}>{badge}</span>
      ))}
    </section>
  );
}

function ConfusedBuyerSection() {
  return (
    <section className="section confused-section" id="problema">
      <div className="confused-copy">
        <p className="eyebrow">O problema que trava a venda</p>
        <h2>Cliente confuso não compra.</h2>
        <p>
          Se a pessoa não entende o valor antes de perguntar preço, a conversa comercial começa
          mais difícil. Um vídeo explicativo ajuda seu cliente a entender o problema, a solução e
          o próximo passo antes da decisão.
        </p>
      </div>
      <div className="outcome-grid">
        {confusedBuyerCards.map((card) => (
          <article className="outcome-card" key={card.title}>
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NicheCards() {
  return (
    <section className="section" id="nichos">
      <SectionIntro
        eyebrow="Escolha seu contexto"
        title="Três nichos onde explicação curta ajuda a conversa de venda"
      >
        O vídeo whiteboard entra onde a imagem sozinha não explica processo, dúvida, risco ou
        diferencial.
      </SectionIntro>
      <div className="cards three">
        {niches.map((niche) => (
          <article className="card niche-card" key={niche.id}>
            <div className="niche-mark" aria-hidden="true">{niche.mark}</div>
            <p className="card-kicker">{niche.eyebrow}</p>
            <h3>{niche.title}</h3>
            <p>{niche.description}</p>
            <ul>
              {niche.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
            <p className="note">{niche.reminder}</p>
            <a
              href="#demos"
              className="small-button"
              onClick={() => trackEvent("niche_card_click", { niche: niche.id })}
            >
              {niche.cta}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function DemoModal({ demo, onClose }: { demo: Demo | null; onClose: () => void }) {
  if (!demo) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="video-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar vídeo">
          ×
        </button>
        <div className="youtube-frame">
          <iframe
            src={`${demo.videoUrl}?autoplay=1&rel=0`}
            title={demo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="modal-copy">
          <p className="eyebrow">{demo.nicheLabel}</p>
          <h3 id="demo-modal-title">{demo.title}</h3>
          <p>{demo.caption}</p>
          <PrimaryLink
            href={`${packageHref("standard-60")}&demo=${demo.id}`}
            onClick={() =>
              trackEvent("package_brief_click", {
                cta_location: "demo_modal",
                demo_topic: demo.id,
                niche: demo.niche,
              })
            }
          >
            Pedir vídeo parecido
          </PrimaryLink>
        </div>
      </div>
    </div>
  );
}

function DemoPortfolio() {
  const [activeDemo, setActiveDemo] = useState<Demo | null>(null);

  return (
    <section className="section paper-band" id="demos">
      <SectionIntro
        eyebrow="Demos reais no YouTube"
        title="Veja como a explicação fica quando vira vídeo"
      >
        Nove exemplos organizados por nicho, com temas prontos para negócios que precisam educar,
        explicar e apoiar vendas.
      </SectionIntro>
      <div className="demo-grid">
        {demos.map((demo) => (
          <button
            type="button"
            className="demo-card"
            key={demo.id}
            onClick={() => {
              setActiveDemo(demo);
              trackEvent("demo_video_click", {
                niche: demo.niche,
                demo_topic: demo.id,
              });
            }}
          >
            <span className="demo-thumb">
              <img
                src={demo.thumbnailUrl}
                alt={`Thumbnail do vídeo: ${demo.title}`}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = demo.thumbnailFallbackUrl;
                }}
              />
              <span className="play-badge" aria-hidden="true">▶</span>
              <span className="demo-id">{demo.niche}</span>
            </span>
            <span className="demo-niche">{demo.nicheLabel}</span>
            <strong>{demo.title}</strong>
            <p>{demo.caption}</p>
            <span className="demo-action">Assistir demo</span>
          </button>
        ))}
      </div>
      <div className="center-cta">
        <PrimaryLink
          href={packageHref("standard-60")}
          onClick={() => trackEvent("primary_cta_click", { cta_location: "portfolio" })}
        >
          Quero uma ideia para o meu negócio
        </PrimaryLink>
      </div>
      <DemoModal demo={activeDemo} onClose={() => setActiveDemo(null)} />
    </section>
  );
}

function FeaturedCase() {
  return (
    <section className="section case-study-section">
      <SectionIntro eyebrow="Mini-case" title={featuredCase.title}>
        Um exemplo de como uma mensagem extensa pode virar uma explicação visual clara, sem inventar métricas que não foram medidas.
      </SectionIntro>
      <div className="case-study-body">
        <div className="case-study-grid">
          <article>
            <span>01</span>
            <h3>Desafio</h3>
            <p>{featuredCase.challenge}</p>
          </article>
          <article>
            <span>02</span>
            <h3>Solução</h3>
            <p>{featuredCase.solution}</p>
          </article>
          <article>
            <span>03</span>
            <h3>O que foi criado</h3>
            <p>{featuredCase.created}</p>
          </article>
        </div>
        <div className="case-video-card">
          <div className="youtube-frame">
            <iframe
              src={`https://www.youtube.com/embed/${featuredCase.youtubeId}?rel=0`}
              title="Mini-case em vídeo whiteboard sobre autoridade local"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="video-label">
            <span>Case incorporado</span>
            <strong>Assista sem sair da página</strong>
          </div>
        </div>
      </div>
      <div className="case-study-footer">
        <p>{featuredCase.note}</p>
      </div>
    </section>
  );
}

function FounderSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="section founder-section">
      <div className="founder-media">
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${siteConfig.founderYoutubeId}?autoplay=1&rel=0`}
            title="Apresentação de Ruslan, artista de animação whiteboard"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className="founder-poster" onClick={() => setPlaying(true)} aria-label="Assistir apresentação de Ruslan">
            <img src={siteConfig.founderPosterUrl} alt="Ruslan, artista de animação especialista em whiteboard" loading="lazy" />
            <span aria-hidden="true">▶</span>
          </button>
        )}
      </div>
      <div className="founder-copy">
        <p className="eyebrow">Produção pessoal</p>
        <h2>{founderProof.title}</h2>
        <p>{founderProof.text}</p>
        <ul className="check-list">
          {founderProof.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
        <a className="secondary-link" href={siteConfig.upworkProfileUrl} target="_blank" rel="noreferrer">
          Ver perfil no Upwork
        </a>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="section" id="processo">
      <SectionIntro
        eyebrow="Como funciona"
        title="Um processo simples, do brief ao checkout"
      />
      <ol className="timeline">
        {howItWorks.map((step, index) => (
          <li key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {step}
          </li>
        ))}
      </ol>
      <p className="monthly-note">
        No plano mensal, o primeiro passo é uma pré-análise para organizar temas e volume.
      </p>
    </section>
  );
}

function LowTouchSection() {
  return (
    <section className="section low-touch-section">
      <SectionIntro
        eyebrow="Pouco trabalho para o cliente"
        title="Você não precisa chegar com roteiro perfeito"
      >
        O fluxo foi pensado para negócios que querem publicar rápido sem transformar o pedido em
        dezenas de mensagens.
      </SectionIntro>
      <div className="low-touch-grid">
        {lowTouchSteps.map((step, index) => (
          <article key={step.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FormatOptions() {
  return (
    <section className="section format-section">
      <SectionIntro
        eyebrow="Formatos"
        title="O cliente escolhe o canal, o pacote deixa claro o arquivo final"
      >
        Assim a pessoa entende se está pagando por um único formato ou por versões adaptadas para
        mais de uma plataforma.
      </SectionIntro>
      <div className="format-grid">
        {formatOptions.map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Packages() {
  return (
    <section className="section paper-band" id="pacotes">
      <SectionIntro
        eyebrow="Pacotes"
        title="Preço, duração, formato e prazo sem surpresa"
      >
        Escolha a duração primeiro. No brief, decida entre um vídeo avulso ou 4 a 8 vídeos por mês com desconto.
      </SectionIntro>
      <div className="packages">
        {packages.map((pack) => (
          <article
            className={`package-card ${pack.recommended ? "featured" : ""}`}
            key={pack.id}
            onClick={(event) => {
              if (!(event.target as HTMLElement).closest(".cta")) {
                trackEvent("package_card_click", { package: pack.id, cta_location: "packages" });
              }
            }}
          >
            <span className="package-badge">{pack.badge}</span>
            <h3>{pack.name}</h3>
            <p className="price">{pack.priceLabel}</p>
            <p>{pack.summary}</p>
            <div className="package-meta">
              <span>{pack.durationLabel}</span>
              <span>{pack.formatLabel}</span>
              <span>{pack.deliveryLabel}</span>
              {pack.revisionsLabel && <span>{pack.revisionsLabel}</span>}
            </div>
            <ul>
              {pack.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="package-monthly-options" aria-label="Opções de quantidade">
              <strong>Também disponível:</strong>
              <span>4 vídeos/mês: {formatBRL(Math.round(pack.price * 4 * 0.9))} (10% de desconto)</span>
              <span>8 vídeos/mês: {formatBRL(Math.round(pack.price * 8 * 0.85))} (15% de desconto)</span>
            </div>
            <PrimaryLink
              href={packageHref(pack.id as PackageId)}
              onClick={() =>
                trackEvent("package_brief_click", { package: pack.id, cta_location: "packages" })
              }
            >
              {pack.cta}
            </PrimaryLink>
          </article>
        ))}
      </div>
    </section>
  );
}

function OrderFlowSection() {
  return (
    <section className="section order-section" id="pedido">
      <div>
        <p className="eyebrow">Depois do pedido</p>
        <h2>Pedido com ID, status e canal oficial por email</h2>
        <p>
          Depois de confirmar o escopo e o pagamento, você recebe um número de pedido. Use esse
          número com o email informado para consultar o andamento ou pedir suporte.
        </p>
      </div>
      <div className="order-flow">
        {orderFlow.map((step, index) => (
          <div className="order-step" key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function UseCasesIncluded() {
  return (
    <section className="section two-columns">
      <div>
        <SectionIntro eyebrow="Onde usar" title="Um vídeo, vários pontos do funil" />
        <div className="use-case-grid">
          {useCases.map((item) => (
            <article className="use-case-card" key={item.title}>
              <span className={`use-case-icon ${item.icon}`} aria-hidden="true" />
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div>
        <SectionIntro eyebrow="O que você recebe" title="O que você recebe em cada vídeo" />
        <ul className="check-list">
          {included.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function WhyWhiteboard() {
  return (
    <section className="section why-grid">
      <SectionIntro
        eyebrow="Por que whiteboard"
        title="Ideal quando o cliente precisa entender antes de comprar"
      />
      {whyItems.map((item) => (
        <article key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </article>
      ))}
    </section>
  );
}

function Comparison() {
  return (
    <section className="section comparison-section">
      <SectionIntro eyebrow="Comparação honesta" title="Onde este serviço se encaixa entre as alternativas" />
      <div className="comparison-table">
        {comparison.map((row) => (
          <div className={`comparison-row ${row.featured ? "featured-row" : ""}`} key={row.option}>
            <strong>{row.option}</strong>
            <p>{row.tradeoff}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProofSection() {
  return (
    <section className="section proof-section">
      <SectionIntro
        eyebrow="Prova e confiança"
        title="Veja exemplos, entenda o processo e saiba o que será entregue"
      >
        A confiança vem de três pontos: assistir demos reais, entender o fluxo do pedido e ver as
        principais dúvidas respondidas antes de iniciar o brief.
      </SectionIntro>
      <article className="testimonial-card" aria-label="Avaliação real de cliente no Upwork">
        <div>
          <span className="package-badge">{testimonial.platform}</span>
          <h3>{testimonial.project}</h3>
          <p className="testimonial-meta">
            ★★★★★ {testimonial.rating} • {testimonial.period} • {testimonial.price}
          </p>
          <blockquote>“{testimonial.quote}”</blockquote>
        </div>
        <div className="testimonial-tags">
          {testimonial.highlights.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>
      <div className="testimonial-proof-grid" aria-label="O que o review comprova">
        {testimonialProofBlocks.map((item) => (
          <article key={item.title}>
            <span className={`testimonial-proof-icon ${item.icon}`} aria-hidden="true" />
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
      <div className="buyer-safety-strip" aria-label="Como o pedido fica seguro">
        {buyerSafetyBlocks.map((item, index) => (
          <article key={item.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="proof-layout">
        <div className="trust-map" aria-label="Caminho seguro do pedido">
          <strong>Seu pedido, sem surpresa</strong>
          <div><span>1</span> Veja demos reais</div>
          <div><span>2</span> Escolha pacote e quantidade</div>
          <div><span>3</span> Confira roteiro e preço</div>
          <div><span>4</span> Receba ID e acompanhe</div>
        </div>
        <div className="proof-grid">
          {proofItems.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="objection-board" aria-label="Dúvidas respondidas antes do pedido">
        <h3>Dúvidas resolvidas antes do pedido</h3>
        <div className="objection-grid">
          {proofObjections.map((item) => (
            <article key={item.doubt}>
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.doubt}</strong>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(faq[0]?.question ?? null);

  return (
    <section className="section paper-band" id="faq">
      <SectionIntro
        eyebrow="FAQ"
        title="Perguntas que normalmente aparecem antes do primeiro pedido"
      />
      <div className="faq-list">
        {faq.map((item) => {
          const isOpen = openQuestion === item.question;

          return (
            <div className="faq-item" key={item.question}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpenQuestion(isOpen ? null : item.question);
                  if (!isOpen) {
                    trackEvent("faq_expand", { question: item.question });
                  }
                }}
              >
                {item.question}
                <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && <p>{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FinalCTA({ onChatOpen }: { onChatOpen: () => void }) {
  return (
    <section className="section final-cta" id="contato">
      <p className="eyebrow">Próximo passo</p>
      <h2>Quer começar seu vídeo explicativo agora?</h2>
      <p>
        Escolha um pacote, envie seu texto ou ideia e aprove o texto de narração antes de seguir para o
        checkout.
      </p>
      <div className="hero-actions">
        <PrimaryLink
          href={packageHref("standard-60")}
          onClick={() => trackEvent("final_cta_click", { cta_location: "final" })}
        >
          Começar meu vídeo agora
        </PrimaryLink>
        <button className="secondary-link button-link" type="button" onClick={onChatOpen}>
          Falar com assistente
        </button>
      </div>
    </section>
  );
}

function HomePage({ onChatOpen }: { onChatOpen: () => void }) {
  return (
    <>
      <Hero onChatOpen={onChatOpen} />
      <main>
        <TrustStrip />
        <ConfusedBuyerSection />
        <NicheCards />
        <DemoPortfolio />
        <FeaturedCase />
        <HowItWorks />
        <LowTouchSection />
        <FounderSection />
        <Packages />
        <ProofSection />
        <FormatOptions />
        <OrderFlowSection />
        <UseCasesIncluded />
        <WhyWhiteboard />
        <Comparison />
        <FAQ />
        <FinalCTA onChatOpen={onChatOpen} />
      </main>
    </>
  );
}

function PageShell({
  eyebrow,
  title,
  children,
  onChatOpen,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  onChatOpen: () => void;
}) {
  return (
    <>
      <header className="hero route-hero">
        <SiteNav onChatOpen={onChatOpen} />
        <div className="route-title">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}

function BriefPage({ onChatOpen }: { onChatOpen: () => void }) {
  const initialPackageId = useMemo(() => {
    const queryPackage = getQueryParam("package") as PackageId | null;
    return queryPackage && packageIds.includes(queryPackage) ? queryPackage : "standard-60";
  }, []);
  const [form, setForm] = useState<BriefFormData>({
    packageId: initialPackageId,
    planId: "single",
    clientName: "",
    email: "",
    niche: "Imóveis",
    inputType: "idea",
    briefText: "",
    format: "9:16",
    voice: "Feminina",
    expressDelivery: false,
  });
  const [generation, setGeneration] = useState<RoteiroGeneration | null>(null);
  const [editorialPlanApproved, setEditorialPlanApproved] = useState(false);
  const [narrativeApproved, setNarrativeApproved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generationQuota, setGenerationQuota] = useState<AiRateLimitStatus | null>(null);
  const [quotaNow, setQuotaNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const selectedPackage = getPackage(form.packageId);
  const selectedPlan = orderPlans.find((plan) => plan.id === form.planId) ?? orderPlans[0];
  const pricing = calculateOrderPricing(form);
  const isMonthly = selectedPlan.quantity > 1;
  const selectedInputType = briefInputTypes.find((option) => option.id === form.inputType) ?? briefInputTypes[1];
  const briefTextLimit = getBriefTextLimit(form.inputType, form.planId);
  const briefCharactersRemaining = briefTextLimit - form.briefText.length;
  const briefExceedsLimit = briefCharactersRemaining < 0;
  const briefIsNearLimit = form.briefText.length >= briefTextLimit * 0.9;
  const quotaResetTime = generationQuota?.resetAt ? Date.parse(generationQuota.resetAt) : 0;
  const quotaSecondsLeft = quotaResetTime > quotaNow
    ? Math.ceil((quotaResetTime - quotaNow) / 1000)
    : 0;
  const quotaRemaining = generationQuota
    ? quotaSecondsLeft > 0 ? generationQuota.remaining : generationQuota.limit
    : 5;
  const quotaLimit = generationQuota?.limit ?? 5;
  const quotaBlocked = quotaRemaining === 0 && quotaSecondsLeft > 0;
  const hasInputContext = form.briefText.trim().length > 8;
  const canGenerate =
    form.clientName.trim().length > 1 &&
    form.email.includes("@") &&
    hasInputContext &&
    !briefExceedsLimit &&
    !quotaBlocked;

  useEffect(() => {
    if (!generationQuota || !quotaResetTime || quotaResetTime <= Date.now()) return;
    setQuotaNow(Date.now());
    const interval = window.setInterval(() => setQuotaNow(Date.now()), 1000);
    const timeout = window.setTimeout(() => {
      setQuotaNow(Date.now());
      window.clearInterval(interval);
    }, Math.max(0, quotaResetTime - Date.now()) + 100);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [generationQuota, quotaResetTime]);

  function updateField<K extends keyof BriefFormData>(key: K, value: BriefFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "email") {
      setGenerationQuota(null);
      setQuotaNow(Date.now());
    }
    setGeneration(null);
    setEditorialPlanApproved(false);
    setNarrativeApproved(false);
    setGenerationError("");
  }

  async function handleGenerate() {
    if (!canGenerate || generating) return;
    setGenerating(true);
    setGenerationError("");
    setGeneration(null);
    setEditorialPlanApproved(false);
    setNarrativeApproved(false);
    try {
      const result = await generateRoteiro(form);
      setGeneration(result.generation);
      if (result.quota) setGenerationQuota(result.quota);
      trackEvent("brief_generate_roteiro", { package: form.packageId, input_type: form.inputType });
    } catch (error) {
      const nextQuota = getQuotaFromError(error);
      if (nextQuota) setGenerationQuota(nextQuota);
      setGenerationError(getUserError(error));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const approvalsReady = narrativeApproved && (!isMonthly || editorialPlanApproved);
    if (!approvalsReady || !generation || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const order = await createOrder(form, generation, {
        editorialPlanApproved: isMonthly ? editorialPlanApproved : true,
        narrativeApproved,
      });
      trackEvent("brief_checkout_click", { package: form.packageId, order_id: order.orderId });
      routeTo(`${routes.checkout}?order=${order.orderId}`);
    } catch (error) {
      setSubmitError(getUserError(error));
    } finally {
      setSubmitting(false);
    }
  }

  function updateTopic(index: number, key: "topic" | "objective", value: string) {
    setGeneration((current) => current ? {
      ...current,
      editorialPlan: current.editorialPlan.map((topic, topicIndex) => (
        topicIndex === index ? { ...topic, [key]: value } : topic
      )),
    } : current);
    setEditorialPlanApproved(false);
  }

  function updateVoiceover(value: string) {
    setGeneration((current) => current ? {
      ...current,
      firstVoiceover: value,
      wordCount: value.trim() ? value.trim().split(/\s+/).length : 0,
    } : current);
    setNarrativeApproved(false);
  }

  return (
    <PageShell eyebrow="Brief + roteiro" title="Prepare seu pedido antes do pagamento" onChatOpen={onChatOpen}>
      <section className="section flow-section">
        <div className="flow-steps">
          {salesFlowSteps.map((step, index) => (
            <span key={step}>{String(index + 1).padStart(2, "0")} {step}</span>
          ))}
        </div>
        <div className="checkout-grid">
          <form className="flow-form" onSubmit={handleSubmit}>
            <div className="selected-package">
              <span className="package-badge">Pacote selecionado</span>
              <h2>{selectedPackage.name}</h2>
              <p>A partir de {selectedPackage.priceLabel}</p>
              <small>{selectedPackage.durationLabel} • {selectedPackage.deliveryLabel}</small>
            </div>

            <label>
              Duração do vídeo
              <select value={form.packageId} onChange={(event) => updateField("packageId", event.target.value as PackageId)}>
                {packages.map((pack) => (
                  <option key={pack.id} value={pack.id}>{pack.durationLabel} — {pack.priceLabel}</option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend>Quantidade</legend>
              <div className="choice-grid plan-choice-grid">
                {orderPlans.map((plan) => (
                  <label className={`choice-card ${form.planId === plan.id ? "selected-choice" : ""}`} key={plan.id}>
                    <input
                      type="radio"
                      name="planId"
                      checked={form.planId === plan.id}
                      onChange={() => updateField("planId", plan.id as PlanId)}
                    />
                    <strong>{plan.label}</strong>
                    <span>{plan.note}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              Nome
              <input value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            </label>
            <label>
              Nicho
              <select value={form.niche} onChange={(event) => updateField("niche", event.target.value)}>
                {niches.map((niche) => (
                  <option key={niche.id} value={niche.title}>{niche.title}</option>
                ))}
                <option value="Outro">Outro</option>
              </select>
            </label>

            <fieldset>
              <legend>O que você já tem para começar?</legend>
              <div className="choice-grid input-choice-grid">
                {briefInputTypes.map((option) => (
                  <label className={`choice-card input-choice-card ${form.inputType === option.id ? "selected-choice" : ""}`} key={option.id}>
                    <input
                      type="radio"
                      name="inputType"
                      checked={form.inputType === option.id}
                      onChange={() => updateField("inputType", option.id as BriefInputType)}
                    />
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                    <small><b>Resultado:</b> {option.result}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              {selectedInputType.fieldLabel}
              <textarea
                value={form.briefText}
                onChange={(event) => updateField("briefText", event.target.value)}
                maxLength={briefTextLimit}
                placeholder={selectedInputType.placeholder}
              />
              <span className="brief-field-meta">
                <small>{selectedInputType.helper} A prévia e os demais roteiros usarão somente o conteúdo aprovado neste pedido.</small>
                <small className={briefIsNearLimit ? "character-count near-limit" : "character-count"} aria-live="polite">
                  {briefExceedsLimit
                    ? `Reduza ${Math.abs(briefCharactersRemaining).toLocaleString("pt-BR")} caracteres`
                    : `Restam ${briefCharactersRemaining.toLocaleString("pt-BR")} de ${briefTextLimit.toLocaleString("pt-BR")} caracteres`}
                </small>
              </span>
            </label>
            <div className="form-row">
              <label>
                Formato
                <select value={form.format} onChange={(event) => updateField("format", event.target.value as BriefFormData["format"])}>
                  <option value="9:16">9:16 Reels / Shorts</option>
                  <option value="16:9">16:9 YouTube / site</option>
                  <option value="9:16 + 16:9">9:16 + 16:9 (+{formatBRL(selectedPackage.dualFormatPrice)} por vídeo)</option>
                </select>
              </label>
              <label>
                Voz
                <select value={form.voice} onChange={(event) => updateField("voice", event.target.value as BriefFormData["voice"])}>
                  <option value="Feminina">Feminina</option>
                  <option value="Masculina">Masculina</option>
                </select>
              </label>
            </div>

            <label className="approval-check express-check">
              <input
                type="checkbox"
                checked={form.expressDelivery}
                onChange={(event) => updateField("expressDelivery", event.target.checked)}
              />
              <span>
                <strong>Entrega expressa em 24 horas: +{formatBRL(selectedPackage.expressPrice)}</strong>
                {selectedPlan.quantity > 1 && <small>Aplicada à primeira entrega do plano mensal.</small>}
              </span>
            </label>

            <div className={`generation-quota ${quotaBlocked ? "quota-blocked" : ""}`} role="status">
              <div>
                <strong>{quotaRemaining} de {quotaLimit} prévias disponíveis</strong>
                <span>
                  {quotaBlocked
                    ? `Nova prévia disponível em ${formatCountdown(quotaSecondsLeft)}`
                    : "Somente prévias concluídas consomem o limite"}
                </span>
              </div>
              <meter min="0" max={quotaLimit} value={quotaRemaining} aria-label={`${quotaRemaining} gerações disponíveis`} />
            </div>

            <button className="small-button" type="button" disabled={!canGenerate || generating} onClick={handleGenerate}>
              {generating ? "Criando prévia com AI..." : isMonthly ? "Gerar temas + primeiro VO" : "Gerar VO com AI"}
            </button>

            {generationError && <p className="form-error" role="alert">{generationError}</p>}

            {generation && isMonthly && (
              <label className="approval-check">
                <input
                  type="checkbox"
                  checked={editorialPlanApproved}
                  onChange={(event) => setEditorialPlanApproved(event.target.checked)}
                />
                Aprovo os temas do plano editorial.
              </label>
            )}

            {generation && (
              <label className="approval-check">
                <input
                  type="checkbox"
                  checked={narrativeApproved}
                  onChange={(event) => setNarrativeApproved(event.target.checked)}
                />
                {isMonthly
                  ? "Aprovo o tom e o formato do primeiro roteiro."
                  : "Aprovo o texto de narração deste vídeo."}
              </label>
            )}

            {generation && isMonthly && (
              <p className="form-note">
                Após a confirmação do pagamento, os outros {selectedPlan.quantity - 1} textos de narração
                serão criados a partir destes temas e enviados para sua revisão.
              </p>
            )}

            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button
              className="cta"
              type="submit"
              disabled={!generation || !narrativeApproved || (isMonthly && !editorialPlanApproved) || submitting}
            >
              {submitting ? "Salvando pedido..." : "Continuar para checkout"}
            </button>
          </form>

          <aside className="roteiro-preview">
            <span className="package-badge">Resumo do pedido</span>
            <h2>{formatBRL(pricing.total)}</h2>
            <div className="price-breakdown">
              <span><b>{pricing.quantity}× vídeo</b><b>{formatBRL(pricing.baseSubtotal)}</b></span>
              {pricing.formatAddon > 0 && <span><b>Segundo formato</b><b>+{formatBRL(pricing.formatAddon)}</b></span>}
              {pricing.discountAmount > 0 && <span className="discount-line"><b>Desconto mensal ({Math.round(pricing.discountRate * 100)}%)</b><b>-{formatBRL(pricing.discountAmount)}</b></span>}
              {pricing.expressAddon > 0 && <span><b>Entrega expressa</b><b>+{formatBRL(pricing.expressAddon)}</b></span>}
              <span className="price-total"><b>Total</b><b>{formatBRL(pricing.total)}</b></span>
            </div>
            {pricing.quantity > 1 && <p className="price-per-video">Média de {formatBRL(pricing.perVideo)} por vídeo.</p>}
            <span className="package-badge">Prévia editorial</span>
            {generating ? (
              <p aria-busy="true">Analisando o brief, a duração e o material de referência...</p>
            ) : generation ? (
              <div className="generation-preview">
                <h2>{isMonthly ? `${generation.editorialPlan.length} temas do mês` : "Tema do vídeo"}</h2>
                <div className="editorial-topic-list">
                  {generation.editorialPlan.map((topic, index) => (
                    <div className="editorial-topic" key={topic.sequence}>
                      <span>{String(topic.sequence).padStart(2, "0")}</span>
                      <label>
                        Tema
                        <input value={topic.topic} onChange={(event) => updateTopic(index, "topic", event.target.value)} />
                      </label>
                      <label>
                        Objetivo
                        <textarea value={topic.objective} onChange={(event) => updateTopic(index, "objective", event.target.value)} />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="voiceover-editor">
                  <h2>Texto de narração {isMonthly ? "do vídeo 1" : ""}</h2>
                  <p>{generation.wordCount} palavras • alvo de {generation.estimatedSeconds} segundos</p>
                  <textarea
                    value={generation.firstVoiceover}
                    onChange={(event) => updateVoiceover(event.target.value)}
                    aria-label="Texto de narração editável"
                  />
                </div>
              </div>
            ) : (
              <p>Preencha o brief e gere a prévia para revisar os temas e o texto de narração antes do checkout.</p>
            )}
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

function CheckoutPage({ onChatOpen }: { onChatOpen: () => void }) {
  const [order, setOrder] = useState<OrderRecord | null>(() => getOrder(getQueryParam("order")));
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  async function handlePayment() {
    if (!order) {
      return;
    }

    setPaymentLoading(true);
    setPaymentError("");
    try {
      const payment = await createPayment(order, method, publicReturnBaseUrl());
      trackEvent("checkout_payment_click", {
        order_id: payment.orderId,
        payment_method: method,
        payment_status: payment.paymentStatus,
      });
      window.location.assign(payment.checkoutLink);
    } catch (error) {
      setPaymentError(getUserError(error));
    } finally {
      setPaymentLoading(false);
    }
  }

  return (
    <PageShell eyebrow="Checkout" title="Revise o pedido e siga para pagamento" onChatOpen={onChatOpen}>
      <section className="section checkout-grid">
        {!order ? (
          <div className="empty-state">
            <h2>Pedido não encontrado</h2>
            <p>Volte ao brief para gerar um Order ID antes do checkout.</p>
            <PrimaryLink href={packageHref("standard-60")}>Começar brief</PrimaryLink>
          </div>
        ) : (
          <>
            <article className="checkout-summary">
              <span className="package-badge">Order ID</span>
              <h2>{order.orderId}</h2>
              <p>{order.packageName}</p>
              <div className="package-meta">
                <span>Total: {formatBRL(order.price)}</span>
                <span>Quantidade: {order.pricing?.quantity ?? 1} vídeo(s)</span>
                <span>Formato: {order.format}</span>
                <span>Previsão da primeira entrega: {order.dueDate}</span>
              </div>
              {order.generation?.editorialPlan?.length > 1 && (
                <>
                  <h3>Plano editorial aprovado</h3>
                  <ol className="checkout-topic-list">
                    {order.generation.editorialPlan.map((topic) => (
                      <li key={topic.sequence}>
                        <strong>{topic.topic}</strong>
                        <span>{topic.objective}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="form-note">
                    O texto do vídeo 1 já está aprovado. Os outros {order.generation.editorialPlan.length - 1}
                    textos serão gerados após a confirmação do pagamento e ficarão disponíveis para revisão.
                  </p>
                </>
              )}
              <h3>Texto de narração aprovado{order.pricing.quantity > 1 ? " • vídeo 1" : ""}</h3>
              <pre>{order.generation?.firstVoiceover ?? order.generatedRoteiro}</pre>
            </article>
            <form className="flow-form payment-panel">
              <span className="package-badge">Pagamento</span>
              <h2>Escolha como pagar</h2>
              <p>
                Confira o valor e escolha PIX ou cartão. A confirmação do pedido será enviada para
                o email informado no brief.
              </p>
              <label>
                Método
                <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                  <option value="PIX">PIX</option>
                  <option value="Cartão">Cartão</option>
                </select>
              </label>
              {paymentError && <p className="form-error" role="alert">{paymentError}</p>}
              <button className="cta" type="button" onClick={handlePayment} disabled={paymentLoading}>
                {paymentLoading ? "Criando checkout..." : "Ir para Mercado Pago"}
              </button>
              <p className="form-note">
                O pagamento é finalizado no ambiente seguro do Mercado Pago. O pedido muda de status
                automaticamente quando a confirmação chegar.
              </p>
            </form>
          </>
        )}
      </section>
    </PageShell>
  );
}

function OrderSuccessPage({ onChatOpen }: { onChatOpen: () => void }) {
  const order = getOrder(getQueryParam("order"));

  return (
    <PageShell eyebrow="Pedido recebido" title="Seu pedido entrou na fila" onChatOpen={onChatOpen}>
      <section className="section success-panel">
        <span className="package-badge">Confirmação</span>
        <h2>{order?.orderId ?? "Order ID indisponível"}</h2>
        <p>
          O status oficial será enviado por email. Para consultar o pedido depois, use o Order ID
          junto com o mesmo email informado no brief.
        </p>
        <div className="hero-actions">
          {order && order.pricing.quantity > 1 && (
            <PrimaryLink href={routes.scripts}>Revisar textos do plano</PrimaryLink>
          )}
          <PrimaryLink href={routes.support}>Preciso de ajuda com meu pedido</PrimaryLink>
          <PrimaryLink href={routes.feedback} className="secondary-cta">Enviar feedback depois</PrimaryLink>
        </div>
      </section>
    </PageShell>
  );
}

function OrderStatusMiniForm() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<SafeOrderStatus | null | "not-found">(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const found = await lookupOrder(orderId, email);
      setResult(found ?? "not-found");
      trackEvent("order_lookup", { has_result: Boolean(found) });
    } catch (lookupError) {
      setResult(null);
      setError(getUserError(lookupError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flow-form lookup-form" onSubmit={handleLookup}>
      <span className="package-badge">Status do pedido</span>
      <h2>Consultar por Order ID + email</h2>
      <label>
        Order ID
        <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="ORD-2026-0001" />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <button className="small-button" type="submit" disabled={loading}>{loading ? "Consultando..." : "Consultar"}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
      {result === "not-found" && <p>Nenhum pedido encontrado com essa combinação.</p>}
      {result && result !== "not-found" && (
        <p>Status: {orderStatusLabels[result.orderStatus] ?? result.orderStatus} • Pagamento: {paymentStatusLabels[result.paymentStatus] ?? result.paymentStatus} • Previsão: {result.dueDate}</p>
      )}
    </form>
  );
}

function ScriptsReviewPage({ onChatOpen }: { onChatOpen: () => void }) {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [videos, setVideos] = useState<VideoScriptReview[]>([]);
  const [packageName, setPackageName] = useState("");
  const [scriptsStatus, setScriptsStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLoad(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await getVideoScripts(orderId, email);
      setVideos(result.videos);
      setPackageName(result.packageName);
      setScriptsStatus(result.scriptsStatus);
    } catch (loadError) {
      setVideos([]);
      setError(getUserError(loadError));
    } finally {
      setLoading(false);
    }
  }

  function updateVideo(index: number, patch: Partial<VideoScriptReview>) {
    setVideos((current) => current.map((video, videoIndex) => (
      videoIndex === index ? {
        ...video,
        ...patch,
        wordCount: typeof patch.voiceover === "string"
          ? (patch.voiceover.trim() ? patch.voiceover.trim().split(/\s+/).length : 0)
          : video.wordCount,
      } : video
    )));
    setSuccess("");
  }

  async function handleApprove() {
    if (!videos.length || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await approveVideoScripts(orderId, email, videos);
      setSuccess(result.allApproved
        ? "Todos os textos foram aprovados e o pedido seguirá para produção."
        : "As alterações foram salvas. Aprove todos os textos para liberar a produção.");
      setScriptsStatus(result.allApproved ? "SCRIPTS_APPROVED" : scriptsStatus);
    } catch (saveError) {
      setError(getUserError(saveError));
    } finally {
      setSaving(false);
    }
  }

  const allReady = videos.length > 0 && videos.every((video) => Boolean(video.voiceover));
  const allApproved = allReady && videos.every((video) => video.clientApproved);

  return (
    <PageShell eyebrow="Revisão dos textos" title="Revise os VOs do seu plano mensal" onChatOpen={onChatOpen}>
      <section className="section checkout-grid scripts-review-layout">
        <form className="flow-form scripts-access" onSubmit={handleLoad}>
          <span className="package-badge">Acesso ao pedido</span>
          <h2>Order ID + email</h2>
          <p>Use o mesmo email informado no brief. Os demais textos aparecem depois da confirmação do pagamento.</p>
          <label>
            Order ID
            <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="ORD-2026-..." />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="small-button" type="submit" disabled={loading || !orderId.trim() || !email.includes("@")}>
            {loading ? "Abrindo pedido..." : "Ver meus roteiros"}
          </button>
          {packageName && <p><strong>{packageName}</strong><br />Status: {orderStatusLabels[scriptsStatus] ?? scriptsStatus}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>

        <div className="scripts-review-list">
          {!videos.length ? (
            <div className="empty-state">
              <h2>Seus textos aparecerão aqui</h2>
              <p>Você poderá editar cada VO, deixar observações e aprovar o conjunto antes da produção.</p>
            </div>
          ) : (
            <>
              {videos.map((video, index) => (
                <article className="script-review-item" key={video.videoId}>
                  <div className="script-review-heading">
                    <span>{String(video.sequence).padStart(2, "0")}</span>
                    <div>
                      <h2>{video.topic}</h2>
                      <p>{video.objective}</p>
                    </div>
                  </div>
                  {video.voiceover ? (
                    <>
                      <label>
                        Texto de narração • {video.wordCount} palavras
                        <textarea
                          value={video.voiceover}
                          onChange={(event) => updateVideo(index, { voiceover: event.target.value, clientApproved: false })}
                        />
                      </label>
                      <label>
                        Observação opcional
                        <input
                          value={video.clientNotes}
                          onChange={(event) => updateVideo(index, { clientNotes: event.target.value })}
                          placeholder="Ex.: trocar a chamada final"
                        />
                      </label>
                      <label className="approval-check">
                        <input
                          type="checkbox"
                          checked={video.clientApproved}
                          onChange={(event) => updateVideo(index, { clientApproved: event.target.checked })}
                        />
                        Aprovo este texto de narração.
                      </label>
                    </>
                  ) : (
                    <p className="form-note">Este texto ainda está sendo criado. Volte em alguns minutos.</p>
                  )}
                </article>
              ))}
              {success && <p className="success-message">{success}</p>}
              <button className="cta" type="button" onClick={handleApprove} disabled={!allApproved || saving}>
                {saving ? "Salvando aprovação..." : "Aprovar todos e enviar para produção"}
              </button>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function SupportPage({ onChatOpen }: { onChatOpen: () => void }) {
  const [ticketId, setTicketId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const ticket = await createTicket({
        orderId: String(formData.get("orderId") ?? ""),
        clientName: String(formData.get("clientName") ?? ""),
        email: String(formData.get("email") ?? ""),
        issueType: String(formData.get("issueType") ?? supportIssueTypes[0]),
        priority: String(formData.get("priority") ?? "Normal") as "Normal" | "Alta",
        description: String(formData.get("description") ?? ""),
        desiredFix: String(formData.get("desiredFix") ?? ""),
        assetLink: String(formData.get("assetLink") ?? ""),
      });
      setTicketId(ticket.ticketId);
      trackEvent("ticket_submit", { ticket_id: ticket.ticketId });
      event.currentTarget.reset();
    } catch (submitError) {
      setError(getUserError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell eyebrow="Suporte" title="Preciso de ajuda com meu pedido" onChatOpen={onChatOpen}>
      <section className="section checkout-grid">
        <form className="flow-form" onSubmit={handleSubmit}>
          <label>Order ID<input name="orderId" required /></label>
          <label>Nome<input name="clientName" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>
            Tipo de problema
            <select name="issueType">
              {supportIssueTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Prioridade
            <select name="priority">
              <option value="Normal">Normal</option>
              <option value="Alta">Alta</option>
            </select>
          </label>
          <label>Descrição<textarea name="description" required /></label>
          <label>Correção desejada<textarea name="desiredFix" required /></label>
          <label>Link do vídeo/arquivo<input name="assetLink" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="cta" type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Criar ticket"}</button>
          {ticketId && <p className="success-message">Recebemos seu ticket #{ticketId}. Vamos analisar seu pedido e responder por email.</p>}
        </form>
        <OrderStatusMiniForm />
      </section>
    </PageShell>
  );
}

function FeedbackPage({ onChatOpen }: { onChatOpen: () => void }) {
  const [feedbackId, setFeedbackId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const feedback = await createFeedback({
        orderId: String(formData.get("orderId") ?? ""),
        clientName: String(formData.get("clientName") ?? ""),
        email: String(formData.get("email") ?? ""),
        rating: String(formData.get("rating") ?? ""),
        feedbackText: String(formData.get("feedbackText") ?? ""),
        liked: String(formData.get("liked") ?? ""),
        improvements: String(formData.get("improvements") ?? ""),
        canUseTestimonial: formData.get("canUseTestimonial") === "on",
        canUseVideoPortfolio: formData.get("canUseVideoPortfolio") === "on",
        canUseBusinessName: formData.get("canUseBusinessName") === "on",
        canTagSocialProfile: formData.get("canTagSocialProfile") === "on",
        publicName: String(formData.get("publicName") ?? ""),
        socialLink: String(formData.get("socialLink") ?? ""),
      });
      setFeedbackId(feedback.feedbackId);
      trackEvent("feedback_submit", { feedback_id: feedback.feedbackId });
      event.currentTarget.reset();
    } catch (submitError) {
      setError(getUserError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell eyebrow="Feedback" title="Avaliação e permissões de portfólio" onChatOpen={onChatOpen}>
      <section className="section">
        <form className="flow-form wide-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Order ID<input name="orderId" required /></label>
            <label>Email<input name="email" type="email" required /></label>
          </div>
          <div className="form-row">
            <label>Nome<input name="clientName" required /></label>
            <label>Nota
              <select name="rating" required>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </label>
          </div>
          <label>Feedback<textarea name="feedbackText" required /></label>
          <label>O que você mais gostou?<textarea name="liked" /></label>
          <label>O que pode melhorar?<textarea name="improvements" /></label>
          <div className="permission-box">
            <label><input type="checkbox" name="canUseTestimonial" /> Autorizo usar meu depoimento no site e nas redes sociais.</label>
            <label><input type="checkbox" name="canUseVideoPortfolio" /> Autorizo usar meu vídeo como exemplo no portfólio.</label>
            <label><input type="checkbox" name="canUseBusinessName" /> Autorizo exibir o nome do meu negócio.</label>
            <label><input type="checkbox" name="canTagSocialProfile" /> Autorizo marcar meu Instagram/site.</label>
          </div>
          <div className="form-row">
            <label>Nome público<input name="publicName" /></label>
            <label>Instagram/site<input name="socialLink" /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="cta" type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Enviar feedback"}</button>
          {feedbackId && <p className="success-message">Feedback recebido #{feedbackId}. Obrigado!</p>}
        </form>
      </section>
    </PageShell>
  );
}

type ChatUiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const chatHistoryStorageKey = "whiteboard_chat_history_v1";
const chatWelcomeMessage: ChatUiMessage = {
  id: "welcome",
  role: "assistant",
  content: "Olá! Posso recomendar a duração, explicar preços e formatos ou orientar seu brief. Qual é o objetivo do seu vídeo?",
};

function makeChatMessage(role: ChatUiMessage["role"], content: string): ChatUiMessage {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return { id, role, content };
}

function loadChatHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(chatHistoryStorageKey) || "[]") as ChatUiMessage[];
    const valid = parsed.filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.length <= 6000,
    );
    return valid.length ? valid.slice(-20) : [chatWelcomeMessage];
  } catch {
    return [chatWelcomeMessage];
  }
}

function renderChatInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      : <span key={`${part}-${index}`}>{part}</span>,
  );
}

function normalizeAssistantText(content: string) {
  const rawLines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lines: string[] = [];
  let characterRun = "";

  for (const line of rawLines) {
    if (/^[\p{L}\p{N}]$/u.test(line)) {
      characterRun += line;
      continue;
    }

    if (characterRun) {
      lines.push(characterRun);
      characterRun = "";
    }
    lines.push(line);
  }

  if (characterRun) {
    lines.push(characterRun);
  }

  const normalized: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    normalized.push(paragraph.join(" ").replace(/\s+([,.!?;:])/g, "$1"));
    paragraph = [];
  };

  for (const line of lines) {
    if (line === ":") {
      if (paragraph.length) {
        paragraph[paragraph.length - 1] = `${paragraph[paragraph.length - 1]}:`;
      } else if (normalized.length) {
        normalized[normalized.length - 1] = `${normalized[normalized.length - 1]}:`;
      }
      continue;
    }

    const isListItem = /^([-*]|\d+[.)])\s+/.test(line);
    const isShortHeading = line.endsWith(":") && line.length <= 64;
    if (isListItem || isShortHeading) {
      flushParagraph();
      normalized.push(line);
      continue;
    }

    paragraph.push(line);
    if (/[.!?。؟)]$/.test(line) || paragraph.join(" ").length > 220) {
      flushParagraph();
    }
  }

  flushParagraph();
  return normalized.join("\n");
}

function ChatMessageContent({ content }: { content: string }) {
  const readableContent = normalizeAssistantText(content);
  return (
    <span className="chat-message-content">
      {readableContent.split("\n").map((line, index) => {
        const bullet = /^[-*]\s+/.test(line);
        const cleanLine = bullet ? line.replace(/^[-*]\s+/, "") : line;
        return (
          <span className={`chat-line ${bullet ? "bullet" : ""}`} key={`${line}-${index}`}>
            {bullet && <span aria-hidden="true">•</span>}
            <span className="chat-line-text">{cleanLine ? renderChatInline(cleanLine) : <br />}</span>
          </span>
        );
      })}
    </span>
  );
}

function ChatWidget({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<ChatUiMessage[]>(loadChatHistory);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const sessionId = useMemo(getChatSessionId, []);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(chatHistoryStorageKey, JSON.stringify(messages.slice(-20)));
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  async function submitMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || sending) return;
    const history = messages.map(({ role, content }) => ({ role, content })).slice(-8);
    setMessages((current) => [...current, makeChatMessage("user", text)]);
    setInput("");
    setSending(true);
    setError("");
    try {
      const response = await sendAiChatMessage(text, sessionId, history);
      setMessages((current) => [...current, makeChatMessage("assistant", response.answer)]);
      trackEvent("chat_message", { source_widget: aiChatWidgetChoice.widget });
    } catch (requestError) {
      setError(getUserError(requestError));
    } finally {
      setSending(false);
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  function clearMessages() {
    setMessages([chatWelcomeMessage]);
    setError("");
    window.localStorage.removeItem(chatHistoryStorageKey);
  }

  return (
    <div className={`chat-widget ${open ? "open" : ""}`}>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Assistente de vendas" aria-modal="false">
          <div className="chat-head">
            <div>
              <strong>Assistente AI</strong>
              <small>Pacotes, formatos e próximos passos</small>
            </div>
            <div className="chat-head-actions">
              <button className="chat-clear" type="button" onClick={clearMessages}>Limpar</button>
              <button type="button" onClick={() => onOpenChange(false)} aria-label="Fechar chat">×</button>
            </div>
          </div>
          <div className="chat-messages" aria-live="polite">
            {messages.map((message) => (
              <p className={`chat-message ${message.role}`} key={message.id}>
                <span className="chat-message-label">{message.role === "user" ? "Você" : "Assistente"}</span>
                <ChatMessageContent content={message.content} />
              </p>
            ))}
            {sending && <p className="chat-message assistant chat-thinking">Analisando sua pergunta...</p>}
            {error && <p className="chat-error" role="alert">{error}</p>}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-suggestions" aria-label="Perguntas rápidas">
            <button type="button" disabled={sending} onClick={() => void submitMessage("Qual duração combina com meu vídeo?")}>Escolher duração</button>
            <button type="button" disabled={sending} onClick={() => void submitMessage("Como funciona o plano mensal?")}>Plano mensal</button>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                routeTo(routes.support);
              }}
            >
              Consultar pedido
            </button>
          </div>
          <form onSubmit={sendMessage}>
            <input
              value={input}
              maxLength={2400}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escreva sua pergunta"
              aria-label="Mensagem para o assistente"
            />
            <button type="submit" disabled={sending || !input.trim()}>Enviar</button>
          </form>
          <p className="chat-privacy">Não envie dados sensíveis. Status exige Order ID e email.</p>
        </div>
      )}
      <button
        className="chat-launcher"
        type="button"
        title="Abrir assistente"
        aria-label="Abrir assistente AI"
        aria-expanded={open}
        onClick={() => {
          onOpenChange(true);
          trackEvent("chat_open", { source_widget: aiChatWidgetChoice.widget });
        }}
      >
        <span className="chat-launcher-label">Assistente AI</span>
        <span className="chat-launcher-mobile" aria-hidden="true">AI</span>
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>{siteConfig.brandName}</strong>
        <p>Vídeos explicativos profissionais em estilo whiteboard para negócios no Brasil.</p>
      </div>
      <div>
        {siteConfig.instagramUrl !== "#" && (
          <a href={siteConfig.instagramUrl} onClick={() => trackEvent("instagram_click", { cta_location: "footer" })}>
            Instagram
          </a>
        )}
        <a href={siteConfig.youtubeUrl} onClick={() => trackEvent("footer_contact_click", { cta_location: "footer_youtube" })}>
          YouTube
        </a>
        <a href={siteConfig.upworkProfileUrl} target="_blank" rel="noreferrer">Upwork</a>
        {siteConfig.email && <a href={`mailto:${siteConfig.email}`}>Email</a>}
        <a
          href={routes.scripts}
          onClick={(event) => {
            event.preventDefault();
            routeTo(routes.scripts);
          }}
        >
          Meus roteiros
        </a>
        <a
          href={routes.support}
          onClick={(event) => {
            event.preventDefault();
            routeTo(routes.support);
            trackEvent("footer_contact_click", { cta_location: "footer_support" });
          }}
        >
          Suporte
        </a>
        <a
          href={routes.feedback}
          onClick={(event) => {
            event.preventDefault();
            routeTo(routes.feedback);
            trackEvent("footer_contact_click", { cta_location: "footer_feedback" });
          }}
        >
          Feedback
        </a>
      </div>
      <p className="privacy">© 2026. Demos, processo e pacotes para pedidos de vídeos explicativos.</p>
    </footer>
  );
}

function Router({ onChatOpen }: { onChatOpen: () => void }) {
  const [path, setPath] = useState(currentRoutePath());

  useEffect(() => {
    const onPopState = () => setPath(currentRoutePath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    trackEvent("page_view", { path });
  }, [path]);

  if (path === routes.brief) {
    return <BriefPage onChatOpen={onChatOpen} />;
  }

  if (path === routes.checkout) {
    return <CheckoutPage onChatOpen={onChatOpen} />;
  }

  if (path === routes.orderSuccess) {
    return <OrderSuccessPage onChatOpen={onChatOpen} />;
  }

  if (path === routes.scripts) {
    return <ScriptsReviewPage onChatOpen={onChatOpen} />;
  }

  if (path === routes.support) {
    return <SupportPage onChatOpen={onChatOpen} />;
  }

  if (path === routes.feedback) {
    return <FeedbackPage onChatOpen={onChatOpen} />;
  }

  return <HomePage onChatOpen={onChatOpen} />;
}

export function App() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <Router onChatOpen={() => setChatOpen(true)} />
      <Footer />
      <ChatWidget open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
