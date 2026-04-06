import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Users,
  MessageSquareText,
  Phone,
  Headset,
  ShieldCheck,
} from "lucide-react";
import agentDashboard from "../assets/image.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement authentication
    console.log("Login submitted", { email, rememberMe });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[1100px] bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* ── Left Panel ── */}
        <LeftPanel />

        {/* ── Right Panel (Login Form) ── */}
        <div className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
          <h2 className="text-3xl font-bold text-gray-900">Login</h2>
          <p className="mt-1 text-gray-500">
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.johnson@company.com"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Remember me
            </label>

            {/* Sign In */}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition cursor-pointer"
            >
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition cursor-pointer"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          {/* Contact admin */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              type="button"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Contact your administrator
            </button>
          </p>

          {/* Security badge */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-gray-100 bg-gray-50 py-2.5 text-xs text-gray-500">
            <ShieldCheck size={14} className="text-gray-400" />
            Secure login protected by JWT authentication
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Left Panel ─── */
function LeftPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-b from-blue-50 to-slate-50 px-10 py-10 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-2 z-10">
        <Headset className="h-8 w-8 text-blue-600" />
        <span className="text-xl font-bold text-gray-900">
          Contact Center
        </span>
      </div>

      {/* Heading */}
      <div className="-mt-2 z-10">
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          Welcome Back 👋
        </h1>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Sign in to access your dashboard and manage customers, tickets, and
          calls efficiently.
        </p>
      </div>

      {/* Illustration image */}
      <div className="flex-1 flex items-center justify-center z-10">
        <img
          src={agentDashboard}
          alt="Contact center agent illustration"
          className="w-full max-w-[420px] object-contain"
        />
      </div>

      {/* Feature pills */}
      <div className="grid grid-cols-3 gap-4 text-center z-10">
        <FeaturePill
          icon={<Users size={22} />}
          title="Manage Customers"
          desc="View and support your customers"
        />
        <FeaturePill
          icon={<MessageSquareText size={22} />}
          title="Track Tickets"
          desc="Create, update, and resolve tickets"
        />
        <FeaturePill
          icon={<Phone size={22} />}
          title="Handle Calls"
          desc="Start and manage customer calls"
        />
      </div>
    </div>
  );
}

