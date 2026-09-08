import type { CustomSurfaceDefinition, ImageTarget, PromptProfileId, SurfacePromptCategory, SurfaceShellMode } from './contracts'
import { CANONICAL_REVIEWED_SURFACE_BY_ID } from './canonicalReviewedSurfaceContracts'
import { bracketSurfacePromptModule } from './bracketSurfaceAuthoring'

export type ShippedSurfaceSpec = {
  index: number
  id: string
  label: string
  icon: string
  wrapper: string
  target: ImageTarget
  defaultAspect: string
  supportedAspects: string[]
  rootAttributes: string[]
  requiredMediaCount: number
  maximumMediaCount?: number
  sampleXml: string
  promptModule: string
  category: SurfacePromptCategory
  shellMode: SurfaceShellMode
  maxWidth: string
  mediaFit: 'contain' | 'cover'
  peoplePolicy: CustomSurfaceDefinition['peoplePolicy']
  profile: PromptProfileId
  /** Derived, contract-owned repair metadata consumed by the shared
   * normalizer. It is generated from this one shipped-Surface inventory. */
  normalization?: {
    rootAliases: string[]
    attributeAliases: Record<string, string>
    allowedChildren: string[]
    canonicalChildOrder: string[]
    childAliases: Record<string, string>
    uniqueParents: Record<string, string>
    optionalMeta: string[]
  }
}

