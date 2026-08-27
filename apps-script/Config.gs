var WB_API_VERSION = "v1";
var WB_SERVICE_NAME = "whiteboard-sales-api";
var WB_SPREADSHEET_PROPERTY = "SPREADSHEET_ID";
var WB_PRICING_VERSION = "2026-08-25";
var WB_LLM_PROVIDER_PROPERTY = "LLM_PROVIDER";
var WB_LLM_API_KEY_PROPERTY = "LLM_API_KEY";
var WB_LLM_MODEL_PROPERTY = "LLM_MODEL";
var WB_LLM_BASE_URL_PROPERTY = "LLM_BASE_URL";
var WB_MP_ACCESS_TOKEN_PROPERTY = "MERCADO_PAGO_ACCESS_TOKEN";
var WB_MP_USE_SANDBOX_PROPERTY = "MERCADO_PAGO_USE_SANDBOX";
var WB_MP_WEBHOOK_URL_PROPERTY = "MERCADO_PAGO_WEBHOOK_URL";
var WB_SITE_BASE_URL_PROPERTY = "SITE_BASE_URL";
var WB_WEBAPP_URL_PROPERTY = "WEBAPP_URL";
var WB_STUDIO_EMAIL_PROPERTY = "STUDIO_NOTIFICATION_EMAIL";
var WB_AI_HISTORY_LIMIT = 10;
var WB_AI_MESSAGE_LIMIT = 2400;
var WB_AI_GENERATION_MESSAGE_LIMIT = 30000;

var WB_PACKAGE_RULES = {
  "basic-30": { name: "Basic 30s", price: 149, dualFormatPrice: 40, expressPrice: 80, deliveryDays: 2 },
  "standard-60": { name: "Standard 60s", price: 297, dualFormatPrice: 70, expressPrice: 100, deliveryDays: 3 },
  "premium-120": { name: "Premium 120s", price: 597, dualFormatPrice: 120, expressPrice: 150, deliveryDays: 5 }
};

var WB_PLAN_RULES = {
  single: { quantity: 1, discount: 0 },
  monthly_4: { quantity: 4, discount: 0.10 },
  monthly_8: { quantity: 8, discount: 0.15 }
};

var WB_ACTIONS = {
  health: true,
  create_brief: true,
  generate_roteiro: true,
  create_order: true,
  create_payment: true,
  payment_webhook: true,
  lookup_order: true,
  get_video_scripts: true,
  approve_video_scripts: true,
  create_ticket: true,
  create_feedback: true,
  chat: true,
  log_chat: true,
  log_event: true,
  send_email: true
};

var WB_SHEETS = {
  ORDERS: [
    "Order_ID", "Created_At", "Updated_At", "Client_Name", "Email", "Package", "Plan",
    "Quantity", "Price", "Niche", "Brief_Text", "Input_Type", "Asset_Link", "Reference_Note", "Source_Digest",
    "Format", "Voice", "Express_Delivery", "Price_Breakdown", "Generated_Roteiro",
    "Roteiro_Approved", "Editorial_Plan", "Editorial_Plan_Approved", "Narrative_Approved",
    "Scripts_Status", "Payment_Status", "Order_Status", "Due_Date", "Approval_Link",
    "Final_Video_Link", "Review_Received", "Portfolio_Allowed", "Testimonial_Allowed", "Notes",
    "Request_ID"
  ],
  PAYMENTS: [
    "Payment_ID", "Order_ID", "Created_At", "Updated_At", "Provider", "Preference_ID", "Provider_Payment_ID",
    "Amount", "Currency", "Payment_Status", "Provider_Status", "Payment_Method", "Checkout_Link", "Paid_At",
    "Raw_Response", "Request_ID"
  ],
  BRIEFS: [
    "Brief_ID", "Order_ID", "Created_At", "Client_Name", "Email", "Package", "Plan", "Niche",
    "Input_Type", "Brief_Text", "Asset_Link", "Reference_Note", "Source_Digest", "Format", "Voice",
    "Express_Delivery", "Generated_Roteiro", "Roteiro_Approved", "Editorial_Plan",
    "Editorial_Plan_Approved", "Narrative_Approved", "Request_ID"
  ],
  VIDEOS: [
    "Video_ID", "Order_ID", "Sequence", "Topic", "Objective", "Duration", "Format", "Voice",
    "VO_Text", "Word_Count", "Script_Status", "Client_Approved", "Client_Notes",
    "Generation_Attempts", "Created_At", "Updated_At", "Request_ID"
  ],
  TICKETS: [
    "Ticket_ID", "Created_At", "Order_ID", "Client_Name", "Email", "Issue_Type", "Priority",
    "Description", "Desired_Fix", "Asset_Link", "Status", "Response_Email_Sent", "Notes", "Request_ID"
  ],
  FEEDBACK: [
    "Feedback_ID", "Order_ID", "Client_Name", "Email", "Rating", "Feedback_Text", "Liked",
    "Improvements", "Can_Use_Testimonial", "Can_Use_Video_Portfolio", "Can_Use_Business_Name",
    "Can_Tag_Social_Profile", "Public_Name", "Social_Link", "Submitted_At", "Status", "Request_ID"
  ],
  CHAT_LOGS: ["Chat_ID", "Session_ID", "Created_At", "Role", "Message", "Order_ID", "Email", "Request_ID"],
  EMAIL_LOG: ["Email_ID", "Created_At", "Template", "Recipient", "Order_ID", "Status", "Error", "Request_ID"],
  EVENTS: ["Event_ID", "Created_At", "Event_Name", "Payload", "Request_ID"]
};
