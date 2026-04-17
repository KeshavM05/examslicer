# Exam Slicer

> **12 weeks of content. 1 day to study.**  
> The only reason I pass 100% of my exams despite never going to class.

**[Try it live → examslicer.keshavhq.com](https://examslicer.keshavhq.com/)**

Exam Slicer is a **fully client-side, privacy-first** study tool that turns a pile of past exam PDFs into a perfectly organized Master Study Guide — automatically. No server. No uploads. No subscription. Everything runs in your browser.

---

## How It Works

Exam Slicer is built around a 3-step workflow:

### Step 01 — Generate the AI Analysis
Copy the built-in prompt and paste it into **Gemini, ChatGPT, or Claude** alongside your past exam PDFs. The AI performs a longitudinal analysis across all exam years and returns a structured JSON payload containing:

- **ROI Matrix** — every recurring topic ranked by average mark weight, yield, complexity, and frequency
- **Frequency Heatmap** — which years each topic appeared, so you can spot "guaranteed" vs. "rotational" questions
- **Professor Twists Log** — niche edge-case variations the professor uses to separate A+ students from the rest
- **Page Extraction Map** — the exact PDF filenames and page numbers to slice

### Step 02 — Upload Your PDFs Locally
Drop the same exam PDFs directly in the browser. **Files never leave your device.** There is no backend, no cloud storage, no network request. Processing happens entirely in-memory using `pdf-lib`.

### Step 03 — Generate the Master Study Guide
Paste the JSON from the AI, hit generate, and download a fully assembled PDF that includes:

1. **Strategic Dashboard Cover Page** — the ROI table, heatmap, and twists log stamped directly into the PDF
2. **Per-Topic Section Dividers** — each category gets its own title page with statistical yield, questions included, and topics covered
3. **Sliced Exam Pages** — relevant past exam questions extracted and stamped with year + question labels in red

---

## Features

| Feature | Details |
|---|---|
| **100% Client-Side** | No server, no uploads, zero data leaves your browser |
| **AI-Powered Analysis** | Longitudinal archetype identification across 5–20+ years of exams |
| **Smart Cover Page** | ROI matrix, frequency heatmap, and professor twists rendered natively into the PDF |
| **Intelligent Stamping** | Year + question label top-right, topic tag top-left on every sliced page |
| **Multi-Page Span Detection** | The AI prompt is instructed to detect questions that continue across pages |
| **LaTeX-Safe Parser** | Automatically sanitizes AI-generated math notation before JSON parsing |
| **Brutalist UI** | Fast, distraction-free Swiss editorial interface — zero bloat |

---

## Tech Stack

- **React + TypeScript** via Vite
- **pdf-lib** — client-side PDF manipulation and assembly
- **Lucide React** — icons
- **Chivo / Chivo Mono** — typography (Google Fonts)

---

## Getting Started

```bash
git clone https://github.com/KeshavM05/examslicer.git
cd examslicer
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Privacy

Exam Slicer processes everything locally in your browser using the Web File API and `pdf-lib`. Your exam PDFs are never sent to any server. The AI interaction happens externally through whichever LLM you choose (Gemini, ChatGPT, Claude) — Exam Slicer only receives the structured JSON output, not your raw files.

---

## License

MIT