const LEGACY_SHIPPED_SURFACE_SPECS: ShippedSurfaceSpec[] = [
  {
          index: 2,
          id: "forum-thread",
          label: "Forum / Reddit Thread",
          icon: "🧵",
          wrapper: "forum_thread",
          target: "custom.forum-thread",
          defaultAspect: "16:9",
          supportedAspects: ["16:9"],
          rootAttributes: ["community", "user", "time", "score", "title"],
          requiredMediaCount: 1,
          sampleXml: "<forum_thread community=\"community_name\" user=\"poster_name\" time=\"3 hours ago\" score=\"4.8K\" title=\"Thread title\">\n<fm_body>Opening post text.</fm_body>\n<fm_media>\n<image_request id=\"forum-thread-001\" target=\"custom.forum-thread\" slot=\"thread-media\" aspect=\"16:9\" alt=\"Forum attachment\">\n<scene_brief>A believable attached image relevant to the thread. Compose the attachment as a visual-only image.</scene_brief>\n</image_request>\n</fm_media>\n<details><summary>View discussion</summary><fm_comments>\n<fm_comment user=\"reply_one\">Reply.</fm_comment>\n<fm_comment user=\"reply_two\">Reply.</fm_comment>\n</fm_comments></details>\n</forum_thread>",
          promptModule: "SURFACE: FORUM / REDDIT THREAD\nUse <forum_thread> with target=\"custom.forum-thread\". Include 1 complete image request in authored order, using unique ids, meaningful slots, accessible alt text, aspect 16:9, and visible scene briefs. Place readable interface text in the semantic child tags.\n\nCONTRACT EXAMPLE\n<forum_thread community=\"community_name\" user=\"poster_name\" time=\"3 hours ago\" score=\"4.8K\" title=\"Thread title\">\n<fm_body>Opening post text.</fm_body>\n<fm_media>\n<image_request id=\"forum-thread-001\" target=\"custom.forum-thread\" slot=\"thread-media\" aspect=\"16:9\" alt=\"Forum attachment\">\n<scene_brief>A believable attached image relevant to the thread. Compose the attachment as a visual-only image.</scene_brief>\n</image_request>\n</fm_media>\n<details><summary>View discussion</summary><fm_comments>\n<fm_comment user=\"reply_one\">Reply.</fm_comment>\n<fm_comment user=\"reply_two\">Reply.</fm_comment>\n</fm_comments></details>\n</forum_thread>",
          category: "social-messaging",
          shellMode: "collapsible",
          maxWidth: "760px",
          mediaFit: "cover",
          peoplePolicy: "allow",
          profile: "social-candid",
        },
  {
          index: 3,
          id: "email-thread",
          label: "Email Thread",
          icon: "✉️",
          wrapper: "email_thread",
          target: "custom.email-thread",
          defaultAspect: "16:9",
          supportedAspects: ["16:9"],
          rootAttributes: ["subject", "account", "time", "messages", "attachments"],
          requiredMediaCount: 1,
          sampleXml: "<email_thread subject=\"Email subject\" account=\"Primary Inbox\" time=\"08:37\" messages=\"2\" attachments=\"1\">\n<em_message from=\"Sender Name\" to=\"Recipient Name\" time=\"08:14\">Message body.</em_message>\n<em_message from=\"Recipient Name\" to=\"Sender Name\" time=\"08:37\">Reply body.</em_message>\n<em_attachment>\n<image_request id=\"email-thread-001\" target=\"custom.email-thread\" slot=\"attachment-preview\" aspect=\"16:9\" alt=\"Email attachment preview\">\n<scene_brief>A realistic visual attachment referenced by the email. Keep all readable email text in the surrounding interface.</scene_brief>\n</image_request>\n</em_attachment>\n<em_files><em_file>attachment.pdf</em_file></em_files>\n</email_thread>",
          promptModule: "SURFACE: EMAIL THREAD\nUse <email_thread> with target=\"custom.email-thread\". Include 1 complete image request in authored order, using unique ids, meaningful slots, accessible alt text, aspect 16:9, and visible scene briefs. Place readable interface text in the semantic child tags.\n\nCONTRACT EXAMPLE\n<email_thread subject=\"Email subject\" account=\"Primary Inbox\" time=\"08:37\" messages=\"2\" attachments=\"1\">\n<em_message from=\"Sender Name\" to=\"Recipient Name\" time=\"08:14\">Message body.</em_message>\n<em_message from=\"Recipient Name\" to=\"Sender Name\" time=\"08:37\">Reply body.</em_message>\n<em_attachment>\n<image_request id=\"email-thread-001\" target=\"custom.email-thread\" slot=\"attachment-preview\" aspect=\"16:9\" alt=\"Email attachment preview\">\n<scene_brief>A realistic visual attachment referenced by the email. Keep all readable email text in the surrounding interface.</scene_brief>\n</image_request>\n</em_attachment>\n<em_files><em_file>attachment.pdf</em_file></em_files>\n</email_thread>",
          category: "social-messaging",
          shellMode: "collapsible",
          maxWidth: "760px",
          mediaFit: "cover",
          peoplePolicy: "allow",
          profile: "social-candid",
        },
  {
          index: 4,
          id: "imessage-chat",
          label: "iMessage Group Chat",
          icon: "💬",
          wrapper: "imessage_chat",
          target: "custom.imessage-chat",
          defaultAspect: "16:9",
          supportedAspects: ["16:9"],
          rootAttributes: ["title", "participants", "time", "status", "unread"],
          requiredMediaCount: 1,
          sampleXml: "<imessage_chat title=\"Weekend Survivors\" participants=\"Character A, Character B, Character C, You\" time=\"Today 7:14 PM\" status=\"Delivered\" unread=\"0\">\n<im_messages>\n<im_msg from=\"Character A\" side=\"left\">Message.</im_msg>\n<im_msg from=\"You\" side=\"right\">Reply.</im_msg>\n<im_media>\n<image_request id=\"imessage-chat-001\" target=\"custom.imessage-chat\" slot=\"shared-image\" aspect=\"16:9\" alt=\"Shared iMessage photograph\">\n<scene_brief>A wide shared photograph shown inside the chat. Preserve the full composition in a contained wide frame.</scene_brief>\n</image_request>\n</im_media>\n<im_msg from=\"Character C\" side=\"left\">Message after the image.<im_reaction>😂 4</im_reaction></im_msg>\n<im_system>Group name changed.</im_system>\n</im_messages>\n<details><summary>Group information</summary><im_group_info><im_member>Character A</im_member><im_member>Character B</im_member><im_member>Character C</im_member><im_member>You</im_member></im_group_info></details>\n</imessage_chat>",
          promptModule: "SURFACE: IMESSAGE GROUP CHAT\nUse <imessage_chat> with target=\"custom.imessage-chat\". Include 1 complete image request in authored order, using unique ids, meaningful slots, accessible alt text, aspect 16:9, and visible scene briefs. Place readable interface text in the semantic child tags.\n\nCONTRACT EXAMPLE\n<imessage_chat title=\"Weekend Survivors\" participants=\"Character A, Character B, Character C, You\" time=\"Today 7:14 PM\" status=\"Delivered\" unread=\"0\">\n<im_messages>\n<im_msg from=\"Character A\" side=\"left\">Message.</im_msg>\n<im_msg from=\"You\" side=\"right\">Reply.</im_msg>\n<im_media>\n<image_request id=\"imessage-chat-001\" target=\"custom.imessage-chat\" slot=\"shared-image\" aspect=\"16:9\" alt=\"Shared iMessage photograph\">\n<scene_brief>A wide shared photograph shown inside the chat. Preserve the full composition in a contained wide frame.</scene_brief>\n</image_request>\n</im_media>\n<im_msg from=\"Character C\" side=\"left\">Message after the image.<im_reaction>😂 4</im_reaction></im_msg>\n<im_system>Group name changed.</im_system>\n</im_messages>\n<details><summary>Group information</summary><im_group_info><im_member>Character A</im_member><im_member>Character B</im_member><im_member>Character C</im_member><im_member>You</im_member></im_group_info></details>\n</imessage_chat>",
          category: "social-messaging",
          shellMode: "collapsible",
          maxWidth: "460px",
          mediaFit: "contain",
          peoplePolicy: "allow",
          profile: "social-candid",
        },
  {
          index: 5,
          id: "workspace-chat",
          label: "Workspace / Discord-Style Chat",
          icon: "🗨️",
          wrapper: "workspace_chat",
          target: "custom.workspace-chat",
          defaultAspect: "16:9",
          supportedAspects: ["16:9"],
          rootAttributes: ["workspace", "channel", "topic", "members", "time"],
          requiredMediaCount: 1,
          sampleXml: "<workspace_chat workspace=\"Expedition Team\" channel=\"field-chat\" topic=\"Coordination and live updates\" members=\"5\" time=\"11:36 PM\">\n<ws_messages>\n<ws_msg user=\"Character A\" time=\"11:32 PM\">Message.</ws_msg>\n<ws_msg user=\"Character B\" time=\"11:33 PM\">Reply.</ws_msg>\n<ws_msg user=\"Character A\" time=\"11:33 PM\">Shared image:<ws_media>\n<image_request id=\"workspace-chat-001\" target=\"custom.workspace-chat\" slot=\"shared-media\" aspect=\"16:9\" alt=\"Workspace shared image\">\n<scene_brief>A full uncropped shared image relevant to the channel conversation.</scene_brief>\n</image_request>\n</ws_media></ws_msg>\n<ws_msg user=\"Character C\" time=\"11:35 PM\">Voice upload.<ws_voice>▶ 00:31</ws_voice></ws_msg>\n</ws_messages>\n<details><summary>Members</summary><ws_members><ws_member>Character A</ws_member><ws_member>Character B</ws_member><ws_member>Character C</ws_member><ws_member>You</ws_member></ws_members></details>\n</workspace_chat>",
          promptModule: "SURFACE: WORKSPACE / DISCORD-STYLE CHAT\nUse <workspace_chat> with target=\"custom.workspace-chat\". Include 1 complete image request in authored order, using unique ids, meaningful slots, accessible alt text, aspect 16:9, and visible scene briefs. Place readable interface text in the semantic child tags.\n\nCONTRACT EXAMPLE\n<workspace_chat workspace=\"Expedition Team\" channel=\"field-chat\" topic=\"Coordination and live updates\" members=\"5\" time=\"11:36 PM\">\n<ws_messages>\n<ws_msg user=\"Character A\" time=\"11:32 PM\">Message.</ws_msg>\n<ws_msg user=\"Character B\" time=\"11:33 PM\">Reply.</ws_msg>\n<ws_msg user=\"Character A\" time=\"11:33 PM\">Shared image:<ws_media>\n<image_request id=\"workspace-chat-001\" target=\"custom.workspace-chat\" slot=\"shared-media\" aspect=\"16:9\" alt=\"Workspace shared image\">\n<scene_brief>A full uncropped shared image relevant to the channel conversation.</scene_brief>\n</image_request>\n</ws_media></ws_msg>\n<ws_msg user=\"Character C\" time=\"11:35 PM\">Voice upload.<ws_voice>▶ 00:31</ws_voice></ws_msg>\n</ws_messages>\n<details><summary>Members</summary><ws_members><ws_member>Character A</ws_member><ws_member>Character B</ws_member><ws_member>Character C</ws_member><ws_member>You</ws_member></ws_members></details>\n</workspace_chat>",
          category: "social-messaging",
          shellMode: "collapsible",
          maxWidth: "760px",
          mediaFit: "contain",
          peoplePolicy: "allow",
          profile: "social-candid",
        },
  {
          index: 6,
          id: "livestream",
          label: "Twitch Livestream + Live Chat",
          icon: "📡",
          wrapper: "livestream",
          target: "custom.livestream",
          defaultAspect: "16:9",
          supportedAspects: ["16:9"],
          rootAttributes: ["title", "channel", "viewers", "category", "status"],
          requiredMediaCount: 1,
          sampleXml: "<livestream title=\"Stream title\" channel=\"Channel Name\" viewers=\"18.4K\" category=\"Urban Exploration\" status=\"LIVE\">\n<live_layout><live_main><live_media>\n<image_request id=\"livestream-001\" target=\"custom.livestream\" slot=\"video-frame\" aspect=\"16:9\" alt=\"Livestream frame\">\n<scene_brief>A cinematic but believable 16:9 live video frame from the exact broadcast moment.</scene_brief>\n</image_request>\n</live_media></live_main>\n<live_chat>\n<live_msg user=\"viewer_one\">Chat message.</live_msg>\n<live_donation>$20.00 from Supporter — Donation message.</live_donation>\n<live_poll>Poll question.<live_option>Option A · 68%</live_option><live_option>Option B · 32%</live_option></live_poll>\n</live_chat></live_layout>\n</livestream>",
          promptModule: "SURFACE: TWITCH LIVESTREAM + LIVE CHAT\nUse <livestream> with target=\"custom.livestream\". Include 1 complete image request in authored order, using unique ids, meaningful slots, accessible alt text, aspect 16:9, and visible scene briefs. Place readable interface text in the semantic child tags.\n\nCONTRACT EXAMPLE\n<livestream title=\"Stream title\" channel=\"Channel Name\" viewers=\"18.4K\" category=\"Urban Exploration\" status=\"LIVE\">\n<live_layout><live_main><live_media>\n<image_request id=\"livestream-001\" target=\"custom.livestream\" slot=\"video-frame\" aspect=\"16:9\" alt=\"Livestream frame\">\n<scene_brief>A cinematic but believable 16:9 live video frame from the exact broadcast moment.</scene_brief>\n</image_request>\n</live_media></live_main>\n<live_chat>\n<live_msg user=\"viewer_one\">Chat message.</live_msg>\n<live_donation>$20.00 from Supporter — Donation message.</live_donation>\n<live_poll>Poll question.<live_option>Option A · 68%</live_option><live_option>Option B · 32%</live_option></live_poll>\n</live_chat></live_layout>\n</livestream>",
          category: "social-messaging",
          shellMode: "collapsible",
          maxWidth: "920px",
          mediaFit: "cover",
          peoplePolicy: "allow",
          profile: "social-candid",
        },
  {
          index: 7,
          id: "dating-profile",
          label: "Tinder Dating Profile",
          icon: "💘",
          wrapper: "dating_profile",
          target: "custom.dating-profile",
          defaultAspect: "4:5",
          supportedAspects: ["4:5"],
          rootAttributes: ["name", "age", "distance", "occupation", "verified"],
          requiredMediaCount: 1,
          sampleXml: "<dating_profile name=\"Profile Subject\" age=\"29\" distance=\"4 km\" occupation=\"Museum conservator\" verified=\"yes\">\n<dt_media>\n<image_request id=\"dating-profile-001\" target=\"custom.dating-profile\" slot=\"profile-photo\" aspect=\"4:5\" alt=\"Dating profile portrait\">\n<scene_brief>A flattering but believable vertical dating profile photograph in a scene-specific setting.</scene_brief>\n</image_request>\n</dt_media>\n<dt_profile><dt_bio>Profile bio.</dt_bio><dt_tags><dt_tag>Books</dt_tag><dt_tag>Night walks</dt_tag></dt_tags><dt_prompt question=\"A perfect Sunday\">Answer.</dt_prompt></dt_profile>\n</dating_profile>",
          promptModule: "SURFACE: TINDER DATING PROFILE\nUse <dating_profile> with target=\"custom.dating-profile\". Include 1 complete image request in authored order, using unique ids, meaningful slots, accessible alt text, aspect 4:5, and visible scene briefs. Place readable interface text in the semantic child tags.\n\nCONTRACT EXAMPLE\n<dating_profile name=\"Profile Subject\" age=\"29\" distance=\"4 km\" occupation=\"Museum conservator\" verified=\"yes\">\n<dt_media>\n<image_request id=\"dating-profile-001\" target=\"custom.dating-profile\" slot=\"profile-photo\" aspect=\"4:5\" alt=\"Dating profile portrait\">\n<scene_brief>A flattering but believable vertical dating profile photograph in a scene-specific setting.</scene_brief>\n</image_request>\n</dt_media>\n<dt_profile><dt_bio>Profile bio.</dt_bio><dt_tags><dt_tag>Books</dt_tag><dt_tag>Night walks</dt_tag></dt_tags><dt_prompt question=\"A perfect Sunday\">Answer.</dt_prompt></dt_profile>\n</dating_profile>",
          category: "social-messaging",
          shellMode: "inline",
          maxWidth: "460px",
          mediaFit: "cover",
          peoplePolicy: "allow",
          profile: "character-portrait",
        },
  {
          index: 8,
          id: "public-bulletin",
          label: "News Article / Public Bulletin",
          icon: "🗞️",
          wrapper: "public_bulletin",
          target: "custom.public-bulletin",
          defaultAspect: "16:9",
          supportedAspects: ["16:9"],
          rootAttributes: ["authority", "level", "headline", "timestamp", "district"],
          requiredMediaCount: 1,
          sampleXml: "<public_bulletin authority=\"Municipal Authority\" level=\"Emergency Notice\" headline=\"Headline\" timestamp=\"22:10\" district=\"Riverside District\">\n<pb_media>\n<image_request id=\"public-bulletin-001\" target=\"custom.public-bulletin\" slot=\"bulletin-image\" aspect=\"16:9\" alt=\"Public bulletin image\">\n<scene_brief>A wide documentary image of the exact public event or affected location. Compose the attachment as a visual-only image.</scene_brief>\n</image_request>\n</pb_media>\n<pb_body>Official bulletin copy.</pb_body><pb_instructions><pb_rule>Instruction one.</pb_rule><pb_rule>Instruction two.</pb_rule></pb_instructions>\n</public_bulletin>",
          promptModule: "SURFACE: NEWS ARTICLE / PUBLIC BULLETIN\nUse <public_bulletin> with target=\"custom.public-bulletin\". Include 1 complete image request in authored order, using unique ids, meaningful slots, accessible alt text, aspect 16:9, and visible scene briefs. Place readable interface text in the semantic child tags.\n\nCONTRACT EXAMPLE\n<public_bulletin authority=\"Municipal Authority\" level=\"Emergency Notice\" headline=\"Headline\" timestamp=\"22:10\" district=\"Riverside District\">\n<pb_media>\n<image_request id=\"public-bulletin-001\" target=\"custom.public-bulletin\" slot=\"bulletin-image\" aspect=\"16:9\" alt=\"Public bulletin image\">\n<scene_brief>A wide documentary image of the exact public event or affected location. Compose the attachment as a visual-only image.</scene_brief>\n</image_request>\n</pb_media>\n<pb_body>Official bulletin copy.</pb_body><pb_instructions><pb_rule>Instruction one.</pb_rule><pb_rule>Instruction two.</pb_rule></pb_instructions>\n</public_bulletin>",
          category: "evidence-editorial",
          shellMode: "collapsible",
          maxWidth: "920px",
          mediaFit: "cover",
          peoplePolicy: "allow",
          profile: "evidence-surveillance",
        },
  {
          index: 9,
          id: "case-file",
          label: "Case File / Classified Dossier",
          icon: "📁",
          wrapper: "case_file",
          target: "custom.case-file",
          defaultAspect: "3:4",
          supportedAspects: ["3:4"],
          rootAttributes: ["case", "subject", "status", "last_seen", "risk", "agent"],
          requiredMediaCount: 1,
          sampleXml: "<case_file case=\"04-17\" subject=\"Subject A\" status=\"Missing\" last_seen=\"Platform Four\" risk=\"Elevated\" agent=\"REDACTED\">\n<cf_tab>SUBJECT</cf_tab><cf_tab>EVIDENCE</cf_tab><cf_tab>TIMELINE</cf_tab>\n<cf_sheet><cf_media>\n<image_request id=\"case-file-001\" target=\"custom.case-file\" slot=\"subject-photo\" aspect=\"3:4\" alt=\"Case file photograph\">\n<scene_brief>A contained vertical subject photograph or evidence photograph suitable for a dossier.</scene_brief>\n</image_request>\n</cf_media><cf_facts><cf_fact label=\"STATUS\" value=\"MISSING\"></cf_fact><cf_fact label=\"LAST SEEN\" value=\"PLATFORM FOUR\"></cf_fact><cf_fact label=\"RISK LEVEL\" value=\"ELEVATED\"></cf_fact></cf_facts></cf_sheet>\n<details><summary>Case notes</summary><cf_notes>Investigation notes.</cf_notes></details>\n</case_file>",
          promptModule: "SURFACE: CASE FILE / CLASSIFIED DOSSIER\nUse <case_file> with target=\"custom.case-file\". Include 1 complete image request in authored order, using unique ids, meaningful slots, accessible alt text, aspect 3:4, and visible scene briefs. Place readable interface text in the semantic child tags.\n\nCONTRACT EXAMPLE\n<case_file case=\"04-17\" subject=\"Subject A\" status=\"Missing\" last_seen=\"Platform Four\" risk=\"Elevated\" agent=\"REDACTED\">\n<cf_tab>SUBJECT</cf_tab><cf_tab>EVIDENCE</cf_tab><cf_tab>TIMELINE</cf_tab>\n<cf_sheet><cf_media>\n<image_request id=\"case-file-001\" target=\"custom.case-file\" slot=\"subject-photo\" aspect=\"3:4\" alt=\"Case file photograph\">\n<scene_brief>A contained vertical subject photograph or evidence photograph suitable for a dossier.</scene_brief>\n</image_request>\n</cf_media><cf_facts><cf_fact label=\"STATUS\" value=\"MISSING\"></cf_fact><cf_fact label=\"LAST SEEN\" value=\"PLATFORM FOUR\"></cf_fact><cf_fact label=\"RISK LEVEL\" value=\"ELEVATED\"></cf_fact></cf_facts></cf_sheet>\n<details><summary>Case notes</summary><cf_notes>Investigation notes.</cf_notes></details>\n</case_file>",
          category: "evidence-editorial",
          shellMode: "collapsible",
          maxWidth: "760px",
          mediaFit: "contain",
          peoplePolicy: "allow",
          profile: "evidence-surveillance",
        },
  {
      index: 10,
      id: "relationship-map",
      label: "Relationship Map",
      icon: "🕸️",
      wrapper: "relationship_map",
      target: "custom.artifact-media",
      defaultAspect: "1:1",
      supportedAspects: ["1:1"],
      rootAttributes: ["id"],
      requiredMediaCount: 3,
      maximumMediaCount: 5,
      sampleXml: "<relationship_map id=\"relationship-map-01\">\n<title>Pressure Lines</title>\n<subtitle>Current relationship landscape from the focal character’s viewpoint</subtitle>\n<character_one><portrait><image_request id=\"relationship-map-01-focal\" target=\"custom.artifact-media\" slot=\"relationship-map-01-focal\" aspect=\"1:1\" alt=\"Portrait of Focal Character\"><scene_brief>Polished square relationship-board portrait using only visible established appearance, current clothing, expression, age vibe, scene lighting, and no readable text.</scene_brief></image_request></portrait><name>Focal Character</name><role>Center of the conflict</role><status>Focal</status><summary>The current focal viewpoint and the person carrying the map’s central pressure.</summary><relationship>Self</relationship><strength>95</strength><pressure>Must decide whom to trust.</pressure></character_one>\n<character_two><portrait><image_request id=\"relationship-map-01-ally\" target=\"custom.artifact-media\" slot=\"relationship-map-01-ally\" aspect=\"1:1\" alt=\"Portrait of Trusted Ally\"><scene_brief>Polished square relationship-board portrait using only visible established appearance, current clothing, expression, age vibe, scene lighting, and no readable text.</scene_brief></image_request></portrait><name>Trusted Ally</name><role>Closest bond</role><status>Trusted</status><summary>The strongest currently established ally.</summary><relationship>Protective trust</relationship><strength>90</strength><pressure>Trust is being tested.</pressure></character_two>\n<character_three><portrait><image_request id=\"relationship-map-01-observer\" target=\"custom.artifact-media\" slot=\"relationship-map-01-observer\" aspect=\"1:1\" alt=\"Portrait of Suspicious Observer\"><scene_brief>Polished square relationship-board portrait using only visible established appearance, current clothing, expression, age vibe, scene lighting, and no readable text.</scene_brief></image_request></portrait><name>Suspicious Observer</name><role>Rival or watcher</role><status>Strained</status><summary>A figure whose motives remain difficult to read.</summary><relationship>Mutual scrutiny</relationship><strength>62</strength><pressure>May know more than they admit.</pressure></character_three>\n<connections><one_two>trusted bond</one_two><one_three>mutual suspicion</one_three></connections>\n<insight>The trusted bond is strongest, but uncertainty around the observer keeps the focal character exposed.</insight>\n</relationship_map>",
      promptModule: "<relationship_map_utility>\n[RELATIONSHIP MAP — REVERIE RELAY UTILITY]\n\nUse this surface when the social web around a focal character becomes narratively important and the reader would benefit from seeing the current relationship landscape at a glance.\n\nThis is not a document, chat, or app surface. It is a dramatic character network board for bonds, suspicions, threats, alliances, and pressure points.\n\nUse it for:\n- escalating social tension\n- secret-identity pressure\n- rivalries and alliances\n- faction dynamics\n- cast-orientation moments\n- “who matters right now?” recaps\n\nDo not use it for:\n- casual background casts\n- fewer than three meaningful relationships\n- moments where the map adds no clarity\n- information unavailable to the focal viewpoint\n\nVIEWPOINT RULES\n\nEverything shown must reflect only what the focal viewpoint currently knows, suspects, or can reasonably infer.\nDo not reveal hidden truths as established facts unless the focal viewpoint already knows them.\nAn obscured connection may express uncertainty or suspicion, but it must not spoil unavailable truth.\n\nSTRUCTURE RULES — FLEXIBLE 3 TO 5 NODES\n\nUse at least three and no more than five character nodes.\nNever invent filler characters merely to reach five.\n\nRequired:\n- character_one = focal character\n- character_two = closest trusted bond or strongest ally\n- character_three = rival, observer, suspicious figure, or second major relationship\n\nOptional:\n- character_four = danger, destabilizer, likely threat, or additional major pressure\n- character_five = protector, anchor, family figure, or emotionally important stabilizer\n\nOmit character_four and character_five entirely when they are not meaningful. Do not output empty character blocks.\n\nIMAGE RULES\n\nEvery included character block must contain exactly one complete Reverie Relay <image_request> inside <portrait>.\nA three-node map therefore contains exactly three portrait requests; a four-node map contains four; a five-node map contains five.\n\nFor every portrait:\n- use target=\"custom.artifact-media\"\n- use aspect=\"1:1\"\n- give the request a unique id\n- give it a matching unique slot\n- describe only visible or established appearance\n- describe expression, clothing, age vibe, framing, lighting, and visual tone\n- request a polished character portrait suitable for a relationship board\n- do not request text, labels, or typography inside the image\n\nDo not use another illustration lane for this surface.\n\nFIELD RULES\n\n<title> Short dramatic title.\n<subtitle> Short orientation line naming the focal viewpoint or scope.\n\nFor every included character block:\n<name> Character name\n<role> Short scene-relevant role label\n<status> Short tag such as Focal, Trusted, Strained, Danger, Protector, Unknown\n<summary> One or two sentences describing the current read on this person\n<relationship> Primary relationship to the focal character\n<strength> Numeric value from 0 to 100\n<pressure> One current tension, vulnerability, or pressure point\n\nCONNECTION RULES\n\nAlways include:\n<one_two> focal ↔ character_two\n<one_three> focal ↔ character_three\n\nInclude only when the related optional character exists:\n<one_four> focal ↔ character_four\n<one_five> focal ↔ character_five\n<three_four> obscured or secondary connection between character_three and character_four\n\nOmit optional connection fields entirely when their character node is absent. Do not output empty connection fields.\n\n<insight> One short dramatic summary of the overall pressure point.\n\nOUTPUT FORMAT — EXACT\n\nOutput raw XML only. No markdown fence, HTML explanation, or prose label.\n\nMinimum three-node form:\n\n<relationship_map id=\"unique-map-id\">\n<title>Map title</title>\n<subtitle>Current scope or focal viewpoint</subtitle>\n\n<character_one>\n<portrait>\n<image_request id=\"unique-id-1\" target=\"custom.artifact-media\" slot=\"unique-id-1\" aspect=\"1:1\" alt=\"Portrait of Character name\">\n<scene_brief>Polished square relationship-board portrait using only visible or established appearance, current clothing, expression, age vibe, framing, lighting, and visual tone. No readable text.</scene_brief>\n</image_request>\n</portrait>\n<name>Character name</name>\n<role>Short role</role>\n<status>Focal</status>\n<summary>Current understanding of this person.</summary>\n<relationship>Self or central position in the current web.</relationship>\n<strength>95</strength>\n<pressure>Current tension or vulnerability.</pressure>\n</character_one>\n\n<character_two>\n<portrait>\n<image_request id=\"unique-id-2\" target=\"custom.artifact-media\" slot=\"unique-id-2\" aspect=\"1:1\" alt=\"Portrait of Character name\">\n<scene_brief>Polished square relationship-board portrait using only visible or established appearance, current clothing, expression, age vibe, framing, lighting, and visual tone. No readable text.</scene_brief>\n</image_request>\n</portrait>\n<name>Character name</name>\n<role>Short role</role>\n<status>Trusted</status>\n<summary>Current understanding of this person.</summary>\n<relationship>Primary relationship to the focal character.</relationship>\n<strength>90</strength>\n<pressure>Current tension or vulnerability.</pressure>\n</character_two>\n\n<character_three>\n<portrait>\n<image_request id=\"unique-id-3\" target=\"custom.artifact-media\" slot=\"unique-id-3\" aspect=\"1:1\" alt=\"Portrait of Character name\">\n<scene_brief>Polished square relationship-board portrait using only visible or established appearance, current clothing, expression, age vibe, framing, lighting, and visual tone. No readable text.</scene_brief>\n</image_request>\n</portrait>\n<name>Character name</name>\n<role>Short role</role>\n<status>Strained</status>\n<summary>Current understanding of this person.</summary>\n<relationship>Primary relationship to the focal character.</relationship>\n<strength>62</strength>\n<pressure>Current tension or vulnerability.</pressure>\n</character_three>\n\n<connections>\n<one_two>Short visible connection label</one_two>\n<one_three>Short visible connection label</one_three>\n</connections>\n\n<insight>One short dramatic summary of the current pressure point.</insight>\n</relationship_map>\n\nOPTIONAL CHARACTER FOUR BLOCK\nInsert this complete block after character_three only when a fourth node is meaningful:\n\n<character_four>\n<portrait>\n<image_request id=\"unique-id-4\" target=\"custom.artifact-media\" slot=\"unique-id-4\" aspect=\"1:1\" alt=\"Portrait of Character name\">\n<scene_brief>Polished square relationship-board portrait using only visible or established appearance, current clothing, expression, age vibe, framing, lighting, and visual tone. No readable text.</scene_brief>\n</image_request>\n</portrait>\n<name>Character name</name>\n<role>Short role</role>\n<status>Danger</status>\n<summary>Current understanding of this person.</summary>\n<relationship>Primary relationship to the focal character.</relationship>\n<strength>78</strength>\n<pressure>Current tension or vulnerability.</pressure>\n</character_four>\n\nWhen character_four exists, add <one_four> inside <connections>. Add <three_four> only when an obscured or secondary connection is currently inferable.\n\nOPTIONAL CHARACTER FIVE BLOCK\nInsert this complete block after character_four, or after character_three when character_four is absent, only when a fifth node is meaningful:\n\n<character_five>\n<portrait>\n<image_request id=\"unique-id-5\" target=\"custom.artifact-media\" slot=\"unique-id-5\" aspect=\"1:1\" alt=\"Portrait of Character name\">\n<scene_brief>Polished square relationship-board portrait using only visible or established appearance, current clothing, expression, age vibe, framing, lighting, and visual tone. No readable text.</scene_brief>\n</image_request>\n</portrait>\n<name>Character name</name>\n<role>Short role</role>\n<status>Protector</status>\n<summary>Current understanding of this person.</summary>\n<relationship>Primary relationship to the focal character.</relationship>\n<strength>88</strength>\n<pressure>Current tension or vulnerability.</pressure>\n</character_five>\n\nWhen character_five exists, add <one_five> inside <connections>.\n</relationship_map_utility>\n",
      category: "narrative-visuals",
      shellMode: "inline",
      maxWidth: "920px",
      mediaFit: "cover",
      peoplePolicy: "require",
      profile: "character-portrait",
    },
  {
    index: 11, id: 'instagram-dm', label: 'Instagram Direct Messages', icon: '◎', wrapper: 'instagram_dm', target: 'custom.instagram-dm',
    defaultAspect: '4:5', supportedAspects: ['1:1', '4:5'], rootAttributes: ['name', 'handle', 'time'], requiredMediaCount: 0, maximumMediaCount: 1,
    sampleXml: '<instagram_dm name="Display Name" handle="@username" time="21:14"><dm_msg side="left" user="@friend" time="21:13">Incoming message</dm_msg><dm_msg side="right" user="@username" time="21:14">Outgoing message</dm_msg></instagram_dm>',
    promptModule: 'SURFACE: INSTAGRAM DIRECT MESSAGES\nUse the accepted Regex contract exactly. Required root attributes are name, handle, and time. Use dm_msg children with side, user, and time attributes. Optional media uses dm_media containing one image_request target="custom.instagram-dm" with a unique id and slot.\n\n<instagram_dm name="Display Name" handle="@username" time="21:14"><dm_msg side="left" user="@friend" time="21:13">Incoming message</dm_msg><dm_msg side="right" user="@username" time="21:14">Outgoing message</dm_msg></instagram_dm>',
    category: 'social-messaging', shellMode: 'inline', maxWidth: '410px', mediaFit: 'contain', peoplePolicy: 'forbid', profile: 'auto',
  },
  {
    index: 12, id: 'x-dm', label: 'X Direct Messages', icon: '𝕏', wrapper: 'x_dm', target: 'custom.x-dm',
    defaultAspect: '4:5', supportedAspects: ['1:1', '4:5'], rootAttributes: ['name', 'handle', 'time'], requiredMediaCount: 0, maximumMediaCount: 1,
    sampleXml: '<x_dm name="Display Name" handle="@username" time="21:14"><dm_msg side="left" user="@friend" time="21:13">Incoming DM</dm_msg><dm_msg side="right" user="@username" time="21:14">Outgoing DM</dm_msg></x_dm>',
    promptModule: 'SURFACE: X DIRECT MESSAGES\nUse the accepted Regex contract exactly. Required root attributes are name, handle, and time. The wrapper may be x_dm; use dm_msg children with side, user, and time attributes. Optional media uses dm_media containing one image_request target="custom.x-dm" with a unique id and slot.\n\n<x_dm name="Display Name" handle="@username" time="21:14"><dm_msg side="left" user="@friend" time="21:13">Incoming DM</dm_msg><dm_msg side="right" user="@username" time="21:14">Outgoing DM</dm_msg></x_dm>',
    category: 'social-messaging', shellMode: 'inline', maxWidth: '410px', mediaFit: 'contain', peoplePolicy: 'forbid', profile: 'auto',
  },
  {
    index: 13, id: 'discord-dm', label: 'Discord Direct Messages', icon: '◉', wrapper: 'discord_dm', target: 'custom.discord-dm',
    defaultAspect: '4:5', supportedAspects: ['1:1', '4:5'], rootAttributes: ['name', 'status', 'time'], requiredMediaCount: 0, maximumMediaCount: 1,
    sampleXml: '<discord_dm name="Display Name" status="Online" time="21:14"><discord_msg user="friend" time="21:13">Incoming message</discord_msg><discord_msg user="you" time="21:14">Outgoing message</discord_msg></discord_dm>',
    promptModule: 'SURFACE: DISCORD DIRECT MESSAGES\nUse the accepted Regex contract exactly. Required root attributes are name, status, and time. Use discord_msg children with user and time attributes. Optional media uses dm_media containing one image_request target="custom.discord-dm" with a unique id and slot.\n\n<discord_dm name="Display Name" status="Online" time="21:14"><discord_msg user="friend" time="21:13">Incoming message</discord_msg><discord_msg user="you" time="21:14">Outgoing message</discord_msg></discord_dm>',
    category: 'social-messaging', shellMode: 'inline', maxWidth: '410px', mediaFit: 'contain', peoplePolicy: 'forbid', profile: 'auto',
  },
  {
    index: 14, id: 'discord-server', label: 'Discord Server', icon: '#', wrapper: 'discord_server', target: 'custom.artifact-media',
    defaultAspect: '1:1', supportedAspects: ['1:1', '4:3', '16:9'], rootAttributes: ['server', 'topic'], requiredMediaCount: 0, maximumMediaCount: 12,
    sampleXml: '<discord_server server="Server Name" topic="Late-night chat" members="1,284" online="318"><server_channel slot="1" name="general" description="General chat"><server_avatar_msg user="Guide" time="21:13"><avatar><image_request id="discord-avatar-guide" target="custom.artifact-media" slot="discord-avatar-guide" aspect="1:1" alt="Avatar of Guide"><scene_brief>Centered reusable portrait avatar of Guide.</scene_brief></image_request></avatar><text>First message.</text></server_avatar_msg></server_channel><server_channel slot="2" name="updates" description="Project updates"><server_avatar_msg user="Guide" time="21:14"><avatar><image_request id="discord-avatar-guide" target="custom.artifact-media" slot="discord-avatar-guide" aspect="1:1" alt="Avatar of Guide"><scene_brief>Centered reusable portrait avatar of Guide.</scene_brief></image_request></avatar><text>Second message.</text></server_avatar_msg></server_channel><server_channel slot="3" name="archive" description="Older messages"><server_msg user="Visitor" time="21:15">Historical initials-only message.</server_msg></server_channel></discord_server>',
    promptModule: 'SURFACE: DISCORD SERVER CHAT\nUse the accepted Regex contract exactly. Required root attributes are server, channel, and topic. Optional channels contains server_channel children. Required messages contains server_msg children with user and time attributes. Optional media uses server_media containing one image_request target="custom.discord-server" with a unique id and slot.\n\n<discord_server server="Server Name" channel="midnight-lounge" topic="Late-night chat"><channels><server_channel>#general</server_channel><server_channel>#midnight-lounge</server_channel></channels><messages><server_msg user="User One" time="21:13">First message</server_msg><server_msg user="User Two" time="21:14">Reply</server_msg></messages></discord_server>',
    category: 'social-messaging', shellMode: 'collapsible', maxWidth: '700px', mediaFit: 'contain', peoplePolicy: 'forbid', profile: 'auto',
  },
  {
    index: 15, id: 'google-images', label: 'Google Image Search', icon: 'G', wrapper: 'google_image_search', target: 'custom.artifact-media',
    defaultAspect: '4:3', supportedAspects: ['4:3'], rootAttributes: ['query'], requiredMediaCount: 1, maximumMediaCount: 6,
    sampleXml: '<google_image_search query="search phrase"><gis_result slot="1" title="First result" source="Example source"><image_request id="google-result-1" target="custom.artifact-media" slot="google-result-1" aspect="4:3" alt="First image result"><scene_brief>Plausible visual result for this exact search query.</scene_brief></image_request></gis_result></google_image_search>',
    promptModule: 'SURFACE: GOOGLE IMAGE SEARCH RESULTS\nUse the accepted Regex contract exactly. The canonical wrapper is google_image_search, never an abbreviated substitute. Required root attributes are query and results. Use one gallery_item per visible result. Each gallery_item contains one image_request target="custom.google-images" with a unique id and slot, followed by a concise caption.\n\n<google_image_search query="search phrase" results="1"><gallery_item><image_request id="google-result-1" target="custom.google-images" slot="google-result-1" aspect="4:3" alt="Image result"><scene_brief>Complete visual result prompt.</scene_brief></image_request><caption>Result caption</caption></gallery_item></google_image_search>',
    category: 'evidence-editorial', shellMode: 'collapsible', maxWidth: '920px', mediaFit: 'cover', peoplePolicy: 'forbid', profile: 'auto',
  },
  {
    index: 16, id: 'phone-gallery', label: 'Phone Gallery', icon: '▦', wrapper: 'phone_gallery', target: 'custom.phone-gallery',
    defaultAspect: '1:1', supportedAspects: ['1:1'], rootAttributes: ['album', 'time'], requiredMediaCount: 1, maximumMediaCount: 6,
    sampleXml: '<phone_gallery album="Recents" time="21:14"><gallery_item slot="1" title="First photo" time="21:12" location="Park" size="2 MB"><image_request id="gallery-photo-1" target="custom.artifact-media" slot="gallery-photo-1" aspect="1:1" alt="First gallery photo"><scene_brief>Distinct square-safe saved phone photo; focal subject inside the central 70%.</scene_brief></image_request></gallery_item></phone_gallery>',
    promptModule: 'SURFACE: PHONE PHOTO GALLERY\nUse <phone_gallery album="…" time="…"> with one <gallery_item slot="…" title="…" time="…" location="…" size="…"> per saved photo. Each item contains one unique image_request target="custom.artifact-media" using aspect="1:1". Describe each saved moment independently and keep its focal subject inside the central 70%. Grid thumbnails may fill their cells; the enlarged state preserves the full image. Never use photo id/caption or reuse one request between unrelated items.\n\n<phone_gallery album="Recents" time="21:14"><gallery_item slot="1" title="Photo" time="21:12" location="Park" size="2 MB"><image_request id="gallery-photo-1" target="custom.artifact-media" slot="gallery-photo-1" aspect="1:1" alt="Gallery photo"><scene_brief>Distinct square-safe saved phone photo; focal subject inside the central 70%.</scene_brief></image_request></gallery_item></phone_gallery>',
    category: 'photography-keepsakes', shellMode: 'inline', maxWidth: '460px', mediaFit: 'cover', peoplePolicy: 'forbid', profile: 'auto',
  },
  {
    index: 17, id: 'tiktok-post', label: 'TikTok Post', icon: '♪', wrapper: 'tiktok_post', target: 'custom.tiktok-post',
    defaultAspect: '9:16', supportedAspects: ['9:16'], rootAttributes: ['user', 'likes', 'comments', 'sound'], requiredMediaCount: 1, maximumMediaCount: 1,
    sampleXml: '<tiktok_post user="@creator" likes="12.4K" comments="384" sound="Original sound"><tt_media><image_request id="tiktok-media-1" target="custom.tiktok-post" slot="tiktok-media-1" aspect="9:16" alt="TikTok video frame"><scene_brief>Vertical TikTok video frame.</scene_brief></image_request></tt_media><tt_caption>Short caption</tt_caption><tt_comments><tt_comment user="@viewer" time="2m">First comment</tt_comment></tt_comments></tiktok_post>',
    promptModule: 'SURFACE: TIKTOK POST AND COMMENT DRAWER\nUse the accepted Regex contract exactly. Required root attributes are user, likes, comments, and sound. Required order: tt_media, tt_caption, optional tt_comments. tt_media contains one image_request target="custom.tiktok-post" with a unique id and slot and aspect="9:16". Use tt_comment children with user and time attributes.\n\n<tiktok_post user="@creator" likes="12.4K" comments="384" sound="Original sound"><tt_media><image_request id="tiktok-media-1" target="custom.tiktok-post" slot="tiktok-media-1" aspect="9:16" alt="TikTok video frame"><scene_brief>Complete vertical video-frame prompt.</scene_brief></image_request></tt_media><tt_caption>Short caption</tt_caption><tt_comments><tt_comment user="@viewer" time="2m">Comment</tt_comment></tt_comments></tiktok_post>',
    category: 'social-messaging', shellMode: 'inline', maxWidth: '460px', mediaFit: 'cover', peoplePolicy: 'forbid', profile: 'auto',
  },
  {
    index: 18, id: 'naver-article', label: 'Naver-Style News Article', icon: 'N', wrapper: 'naver_news', target: 'custom.naver-article',
    defaultAspect: '16:9', supportedAspects: ['16:9', '4:3'], rootAttributes: ['category', 'headline', 'source', 'byline', 'timestamp', 'comments'], requiredMediaCount: 0, maximumMediaCount: 1,
    sampleXml: '<naver_news category="Entertainment" headline="Article headline" source="News Desk" byline="Staff Reporter" timestamp="2026.08.09 14:22" comments="128"><nv_media><image_request id="naver-media-1" target="custom.naver-article" slot="naver-media-1" aspect="16:9" alt="Article photograph"><scene_brief>Publication-ready article photograph.</scene_brief></image_request></nv_media><nv_body>First paragraph. Second paragraph.</nv_body><nv_comments><nv_comment user="reader" time="2m">Reader comment.</nv_comment></nv_comments></naver_news>',
    promptModule: 'SURFACE: NAVER-STYLE NEWS ARTICLE\nUse the accepted Regex contract exactly. The canonical wrapper is naver_news, never an article substitute. Required root attributes are category, headline, source, byline, timestamp, and comments. Use optional nv_media containing one image_request target="custom.naver-article" with a unique id and slot, nv_body for article copy, and optional nv_comments containing nv_comment children with user and time attributes.\n\n<naver_news category="Entertainment" headline="Article headline" source="News Desk" byline="Staff Reporter" timestamp="2026.08.09 14:22" comments="128"><nv_media><image_request id="naver-media-1" target="custom.naver-article" slot="naver-media-1" aspect="16:9" alt="Article photograph"><scene_brief>Complete article photograph prompt.</scene_brief></image_request></nv_media><nv_body>Article body.</nv_body><nv_comments><nv_comment user="reader" time="2m">Comment.</nv_comment></nv_comments></naver_news>',
    category: 'evidence-editorial', shellMode: 'collapsible', maxWidth: '920px', mediaFit: 'contain', peoplePolicy: 'forbid', profile: 'auto',
  }
]

