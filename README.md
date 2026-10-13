# Atithi AI (अतिथि AI) 🏨✨

> Agentic AI staff, intelligent concierge, and real-time hyper-personalization for modern luxury hospitality.

Atithi AI is an all-in-one hospitality management and autonomous guest companion platform. Designed for boutique properties and luxury hotels (such as The Aranya House), Atithi AI bridges the gap between seamless guest experience and intelligent operations.

It helps hotels deliver hyper-personalized stays using generative AI to craft dynamic itineraries, menus, and activity suggestions that adapt in real time to weather, guest preferences, and local conditions—boosting satisfaction and operational efficiency.

---

## 🌟 Key Features & Interface Modules

- The Atithi Concierge AI: A conversational companion providing immediate 24/7 assistance with room service, local exploration, spa bookings, and dynamic preferences like dietary tracking.
- Intelligent Guest Companion (Mobile App):
  - Smart Home & Stay Overview: Real-time visibility into room status (e.g., Suite 402 Luxury Suite), checkout countdowns, weather sync, and one-tap access to services like housekeeping, valet, and room requests.
  - Proactive Itinerary Planning: AI-driven morning briefings and dynamic scheduling tailored to current weather conditions and guest preferences.
  - Curated Local Experiences ("The Local Edit"): Context-aware recommendations for local activities—such as Forest Bathing at Maldevta or culinary tasting menus—with instant reservation workflows.
- Hotel Command Center (Admin Dashboard):
  - Live Guest Activity & Interventions: Real-time tracking of active guest states, automated request resolutions, and global satisfaction scores.
  - Demo & Environmental Controls: Interactive simulation tools allowing operators to test contextual triggers like live weather changes (e.g., triggering rain protocols).

---

## 🏗️ Tech Stack

- Frontend / Mobile UI: React / Next.js / Tailwind CSS (crafted with a premium, minimalist luxury aesthetic)
- Backend: Node.js / Python (FastAPI)
- AI & Orchestration: LLM-driven multi-agent workflows for contextual guest personalization, automated routing, and dynamic itinerary generation

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Python 3.10+ (for backend services)
- Git

### Installation & Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/viratpaudel/atithiai.git
   cd atithiai
   ```

2. Configure environment variables:
   Create a `.env` file in the root directory and add your required keys:
   ```env
   PORT=3000
   DATABASE_URL=your_database_connection_string
   OPENAI_API_KEY=your_openai_api_key
   ```

3. Install dependencies & run:
   ```bash
   # Install frontend/backend packages
   npm install
   npm run dev
   ```

---

## 🗺️ Roadmap

- [x] Guest mobile web-app UI & concierge chat interface
- [x] Localized experience discovery and reservation flow (Dehradun pilot)
- [x] Hotel Operations & Command Dashboard with live intervention metrics
- [ ] Deep Property Management System (PMS) integrations
- [ ] Multi-lingual voice interface support

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/viratpaudel/atithiai/issues).

1. Fork the Project (`https://github.com/viratpaudel/atithiai/fork`)
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the [MIT License](LICENSE). See `LICENSE` for more information.

---

<p align="center">Built with ❤️ for the future of luxury hospitality.</p>


## Auth (demo only)

Guest and staff sign-in use mock records and store a selected demo identity in browser `localStorage` (`atithi-auth`). This is **client-side demo authentication only**: it is not secure, does not verify a real booking, and must never be used with real guest/staff data or treated as production access control.

The planned production design is a signed per-room QR token validated server-side against the PMS booking. It should be bound to the active stay and expire at checkout. Staff should use a trusted identity provider or server-managed sessions. Room/last-name checks and demo staff credentials are only for the hackathon walkthrough.
