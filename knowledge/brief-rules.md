# Brief Rules

Input types:
- `ready_text`: the client has facts, a draft or existing copy. Treat it as the factual source of truth. Preserve names, claims, conditions and limitations while adapting clarity and duration.
- `idea`: the client has an objective rather than finished source material. Develop the angle, structure and call to action, but never invent concrete facts about the business, offer or location.

Required fields:
- client name
- email
- niche
- input type
- text or information explaining what the video should communicate
- format
- voice preference
- single, monthly_4 or monthly_8 quantity
- optional express delivery

The public MVP does not fetch, parse or send PDF files, Google Drive documents or external websites to the AI. All facts used for preview and post-payment scripts must be present in the written brief and visible to the client before checkout. If the client has a large document, ask them to paste only the relevant facts or excerpts.

The form shows a live remaining-character counter and applies these limits:
- `ready_text`: 3,000 characters for one video, 6,000 for four, 8,000 for eight;
- `idea`: 1,200 characters for one video, 2,000 for four, 3,000 for eight.

If the source is longer, ask the client to remove unrelated passages and keep only the facts needed for the selected videos.

For a single video, generate one complete voiceover adapted to the selected duration.

For a monthly plan, generate exactly 4 or 8 editable editorial topics and the complete voiceover only for topic 1 before checkout. Require separate approval for the editorial topics and for the tone/format of the first voiceover. Generate the remaining 3 or 7 voiceovers only after confirmed payment.

Before checkout, create and save a compact `Source_Digest` from the approved written brief. After payment, generate every remaining voiceover from the approved topics, first voiceover, original brief and `Source_Digest`. Never attempt to fetch an external source at that stage.

Voiceover output must not contain storyboard, scene directions, drawing instructions or production notes. The visual workflow derives its large, medium and small text plus relationships automatically from each VO segment.