/** Reviewed entries derive their model-facing grammar from the canonical registry. */
const UNIFIED_SHIPPED_SURFACE_SPECS = LEGACY_SHIPPED_SURFACE_SPECS.map(spec => {
  const canonical = CANONICAL_REVIEWED_SURFACE_BY_ID.get(spec.id)
  if (!canonical) return spec
  const target = canonical.imageTargets[0] || spec.target
  const rootAttributes = [...new Set((canonical.sampleXml.match(/<[^\s>/]+\s+([^>]+)>/)?.[1].match(/\b([\w-]+)=/g) || []).map(value => value.slice(0, -1)))]
  return { ...spec, wrapper: canonical.wrapper, target: target as ImageTarget, rootAttributes, sampleXml: canonical.sampleXml, promptModule: canonical.utilityPrompt }
})

const REVIEWED_ONLY_SURFACE_SPECS: ShippedSurfaceSpec[] = ['newspaper', 'inline-chat'].map((surfaceId, offset) => {
  const canonical = CANONICAL_REVIEWED_SURFACE_BY_ID.get(surfaceId)!
  return {
    index: 100 + offset, id: canonical.surfaceId, label: surfaceId === 'newspaper' ? 'Newspaper' : 'Inline Chat', icon: surfaceId === 'newspaper' ? '🗞️' : '💬',
    wrapper: canonical.wrapper, target: (canonical.imageTargets[0] || 'custom.artifact-media') as ImageTarget,
    defaultAspect: '16:9', supportedAspects: ['16:9', '4:3'], rootAttributes: [], requiredMediaCount: 0, maximumMediaCount: 1,
    sampleXml: canonical.sampleXml, promptModule: canonical.utilityPrompt, category: 'social-messaging', shellMode: 'collapsible', maxWidth: '920px', mediaFit: 'contain', peoplePolicy: 'allow', profile: 'auto',
  }
})

