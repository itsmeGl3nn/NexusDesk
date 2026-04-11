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
    console.log("Login submitted", { email, rememberMe });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[1100px] bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        <LeftPanel />

        <div className="flex flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
          <h2 className="text-3xl font-bold text-gray-900">Login</h2>
          <p className="mt-1 text-gray-500">
            Enter your credentials to continue
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Remember me
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition cursor-pointer"
            >
              Sign In
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition cursor-pointer"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              type="button"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Contact your administrator
            </button>
          </p>

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
      <div className="flex items-center gap-2 z-10">
        <Headset className="h-8 w-8 text-blue-600" />
        <span className="text-xl font-bold text-gray-900">
          Contact Center
        </span>
      </div>

      <div className="-mt-2 z-10">
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          Welcome Back 👋
        </h1>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          Sign in to access your dashboard and manage customers, tickets, and
          calls efficiently.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center z-10">
        <img
          src={agentDashboard}
          alt="Contact center agent illustration"
          className="w-full max-w-[420px] object-contain"
        />
      </div>

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