/* ─── Agent Illustration with Dashboard Overlay ─── */
function AgentIllustration() {
  return (
    <div className="relative w-full z-10" style={{ height: 280 }}>
      {/* Background browser window */}
      <div className="absolute top-0 right-0 w-[85%] h-[220px] rounded-xl bg-gradient-to-br from-blue-100/80 to-blue-50/60 border border-blue-200/50 shadow-md overflow-hidden">
        {/* Browser top bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/60 border-b border-blue-200/40">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <div className="ml-2 flex-1 h-4 rounded bg-blue-200/40" />
        </div>

        {/* Dashboard card inside browser */}
        <div className="p-3">
          <DashboardMini />
        </div>
      </div>

      {/* Headset icon (top-left of illustration) */}
      <div className="absolute top-2 left-0 bg-white rounded-lg shadow-md p-2 z-20">
        <Headset size={20} className="text-blue-500" />
      </div>

      {/* Chat bubble - top */}
      <div className="absolute top-4 left-10 bg-gray-600 rounded-lg rounded-bl-none px-2 py-1 z-20">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
        </div>
      </div>

      {/* Chat bubbles - middle */}
      <div className="absolute top-14 left-4 space-y-1.5 z-20">
        <div className="bg-blue-500 rounded-lg rounded-bl-none px-2 py-1">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          </div>
        </div>
        <div className="bg-white rounded-lg rounded-tl-none px-2 py-1 shadow-sm">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>

      {/* Check mark badge */}
      <div className="absolute bottom-20 left-16 bg-blue-500 rounded-full p-1.5 shadow-lg z-20">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
          <path stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Agent SVG illustration */}
      <svg className="absolute bottom-0 left-4 z-10" width="200" height="200" viewBox="0 0 200 200" fill="none">
        {/* Hair */}
        <ellipse cx="100" cy="60" rx="35" ry="38" fill="#2D3748" />
        {/* Face */}
        <ellipse cx="100" cy="68" rx="28" ry="28" fill="#F5C6A0" />
        {/* Eyes */}
        <ellipse cx="90" cy="65" rx="2.5" ry="3" fill="#2D3748" />
        <ellipse cx="110" cy="65" rx="2.5" ry="3" fill="#2D3748" />
        {/* Smile */}
        <path d="M93 76 Q100 82 107 76" stroke="#D08060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Hair bangs */}
        <path d="M68 55 Q75 30 100 28 Q110 28 118 35 Q125 42 128 55" fill="#2D3748" />
        <path d="M68 55 Q72 45 82 38" stroke="#2D3748" strokeWidth="8" strokeLinecap="round" fill="none" />
        {/* Headset band */}
        <path d="M66 58 Q65 35 100 30 Q135 35 134 58" stroke="#4A5568" strokeWidth="3.5" fill="none" />
        {/* Headset ear pieces */}
        <rect x="60" y="54" width="10" height="14" rx="4" fill="#4A5568" />
        <rect x="130" y="54" width="10" height="14" rx="4" fill="#4A5568" />
        {/* Headset mic arm */}
        <path d="M63 68 Q58 80 65 85" stroke="#4A5568" strokeWidth="2.5" fill="none" />
        <circle cx="66" cy="86" r="3" fill="#4A5568" />
        {/* Body / Shirt */}
        <path d="M70 95 Q65 100 58 130 L58 185 L142 185 L142 130 Q135 100 130 95 Q115 88 100 88 Q85 88 70 95Z" fill="#5B7FD6" />
        {/* Neckline */}
        <path d="M85 92 Q100 100 115 92" stroke="#4A6BC0" strokeWidth="1.5" fill="none" />
        {/* Arms */}
        <path d="M58 130 Q45 145 50 165 Q55 175 65 178" fill="#5B7FD6" />
        <path d="M142 130 Q155 145 150 165 Q145 175 135 178" fill="#5B7FD6" />
        {/* Hands */}
        <ellipse cx="65" cy="178" rx="8" ry="5" fill="#F5C6A0" />
        <ellipse cx="135" cy="178" rx="8" ry="5" fill="#F5C6A0" />
        {/* Laptop */}
        <rect x="50" y="170" width="100" height="6" rx="2" fill="#CBD5E0" />
        <rect x="55" y="150" width="90" height="22" rx="3" fill="#E2E8F0" />
        <rect x="60" y="153" width="80" height="16" rx="2" fill="#4299E1" opacity="0.3" />
      </svg>

      {/* Plant */}
      <svg className="absolute bottom-0 right-2 z-10" width="50" height="80" viewBox="0 0 50 80">
        {/* Pot */}
        <path d="M15 55 L12 75 Q12 80 18 80 L32 80 Q38 80 38 75 L35 55Z" fill="#D4956B" />
        <rect x="12" y="52" width="26" height="6" rx="2" fill="#C07A50" />
        {/* Stems & Leaves */}
        <path d="M25 52 Q25 40 20 30" stroke="#48BB78" strokeWidth="2" fill="none" />
        <path d="M25 52 Q25 35 30 25" stroke="#48BB78" strokeWidth="2" fill="none" />
        <path d="M25 52 Q28 42 35 38" stroke="#48BB78" strokeWidth="2" fill="none" />
        <path d="M25 52 Q22 42 15 38" stroke="#48BB78" strokeWidth="2" fill="none" />
        {/* Leaf shapes */}
        <ellipse cx="18" cy="28" rx="8" ry="5" transform="rotate(-30 18 28)" fill="#48BB78" />
        <ellipse cx="32" cy="23" rx="8" ry="5" transform="rotate(20 32 23)" fill="#38A169" />
        <ellipse cx="37" cy="36" rx="7" ry="4" transform="rotate(40 37 36)" fill="#48BB78" />
        <ellipse cx="13" cy="36" rx="7" ry="4" transform="rotate(-40 13 36)" fill="#38A169" />
        <ellipse cx="25" cy="22" rx="6" ry="4" transform="rotate(5 25 22)" fill="#68D391" />
      </svg>
    </div>
  );
}

/* ─── Mini Dashboard (inside illustration browser window) ─── */
function DashboardMini() {
  return (
    <div className="space-y-2">
      {/* Stats row */}
      <div className="flex justify-between text-[9px]">
        <div className="text-center">
          <div className="text-[8px] text-gray-400 font-medium">Open Tickets</div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-blue-500">📁</span>
            <span className="text-sm font-bold text-blue-600">32</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-gray-400 font-medium">In Progress</div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-orange-500">🔶</span>
            <span className="text-sm font-bold text-orange-500">12</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-gray-400 font-medium">Resolved</div>
          <div className="flex items-center justify-center gap-1">
            <span>✅</span>
            <span className="text-sm font-bold text-green-600">128</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-gray-400 font-medium">Calls Today</div>
          <div className="flex items-center justify-center gap-1">
            <span>📞</span>
            <span className="text-sm font-bold text-purple-600">24</span>
          </div>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="bg-white/70 rounded-lg p-2 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-semibold text-gray-700">Recent Tickets</span>
          <span className="text-[8px] font-medium text-blue-500">View All</span>
        </div>
        {[
          { name: "Login Issue", status: "OPEN", badge: "bg-blue-100 text-blue-600" },
          { name: "Payment Failed", status: "IN PROGRESS", badge: "bg-orange-100 text-orange-600" },
          { name: "Account Update", status: "RESOLVED", badge: "bg-green-100 text-green-600" },
        ].map((t) => (
          <div key={t.name} className="flex items-center justify-between text-[9px]">
            <span className="text-gray-500">{t.name}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-bold ${t.badge}`}>
              {t.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Feature Pill ─── */
function FeaturePill({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-blue-600">{icon}</div>
      <span className="text-xs font-semibold text-gray-800">{title}</span>
      <span className="text-[10px] text-gray-500 leading-tight">{desc}</span>
    </div>
  );
}

/* ─── Inline Google "G" SVG ─── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