const RESTORED_EVIDENCE_PHOTO_SPEC: ShippedSurfaceSpec = {
  index: 102, id: 'evidence-photo', label: 'Evidence Photo', icon: '📷', wrapper: 'evidence_photo', target: 'custom.evidence-photo',
  defaultAspect: '4:3', supportedAspects: ['4:3', '3:4'], rootAttributes: [], requiredMediaCount: 1, maximumMediaCount: 1,
  sampleXml: '<evidence_photo><image_request id="evidence-photo-001" target="custom.evidence-photo" slot="evidence-image" aspect="4:3" alt="Documentary evidence photograph"><scene_brief>Complete documentary evidence photograph with the exact visible subject matter.</scene_brief></image_request></evidence_photo>',
  promptModule: 'SURFACE: EVIDENCE PHOTO\nUse exactly one balanced <evidence_photo> wrapper containing one image_request with target="custom.evidence-photo", a unique id, slot="evidence-image", aspect="4:3", accessible alt text, and a complete documentary scene_brief. Preserve the exact visible subject matter; do not invent forensic labels or readable evidence text inside the generated image.\n\n<evidence_photo><image_request id="evidence-photo-UNIQUE-ID" target="custom.evidence-photo" slot="evidence-image" aspect="4:3" alt="Accessible evidence-photo description"><scene_brief>Complete documentary evidence photograph with the exact visible subject matter.</scene_brief></image_request></evidence_photo>',
  category: 'evidence-editorial', shellMode: 'collapsible', maxWidth: '760px', mediaFit: 'contain', peoplePolicy: 'allow', profile: 'evidence-surveillance',
}

