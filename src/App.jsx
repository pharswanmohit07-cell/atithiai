import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IconBadge from "./components/ui/IconBadge.jsx";
import ThemeToggle from "./components/ui/ThemeToggle.jsx";
import {
  Sun,
  CloudRain,
  Clock,
  MapPin,
  Utensils,
  Sparkles,
  MessageSquare,
  Home,
  LayoutDashboard,
  User,
  Bell,
  ChevronRight,
  Check,
  Compass,
  Coffee,
  ShieldCheck,
  Thermometer,
  Wind,
  Droplets,
  CalendarDays,
  Search,
  BedDouble,
  Bath,
  Car,
  Settings,
  CreditCard,
  ChevronLeft,
  Send,
  X,
} from "lucide-react";

const GUEST = {
  name: "Virat",
  lastName: "Sharma",
  room: "402 (Luxury Suite)",
  preferences: {
    diet: "Vegetarian",
    interests: ["Culture", "Wellness", "Quiet Dining"],
    vibe: "Relaxing",
  },
};

const SUNNY_ITINERARY = [
  {
    id: 1,
    time: "09:00 AM",
    title: "In-Room Breakfast",
    desc: "Vegetarian Continental, Green Tea",
    icon: Coffee,
    type: "dining",
    status: "completed",
  },
  {
    id: 2,
    time: "11:00 AM",
    title: "Private City Tour",
    desc: "Heritage sites and local markets",
    location: "Old Town · Dehradun",
    host: "Arjun Mehta · Local guide",
    duration: "2.5 hours",
    pickup: "Hotel lobby · 10:50 AM",
    icon: Compass,
    type: "activity",
    status: "current",
  },
  {
    id: 3,
    time: "02:00 PM",
    title: "Light Lunch at The Courtyard",
    desc: "Reserved table by the fountain",
    icon: Utensils,
    type: "dining",
    status: "upcoming",
  },
  {
    id: 4,
    time: "04:00 PM",
    title: "Botanical Garden Walk",
    desc: "Outdoor guided nature walk",
    icon: MapPin,
    type: "activity",
    status: "upcoming",
    isVulnerableToWeather: true,
  },
  {
    id: 5,
    time: "07:30 PM",
    title: "Dinner at Saffron",
    desc: "Chef's special vegetarian tasting menu",
    icon: Utensils,
    type: "dining",
    status: "upcoming",
  },
];

const AI_ALTERNATIVES = [
  {
    id: "alt_1",
    title: "National Art Museum",
    desc: "Private indoor guided tour (15 mins away).",
    icon: MapPin,
    match: "98% match with 'Culture'",
  },
  {
    id: "alt_2",
    title: "Signature Ayurvedic Spa",
    desc: "60-min deep tissue massage in the wellness center.",
    icon: Sparkles,
    match: "95% match with 'Wellness'",
  },
];

const EXPERIENCES = [
  {
    id: 1,
    title: "Ayurvedic Rejuvenation",
    category: "Wellness",
    time: "Today, 5:30 PM",
    desc: "A restorative 60-minute massage with warm herbal oils in the wellness suite.",
    rating: "4.9",
    duration: "60 min",
    location: "Wellness Pavilion",
    price: "₹3,200",
    availability: "2 times available",
    img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Chef's Tasting Menu",
    category: "Dining",
    time: "Today, 7:30 PM",
    desc: "A five-course vegetarian tasting menu featuring produce from the foothills.",
    rating: "4.8",
    duration: "2 hours",
    location: "Saffron Heritage Room",
    price: "₹2,400 / guest",
    availability: "Tables for 2 or 4",
    img: "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Heritage Sunset Walk",
    category: "Culture",
    time: "Tomorrow, 4:45 PM",
    desc: "A private guided walk through the old town and evening food market.",
    rating: "4.9",
    duration: "90 min",
    location: "Old Town · meet in lobby",
    price: "₹1,800 / guest",
    availability: "Private guide available",
    img: "https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Forest Bathing at Maldevta",
    category: "Wellness",
    time: "Tomorrow, 8:30 AM",
    desc: "A slow, guided walk through cedar shade with tea beside the river.",
    rating: "4.9",
    duration: "2 hours",
    location: "Maldevta · pickup included",
    price: "₹2,600 / guest",
    availability: "3 places remaining",
    img: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=85&w=1000&auto=format&fit=crop",
  },
];

const INITIAL_REQUESTS = [
  {
    id: 1,
    title: "Fresh towels",
    category: "Housekeeping",
    detail: "2 bath towels",
    status: "On the way",
    time: "Today, 10:18 AM",
  },
  {
    id: 2,
    title: "Breakfast for two",
    category: "In-Room Dining",
    detail: "Vegetarian continental",
    status: "Completed",
    time: "Today, 8:42 AM",
  },
];

