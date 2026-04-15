# PushProducer

**Every successful `git push` to GitHub deserves a moment.**

You know how a rap track hits and then you hear the producer tag—the little signature drop before the beat kicks in? Think **Metro Boomin**, **Mike Will**, whoever: that “yep, this is *my* session” audio stamp.

PushProducer brings that same idea to your repo: a tiny CLI that plays **your** tag (or any clip you want) right after a push lands—so the terminal feels less like a log dump and more like you just walked out of the booth with a finished mix.

Works anywhere you type `git push`:

- Terminal.app / iTerm / Warp / whatever
- VS Code terminal
- Cursor terminal

No one else’s tag ships with this—use your own clip. The first install drops in a tiny placeholder WAV; swap it for **your** signature sound in one command.

---

## Why this exists

Git doesn’t give you a reliable “after push” hook for normal terminal pushes. PushProducer wraps `git` in a thin shell shim: when `git push` succeeds and the remote is **GitHub**, it plays your sound. That’s the whole trick.

---

## Install (while hacking on it)

```bash
npm install
npm link
pushproducer install
```

Reload your shell:

```bash
source ~/.zshrc
```

---

## Commands

```bash
pushproducer install          # wire up the wrapper + shell hook
pushproducer play             # preview the current sound
pushproducer doctor           # sanity check your setup
pushproducer set-sound /absolute/path/to/your-tag.wav
pushproducer uninstall        # put things back
```

---

## Drop in your tag

Same workflow as picking the perfect snippet for a song—except the “release” is `main`. WAV is the boring-safe choice; use whatever your machine can play:

```bash
pushproducer set-sound /absolute/path/to/tag.wav
```

---

## Fine print (the useful kind)

- Only fires when the remote looks like **github.com**.
- Shell support: **zsh**, **bash**, **fish**.
- Built for people who push from the terminal—not GUI Git apps.

---

*Push. Tag. Run it back.*