function derivedNormalization(spec: ShippedSurfaceSpec): NonNullable<ShippedSurfaceSpec['normalization']> {
  const rootAliases = [...new Set([spec.wrapper.replace(/_/g, '-'), spec.wrapper.replace(/_/g, '')].filter(alias => alias && alias !== spec.wrapper))]
  const rootAttributeSource = new RegExp(`^\\s*<${spec.wrapper}\\b([^>]*)>`, 'i').exec(spec.sampleXml)?.[1] || ''
  const sampleRootAttributes = [...rootAttributeSource.matchAll(/([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=/g)].map(match => match[1])
  const canonicalRootAttributes = [...new Set([...spec.rootAttributes, ...sampleRootAttributes])]
  const body = spec.sampleXml.replace(new RegExp(`^\\s*<${spec.wrapper}\\b[^>]*>|</${spec.wrapper}>\\s*$`, 'gi'), '')
  const directChildren: string[] = []
  let depth = 0
  for (const token of body.match(/<\/?[A-Za-z][^>]*>/g) || []) {
    const close = /^<\//.test(token)
    const tag = /^<\/?\s*([A-Za-z][\w:-]*)/.exec(token)?.[1]?.toLowerCase()
    if (!tag) continue
    const voidElement = /\/$/.test(token) || ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag)
    if (close) { depth = Math.max(0, depth - 1); continue }
    if (depth === 0 && !directChildren.includes(tag)) directChildren.push(tag)
    if (!voidElement) depth += 1
  }
  const attributeAliases = Object.fromEntries(canonicalRootAttributes.flatMap(attribute => [
    [attribute.replace(/_/g, '-'), attribute],
    [attribute.replace(/_/g, ''), attribute],
  ]).filter(([alias, canonical]) => alias !== canonical))
  const childAliases = Object.fromEntries(directChildren.flatMap(child => [
    [child.replace(/_/g, '-'), child],
    [child.replace(/_/g, ''), child],
  ]).filter(([alias, canonical]) => alias !== canonical))
  // These repairs apply only when the child is isolated and the intended
  // wrapper is absent, which is conservative enough for a rescan pass.
  const uniqueParents: Record<string, string> = {}
  if (spec.id === 'case-file') uniqueParents.image_request = 'cf_media'
  if (spec.id === 'relationship-map') uniqueParents.image_request = 'portrait'
  return {
    rootAliases,
    attributeAliases,
    allowedChildren: directChildren,
    canonicalChildOrder: directChildren,
    childAliases,
    uniqueParents,
    optionalMeta: sampleRootAttributes.filter(key => !['id', 'slot', 'target', 'aspect', 'members', 'online'].includes(key)),
  }
}

const R45_SAMPLE_OVERRIDES: Record<string, string> = {
  'forum-thread': '<forum_thread community="r/fieldnotes" user="archive_user" time="3 hours ago" score="4.8K" title="What did the station camera capture?"><fm_body>The north platform was empty when the signal changed.</fm_body><fm_media><image_request id="forum-media-1" target="custom.artifact-media" slot="forum-media-1" aspect="16:9" alt="Station camera attachment"><scene_brief>Wide documentary photograph of an empty station platform at night, full platform visible, no interface or readable text.</scene_brief></image_request></fm_media><fm_comments><fm_comment user="reader_one">The service light is on.</fm_comment><fm_comment user="reader_two">Check the far gate.</fm_comment></fm_comments></forum_thread>',
  'imessage-chat': '<imessage_chat title="Weekend Group" participants="Character A, Character B, You" time="Today 7:14 PM" status="Delivered" unread="0"><im_messages><im_msg from="Character A" side="left">Are you there?</im_msg><im_msg from="You" side="right">Almost.</im_msg><im_media><image_request id="imessage-media-1" target="custom.artifact-media" slot="imessage-media-1" aspect="4:3" alt="Shared iMessage photograph"><scene_brief>Landscape phone photograph of the station entrance at dusk, entrance and surroundings fully visible, no phone UI or readable text.</scene_brief></image_request></im_media><im_msg from="Character B" side="left">I recognize that entrance.</im_msg></im_messages></imessage_chat>',
  'workspace-chat': '<workspace_chat workspace="Field Team" members="5" time="11:36 PM" active="1"><ws_channels><ws_channel slot="1" name="field-chat" description="Live coordination"><ws_messages><ws_msg user="Character A" time="11:32 PM">Check the north gate.</ws_msg><ws_msg user="Character B" time="11:33 PM">Uploading the photograph.<ws_media><image_request id="workspace-media-1" target="custom.artifact-media" slot="workspace-media-1" aspect="4:3" alt="Workspace shared photograph"><scene_brief>Documentary photograph of the north gate being discussed, entire gate visible, no workspace UI or readable text.</scene_brief></image_request></ws_media></ws_msg></ws_messages></ws_channel><ws_channel slot="2" name="evidence" description="Reviewed evidence"><ws_messages><ws_msg user="Character C" time="11:34 PM">File received.</ws_msg></ws_messages></ws_channel><ws_channel slot="3" name="planning" description="Next actions"><ws_messages><ws_msg user="Character A" time="11:35 PM">Meet at dawn.</ws_msg></ws_messages></ws_channel><ws_channel slot="4" name="archive" description="Older updates"><ws_messages><ws_msg user="Character B" time="11:36 PM">Archived.</ws_msg></ws_messages></ws_channel></ws_channels></workspace_chat>',
  'dating-profile': '<tinder><user><name>You</name><avatar><image_request id="tinder-user-avatar" target="custom.artifact-media" slot="tinder-user-avatar" aspect="1:1" alt="Local dating avatar"><scene_brief>Centered reusable dating-app avatar of the local participant, face and shoulders visible with generous headroom, no app UI or text.</scene_brief></image_request></avatar></user><profiles><profile slot="1" prev="3" next="2"><name>Profile A</name><age>27</age><subtitle>2 km away</subtitle><role>Designer</role><tags>coffee · museums · late walks</tags><bio>Short profile bio.</bio><photo><image_request id="tinder-profile-1" target="custom.artifact-media" slot="tinder-profile-1" aspect="3:4" alt="Dating profile portrait"><scene_brief>Centered face and upper torso dating portrait of Profile A, full hair visible, generous headroom, subject centered inside portrait-safe area, no app UI or text.</scene_brief></image_request></photo></profile><profile slot="2" prev="1" next="3"><name>Profile B</name><age>28</age><subtitle>4 km away</subtitle><role>Developer</role><tags>games · music · night markets</tags><bio>Short profile bio.</bio><photo><image_request id="tinder-profile-2" target="custom.artifact-media" slot="tinder-profile-2" aspect="3:4" alt="Dating profile portrait"><scene_brief>Centered face and upper torso dating portrait of Profile B, full hair visible, generous headroom, subject centered inside portrait-safe area, no app UI or text.</scene_brief></image_request></photo></profile><profile slot="3" prev="2" next="1"><name>Profile C</name><age>29</age><subtitle>6 km away</subtitle><role>Musician</role><tags>records · dogs · rainy days</tags><bio>Short profile bio.</bio><photo><image_request id="tinder-profile-3" target="custom.artifact-media" slot="tinder-profile-3" aspect="3:4" alt="Dating profile portrait"><scene_brief>Centered face and upper torso dating portrait of Profile C, full hair visible, generous headroom, subject centered inside portrait-safe area, no app UI or text.</scene_brief></image_request></photo></profile></profiles></tinder>',
  'case-file': '<case_file case="04-17" subject="Subject A" status="Open" last_seen="Platform Four" risk="Elevated" agent="Field Agent"><cf_sheet><cf_media><image_request id="case-media-1" target="custom.artifact-media" slot="case-media-1" aspect="3:4" alt="Case subject photograph"><scene_brief>Contained vertical identification photograph of Subject A in current clothing, neutral evidentiary framing, no dossier UI or readable text.</scene_brief></image_request></cf_media><cf_facts><cf_fact label="STATUS" value="OPEN"></cf_fact><cf_fact label="LAST SEEN" value="PLATFORM FOUR"></cf_fact><cf_fact label="RISK" value="ELEVATED"></cf_fact></cf_facts></cf_sheet><cf_timeline><cf_event date="Today" title="Evidence received">A photograph was added to the case.</cf_event></cf_timeline><cf_notes>Verify the north entrance before closing the lead.</cf_notes></case_file>',
  'discord-server': '<discord_server server="Field Server" topic="Live coordination" members="1,284" online="318"><server_channel slot="1" name="general" description="General chat"><server_avatar_msg user="Participant A" time="08:30"><avatar><image_request id="discord-avatar-a" target="custom.artifact-media" slot="discord-avatar-a" aspect="1:1" alt="Avatar of Participant A"><scene_brief>Centered reusable portrait avatar of Participant A, stable identity, current appearance, simple background, no text.</scene_brief></image_request></avatar><text>Morning.</text></server_avatar_msg><server_avatar_msg user="You" time="08:31"><avatar><image_request id="discord-avatar-you" target="custom.artifact-media" slot="discord-avatar-you" aspect="1:1" alt="Avatar of the local participant"><scene_brief>Centered reusable portrait avatar of the local participant using established Persona appearance, simple background, no text.</scene_brief></image_request></avatar><text>I am here.</text></server_avatar_msg></server_channel><server_channel slot="2" name="updates" description="Project updates"><server_avatar_msg user="Participant A" time="08:32"><avatar><image_request id="discord-avatar-a" target="custom.artifact-media" slot="discord-avatar-a" aspect="1:1" alt="Avatar of Participant A"><scene_brief>Centered reusable portrait avatar of Participant A, stable identity, current appearance, simple background, no text.</scene_brief></image_request></avatar><text>The gate is open.</text></server_avatar_msg></server_channel><server_channel slot="3" name="media" description="Shared files"><server_media><image_request id="discord-media-1" target="custom.artifact-media" slot="discord-media-1" aspect="4:3" alt="Shared server photograph"><scene_brief>Landscape photograph of the gate being discussed, full subject visible, no Discord interface or readable text.</scene_brief></image_request></server_media></server_channel><server_channel slot="4" name="archive" description="Older messages"><server_avatar_msg user="You" time="08:33"><avatar><image_request id="discord-avatar-you" target="custom.artifact-media" slot="discord-avatar-you" aspect="1:1" alt="Avatar of the local participant"><scene_brief>Centered reusable portrait avatar of the local participant using established Persona appearance, simple background, no text.</scene_brief></image_request></avatar><text>Saved.</text></server_avatar_msg></server_channel></discord_server>',
  'evidence-photo': '<evidence_photo case="EV-104" label="North gate" timestamp="22:14" source="Camera A"><photo><image_request id="evidence-photo-1" target="custom.artifact-media" slot="evidence-photo-1" aspect="4:3" alt="North gate evidence photograph"><scene_brief>Documentary evidentiary view of the north gate at night, full gate and nearby ground visible, no labels, timestamps, or interface.</scene_brief></image_request></photo><caption>North gate after closing.</caption><note>Light visible near the service entrance.</note></evidence_photo>',
  'album-cover': '<album_cover><title>Midnight Signal</title><artist>Fictional Artist</artist><release>Single</release><artwork><image_request id="album-art-1" target="custom.artifact-media" slot="album-art-1" aspect="1:1" alt="Midnight Signal album artwork"><scene_brief>Square art-first release artwork matching the title Midnight Signal and its nocturnal radio concept, strong centered composition, no interface chrome or readable text.</scene_brief></image_request></artwork></album_cover>',
  'magazine-cover': '<magazine_cover><masthead>FIELD</masthead><issue>Autumn Issue</issue><kicker>Special Report</kicker><headline>The Last Platform</headline><subhead>Inside the city after midnight</subhead><image_request id="magazine-art-1" target="custom.artifact-media" slot="magazine-art-1" aspect="4:5" alt="Editorial station cover photograph"><scene_brief>Vertical editorial photograph of an illuminated station platform at night with deliberate headline-safe space, no masthead or readable text in the image.</scene_brief></image_request></magazine_cover>',
  'photo-booth-strip': '<photo_booth_strip title="After Midnight" date="Tonight"><booth_frame><image_request id="booth-frame-1" target="custom.artifact-media" slot="booth-frame-1" aspect="2:5" alt="First photo booth pose"><scene_brief>First pose in one coherent vertical photo-booth session, same participants, wardrobe, booth, and lighting, no text.</scene_brief></image_request></booth_frame><booth_frame><image_request id="booth-frame-2" target="custom.artifact-media" slot="booth-frame-2" aspect="2:5" alt="Second photo booth pose"><scene_brief>Second pose in the same coherent vertical photo-booth session, identities and wardrobe unchanged, no text.</scene_brief></image_request></booth_frame><booth_frame><image_request id="booth-frame-3" target="custom.artifact-media" slot="booth-frame-3" aspect="2:5" alt="Third photo booth pose"><scene_brief>Third pose in the same coherent vertical photo-booth session, identities and wardrobe unchanged, no text.</scene_brief></image_request></booth_frame><booth_frame><image_request id="booth-frame-4" target="custom.artifact-media" slot="booth-frame-4" aspect="2:5" alt="Fourth photo booth pose"><scene_brief>Fourth pose in the same coherent vertical photo-booth session, identities and wardrobe unchanged, no text.</scene_brief></image_request></booth_frame><caption>Four frames after midnight.</caption></photo_booth_strip>',
  polaroid: '<polaroid_frame date="Tonight" location="North Pier"><photo><image_request id="polaroid-photo-1" target="custom.artifact-media" slot="polaroid-photo-1" aspect="1:1" alt="North Pier instant photograph"><scene_brief>Square candid instant photograph at North Pier after rain, full photographed scene visible, no paper border or readable text.</scene_brief></image_request></photo><caption>After the rain.</caption></polaroid_frame>',
  'youtube-thumbnail': '<yt_thumbnail channel="Field Archive" title="The Last Train at North Pier" views="18K views" age="2 hours ago" subscribers="84K subscribers"><yt_media><image_request id="youtube-frame-1" target="custom.artifact-media" slot="youtube-frame-1" aspect="16:9" alt="Video frame at North Pier"><scene_brief>Wide frame from the authored video showing the last train arriving at North Pier, key action inside the center-safe area, no YouTube logo, play icon, UI, or readable text.</scene_brief></image_request></yt_media><yt_comments><yt_comment user="viewer_one" time="12m" likes="28">The platform light changed.</yt_comment><yt_comment user="viewer_two" time="4m" likes="9">Look near the far gate.</yt_comment></yt_comments></yt_thumbnail>',
}

function applyR45Authority(spec: ShippedSurfaceSpec): ShippedSurfaceSpec {
  const sampleXml = R45_SAMPLE_OVERRIDES[spec.id] || spec.sampleXml
  const customArtifactXml = sampleXml.replace(/target="custom\.[^"]+"/g, 'target="custom.artifact-media"')
  const promptXml = bracketSurfacePromptModule({
    label: spec.label,
    root: spec.wrapper,
    sampleXml: customArtifactXml,
    target: spec.target.startsWith('custom.') ? 'custom.artifact-media' : spec.target,
    aspect: spec.defaultAspect,
  })
  return {
    ...spec,
    target: spec.target.startsWith('custom.') ? 'custom.artifact-media' : spec.target,
    sampleXml: customArtifactXml,
    promptModule: promptXml,
  }
}

/** Every active shipped Surface carries a normalization entry derived from its
 * own canonical grammar. Retired R4.5 Surfaces are absent from the inventory. */
export const SHIPPED_SURFACE_SPECS: ShippedSurfaceSpec[] = [...UNIFIED_SHIPPED_SURFACE_SPECS, ...REVIEWED_ONLY_SURFACE_SPECS, RESTORED_EVIDENCE_PHOTO_SPEC]
  .filter(spec => spec.id !== 'weverse-post')
  .map(applyR45Authority)
  .map(spec => ({ ...spec, normalization: derivedNormalization(spec) }))

export const SHIPPED_SURFACE_BY_ID = new Map(SHIPPED_SURFACE_SPECS.map(spec => [spec.id, spec]))
export const SHIPPED_SURFACE_BY_WRAPPER = new Map(SHIPPED_SURFACE_SPECS.map(spec => [spec.wrapper, spec]))
export const SHIPPED_SURFACE_ROOT_TAGS = SHIPPED_SURFACE_SPECS.map(spec => spec.wrapper)

/** Runtime ownership is Relay-only for approved R4.5 Surfaces; Regex packs are compatibility/reference assets. */
export const REVIEWED_REGEX_SURFACE_IDS = new Set<string>()

/** The deterministic Hybrid default. A deliberate per-preset preference wins. */
export function hybridSurfaceOwner(definition: Pick<CustomSurfaceDefinition, 'baseSurfaceId' | 'hybridOwner' | 'hybridOwnerConfigured'> | undefined): 'relay' | 'regex' {
  if (definition?.hybridOwnerConfigured === true && definition.hybridOwner) return definition.hybridOwner
  return 'relay'
}

export function shippedSurfaceDefinitions(now = Date.now()): CustomSurfaceDefinition[] {
  const imageFormat = '<img src="{{imageUrl}}" alt="{{alt}}" data-dgir-key="{{slotKey}}" data-dgir-request-id="{{requestId}}" data-dgir-slot="{{slot}}" data-dgir-custom-target="{{target}}" data-dgir-image-id="{{imageId}}">'
  return SHIPPED_SURFACE_SPECS.map(spec => ({
    surfaceId: spec.id,
    baseSurfaceId: spec.id,
    presetName: 'Relay Default',
    shellMode: spec.shellMode,
    defaultOpen: false,
    launcherLabel: `${spec.icon} ${spec.label}`,
    density: 'comfortable',
    maxWidth: spec.maxWidth,
    mediaFit: spec.mediaFit,
    accentMode: 'theme',
    customAccent: '#c24b78',
    typography: ['letter-dispatch', 'diary-page', 'court-transcript', 'public-bulletin'].includes(spec.id) ? 'editorial' : 'mixed',
    advancedCss: '',
    displayName: spec.label,
    icon: spec.icon,
    targetId: spec.target,
    canonicalOuterWrapper: spec.wrapper,
    imageSlotSelector: 'img',
    resolvedImageChildFormat: imageFormat,
    supportedAspectRatios: spec.supportedAspects,
    defaultPromptProfileId: spec.profile,
    peoplePolicy: spec.peoplePolicy,
    captionSupport: true,
    altTextSupport: true,
    defaultCandidateCount: 1,
    compatibleRegenerationIntents: ['new-angle', 'better-expression', 'preserve-composition-improve-quality', 'full-reimagining'],
    declarativeLayoutFields: { shellMode: 'inline|collapsible', renderer: 'relay', wrapper: spec.wrapper },
    validationRules: ['balanced-wrapper', 'safe-static-markup', 'stable-request-ownership', `required-media:${spec.requiredMediaCount}`, ...(spec.maximumMediaCount ? [`maximum-media:${spec.maximumMediaCount}`] : [])],
    sampleXml: spec.sampleXml,
    deterministicPreviewFixture: { title: spec.label, targetId: spec.target, wrapper: spec.wrapper, requiredMediaCount: spec.requiredMediaCount, maximumMediaCount: spec.maximumMediaCount },
    builtIn: true,
    enabled: true,
    promptEnabled: true,
    promptCategory: spec.category,
    promptModule: spec.promptModule,
    hybridOwner: 'relay',
    hybridOwnerConfigured: false,
    updatedAt: now,
  }))
}
