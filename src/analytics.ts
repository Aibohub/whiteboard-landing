export type AnalyticsEventName =
  | "page_view"
  | "primary_cta_click"
  | "final_cta_click"
  | "footer_contact_click"
  | "niche_card_click"
  | "demo_video_click"
  | "package_click"
  | "package_card_click"
  | "package_brief_click"
  | "brief_generate_roteiro"
  | "brief_checkout_click"
  | "checkout_payment_click"
  | "ticket_submit"
  | "feedback_submit"
  | "order_lookup"
  | "chat_open"
  | "chat_message"
  | "faq_expand"
  | "instagram_click"
  | "optional_form_start"
  | "optional_form_submit"
  | "pricing_click";

export type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  const event = {
    event: eventName,
    source: "landing",
    language: "pt-BR",
    ...payload,
  };

  window.dispatchEvent(new CustomEvent("landing_analytics_event", { detail: event }));

  if (import.meta.env.DEV) {
    console.info("[analytics]", event);
  }

  if (isRemoteApiConfigured()) {
    void apiRequest("log_event", {
      eventName,
      occurredAt: new Date().toISOString(),
      payload: event,
    }).catch((error) => {
      if (import.meta.env.DEV) console.warn("[analytics] remote log skipped", error);
    });
  }
}
import { apiRequest, isRemoteApiConfigured } from "./apiClient";