// --- MAIN APP ---
export default function AtithiAI() {
  const [appMode, setAppMode] = useState("guest");
  const [weather, setWeather] = useState("sunny");
  const [itinerary, setItinerary] = useState(SUNNY_ITINERARY);
  const [showAIIntervention, setShowAIIntervention] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [activeGuestTab, setActiveGuestTab] = useState("services");
  const [isDemoControlsOpen, setIsDemoControlsOpen] = useState(true);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);

  const addRequest = (request) => {
    setRequests((current) => [
      {
        id: Date.now(),
        title: request.title,
        category: request.category,
        detail: request.detail || "Requested for Room 402",
        status: "Received",
        time: "Today, just now",
      },
      ...current,
    ]);
  };

  useEffect(() => {
    if (
      weather === "rainy" &&
      itinerary.some((item) => item.isVulnerableToWeather)
    ) {
      setTimeout(() => setShowAIIntervention(true), 600);
    } else {
      setShowAIIntervention(false);
    }
  }, [weather, itinerary]);

  const acceptAlternative = (alt) => {
    setIsResolving(true);
    setTimeout(() => {
      setItinerary((prev) =>
        prev.map((item) =>
          item.time === "04:00 PM"
            ? {
                ...item,
                title: alt.title,
                desc: alt.desc,
                isVulnerableToWeather: false,
                icon: alt.icon,
                aiAdjusted: true,
              }
            : item,
        ),
      );
      setShowAIIntervention(false);
      setIsResolving(false);
    }, 1200);
  };

  const keepOriginal = () => {
    setShowAIIntervention(false);
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-accent selection:text-text">
      {appMode === "guest" ? (
        <GuestApp
          weather={weather}
          itinerary={itinerary}
          showAIIntervention={showAIIntervention}
          isResolving={isResolving}
          acceptAlternative={acceptAlternative}
          keepOriginal={keepOriginal}
          activeTab={activeGuestTab}
          setActiveTab={setActiveGuestTab}
          requests={requests}
          addRequest={addRequest}
        />
      ) : (
        <AdminDashboard
          weather={weather}
          itinerary={itinerary}
          showAIIntervention={showAIIntervention}
          requests={requests}
        />
      )}

      {!isDemoControlsOpen && (
        <button
          onClick={() => setIsDemoControlsOpen(true)}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-brand text-white px-3 py-2 text-xs font-medium shadow-lg md:hidden"
        >
          Controls
        </button>
      )}

      <div
        className={`fixed bottom-4 right-4 z-50 flex flex-col gap-3 bg-surface/90 backdrop-blur-md p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border transition-all duration-300 md:bottom-6 md:right-6 ${
          isDemoControlsOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-[130%] opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto"
        }`}
      >
        <button
          type="button"
          aria-label="Close demo controls"
          onClick={() => setIsDemoControlsOpen(false)}
          className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm md:hidden"
        >
          <X size={14} />
        </button>

        <p className="text-xs font-semibold tracking-wider text-muted uppercase mb-1">
          Demo Controls
        </p>

        <div className="flex bg-surface-2 rounded-lg p-1">
          <button
            onClick={() => setAppMode("guest")}
            className={`flex-1 text-sm px-4 py-2 rounded-md font-medium transition-all ${appMode === "guest" ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}
          >
            Guest App
          </button>
          <button
            onClick={() => setAppMode("admin")}
            className={`flex-1 text-sm px-4 py-2 rounded-md font-medium transition-all ${appMode === "admin" ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}
          >
            Admin
          </button>
        </div>

        <button
          onClick={() => {
            if (weather === "sunny") setWeather("rainy");
            else {
              setWeather("sunny");
              setItinerary(SUNNY_ITINERARY);
            }
          }}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
            weather === "sunny"
              ? "bg-brand text-white hover:bg-brand/90"
              : "bg-sky-600 text-white hover:bg-blue-700"
          }`}
        >
          {weather === "sunny" ? <CloudRain size={16} /> : <Sun size={16} />}
          {weather === "sunny" ? "Trigger Rain (4:00 PM)" : "Reset Weather"}
        </button>
      </div>
    </div>
  );
}

// --- GUEST APP CONTAINER ---
function GuestApp(props) {
  const { activeTab, setActiveTab } = props;

  const tabVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } },
  };

  return (
    <div className="flex justify-center min-h-screen bg-bg p-0 md:p-8">
      <div className="w-full max-w-[430px] bg-bg md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative h-[100dvh] md:h-[850px] border-[8px] border-brand">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div
                key="home"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <HomeTab {...props} />
              </motion.div>
            )}
            {activeTab === "discover" && (
              <motion.div
                key="discover"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <DiscoverTab onRequest={props.addRequest} />
              </motion.div>
            )}
            {activeTab === "ai" && (
              <motion.div
                key="ai"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <AITab onRequest={props.addRequest} />
              </motion.div>
            )}
            {activeTab === "services" && (
              <motion.div
                key="services"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <ServicesTab
                  requests={props.requests}
                  onRequest={props.addRequest}
                  setActiveTab={setActiveTab}
                />
              </motion.div>
            )}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <ProfileTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-border px-6 py-4 flex justify-between items-center z-40 pb-safe">
          <NavIcon
            icon={Home}
            label="Home"
            active={activeTab === "home"}
            onClick={() => setActiveTab("home")}
          />
          <NavIcon
            icon={Compass}
            label="Discover"
            active={activeTab === "discover"}
            onClick={() => setActiveTab("discover")}
          />

          <div className="relative -top-6">
            <button
              onClick={() => setActiveTab("ai")}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform ${activeTab === "ai" ? "bg-brand text-white shadow-brand/30" : "bg-surface text-accent-text shadow-black/10"}`}
            >
              <motion.div whileTap={{ scale: 0.9 }} animate={activeTab === "ai" ? { y: [0, -3, 0] } : { y: 0 }} transition={{ duration: 0.28 }}>
                <IconBadge icon={Sparkles} tone="violet" size="md" className="!h-12 !w-12 rounded-full" />
              </motion.div>
            </button>
          </div>

          <NavIcon
            icon={Bell}
            label="Services"
            active={activeTab === "services"}
            onClick={() => setActiveTab("services")}
          />
          <NavIcon
            icon={User}
            label="Profile"
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
        </div>
      </div>
    </div>
  );
}

// --- TAB COMPONENTS ---

