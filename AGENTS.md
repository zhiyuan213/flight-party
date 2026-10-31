# Flight Party implementation constraints

Latest user override: no game-count quotas for anyone. Do not calculate or debit daily allowances. Only accounts signed in at match start accumulate server-verified scores and completed games; anonymous games remain untracked. Older quota/membership allowance instructions below are historical and superseded.

Latest score-recording override: the first completed signed-in game per day is recorded automatically, including negative points; later games are playable but unrecorded unless membership is active. Members have unlimited score records. Creem is the payment provider; monthly 9 USD, annual 59 USD. Keep all gameplay unlimited. Do not accept client-provided scores or claim real payments/entitlements without verified Creem configuration and events.

Read README.md, docs/RULES.md, docs/V07-CONTRACT.md, docs/HANDOFF.md, docs/QA.md, docs/VISUAL_ACCEPTANCE.md and inspect docs/design/gameplay-reference.png before changing the app.

- The current v0.7.2 scope is UI preview on the v0.6.2 visual/local-game baseline, with the calibrated illustrated board and independent 3D die. Keep the experimental Three.js path, but do not claim it matches the design before asset and screenshot verification.
- Keep rules in engine.js independent of rendering and UI. Do not silently change game rules.
- Do not implement fake invitation, payment or room features. Cross-device multiplayer requires server authority.
- User prioritizes visual fidelity, funny collision animation and synchronized audio. Missing production assets must be disclosed.
- User requires UI approval first and final UI references inside development documents/packages.
- Keep buildless startup and vendored dependencies until a justified migration. No install is required to run this prototype.
- Run `npm test` and syntax checks for modified JS. For browser QA, use the environment's supported browser and preview tools.
- Keep source updates reviewable and document actual validation limits.
- The user accepts local visual improvements and now requests account/invitation/matchmaking UI while preserving the road alignment. This is not complete visual approval; compare the original design, v05 feedback and docs/design/v062-road-alignment-feedback.png. Keep each requested change bounded.
- Palette lives in dist/palette.js and is shared by UI and board; keep base/floor/lane colors separate. Retain chamfered base rims. Flag cloth is shaded but static.
- v0.6.2 uses the fixed projective ground calibration in ground-projection.js. World x/z ±5.725 maps to measured 1254px artwork corners TL(145,105), TR(1109,105), BR(1128,1076), BL(124,1076). Resize changes containing scale only; do not stretch the airport or alter calibration to fill the viewport. The earlier depth()=1 contract is historical.
- The board is inset into the ground with a low curb. Preserve road/board registration and island breathing room.
- Plane numbers 1/2 belong on the white fuselage panel, follow body animation and remain readable when mirrored. UI status chips use the same actual piece identities.
- The die has six fixed mesh faces, with opposite values summing to 7. The authoritative result face must face the player after animation; never change the result or face labels to fit artwork.
- Use die-geometry.js for the shared recessed mesh and die3d.js for WebGL or software-3D rendering. Do not claim GPU visual validation based only on the software path.
- Keep dice selection locked until rollTo resolves; cancellation must settle its Promise and invalidate the old turn. Reduced motion must show the actual result immediately.
- The 1120ms dice motion is authored animation, not a rigid-body physics simulation. The board remains 2.5D.
- Historical dice preview: docs/verification/dice-3d-preview.mp4 is from v0.6. Existing collision-preview.mp4 is from v0.5; neither records v0.6.2 ground alignment.

- v0.6.1 reserves a fixed-height plane-selection row in every phase. Keep the die host size unchanged when buttons appear/disappear.
- Plane groundY is a rendering-only shadow anchor; interpolate receiving-surface height separately from flight height. Preserve the soft outer shadow and denser contact core.

- The 1.2-world-unit curb chamfer and 1.15 floor clipping contour protect the road corners. Keep tiles, planes, shadows, particles and pointer hit checks on the same project() mapping.

## Current UI scope and future functionality (latest user request 2026-10-31)
- This pass is UI preview plus handoff documentation for later Codex. Do not implement or claim real accounts, rankings, quotas, membership, network rooms, score persistence or shared reactions. Mark simulated states Preview / 示例数据. Preserve current engine and all road/dice/plane visuals.
- Homepage has two primary online actions: Quick match and Create room. Remove the matching configuration form. Online preview defaults to four seats in classic mode; this is an implementation default, not a permanent product rule. Local practice retains 2–4 faction configuration and separate party mode.
- Quick match immediately joins an eligible public waiting room with space or automatically creates one. A room starts a single server-owned 30-second deadline on entering public matching. Full human room starts early; deadline fills every empty seat with bots and starts. Later joins/leaves/reconnects never reset it. No optional bot-fill confirmation.
- Create room enters invitation-only waiting with link/code and Ready for takeoff. Current humans each ready; all ready opens remaining seats to public matching while keeping friends together. No countdown while simply waiting for friends. Creator may ready alone; quick-match entrants are already ready. Started rooms reject new participants; existing seats may reconnect.
- Future game rule: first two players each finish both planes, then end. Rank unfinished seats by completed planes then progress; award +2,+1,-1,-1. Two-player games require both finish. Implement/test later, updating the existing engine hash guard only then.
- Future statistics: top-10 points and completed-game-count boards only. Remove wins/win-rate UI. Signed-in participants automatically save complete server-verified results, including negative points; anonymous users and native bots have no cumulative stats or leaderboard entries. Remove manual score upload and guest result claiming; never accept client-submitted scores. Freeze server-side accountId on each seat at match start; logout/session expiry cannot erase it or escape negative points. Guest sign-in during play applies to later games by default. Completed signed-in matches increment games exactly once, win or loss.
- Anonymous and signed-in users may play without a login gate. Retain ordinary 20 daily games and unlimited membership; guest 20/day and UTC reset are implementation suggestions. Deduplicate anonymous usage when signing in. Start, quota debit and settlement each occur once per match/identity.
- Auth remains email+password without an email verification code, plus Google/GitHub entry previews. Do not mark unverified email verified or auto-merge accounts by unverified email. Preview credentials are transient; no real auth success claims.
- Backend anti-tamper is required later: server dice/legal moves/turns/deadlines/bots/ranks; per-command identity/seat validation; ordered idempotent actions; one settlement and per-seat statistic write in a transaction; server-derived points/games; HTTPS/WSS and rate limits. Frontend obfuscation or local signatures are not authority and cannot prove security.
- Disconnect/offline bot takeover retains original identity/seat. Reconnect gets authoritative state and safe control handoff, never duplicate actions, charges or settlement. Broadcast reactions to all room members in the later service pass.
- Full current behavior, implementation defaults and unresolved details are in docs/V07-CONTRACT.md. Any proposed service/schema is not evidence of running services. No payment/deployment work in this UI task.
- Internal version is 0.7.2; ZIP remains FlightParty-v0.7.zip. Record actual checks in QA only after running them; preserve older visual/test evidence as historical.
