# Verbo Obsidian Plugin - AI Coding Instructions

## Project Overview

**Verbo** is an Obsidian plugin that retrieves YouTube video transcriptions and processes them with Google Gemini AI to improve readability, structure, and extract key information. The plugin integrates directly into Obsidian's UI with modal workflows and result views.

### Key Stack
- **Framework**: Obsidian Plugin API (1.8.7+)
- **Language**: TypeScript
- **AI Integration**: Google Generative AI (Gemini 1.5 Pro)
- **Build Tool**: esbuild with watch mode
- **Key Dependencies**: `youtube-transcript`, `node-html-parser`, `@google/generative-ai`

---

## Architecture & Component Boundaries

### Core Data Flow
```
YouTube URL → getVideoId() → getTranscript() & getVideoMetadata()
    ↓
VerboModal (UI input)
    ↓
processTranscriptWithAI() [ai.ts] → Gemini API
    ↓
VerboResultView (Display results with tabbed interface)
    ↓
Insert into note or create new note
```

### Module Responsibilities

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **youtube.ts** | Extract transcriptions & metadata from YouTube pages | `getVideoId()`, `getTranscript()`, `getVideoMetadata()` |
| **ai.ts** | Process transcript with Gemini, add YAML frontmatter | `processTranscriptWithAI()` |
| **settings.ts** | Manage plugin configuration & prompt library | `VerboSettingTab`, prompt CRUD operations |
| **ui/** | User-facing modals and result display | `VerboModal`, `VerboResultView` |
| **types.ts** | TypeScript interfaces for settings and data structures | `VerboSettings`, `ProcessedTranscript` |

### Critical Integration Points
- **Obsidian App Context**: Passed through constructors (App, Plugin instances) to access workspace, editor, and UI APIs
- **YouTube Transcription Extraction**: Custom HTML parsing (no YouTube API key needed) via `youtube-transcript` pattern
- **AI Prompt Management**: Extensible prompt library with predefined templates (`prompts.ts`) that can be customized in settings
- **Settings Persistence**: Uses Obsidian's `loadData()`/`saveData()` for automatic JSON serialization

---

## Critical Developer Workflows

### Development Build & Watch
```powershell
npm run dev          # Starts esbuild watch mode - auto-rebuilds on src/ changes
npm run build        # Production build with type checking and minification
npm run start-dev    # Alternative dev runner (scripts/dev.js)
```

**Important**: Always use `npm run dev` during development. The plugin hot-reloads in Obsidian when `main.js` changes. No manual Obsidian reload needed unless modifying plugin lifecycle (`onload()`, `onunload()`).

### Testing Workflow
1. Load plugin in Obsidian development vault (point to `d:\Documentos\_DEV\obsidian_plugins\verbo`)
2. Enable plugin in Community Plugins settings
3. Trigger via ribbon button or command "Obtener transcripción de YouTube"
4. Check DevTools console for errors (`Ctrl+Shift+I` in Obsidian)

### Adding New Features
1. **New UI Controls**: Extend `VerboModal` or create new Modal subclass
2. **New AI Processing**: Add function in `ai.ts` following `processTranscriptWithAI()` pattern (error handling for API/quota)
3. **New Settings**: Add to `VerboSettings` interface, update `DEFAULT_SETTINGS` in `main.ts`, add UI in `VerboSettingTab`

---

## Project-Specific Conventions & Patterns

### Prompt Management Pattern
- **Predefined Prompts**: Defined in `src/ui/prompts.ts` under `DEFAULT_PROMPTS` object
- **Customization**: Users can edit prompts in settings tab; predefined ones show "Restaurar predeterminado" button
- **Selection**: Dropdown in modal uses `selectedPromptIndex` to track which prompt is active
- **Language Support**: Prompts auto-append language instruction (Spanish default) via `responseLanguage` setting

### Error Handling Convention
```typescript
// Pattern: Specific error messages for API failures
if (error.message.includes('token limit')) {
  throw new Error('La transcripción es demasiado larga...');
} else if (error.message.includes('quota')) {
  throw new Error('Se ha excedido la cuota de la API...');
}
// UI layer catches and displays via Notice()
```

### UI Pattern: Modal → Result View
1. **VerboModal**: Collects input (URL, prompt selection, options)
2. **Modal closes** after processing starts
3. **VerboResultView**: Opens as new modal displaying tabbed results (processed vs. original)
4. **Action Buttons**: Insert into current note or create new note with metadata

### TypeScript Conventions
- Interfaces exported from `types.ts` (single source of truth)
- Video metadata wrapped in `VideoMetadata` interface with optional fields (title, channelName, views, etc.)
- YAML frontmatter generation in `ai.ts` uses safe string escaping (`replace(/"/g, '\\"')`)

### Obsidian API Patterns Used
- **Modal**: Base class for UI dialogs
- **Setting**: Builder pattern for settings UI (`new Setting(containerEl).setName()...`)
- **Notice**: Toast notifications for user feedback
- **MarkdownRenderer**: Renders markdown in modal (uses Obsidian's markdown parser)
- **Request**: HTTP requests (used for fetching YouTube pages)

---

## Build & Deployment

### Build Process
- **esbuild config**: `esbuild.config.mjs` bundles `src/main.ts` → `main.js` (CommonJS format)
- **External deps**: Obsidian, Electron, CodeMirror modules excluded from bundle
- **Tree shaking**: Enabled to remove unused code
- **Sourcemaps**: Inline in dev mode, disabled in production

### Release Management
- Version bump script: `npm run version` updates manifest.json and versions.json
- Packaging: `npm run package` creates distribution zip
- Distribution includes: `main.js`, `manifest.json`, `styles.css`

---

## Key Files Reference

| File | Purpose | Critical Patterns |
|------|---------|-------------------|
| `src/main.ts` | Plugin entry point & lifecycle | DEFAULT_SETTINGS initialization, `ensurePredefinedPrompts()` |
| `src/ai.ts` | Gemini integration | Language instruction injection, token limit handling |
| `src/youtube.ts` | YouTube extraction | Custom HTML parsing, timestamp formatting |
| `src/ui/modal.ts` | Input modal | Dropdown prompt selection, error UI handling |
| `src/ui/view.ts` | Result display | Tabbed interface, markdown rendering, note insertion |
| `src/ui/prompts.ts` | Prompt templates | DEFAULT_PROMPTS structure (general, tts, sophisticated) |
| `src/settings.ts` | Settings UI | Predefined prompt protection, prompt CRUD UI |
| `esbuild.config.mjs` | Build config | Watch mode setup, external module list |

---

## Common Pitfalls & Best Practices

1. **API Key Handling**: Always check `settings.geminiApiKey` exists before calling Gemini API
2. **Async/Await**: All Obsidian API calls and network requests are async; use try/catch
3. **Notice Messages**: Use for errors; keep messages concise and user-friendly (Spanish)
4. **YAML Escaping**: When adding frontmatter, escape quotes in video title/channel name
5. **Prompt Editing**: Predefined prompts should be read-only in UI; only custom prompts editable
6. **Timestamp Formatting**: YouTube captions include `start` attribute; format as `[M:SS]` with padding
7. **Modal Lifecycle**: Always call `this.close()` before opening new modal to avoid stacking

---

## AI Model & Provider Strategy

### Current Model Configuration
- **Active Model**: Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Why**: Free tier available, excellent price-performance ratio, 1M token context window
- **Migration Note**: Gemini 1.5 Pro deprecated as of Nov 2025; use 2.5 Flash as drop-in replacement

### Alternative Providers (Future Implementation)
For users who need different capabilities:

| Provider | Model | Best For | Setup |
|----------|-------|----------|-------|
| **Anthropic** | Claude 3.5 Sonnet | Complex analysis, long contexts (200K tokens), superior reasoning | Add `claudeApiKey` to settings |
| **OpenAI** | GPT-4o | Fast, versatile, production-ready | Add `openaiApiKey` to settings |
| **Meta** | Llama 3.1 (self-hosted) | Privacy-first, no API key needed | Requires local deployment |

### Adding New Provider Support
1. Create new function in `ai.ts`: `processWithClaude()`, `processWithOpenAI()`
2. Add provider selection to `VerboSettings` interface
3. Add provider dropdown in `VerboSettingTab` (settings.ts)
4. Route based on provider in `processTranscriptWithAI()`

---

## Language & Localization

- **Default Language**: Spanish (UI labels, error messages, placeholder text)
- **Prompt Output**: User selects via `responseLanguage` setting (es, en, fr, de, it, pt)
- **Frontmatter**: Spanish tags and structure (e.g., `[!info]- Transcription`)

---

## Testing Checklist for New Features

- [ ] URL validation handles YouTube URL formats (youtube.com/watch?v=..., youtu.be/...)
- [ ] Transcript fetched without requiring YouTube API key
- [ ] AI prompt injected with correct language instruction
- [ ] Token limits handled gracefully with user-friendly error message
- [ ] YAML frontmatter generated correctly (no invalid characters)
- [ ] Tabbed result view displays both original and processed text
- [ ] Settings persist after Obsidian restart (using `saveSettings()`)
- [ ] Plugin unloads cleanly (`onunload()` logging)