function HomeTab({
  weather,
  itinerary,
  showAIIntervention,
  isResolving,
  acceptAlternative,
  keepOriginal,
  addRequest,
  setActiveTab,
}) {
  const currentPlan = itinerary.find((item) => item.status === "current");
  return (
    <>
      <div className="home-hero relative min-h-[330px] overflow-hidden bg-[#20362E] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=85&w=1200&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#13231E]/55 via-[#13231E]/15 to-[#13231E]/90" />
        <div className="relative flex min-h-[330px] flex-col justify-between px-6 pb-5 pt-11">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                The Aranya House
              </p>
              <p className="mt-1 text-xs text-white/85">
                Monday · October 5, 2026
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <button
                onClick={() => setActiveTab("profile")}
                aria-label="Open profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-surface/10 text-white backdrop-blur"
              >
                <IconBadge icon={User} tone="sky" size="sm" className="!h-9 !w-9 rounded-full border border-white/30" />
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-[#F0D6AD]">
              A slower kind of morning
            </p>
            <h1 className="max-w-[290px] font-serif text-[42px] leading-[0.93]">
              Good morning,
              <br />
              <span className="italic">{GUEST.name}.</span>
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[10px] font-medium backdrop-blur">
                Suite 402 · Luxury
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[10px] font-medium backdrop-blur">
                {weather === "sunny" ? (
                  <IconBadge icon={Sun} tone="saffron" size="sm" className="!h-7 !w-7 rounded-full" />
                ) : (
                  <IconBadge icon={CloudRain} tone="sky" size="sm" className="!h-7 !w-7 rounded-full" />
                )}
                {weather === "sunny" ? "24° · Clear" : "19° · Rain"}{" "}
                <span className="text-white/60">Dehradun</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-6 sm:px-6">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setActiveTab("services")}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left shadow-sm"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-wide text-accent-text">
                At your service
              </span>
              <span className="mt-1 block text-xs font-semibold text-text">
                Room requests
              </span>
            </span>
            <IconBadge icon={BedDouble} tone="sky" size="sm" />
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left shadow-sm"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-wide text-accent-text">
                Your companion
              </span>
              <span className="mt-1 block text-xs font-semibold text-text">
                Ask concierge
              </span>
            </span>
            <IconBadge icon={Sparkles} tone="violet" size="sm" />
          </button>
        </div>
        <AnimatePresence mode="popLayout">
          {!showAIIntervention && !isResolving && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-2xl p-5 shadow-sm border border-border"
            >
              <div className="flex gap-3">
                <Sparkles
                  size={20}
                  className="text-accent-text shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-text leading-relaxed">
                    {weather === "sunny"
                      ? "We've planned a relaxed morning followed by your city tour. Your plans are looking perfect for today's weather."
                      : "I've updated your schedule for the rain. Enjoy a cozy afternoon indoors."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAIIntervention && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="bg-brand rounded-2xl overflow-hidden shadow-xl"
            >
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center gap-2 text-amber-400 mb-3">
                  <IconBadge icon={CloudRain} tone="coral" size="sm" pulse />
                  <span className="text-sm font-medium tracking-wide uppercase">
                    Weather Alert
                  </span>
                </div>
                <p className="text-white text-lg font-serif mb-2 leading-snug">
                  Rain is expected around 4:00 PM.
                </p>
                <p className="text-white/70 text-sm">
                  Your outdoor Botanical Garden Walk will be affected. I've
                  found suitable indoor alternatives based on your preference
                  for Cultural and Wellness activities.
                </p>
              </div>

              <div className="p-5 bg-[#252525] space-y-3">
                {isResolving ? (
                  <div className="py-8 flex flex-col items-center justify-center text-white/70">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "linear",
                      }}
                    >
                      <IconBadge icon={Sparkles} tone="violet" size="md" />
                    </motion.div>
                    <p className="mt-3 text-sm">Updating your itinerary...</p>
                  </div>
                ) : (
                  <>
                    {AI_ALTERNATIVES.map((alt) => (
                      <button
                        key={alt.id}
                        onClick={() => acceptAlternative(alt)}
                        className="w-full text-left bg-surface/5 hover:bg-surface/10 border border-white/10 rounded-xl p-4 transition-colors group flex items-start gap-4"
                      >
                        <IconBadge icon={alt.icon} tone={alt.id === "alt_1" ? "sky" : "violet"} size="md" className="shrink-0" />
                        <div>
                          <h4 className="text-white font-medium mb-1">
                            {alt.title}
                          </h4>
                          <p className="text-white/50 text-xs mb-2">
                            {alt.desc}
                          </p>
                          <span className="text-[10px] uppercase tracking-wider text-accent-text font-semibold bg-accent/10 px-2 py-1 rounded">
                            {alt.match}
                          </span>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={keepOriginal}
                      className="w-full text-center text-white/50 text-sm py-2 mt-2 hover:text-white transition-colors"
                    >
                      Keep original plan
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentPlan && (
          <section className="overflow-hidden rounded-2xl bg-brand text-white shadow-[0_14px_28px_rgba(31,48,40,0.14)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E7C99C]">
                <IconBadge icon={Clock} tone="teal" size="sm" className="!h-7 !w-7" /> Next up
              </span>
              <span className="rounded-full bg-surface/10 px-2.5 py-1 text-[10px] font-semibold">
                {currentPlan.time}
              </span>
            </div>
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-wide text-white/55">
                Your morning, thoughtfully planned
              </p>
              <h2 className="mt-1 font-serif text-[25px] leading-tight">
                {currentPlan.title}
              </h2>
              <p className="mt-1 text-xs text-white/70">
                {currentPlan.location || currentPlan.desc} ·{" "}
                {currentPlan.duration || "Curated for you"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface/8 p-3">
                  <p className="text-[9px] uppercase tracking-wide text-white/50">
                    Your guide
                  </p>
                  <p className="mt-1 text-[11px] font-semibold">
                    {currentPlan.host || "Your local host"}
                  </p>
                </div>
                <div className="rounded-xl bg-surface/8 p-3">
                  <p className="text-[9px] uppercase tracking-wide text-white/50">
                    Meet here
                  </p>
                  <p className="mt-1 text-[11px] font-semibold">
                    {currentPlan.pickup || "Hotel lobby"}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  addRequest({
                    title: "Tour pickup confirmation",
                    category: "Valet / Transport",
                    detail: `${currentPlan.pickup || "Hotel lobby"} · ${currentPlan.location || currentPlan.title}`,
                  })
                }
                className="mt-3 flex w-full items-center justify-between rounded-xl bg-accent px-3.5 py-2.5 text-left text-[11px] font-bold text-text"
              >
                Confirm my pickup <ChevronRight size={15} />
              </button>
            </div>
          </section>
        )}

        <div>
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-serif text-2xl text-text">Today's Stay</h2>
            <span className="text-sm font-medium text-muted">
              October 5, 2026
            </span>
          </div>

          <div className="relative border-l-2 border-border ml-4 space-y-8 pb-4">
            <AnimatePresence>
              {itinerary.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative pl-6"
                >
                  <div
                    className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                      item.status === "completed"
                        ? "bg-muted border-muted"
                        : item.status === "current"
                          ? "bg-brand border-brand"
                          : item.isVulnerableToWeather && weather === "rainy"
                            ? "bg-surface border-red-500 animate-pulse"
                            : "bg-surface border-border"
                    }`}
                  />

                  <div
                    className={`
                    rounded-2xl p-4 transition-all
                    ${item.status === "current" ? "bg-surface shadow-md border border-border" : ""}
                    ${item.isVulnerableToWeather && weather === "rainy" ? "bg-red-50 border border-red-100" : ""}
                  `}
                  >
                    <p
                      className={`text-xs font-semibold tracking-wider mb-1 ${
                        item.status === "completed"
                          ? "text-muted"
                          : item.status === "current"
                            ? "text-accent-text"
                            : item.isVulnerableToWeather && weather === "rainy"
                              ? "text-red-500"
                              : "text-muted"
                      }`}
                    >
                      {item.time}
                    </p>
                    <h3
                      className={`font-medium text-lg mb-1 ${item.status === "completed" ? "text-muted line-through" : "text-text"}`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted leading-snug">
                      {item.desc}
                    </p>

                    {item.aiAdjusted && (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent-text bg-accent/10 px-2 py-1 rounded-md">
                        <IconBadge icon={Sparkles} tone="violet" size="sm" className="!h-7 !w-7" /> Adjusted by AI
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h2 className="font-serif text-2xl text-text mb-4">
            Tonight's Dining
          </h2>
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-border">
            <div className="w-full h-32 rounded-xl bg-[url('https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center mb-4" />
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-lg">Saffron Heritage Room</h3>
              <span className="bg-brand text-white text-xs px-2 py-1 rounded">
                Booked
              </span>
            </div>
            <p className="text-sm text-muted mb-4 border-l-2 border-accent pl-3 italic">
              "Recommended because you prefer quiet, vegetarian fine-dining.
              Chef Anand has prepared a custom tasting menu."
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  addRequest({
                    title: "Saffron tasting menu",
                    category: "In-Room Dining",
                    detail: "Vegetarian tasting menu for tonight at 7:30 PM",
                  })
                }
                className="flex-1 bg-surface-2 text-text text-sm py-2 rounded-lg font-medium hover:bg-border transition-colors"
              >
                View Custom Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DiscoverTab({ onRequest }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const categories = ["All", "Wellness", "Dining", "Culture"];
  const categoryIcons = { All: Compass, Wellness: Sparkles, Dining: Utensils, Culture: MapPin };
  const categoryTones = { All: "teal", Wellness: "violet", Dining: "saffron", Culture: "sky" };
  const filtered = EXPERIENCES.filter(
    (experience) =>
      (category === "All" || experience.category === category) &&
      `${experience.title} ${experience.desc}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <div className="px-5 pb-8 pt-8 sm:px-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-text">
            The local edit · No. 05
          </p>
          <h1 className="font-serif text-[34px] leading-none text-text">
            Discover
            <br />
            <span className="italic">Dehradun.</span>
          </h1>
        </div>
        <span className="mb-1 flex items-center gap-1 text-xs text-muted">
          <IconBadge icon={MapPin} tone="teal" size="sm" className="!h-7 !w-7 rounded-full" /> 30.3165° N
        </span>
      </div>
      <button
        onClick={() => setSelected(EXPERIENCES[3])}
        className="discover-feature relative mb-5 flex h-[218px] w-full items-end overflow-hidden rounded-2xl bg-brand text-left text-white shadow-lg"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.03]"
          style={{ backgroundImage: `url(${EXPERIENCES[3].img})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14251F]/95 via-[#14251F]/25 to-transparent" />
        <div className="relative w-full p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full border border-white/25 bg-black/20 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              Outside the ordinary · {EXPERIENCES[3].category}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-[10px] font-bold text-text">
              ★ {EXPERIENCES[3].rating}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-[26px] leading-none">
                Breathe beyond the city
              </h2>
              <p className="mt-1.5 text-[10px] text-white/75">
                {EXPERIENCES[3].location} · {EXPERIENCES[3].duration}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-3 py-2 text-[10px] font-bold text-text">
              Explore <ChevronRight size={13} className="ml-1 inline" />
            </span>
          </div>
        </div>
      </button>
      <label className="relative block mb-4">
        <IconBadge icon={Search} tone="teal" size="sm" className="absolute left-2 top-2 !h-7 !w-7 rounded-full" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search experiences"
          className="w-full bg-surface border border-border rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none focus:border-accent"
        />
      </label>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {categories.map((item) => {
          const CategoryIcon = categoryIcons[item];
          return (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${category === item ? "bg-brand text-white shadow-sm" : "bg-surface border border-border text-muted"}`}
            >
              <IconBadge icon={CategoryIcon} tone={categoryTones[item]} size="sm" className="!h-7 !w-7 rounded-full" />
              {item}
            </button>
          );
        })}
      </div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-text">
            Chosen for you
          </p>
          <h2 className="font-serif text-[22px] leading-tight text-text">
            A little more local
          </h2>
        </div>
        <span className="text-[10px] text-muted">
          {filtered.length} experiences
        </span>
      </div>
      <div className="space-y-3 pb-8">
        {filtered.map((experience) => (
          <article
            key={experience.id}
            className="flex overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
          >
            <div
              className="w-[104px] shrink-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${experience.img})` }}
            />
            <div className="min-w-0 flex-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent-text">
                  {experience.category} · {experience.duration}
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-muted">
                  ★ {experience.rating}
                </span>
              </div>
              <h3 className="mt-1 font-serif text-[18px] leading-tight text-text">
                {experience.title}
              </h3>
              <p className="mt-1 text-[10px] leading-snug text-muted">
                {experience.location}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-semibold text-muted">
                  {experience.time}
                </span>
                <button
                  onClick={() => setSelected(experience)}
                  className="shrink-0 text-[10px] font-bold text-accent-text"
                >
                  Details <ChevronRight size={12} className="inline" />
                </button>
              </div>
              <p className="mt-1 text-[9px] text-muted">
                {experience.price} · {experience.availability}
              </p>
              <p className="sr-only">{experience.desc}</p>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted py-10">
            No experiences match that search.
          </p>
        )}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-[70] bg-black/45 p-5 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-bg rounded-2xl overflow-hidden shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="h-40 bg-cover bg-center"
              style={{ backgroundImage: `url(${selected.img})` }}
            />
            <div className="p-5">
              <div className="flex justify-between">
                <span className="text-xs uppercase text-accent-text font-semibold">
                  {selected.category}
                </span>
                <button aria-label="Close" onClick={() => setSelected(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <h2 className="font-serif text-2xl leading-tight">
                  {selected.title}
                </h2>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">
                  ★ {selected.rating}
                </span>
              </div>
              <p className="text-sm text-muted mt-2">{selected.desc}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 text-xs">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-accent-text">
                    When
                  </p>
                  <p className="mt-1 font-semibold">{selected.time}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-accent-text">
                    Duration
                  </p>
                  <p className="mt-1 font-semibold">{selected.duration}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-accent-text">
                    Where
                  </p>
                  <p className="mt-1 font-semibold">{selected.location}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-accent-text">
                    From
                  </p>
                  <p className="mt-1 font-semibold">{selected.price}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-muted">
                {selected.availability}
              </p>
              <button
                onClick={() => {
                  onRequest({
                    title: selected.title,
                    category: "Experience booking",
                    detail: `${selected.time} · ${selected.location} · ${selected.price}`,
                  });
                  setSelected(null);
                }}
                className="w-full mt-5 bg-brand text-white py-3 rounded-xl text-sm font-medium"
              >
                Request reservation
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AITab({ onRequest }) {
  const [messages, setMessages] = useState([
    {
      from: "concierge",
      text: `Good afternoon, ${GUEST.name}. I can help with room service, local plans, or anything you need during your stay.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const quickReplies = [
    "Book the spa",
    "Show vegetarian dining",
    "Request fresh towels",
  ];

  const sendMessage = (text = draft) => {
    const message = text.trim();
    if (!message) return;
    setMessages((current) => [...current, { from: "guest", text: message }]);
    const lower = message.toLowerCase();
    let reply =
      "I have shared your request with the hotel team. They will follow up shortly.";
    if (lower.includes("spa")) {
      onRequest({
        title: "Spa booking",
        category: "Spa Booking",
        detail: "Please arrange a wellness session.",
      });
      reply =
        "I sent a spa booking request to the wellness team. They will confirm an available time shortly.";
    } else if (
      lower.includes("towel") ||
      lower.includes("housekeep") ||
      lower.includes("clean")
    ) {
      onRequest({
        title: "Housekeeping request",
        category: "Housekeeping",
        detail: message,
      });
      reply =
        "Your housekeeping request is with the team now. Track it in Hotel Services.";
    } else if (
      lower.includes("dining") ||
      lower.includes("food") ||
      lower.includes("menu")
    ) {
      reply =
        "Saffron Heritage Room has a vegetarian tasting menu tonight at 7:30 PM. Ask me to book it and I will send a request.";
    } else if (
      lower.includes("transport") ||
      lower.includes("car") ||
      lower.includes("valet")
    ) {
      onRequest({
        title: "Transport assistance",
        category: "Valet / Transport",
        detail: message,
      });
      reply =
        "I forwarded your transport request to the valet desk. They will confirm shortly.";
    } else if (lower.includes("book") || lower.includes("order")) {
      onRequest({
        title: "Dining request",
        category: "In-Room Dining",
        detail: message,
      });
      reply =
        "I sent your dining request to the restaurant team. They will confirm shortly.";
    }
    window.setTimeout(
      () =>
        setMessages((current) => [
          ...current,
          { from: "concierge", text: reply },
        ]),
      350,
    );
    setDraft("");
  };

  return (
    <div className="h-full min-h-[560px] flex flex-col bg-bg">
      <div className="pt-12 px-6 pb-4 bg-surface border-b border-border shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
            <IconBadge icon={Sparkles} tone="saffron" size="sm" />
          </div>
          <div>
            <h1 className="font-serif text-xl">Atithi Concierge</h1>
            <p className="text-xs text-green-700 font-medium">
              ● Online · ready to help
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-5 overflow-y-auto space-y-3 pb-5">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.from}`}
            className={`max-w-[86%] rounded-2xl p-4 text-sm leading-relaxed ${message.from === "guest" ? "ml-auto bg-brand text-white rounded-br-sm" : "bg-surface shadow-sm border border-border rounded-tl-sm"}`}
          >
            {message.text}
          </div>
        ))}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => sendMessage(reply)}
                className="bg-surface text-text text-xs font-medium px-3 py-2 rounded-full border border-border"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
        className="px-4 py-3 bg-surface border-t border-border flex gap-2"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask for a recommendation or service..."
          className="min-w-0 flex-1 bg-surface-2 rounded-full py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          aria-label="Send message"
          type="submit"
          disabled={!draft.trim()}
          className="w-11 h-11 shrink-0 rounded-full bg-brand flex items-center justify-center text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function ServicesTab({ requests, onRequest, setActiveTab }) {
  const services = [
    {
      icon: BedDouble,
      tone: "sky",
      name: "Housekeeping",
      detail: "Fresh towels, turndown & more",
      eta: "~15 min",
    },
    {
      icon: Utensils,
      tone: "saffron",
      name: "In-Room Dining",
      detail: "Seasonal dishes, delivered warm",
      eta: "~30 min",
    },
    {
      icon: Bath,
      tone: "violet",
      name: "Spa Booking",
      detail: "Restore with a signature ritual",
      eta: "View times",
    },
    {
      icon: Car,
      tone: "teal",
      name: "Valet / Transport",
      detail: "Your next ride, taken care of",
      eta: "~8 min",
    },
    {
      icon: Clock,
      tone: "coral",
      name: "Wake-up Call",
      detail: "A gentle start, right on time",
      eta: "Set time",
    },
    {
      icon: MessageSquare,
      tone: "emerald",
      name: "Reception",
      detail: "A member of our team, anytime",
      eta: "24 hours",
    },
  ];
  const [selectedService, setSelectedService] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const sendRequest = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onRequest({
      title:
        selectedService === "Wake-up Call"
          ? `Wake-up call · ${form.get("time")}`
          : selectedService,
      category: selectedService,
      detail: `${form.get("detail") || "Requested for Room 402"} · ${form.get("time")}`,
    });
    setConfirmation(`${selectedService} request sent`);
    setSelectedService(null);
    window.setTimeout(() => setConfirmation(""), 2500);
  };
  return (
    <div className="services-page px-5 pt-8 pb-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[#E7C99C]">
            <IconBadge icon={Sparkles} tone="violet" size="sm" className="!h-9 !w-9 rounded-full" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
              The Aranya House
            </p>
            <p className="text-xs font-semibold text-text">
              Guest services
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-[#73927D]" />
          Here for you
        </span>
      </div>

      <div className="mb-5 flex items-end justify-between gap-2">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-accent-text">
            Monday · October 5
          </p>
          <h1 className="font-serif text-[34px] leading-none text-text">
            Make yourself
            <br />
            at home.
          </h1>
        </div>
        <div className="pb-1 text-right">
          <p className="text-xs text-muted">Dehradun</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-sm font-medium text-text">
            <IconBadge icon={Sun} tone="saffron" size="sm" className="!h-7 !w-7 rounded-full" /> 24°
          </p>
        </div>
      </div>

      <div className="stay-summary mb-7 flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface/10">
            <IconBadge icon={BedDouble} tone="sky" size="sm" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">
              Your room
            </p>
            <p className="truncate text-sm font-semibold">
              402{" "}
              <span className="font-normal text-white/60">· Luxury Suite</span>
            </p>
          </div>
        </div>
        <div className="h-8 w-px bg-surface/15" />
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/60">
            Check out
          </p>
          <p className="text-sm font-semibold">
            Oct 7 <span className="font-normal text-white/60">· 2 nights</span>
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-[23px] leading-tight text-text">
            At your service
          </h2>
          <p className="mt-1 text-xs text-muted">
            A few thoughtful touches, whenever you need.
          </p>
        </div>
        <span className="pb-1 text-[10px] uppercase tracking-[0.12em] text-accent-text">
          01 — 06
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {services.map((svc) => (
          <button
            key={svc.name}
            onClick={() => setSelectedService(svc.name)}
            className="service-tile group min-h-[140px] rounded-2xl border border-border bg-surface p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_12px_24px_rgba(38,51,43,0.08)]"
          >
            <span className="mb-3 flex items-center justify-between">
              <IconBadge icon={svc.icon} tone={svc.tone} size="sm" className="transition-transform group-hover:-translate-y-0.5" />
              <ChevronRight
                size={15}
                className="text-muted transition-transform group-hover:translate-x-0.5"
              />
            </span>
            <span className="block text-[13px] font-semibold leading-tight text-text">
              {svc.name}
            </span>
            <span className="mt-1 block min-h-8 text-[10px] leading-[1.45] text-muted">
              {svc.detail}
            </span>
            <span className="mt-1 inline-flex rounded-full bg-surface-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-accent-text">
              {svc.eta}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setActiveTab("ai")}
        className="concierge-banner mt-5 flex w-full items-center justify-between rounded-2xl p-4.5 text-left text-white transition-transform hover:-translate-y-0.5"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-surface/5 text-[#E7C99C]">
            <IconBadge icon={Sparkles} tone="violet" size="sm" />
          </span>
          <span>
            <span className="block font-serif text-[17px] text-[#E7C99C]">
              A little extra?
            </span>
            <span className="mt-0.5 block text-[10px] text-white/65">
              Your personal concierge is one message away.
            </span>
          </span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface/10">
          <ChevronRight size={17} className="text-[#E7C99C]" />
        </span>
      </button>
      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent-text">
              In good hands
            </p>
            <h2 className="mt-0.5 font-serif text-[23px] leading-tight text-text">
              Your requests
            </h2>
          </div>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-muted">
            {
              requests.filter((request) => request.status !== "Completed")
                .length
            }{" "}
            open · {requests.length} total
          </span>
        </div>
        <div className="space-y-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="request-row rounded-xl border border-border bg-surface/90 px-3.5 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  {request.status === "Completed" ? (
                    <IconBadge icon={Check} tone="emerald" size="sm" className="!h-7 !w-7 rounded-lg" />
                  ) : (
                    <IconBadge icon={Clock} tone="saffron" size="sm" className="!h-7 !w-7 rounded-lg" pulse={request.status === "Received"} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-text">
                      {request.title}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${request.status === "Completed" ? "bg-surface-2 text-muted" : "bg-surface-2 text-accent-text"}`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-muted">
                    {request.category} · {request.detail}
                  </p>
                  <p className="mt-1.5 text-[9px] uppercase tracking-wide text-muted">
                    {request.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {confirmation && (
        <p
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] bg-brand text-white text-sm px-4 py-3 rounded-xl shadow-lg"
        >
          {confirmation}
        </p>
      )}
      {selectedService && (
        <div
          className="fixed inset-0 z-[70] bg-black/45 p-5 flex items-center justify-center"
          onClick={() => setSelectedService(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            onSubmit={sendRequest}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm bg-bg rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex justify-between">
              <div>
                <p className="text-xs uppercase text-accent-text">Room 402</p>
                <h2 className="font-serif text-2xl">{selectedService}</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedService(null)}
              >
                <X size={18} />
              </button>
            </div>
            <label className="block mt-4 text-xs font-semibold text-muted">
              DETAILS
              <input
                name="detail"
                placeholder="What should the team prepare?"
                className="w-full mt-2 p-3 rounded-xl border border-border bg-surface text-sm font-normal"
              />
            </label>
            {selectedService === "Wake-up Call" ? (
              <label className="block mt-4 text-xs font-semibold text-muted">
                CALL TIME
                <input
                  name="time"
                  type="time"
                  defaultValue="07:00"
                  required
                  className="w-full mt-2 p-3 rounded-xl border border-border bg-surface text-sm font-normal"
                />
              </label>
            ) : (
              <label className="block mt-4 text-xs font-semibold text-muted">
                WHEN
                <select
                  name="time"
                  className="w-full mt-2 p-3 rounded-xl border border-border bg-surface text-sm font-normal"
                >
                  <option>As soon as possible</option>
                  <option>In 30 minutes</option>
                  <option>At 6:00 PM</option>
                  <option>Tomorrow morning</option>
                </select>
              </label>
            )}
            <button
              type="submit"
              className="w-full mt-5 bg-brand text-white py-3 rounded-xl text-sm font-medium"
            >
              Send request
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ProfileTab() {
  const [diet, setDiet] = useState("Vegetarian");
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [openPanel, setOpenPanel] = useState("");
  return (
    <div className="profile-page px-5 pt-8 pb-8 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-text">
            Your private stay
          </p>
          <h1 className="font-serif text-[34px] leading-none text-text">
            The guest book.
          </h1>
        </div>
        <ThemeToggle compact />
      </div>
      <div className="profile-pass relative mb-5 overflow-hidden rounded-2xl p-5 text-white shadow-lg">
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Atithi · Private guest
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#E7C99C]/60 bg-surface/5 font-serif text-2xl text-[#E7C99C]">
                V
              </div>
              <div>
                <h2 className="font-serif text-[25px] leading-none">
                  {GUEST.name} {GUEST.lastName}
                </h2>
                <p className="mt-1.5 text-[10px] text-white/65">{GUEST.room}</p>
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-[#E7C99C]/35 bg-surface/5 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-[#E7C99C]">
            <ShieldCheck size={12} /> Signature
          </span>
        </div>
        <div className="relative mt-5 flex items-center justify-between border-t border-white/15 pt-3">
          <span className="text-[9px] uppercase tracking-[0.16em] text-white/55">
            Guest since · 2022
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#E7C99C]">
            No. 00402 · Dehradun
          </span>
        </div>
      </div>
      <section className="mb-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent-text">
              October 3 – 7, 2026
            </p>
            <h2 className="mt-0.5 font-serif text-[20px] text-text">
              Your stay
            </h2>
          </div>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[9px] font-semibold text-muted">
            In residence
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#E8E3D9]">
          <div className="pr-2">
            <p className="text-[9px] uppercase tracking-wide text-muted">
              Room
            </p>
            <p className="mt-1 text-xs font-semibold text-text">
              402 Suite
            </p>
          </div>
          <div className="px-3">
            <p className="text-[9px] uppercase tracking-wide text-muted">
              Guests
            </p>
            <p className="mt-1 text-xs font-semibold text-text">
              2 adults
            </p>
          </div>
          <div className="pl-3">
            <p className="text-[9px] uppercase tracking-wide text-muted">
              Nights
            </p>
            <p className="mt-1 text-xs font-semibold text-text">
              4 nights
            </p>
          </div>
        </div>
      </section>
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
          AI Personalization
        </h3>
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setOpenPanel("preferences")}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-2"
          >
            <span className="flex items-center gap-3">
              <IconBadge icon={Sparkles} tone="violet" size="sm" />
              <span className="text-sm font-medium">Diet & interests</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted">
              {diet} <ChevronRight size={16} />
            </span>
          </button>
          <div className="border-t border-border" />
          <ProfileToggle
            icon={Settings}
            label="Auto-adjust plans"
            checked={autoAdjust}
            onChange={() => setAutoAdjust((value) => !value)}
          />
        </div>
      </section>
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
          Account Settings
        </h3>
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setOpenPanel("payment")}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-2"
          >
            <span className="flex items-center gap-3">
              <IconBadge icon={CreditCard} tone="teal" size="sm" />
              <span className="text-sm font-medium">Payment methods</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-muted">
              •••• 2048 <ChevronRight size={16} />
            </span>
          </button>
          <div className="border-t border-border" />
          <ProfileToggle
            icon={Bell}
            label="Notifications"
            checked={notifications}
            onChange={() => setNotifications((value) => !value)}
          />
        </div>
      </section>
      {openPanel && (
        <div
          className="fixed inset-0 z-[70] bg-black/45 p-5 flex items-center justify-center"
          onClick={() => setOpenPanel("")}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-bg rounded-2xl p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <h2 className="font-serif text-2xl">
                {openPanel === "preferences"
                  ? "Your preferences"
                  : "Payment methods"}
              </h2>
              <button aria-label="Close" onClick={() => setOpenPanel("")}>
                <X size={18} />
              </button>
            </div>
            {openPanel === "preferences" ? (
              <>
                <label className="block mt-5 text-xs font-semibold text-muted">
                  DIET
                  <select
                    value={diet}
                    onChange={(event) => setDiet(event.target.value)}
                    className="block w-full mt-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-normal"
                  >
                    <option>Vegetarian</option>
                    <option>Vegan</option>
                    <option>No preference</option>
                    <option>Gluten-free</option>
                  </select>
                </label>
                <p className="text-xs text-muted mt-4">
                  Interests: Culture · Wellness · Quiet Dining
                </p>
              </>
            ) : (
              <div className="mt-5 rounded-xl bg-surface p-4 border border-border">
                <p className="font-medium text-sm">Visa ending in 2048</p>
                <p className="text-xs text-muted mt-1">
                  Primary payment method · Expires 08/28
                </p>
              </div>
            )}
            <button
              onClick={() => setOpenPanel("")}
              className="w-full mt-5 bg-brand text-white py-3 rounded-xl text-sm font-medium"
            >
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function ProfileToggle({ icon: Icon, label, checked, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-2"
    >
      <span className="flex items-center gap-3">
        <IconBadge icon={Icon} tone={label === "Notifications" ? "coral" : "emerald"} size="sm" />
        <span className="text-sm font-medium">{label}</span>
      </span>
      <span
        className={`w-10 h-6 rounded-full relative transition-colors ${checked ? "bg-brand" : "bg-border"}`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-surface transition-all ${checked ? "right-1" : "left-1"}`}
        />
      </span>
    </button>
  );
}

function NavIcon({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[64px]"
    >
      <motion.div whileTap={{ scale: 0.9 }} animate={active ? { y: [0, -3, 0] } : { y: 0 }} transition={{ duration: 0.28 }}>
        <IconBadge icon={Icon} tone={active ? "saffron" : "teal"} size="sm" className={active ? "" : "opacity-85"} />
      </motion.div>
      <span
        className={`text-[10px] font-medium ${active ? "text-text" : "text-muted"}`}
      >
        {label}
      </span>
    </button>
  );
}

// --- ADMIN DASHBOARD ---
// Keeping the Admin Dashboard intact for the Demo controller
function AdminDashboard({ weather, itinerary, showAIIntervention }) {
  const isConflict =
    weather === "rainy" && itinerary.some((i) => i.isVulnerableToWeather);
  const isResolved = weather === "rainy" && itinerary.some((i) => i.aiAdjusted);

  return (
    <div className="min-h-screen flex bg-surface-2">
      {/* Sidebar */}
      <div className="w-64 bg-brand text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <IconBadge icon={Sparkles} tone="saffron" size="sm" />
            <span className="font-serif text-xl tracking-wide">Atithi AI</span>
          </div>
          <p className="text-white/50 text-xs">Hotel Command Center</p>
        </div>

        <div className="p-4 space-y-1 flex-1">
          <SidebarItem icon={LayoutDashboard} label="Overview" active tone="saffron" />
          <SidebarItem icon={User} label="Active Guests" count={124} tone="teal" />
          <SidebarItem
            icon={Sparkles}
            label="AI Control Center"
            alert={isConflict}
            tone="coral"
          />
          <SidebarItem icon={Bell} label="Service Requests" count={12} tone="sky" />
          <SidebarItem icon={CalendarDays} label="Bookings" tone="violet" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-serif text-text">
              AI Operations Dashboard
            </h1>
            <p className="text-muted">
              Real-time guest personalization overview
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-surface px-4 py-2 rounded-lg shadow-sm border border-border flex items-center gap-3">
              <IconBadge icon={Thermometer} tone="coral" size="sm" pulse={isConflict} />
              <div className="flex flex-col">
                <span className="text-xs text-muted uppercase font-semibold">
                  Live Weather
                </span>
                <span className="text-sm font-medium capitalize text-text">
                  {weather} (Detecting Context)
                </span>
              </div>
            </div>
            <ThemeToggle compact />
          </div>
        </header>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Active AI Interventions"
            value={isConflict ? "1" : "0"}
            trend={isConflict ? "Requires attention" : "All clear"}
            alert={isConflict}
            icon={CloudRain}
            tone="coral"
          />
          <StatCard title="Auto-Resolved by AI" value="48" trend="+12% today" icon={Check} tone="emerald" />
          <StatCard
            title="Guest Satisfaction (AI)"
            value="4.9/5"
            trend="Top 5% globally"
            icon={Sparkles}
            tone="saffron"
          />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-surface rounded-2xl shadow-sm border border-border p-6">
            <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
              <IconBadge icon={User} tone="teal" size="sm" /> Live Guest Activity
            </h2>
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border ${isConflict ? "bg-red-50 border-red-100 dark:bg-rose-950/30 dark:border-rose-900/60" : isResolved ? "bg-surface-2 border-accent" : "border-border"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-serif">
                      V
                    </div>
                    <div>
                      <h3 className="font-medium text-text">
                        Virat Sharma{" "}
                        <span className="text-xs font-normal text-muted bg-surface-2 px-2 py-0.5 rounded ml-2">
                          Room 402
                        </span>
                      </h3>
                      <p className="text-xs text-muted">
                        VIP • Vegetarian • Wellness Focus
                      </p>
                    </div>
                  </div>
                </div>

                {isConflict && (
                  <div className="bg-surface p-3 rounded-lg border border-red-100 mt-2">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                      <IconBadge icon={CloudRain} tone="coral" size="sm" pulse />{" "}
                      <span className="text-sm font-semibold">
                        Weather Conflict Detected (4:00 PM)
                      </span>
                    </div>
                    <p className="text-sm text-text mb-2">
                      Outdoor Botanical Garden Walk compromised.
                    </p>
                  </div>
                )}

                {isResolved && (
                  <div className="bg-surface p-3 rounded-lg border border-border mt-2">
                    <div className="flex items-center gap-2 text-text mb-1">
                      <IconBadge icon={Check} tone="emerald" size="sm" />{" "}
                      <span className="text-sm font-semibold">
                        Guest accepted AI Alternative
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      Swapped 'Botanical Walk' for 'National Art Museum' due to
                      rain.
                    </p>
                  </div>
                )}

                {!isConflict && !isResolved && (
                  <div className="bg-surface-2 p-3 rounded-lg mt-2">
                    <p className="text-sm text-muted">
                      Enjoying Private City Tour. Next: Lunch at The Courtyard.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, count, alert, tone = "teal" }) {
  return (
    <button
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${active ? "bg-surface/10 text-white" : "text-white/60 hover:bg-surface/5 hover:text-white"}`}
    >
      <div className="flex items-center gap-3">
        <IconBadge icon={Icon} tone={alert ? "coral" : tone} size="sm" pulse={alert} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {count && (
        <span className="bg-surface/10 text-xs px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
      {alert && (
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
      )}
    </button>
  );
}

function StatCard({ title, value, trend, alert, icon = LayoutDashboard, tone = "teal" }) {
  return (
    <div
      className={`bg-surface rounded-2xl p-5 shadow-sm border ${alert ? "border-red-200" : "border-border"}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <IconBadge icon={icon} tone={alert ? "coral" : tone} size="md" pulse={alert} />
        <h3 className="text-sm font-semibold text-muted">{title}</h3>
      </div>
      <div className="flex items-end justify-between">
        <span
          className={`text-3xl font-serif ${alert ? "text-red-600" : "text-text"}`}
        >
          {value}
        </span>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-md ${alert ? "bg-red-50 text-red-600" : "bg-surface-2 text-muted"}`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}
