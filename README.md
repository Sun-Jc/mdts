<h1 align="center">
  <img src="docs/images/logo.svg" alt="mdts" width="400">
</h1>

<p align="center">
  A zero-config CLI tool to preview your local Markdown files in a browser.
  <br>
  <strong>npx mdts</strong> — and you're done.
</p>

<p align="center">
  <a href="https://mdts-unhappychoice.netlify.app" target="_blank">
    <strong>🔗 Try the Live Demo</strong>
  </a>
</p>

<p align="center">
  <img src="docs/images/screen_animation.gif" width="640" alt="mdts demo">
</p>

## 🆕 What's New (by JC)

Launching [v0.16.0-jc](CHANGELOG.md#v0160-jc-development-branch) with powerful new features:

### 🎯 Major Features
- **🏷️ Tag Filtering** - Filter files by YAML frontmatter tags with elegant chip UI
- **📐 Resizable Panes** - Drag-and-drop resizing for the file tree panel
- **⭐ File Bookmarking** - Star your favorite files for quick access
- **🔄 Smart Sorting** - Sort by name, modification time, or creation time
- **🚪 Auto Port Selection** - Never worry about port conflicts again

### ✨ UI Enhancements
- Sticky outline headers for better long-document navigation
- Improved file name wrapping in compact views
- Support for dot-prefixed directories
- Cleaner file tree interface

See the full [CHANGELOG](CHANGELOG.md) for detailed release notes.

## 🔧 Features

- ⚡ **Instant Markdown Preview** – Run and view in seconds  
- 🌐 **Web UI** – Clean, tree-based browser interface with three-panel layout
- 🔄 **Live Reload** – Automatically refreshes on file changes  
- 🧘 **Zero Setup** – No config, no install, no nonsense
- 🎨 **Custom Themes** – 20+ beautiful application themes and syntax highlighting options


## 🚀 Quick Start

```bash
npx mdts
```

This starts a local server at http://localhost:8521 and opens your browser.
Your current directory becomes a browsable Markdown tree.

## 💡 Use Cases

- Reviewing AI-generated docs  
- Quickly checking README or note folders  
- Lightweight local Markdown wiki  

See [detailed use cases](docs/usecases.md) for more examples and workflows.  

## 📦 Requirements

- Node.js
- No installation needed – uses `npx`

## 🛠 Options

```bash
npx mdts <directory> --host 0.0.0.0 --port 3000 --silent
```

| Option              | Description                           | Example |
| ------------------- | ------------------------------------- |---------|
| `<directory>`       | Directory to serve (default .)       | ./docs  |
| `--host`, `-H`      | Host to listen on (default localhost) | 0.0.0.0 |
| `--port`, `-p`      | Port to serve on (default 8521)      | 8000    |
| `--silent`, `-s`    | Suppress server logs (default false) |         |
| `--version`, `-V`   | Output version number                 |         |
| `--help`, `-h`      | Display help for command              |         |

## 📚 Documentation

### 🔗 [Live Demo](https://mdts-unhappychoice.netlify.app)
Experience mdts in action with real examples and interactive features.

### 📖 Documentation
- [Use Cases](docs/usecases.md)
- [Markdown Features](docs/markdown_features.md)  
- [Frontend Features](docs/frontend_features.md)
- [Advanced Configuration](docs/configuration.md)
- [API Reference](docs/api.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Comparison with other tools](docs/comparison.md)
- [FAQ](docs/faq.md)

## Contributing

Found a bug? Have an idea? Want to send a PR?  
See [CONTRIBUTING.md](./CONTRIBUTING.md) for details — we'd love to have your help!
