WHO Project
Welcome to the sandbox where we build world‑saving stuff without acting like we’re writing documentation for a fax machine.
Purpose
This branch exists so we can prototype a clean, modular, WHO‑aligned ensemble toolkit without tripping over ourselves. Everything here is meant to be understandable by future contributors, future us, and future aliens who discover this repo long after humanity is gone.
Structure
Here’s the lay of the land:
• 	core/ – the glue, the wiring, the “don’t touch this unless you know what you’re doing” zone
• 	modules/ – reusable logic chunks that should NOT secretly depend on black magic
• 	agents/ – the little worker bees with contracts so they don’t go rogue
• 	ui/ – demos, frontends, and anything that makes humans go “ohhh I get it now”
• 	api/ – server bits, adapters, and the stuff that talks to the outside world
• 	data/ – sample datasets, ingestion scripts, and things that make tests feel real
• 	docs/ – architecture notes, onboarding, and “why we did this instead of that”
• 	tests/ – the place where we prove we didn’t break everything (again)
Getting Started
1. 	Install the usual suspects: Node, npm, TypeScript, ESLint, Prettier
2. 	Once things exist, run  and pray
3. 	Keep commits small enough that future you doesn’t swear at past you
4. 	When importing from swarm projects, leave a breadcrumb trail so we know where the bodies came from
Contribution Notes
• 	Anything sensitive, cursed, or experimental goes in  (gitignored for everyone’s safety)
• 	Every module you fold in gets a short “why this exists” note — no mystery meat allowed
• 	Keep things modular, readable, and non‑chaotic — we’re building for WHO, not speedrunning spaghetti code

