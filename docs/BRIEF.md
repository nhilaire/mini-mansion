# Brief: mini-mansion

Date: 2026-10-20
Project slug: mini-mansion
Final app name: Mini Mansion

## Original brief

> Je veux faire un jeu point to click dans le même genre que celui-là C:\dev\android\midnight-mansion avec
> inspiration maniac mansion. Le repertoire contient un POC de faisabilité, c'est ok.
> Tu trouveras le premier jet de PRD du jeu ici [C:\dev\prd]
> Je te donnerai les photos de mes pièces et il faudra reproduire globalement la pièce en pixel art mais pour
> l'instant, on prépare le reste, on vérifie la cohérence du scénario, etc.
> quitte même à faire une première version qui ressemble pas tout à fait.
> Propose aussi un nom avec mansion dedans

### Source material (kept local, outside the repository)

- `C:\dev\prd\gameprd.txt`: the user's first PRD draft "Le Secret de la Maison" (French, 23 sections): a young
  detective sneaks into a family house to investigate a rumour that the father invented a secret, dangerous recipe;
  the truth is a gluten-free, lactose-free chocolate cake. Characters: the father, the mother, three children
  (football fan, drums/Nerf/video games fan, chess/Rubik's Cube fan). Puzzles E01-E15 (doormat key, ball on the pool
  cover, drumsticks, missing chess piece, Rubik's Cube, mate-in-3 chess problem giving the computer code, father's
  computer, broken shower, steamed mirror code, safe, paint stain hiding the attic door, secret laundry room, optional
  pool pump, escape from the wine cellar after a capture), light stealth (doorbell distraction, capture rules),
  clue notebook, optional 3-level hints.
- `C:\dev\prd\plan.txt`: the canonical navigation plan of the house (3 outdoor zones, ground floor, garage / wine
  cellar / attic, upstairs corridor door order, list of transitions).
- `C:\dev\android\midnight-mansion`: the feasibility POC ("Minuit moins 13", v0.1.0) whose engine (walkable areas,
  pathfinding, verbs, inventory, dialogues, autosave) is the technical starting point.
- Room photos of the user's real house will be supplied later; each room is to be reproduced roughly in pixel art.
  A first version may use approximate rooms.

## Clarifying questions

Answers are summarised in English. Format: `- **Q:** question` then `  **A:** answer`.
Mark assumptions the user accepted as `(default accepted)`.

### Concept and players

- **Q:** The repository will be public: what about the characters' first names and the house photos?
  **A:** The first names in the draft (the father, the mother, Julien, Florent, Théo) are already invented, they
  stay. The room photos must never be published: they stay local, only the derived pixel art is committed.
- **Q:** Who is the young detective the player controls (a stranger sneaking in sounds like a burglary)?
  **A:** A teenager from the neighbourhood, a friend of the children, curious, who heard the rumour and knows about
  the key under the doormat. (default accepted)
- **Q:** Who is the game for?
  **A:** Families, from about 10 years old (as stated in the draft): light humour, light mystery, never scary.
- **Q:** Total length to finish the game without help?
  **A:** 3 hours or more, played over sessions of 10-30 min thanks to the autosave.
- **Q:** What is the size of the first version (the plan has about 22 places, the POC had 8)?
  **A:** Everything, complete: all places of the plan and all puzzles E01-E15, the pool pump included (so E14 needs
  a real role).

### Story (About screen)

- **Q:** Why this game, in this house?
  **A:** To bring back Maniac Mansion, the game of the user's childhood, this time set in their own home. Draft
  accepted by the user for `about.story`:
  « Enfant, je passais des heures à fouiller chaque pièce du manoir de Maniac Mansion, chez une famille complètement
  folle. Cette fois, j'ai voulu que le manoir soit une vraie maison : la mienne, transformée en pixel art, avec ses
  habitants loufoques et un secret bien gardé. »

### Gameplay and controls

- **Q:** How do the stealth windows (doorbell, drums, chess game) and captures work?
  **A:** Event-driven, no timer and no reflex: a window stays open until a precise event (puzzle solved, room left);
  a capture only happens when entering a room that is occupied, and the occupant's presence is always announced
  beforehand (sounds, a line). (default accepted)
- **Q:** How are the ball (Julien) and drums (Florent) tracks connected to the main investigation (in the draft
  they open rooms that contain nothing needed)?
  **A:** The missing chess piece is in Julien's room among his trophies (ball -> Julien leaves -> chess piece ->
  Théo's game); the shower spare part is an O-ring from Florent's Nerf modding kit in his room (drums -> Florent
  leaves -> spare part -> shower). (default accepted)
- **Q:** How does the player learn that hot water reveals the safe code on the mirror?
  **A:** Through Théo: his monologue adds a hint that his father always lingers in front of the shower mirror.
- **Q:** Which level for the chess problem (draft: mate in 3)?
  **A:** Mate in 2, guided: fixed position, tap a piece then a square, the opponent answers automatically; the
  destination squares of the winning moves give the computer code; unlimited retries. (default accepted)
- **Q:** Who makes the parents' bedroom (safe and shower) dangerous? No routine placed a parent there.
  **A:** The mother folds laundry in the parents' bedroom; the player starts the washing machine in the cellier and,
  when it rings, she goes down and stays in the cellier or the garden. The father leaves his office thanks to the
  doorbell (as in the draft) and goes to the kitchen to test his recipe. (default accepted)
- **Q:** The living room leads to the pool but not back (a way in without the doormat key). How does the bay window
  work?
  **A:** Locked from the inside: from the pool, « C'est verrouillé de l'intérieur. »; once opened from the living room
  it works both ways. The doormat key stays mandatory. (default accepted)
