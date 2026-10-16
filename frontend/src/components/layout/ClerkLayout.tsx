import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { clerksApi, type Clerk } from "../../api/clerksApi";


interface ClerkLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  caseCount?: number;
}

export const ClerkLayout: React.FC<ClerkLayoutProps> = ({
  children,
  title,
  subtitle,
  caseCount,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentClerk = authApi.getCurrentClerk();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<Clerk | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fetchProfileDetails = async () => {
    if (!currentClerk) return;
    try {
      setProfileLoading(true);
      setProfileError(null);
      // Fetch full clerk profile by userId
      const data = await clerksApi.getByUserId(currentClerk.userId);
      setProfileData(data);
    } catch (err: any) {
      // Fallback to currentClerk stored in auth session
      setProfileError(err.response?.data?.message || err.message || "Failed to load live profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const openProfileModal = () => {
    setShowProfileModal(true);
    fetchProfileDetails();
  };

  const handleLogout = () => {
    authApi.logoutClerk();
    navigate("/clerk/login");
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900 selection:bg-amber-500/20 selection:text-amber-900">
      {/* ── Clerk Top Navigation Bar ── */}
      <header className="bg-slate-950 text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-md backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Navigation */}
            <div className="flex items-center gap-6">
              <Link to="/clerk/cases" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg shadow-inner group-hover:scale-105 transition-transform duration-200">
                  ⚖️
                </div>
                <div>
                  <div className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                    <span>LegalEase</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/25">
                      Clerk Workspace
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium -mt-0.5 tracking-wide">
                    Legal Operations & Case Review
                  </div>
                </div>
              </Link>

              <div className="hidden md:block h-6 w-px bg-slate-800" />

              <nav className="hidden md:flex items-center gap-2">
                <Link
                  to="/clerk/cases"
                  className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                    location.pathname.startsWith("/clerk/cases")
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <span>📋</span>
                  <span>My Assigned Cases</span>
                  {caseCount !== undefined && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {caseCount}
                    </span>
                  )}
                </Link>
              </nav>
            </div>

            {/* Right: Clerk Profile & Actions */}
            <div className="flex items-center gap-2.5">
              {currentClerk && (
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="flex items-center gap-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 px-3 py-1.5 rounded-2xl shadow-inner transition-all group text-left cursor-pointer"
                  title="Click to view your personal details"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-extrabold flex items-center justify-center text-xs shadow-sm ring-2 ring-slate-950 group-hover:scale-105 transition-transform">
                      {currentClerk.name ? currentClerk.name[0].toUpperCase() : "C"}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full shadow-xs" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                      <span>{currentClerk.name}</span>
                      <span className="text-[10px] font-mono font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                        CRK{String(currentClerk.userId).padStart(3, "0")}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium group-hover:text-amber-300 transition-colors">
                      {currentClerk.department || "Legal Operations"} • <span className="underline decoration-dotted text-amber-400/80">Personal Details</span>
                    </div>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={openProfileModal}
                className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-2 rounded-xl transition-all shadow-xs"
                title="View your personal clerk profile details"
              >
                <span>👤</span>
                <span>My Details</span>
              </button>

              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-rose-950/40 hover:text-rose-200 px-3.5 py-2 rounded-xl border border-slate-800 hover:border-rose-900/50 transition-all flex items-center gap-1.5 shadow-xs"
                title="Sign out of Clerk Portal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>


      {/* ── Main Content Container ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title & Breadcrumb Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              <span>Legal Workspace</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">Assigned Casework</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-serif">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online</span>
            </div>
          </div>
        </div>

        {children}
      </main>

      {/* ── Corporate Clerk Footer ── */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-semibold text-slate-700">LegalEase Intelligent Legal Services</span>
            <span className="text-slate-300">•</span>
            <span>Clerk Operations Module</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Confidential Client Documentation System • Authorized Personnel Only
          </div>
        </div>
      </footer>
      {/* ── Clerk Personal Details Modal ── */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-fade-up">
            {/* Header banner */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white p-6 relative">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
                title="Close"
              >
                ×
              </button>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-slate-950/60">
                    {profileData?.fullName
                      ? profileData.fullName[0].toUpperCase()
                      : currentClerk?.name
                      ? currentClerk.name[0].toUpperCase()
                      : "C"}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 shadow-xs ${
                      (profileData ? profileData.isActive : true) ? "bg-emerald-400" : "bg-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {profileData?.fullName || currentClerk?.name || "Clerk Officer"}
                    </h2>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                      CRK{String(profileData?.clerkId || currentClerk?.userId || 1).padStart(3, "0")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 font-medium">
                    {profileData?.department || currentClerk?.department || "Legal Operations"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Staff Account
                    </span>
                    <span className="text-[11px] text-slate-400">• Role: Clerk</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Content Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Officer Personal & Employment Information
                </h3>
                <button
                  type="button"
                  onClick={fetchProfileDetails}
                  disabled={profileLoading}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Reload details"
                >
                  <span className={profileLoading ? "animate-spin" : ""}>🔄</span>
                  <span>{profileLoading ? "Refreshing..." : "Refresh"}</span>
                </button>
              </div>

              {profileError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>{profileError} (displaying cached session information)</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Full Official Name</span>
                  <div className="text-xs font-bold text-slate-900">
                    {profileData?.fullName || currentClerk?.name || "—"}
                  </div>
                </div>

                {/* Staff / Clerk ID */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Clerk System ID</span>
                  <div className="text-xs font-bold font-mono text-amber-700">
                    CRK{String(profileData?.clerkId || currentClerk?.userId || 1).padStart(3, "0")}
                  </div>
                </div>

                {/* Email / Username */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 sm:col-span-2">
                  <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Email / Login Username</span>
                  <div className="text-xs font-bold font-mono text-slate-900 flex items-center gap-1.5">
                    <span>✉</span>
                    <span>{profileData?.email || currentClerk?.email || "—"}</span>
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Contact Mobile / Phone</span>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>📱</span>
                    <span>{profileData?.contact || currentClerk?.contact || "—"}</span>
                  </div>
                </div>

                {/* Department */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Department / Division</span>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🏢</span>
                    <span>{profileData?.department || currentClerk?.department || "Legal Operations"}</span>
                  </div>
                </div>

                {/* Active Assignments Count */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Active Assigned Tasks</span>
                  <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <span>📋</span>
                    <span>
                      {profileData?.activeAssignmentsCount ?? caseCount ?? 0} active case(s)
                    </span>
                  </div>
                </div>

                {/* Account Status */}
                <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Employment Status</span>
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>{(profileData ? profileData.isActive : true) ? "Active & Authorized" : "Inactive"}</span>
                  </div>
                </div>

                {/* Registration Date */}
                {profileData?.createdAt && (
                  <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 sm:col-span-2">
                    <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Member Since / Registered</span>
                    <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                      <span>📅</span>
                      <span>{new Date(profileData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

