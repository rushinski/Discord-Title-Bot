# Discord Title Bot - Security Notes

## 🎯 Purpose

This document outlines the **security considerations** for the Discord Title Bot.  
As a system handling **Discord authentication, player data, and device automation**, security was a key part of the design.

---

## 🔑 Core Risks

### 1. Environment Variables & Secrets
- **Collected:** Discord bot token, MongoDB URI, Bot ID, Kingdom IDs.
- **Risks:**
  - Catastrophic leak if `.env` is committed to repo.
  - Unauthorized access to bot or database.
- **Mitigations:**
  - `.gitignore` includes `.env` → never committed.
  - All secrets stored in `.env` only.
  - Tokens validated on startup (fail fast if missing).

---

### 2. Discord Permissions & Abuse
- **Collected:** User IDs, usernames, slash command interactions.
- **Risks:**
  - Abuse of title assignment commands by unauthorized users.
  - Spamming `/title` could disrupt coordination.
- **Mitigations:**
  - Admin-only restrictions on sensitive commands (`/locate-bot`).
  - Ephemeral replies prevent leaking sensitive data in channels.
  - Command queue + cooldown to prevent spamming.

---

### 3. MongoDB Persistence
- **Stored:** User locations (x, y, type, tier), last visited kingdom.
- **Risks:**
  - Exposure of player coordinate data if DB is breached.
  - Weak database authentication leaves bot state vulnerable.
- **Mitigations:**
  - Enforced schema with validation.
  - Requires authenticated connection string (`MONGOURL`).
  - No sensitive PII stored beyond Discord ID and username.

---

### 4. ADB Integration (Device Automation)
- **Collected:** Screenshots, automated taps, text input.
- **Risks:**
  - Remote ADB exposure could allow device hijacking.
  - Malformed commands could execute unintended actions.
- **Mitigations:**
  - Assumes secured emulator/device setup.
  - All ADB calls wrapped in error handling.
  - Limited to predefined UI actions (coordinates hardcoded).

---

### 5. Image Processing & OCR
- **Collected:** Screenshots, cropped images, OCR-extracted coordinates.
- **Risks:**
  - Screenshots may inadvertently capture sensitive in-game info.
  - OCR errors could cause mislocation or bad title assignments.
- **Mitigations:**
  - Cropping isolates only necessary UI elements.
  - Reference images stored locally in repo.
  - Logs redact sensitive outputs.

---

## 📋 Security-by-Design Principles

1. **Least Privilege** → Only admins can invoke high-impact commands.
2. **Zero Secrets in Repo** → All secrets externalized via `.env`.
3. **Scoped Data Storage** → Only Discord IDs, usernames, and coordinates stored.
4. **Fail-Fast Validation** → Missing secrets cause immediate process exit.
5. **Controlled Device Access** → ADB used only for predefined taps and inputs.

---

## ⚡ Gaps & Future Improvements

- No automated intrusion detection or structured audit logs.
- No role-based access beyond Discord admin checks.
- ADB assumes trusted local setup (no remote hardening in place).
- OCR accuracy could be improved with model training.

---

## ✅ Recruiter-Facing Takeaway

The Discord Title Bot demonstrates **security-aware design** for a gaming automation project:

- No secrets in repo (all managed via `.env`).  
- Admin-only execution for sensitive commands.  
- MongoDB schemas validated + authenticated.  
- ADB + OCR actions tightly scoped and error-handled.  

While not enterprise-grade, the bot was built with **practical security controls** suitable for portfolio demonstration.