- **Q:** After a first escape from the wine cellar (iron bar), what happens on later captures?
  **A:** The shutter stays open: a short funny scene (« Encore toi ?! »), the player is put in the cellar and walks
  straight out. No repeated punishment. (default accepted)
- **Q:** Which role for the pool pump (E14)?
  **A:** Mandatory: the bottle of paint thinner lies at the bottom of the pool; draining it is required for the
  attic door (this changes the draft, where E14 was optional and the thinner was in the cellier).
- **Q:** When does Florent stop playing the drums?
  **A:** He plays until the player has taken the O-ring and left his room, then goes back upstairs; his room is
  forbidden again but no longer needed. (default accepted)
- **Q:** The draft mentions a dining room, a flower garden where the mother gardens and a swing, absent from the
  plan. What to do?
  **A:** Add them as new zones of the plan, with their own exits.
- **Q:** Where is the dining room?
  **A:** Between the music corner and the kitchen: Salon <- Coin musique <- Salle à manger <- Cuisine (the draft
  already says the music corner is between the living room and the dining room). (default accepted)
- **Q:** Where is the garden (the mother's flowers and the swing)?
  **A:** At the end of the football corner: Coin foot -> left -> Jardin, a dead end; the outdoor loop front door /
  football corner / pool is unchanged. (default accepted)

### Progression, scoring, difficulty

- **Q:** The POC had no help and the user got stuck in Act II; the draft proposes 3 hint levels. Which one?
  **A:** No help at all, as in 1987 and as in the POC (the draft's section 16.1 hint levels are dropped). The clue
  notebook still records what was learnt.

### Look, sound and feel

- **Q:** How are the room scenes produced for v1, before the photos?
  **A:** Provisional pixel-art scenes drawn in code (POC style) with furniture and interactive objects at the right
  places; later a local script converts each photo into 320x180 pixel art with a reduced palette, then it is
  retouched. The photos live in a git-ignored folder and are never committed. (default accepted)
- **Q:** Which sound and music?
  **A:** 8-bit, generated by a script in the repository like the POC (no licence issue): sound effects and chiptune
  music, plus doorbell, drums, water, washing machine and pool pump sounds. (default accepted)

### Languages

- **Q:** Languages, fallback, names and title?
  **A:** French (reference) + English, English as the fallback for other phone languages; app name "Mini Mansion"
  in both languages; the home screen title is the app name, with the draft's title as a subtitle: « Le Secret de la
  Maison » / "The House Secret". No image containing text and no spoken audio: all text is drawn by the UI.
  (default accepted)

### Screens and settings

- **Q:** Tu or vous?
  **A:** Tu: playful and complicit, as in the POC, fits a teenage hero. (default accepted)

### Telemetry and success metrics

- **Q:** What counts as success (measured only with the player's opt-in consent)?
  **A:** All four: progression per puzzle (how many finish, where they get stuck in the E01-E15 funnel, how long it
  takes - crucial without hints); captures (how many per game and where, to tune the stealth); crashes, cold start
  and APK size; D1/D7 retention (do players come back to finish).

### Constraints

- **Q:** What is out of scope for v1?
  **A:** As the POC: one playable hero, text-only dialogues (no voice), one ending, no hints, no save slots or cloud
  save, no account, ads, purchases or iOS, no haptics, no third-party art or music. Offline, no backend.
  (default, to be confirmed when the PRD is reviewed)
- **Q:** Orientation and fullscreen?
  **A:** Landscape, immersive fullscreen, as the POC (point-and-click scenes are wide). (default accepted)

## Decisions taken during discovery

- Content baseline: the user's draft `C:\dev\prd\gameprd.txt` and plan `C:\dev\prd\plan.txt`, amended by the answers
  above. The PRD (`/write-prd`) must restate every rule it keeps; the draft files are not part of the repository.
- Coherence review done on the draft during discovery; fixed: dead-end tracks (ball, drums) now feed the main
  chain, mirror clue given by Théo, chess problem reduced to a guided mate in 2, parents' bedroom guarded by the
  mother (washing machine lure), office guarded by the father (doorbell lure), bay window locked from the inside,
  repeat captures harmless, pool pump made mandatory (thinner), dining room and garden added to the plan, Florent's
  drum session ends on an explicit event.
- Still to define in the PRD (draft section 21): exact chess position and code mapping, computer code and documents,
  mirror code, shower failure and repair tool, other puzzles of Théo's room, secret laundry contents, hiding spots,
  pool cover/pump sequence (the ball sits on the cover; the cover must be opened before draining reveals the
  thinner), which clue tells the player to start the washing machine, the clue notebook contents.
- No hint system by the user's explicit choice: every puzzle must be clued in the scene, a look line or a dialogue;
  the prd-reviewer must check that each step has at least one in-world clue. An exhaustive state-graph test proves
  the game is always winnable.
- Stealth is event-driven (no timer, no reflex); captures never lose progress; the wine cellar is the capture
  place; the iron bar escape is needed only once.
- Full scope for v1: every zone of the plan plus the dining room and the garden, all puzzles E01-E15. Expect a larger
  engine and content effort than the POC (8 rooms); the POC engine (walkable areas, pathfinding, verbs, inventory,
  dialogues, autosave) is reused as the technical starting point.
- Art: provisional code-drawn pixel art first; later each room from the user's photos via a local conversion script
  plus retouch. Photos are personal data: kept in a git-ignored folder, never committed or published.
- Character first names (the father, the mother, Julien, Florent, Théo) are fictional per the user.
- Telemetry opt-in: puzzle funnel, completion and time, captures, settings; crashes; retention. No identifiers.
- Out of scope (default, as the POC): several playable characters, voice acting, multiple endings, hints, save
  slots, cloud save, accounts, ads, purchases, iOS, haptics, third-party art or music, any Lucasfilm asset or name.
