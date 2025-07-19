## 📊 Codeforces Markdown Card Generator

Easily generate a dynamic SVG card showing your **Codeforces stats**, including handle, rank, rating, contributions, and more – styled beautifully and embeddable in your GitHub README or personal site.

### 🚀 Features

* 🎨 Multiple theme support (light, abyss, ember, frost, etc.)
* 🧠 Real-time data fetched from the Codeforces API
* 📦 NPM-ready package for easy integration
* 🖼️ Fully customizable SVG output
* 📎 Ideal for GitHub READMEs and portfolios

### 🛠️ Usage

**1. Embed in GitHub README:**

```md
![Codeforces Stats](https://codeforces-markdown.vercel.app/api/codeforces?username=YOUR_HANDLE&theme=light)
```

**2. Customizable Parameters:**

| Parameter  | Description                     | Example          |
| ---------- | ------------------------------- | ---------------- |
| `username` | Your Codeforces handle          | `vishnuppriyan_` |
| `theme`    | Card theme (light, ember, etc.) | `theme=twilight` |

---

### 📦 Coming Soon: NPM Package

Install and use this as a utility inside your Node.js project to generate SVG cards dynamically via:

```bash
npm install codeforces-markdown-card
```

Then:

```ts
import { getSuccessSvg } from 'codeforces-markdown-card';

const svg = getSuccessSvg({ stats, username, theme });
```

---

### 🌐 Live Demo

See it in action:
🔗 [https://codeforces-markdown.vercel.app](https://codeforces-markdown.vercel.app)

---

### 🤝 Contributing

Contributions are welcome! Feel free to submit issues, add themes, or improve the rendering logic.

---

Let me know if you want me to tailor the README further based on:

* How to run it locally
* API routes usage
* Tech stack badges (Next.js, TypeScript, TailwindCSS)

Would you also like a shield badge like this for the top?

```md
![npm](https://img.shields.io/npm/v/codeforces-markdown-card)
```
