# 🎨 My Art Gallery

A modern, interactive art gallery web application built with **Vite**, **React**, **TypeScript**, and **Tailwind CSS**, with a contact endpoint hosted by **Cloudflare Pages Functions**.

---

## 🚀 Features

- 📋 **Browse Art Collections** – View featured art pieces with details.
- 🎨 **Responsive UI** – Designed with Tailwind CSS for great UX on all devices.
- ✉️ **Protected Contact Form** – Cloudflare Turnstile verification and server-side delivery through Resend.
- ⚡ **Fast Development** – Built with Vite for ultra-fast bundling and HMR.
- 🛠️ Easily extendable architecture for additional features (e.g., user accounts, likes, comments).

---

## 🧠 Tech Stack

| Layer | Technology |
|-------|------------|
| ⚙️ Build Tool | Vite |
| 🧪 Language | TypeScript |
| 💅 Styling | Tailwind CSS |
| ☁️ Hosting/API | Cloudflare Pages + Pages Functions |
| 📄 UI | HTML + React |

---

## 📁 Project Structure

```text
my-art-gallery/
├── public/ # Static public assets
├── src/ # Frontend source code
├── functions/ # Cloudflare Pages Functions
├── package.json # Dependencies & scripts
├── vite.config.ts # Vite config
├── tailwind.config.ts # Tailwind config
└── README.md # Project README
```

---

## 🧾 Prerequisites

Make sure you have installed:

- Node.js (v16+)
- npm or yarn
- A Cloudflare Pages project

---

## 🔧 Setup & Installation

1. **Clone the repo**

   ```bash
   git clone https://github.com/Bhanu99517/my-art-gallery.git
   cd my-art-gallery
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure the contact form**

   Follow [CONTACT-SPAM-PROTECTION.md](./CONTACT-SPAM-PROTECTION.md) for Turnstile, Resend, Pages secrets, deployment, and local testing. The only browser-exposed contact setting is the public Turnstile site key:

   ```dotenv
   VITE_TURNSTILE_SITE_KEY=your_public_turnstile_site_key
   ```

   Never put private keys in a `VITE_` variable.

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

Open your browser at http://localhost:5173.

---

##📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

##💬 Contact

Developed by Bhanu99517
GitHub: https://github.com/Bhanu99517
