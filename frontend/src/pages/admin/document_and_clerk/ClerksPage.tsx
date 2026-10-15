import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { clerksApi, type Clerk, type CreateClerkData } from "../../../api/clerksApi";

// Format numeric clerk ID → CRK001, CRK002, …
const formatClerkId = (id: string | number) =>
  `CRK${String(id).padStart(3, "0")}`;

export const ClerksPage: React.FC = () => {
  const [clerks, setClerks] = useState<Clerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Clerk Modal State & Form Validation
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateClerkData>({
    name: "",
    email: "",
    password: "",
    contact: "",
    department: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setFormData({ name: "", email: "", password: "", contact: "", department: "" });
    setFormErrors({});
    setTouched({});
    setModalError(null);
    setShowPassword(false);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormErrors({});
    setTouched({});
    setModalError(null);
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "name": {
        const trimmed = value.trim();
        if (!trimmed) return "Clerk full name is required.";
        if (trimmed.length < 2) return "Full name must be at least 2 characters.";
        if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
          return "Name can only contain letters, spaces, dots, and hyphens.";
        }
        return "";
      }
      case "email": {
        const trimmed = value.trim();
        if (!trimmed) return "Username / email address is required.";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(trimmed)) {
          return "Please enter a valid email address (e.g. priyantha@lexintelligence.com).";
        }
        return "";
      }
      case "password": {
        if (!value) return "Password is required.";
        if (value.length < 6) return "Password must be at least 6 characters long.";
        if (value.length > 50) return "Password cannot exceed 50 characters.";
        return "";
      }
      case "department": {
        const trimmed = value.trim();
        if (!trimmed) return "Department is required.";
        if (trimmed.length < 2) return "Department must be at least 2 characters.";
        return "";
      }
      case "contact": {
        const trimmed = value.trim();
        if (!trimmed) return "Contact phone / mobile number is required.";
        const digitsOnly = trimmed.replace(/\D/g, "");
        if (digitsOnly.length < 9 || digitsOnly.length > 15) {
          return "Mobile number must contain between 9 and 15 digits.";
        }
        // Disallow repeated dummy digits (e.g., 2222222222, 0000000000, 1111111111)
        if (/^(\d)\1+$/.test(digitsOnly)) {
          return "Please enter a valid mobile number, not repeated digits.";
        }
        // Sri Lankan mobile (07X XXX XXXX), Sri Lankan general phone (0XX XXX XXXX), or international format (+XX XXX XXXXX)
        const slMobileRegex = /^(?:\+94\s?|0)7[0-8][\s-]?\d{3}[\s-]?\d{4}$/;
        const slGeneralPhoneRegex = /^(?:\+94\s?|0)(?:7[0-8]|11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67)[\s-]?\d{3}[\s-]?\d{4}$/;
        const intlPhoneRegex = /^\+[1-9]\d{0,3}[\s-]?\(?\d{1,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,9}$/;

        if (!slMobileRegex.test(trimmed) && !slGeneralPhoneRegex.test(trimmed) && !intlPhoneRegex.test(trimmed)) {
          return "Please enter a valid mobile number (e.g. 077 123 4567 or +94 77 123 4567).";
        }
        return "";
      }
      default:
        return "";
    }
  };

  const validateAll = (data: CreateClerkData): Record<string, string> => {
    const errors: Record<string, string> = {};
    const fields: (keyof CreateClerkData)[] = ["name", "email", "password", "department", "contact"];
    fields.forEach((f) => {
      const err = validateField(f, data[f]);
      if (err) errors[f] = err;
    });
    return errors;
  };

  const handleInputChange = (field: keyof CreateClerkData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setModalError(null);
    if (touched[field]) {
      const err = validateField(field, value);
      setFormErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleInputBlur = (field: keyof CreateClerkData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setFormErrors((prev) => ({ ...prev, [field]: err }));
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", barClass: "w-0 bg-transparent", textClass: "" };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 2) {
      return { score, label: "Weak", barClass: "w-1/3 bg-rose-500", textClass: "text-rose-600" };
    } else if (score <= 3) {
      return { score, label: "Medium", barClass: "w-2/3 bg-amber-500", textClass: "text-amber-600" };
    } else {
      return { score, label: "Strong", barClass: "w-full bg-emerald-500", textClass: "text-emerald-600" };
    }
  };

  const getInputClass = (field: keyof CreateClerkData, extraClass = "") => {
    const hasError = touched[field] && formErrors[field];
    const isValid = touched[field] && !formErrors[field] && formData[field].trim().length > 0;

    let borderClass = "border-slate-300 focus:ring-amber-500 focus:border-amber-500";
    if (hasError) {
      borderClass = "border-rose-400 bg-rose-50/20 focus:ring-rose-400 focus:border-rose-400";
    } else if (isValid) {
      borderClass = "border-emerald-400 focus:ring-emerald-400 focus:border-emerald-400";
    }

    return `w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${borderClass} ${extraClass}`;
  };

  const renderFieldError = (field: keyof CreateClerkData) => {
    if (touched[field] && formErrors[field]) {
      return (
        <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium animate-fade-in">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {formErrors[field]}
        </p>
      );
    }
    return null;
  };

  // Confirmation Modal State for Activate / Deactivate
  const [confirmClerk, setConfirmClerk] = useState<Clerk | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Edit Clerk Modal State & Form Validation
  const [editingClerk, setEditingClerk] = useState<Clerk | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    email: string;
    password: string;
    contact: string;
    department: string;
    isActive: boolean;
  }>({
    name: "",
    email: "",
    password: "",
    contact: "",
    department: "",
    isActive: true,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete Clerk Modal State
  const [deletingClerk, setDeletingClerk] = useState<Clerk | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openEditModal = (clerk: Clerk) => {
    setEditingClerk(clerk);
    setEditFormData({
      name: clerk.fullName || "",
      email: clerk.email || "",
      password: "",
      contact: clerk.contact || "",
      department: clerk.department || "",
      isActive: clerk.isActive,
    });
    setEditErrors({});
    setEditTouched({});
    setEditModalError(null);
    setShowEditPassword(false);
  };

  const closeEditModal = () => {
    setEditingClerk(null);
    setEditErrors({});
    setEditTouched({});
    setEditModalError(null);
  };

  const handleEditInputChange = (field: string, value: any) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    setEditModalError(null);
    if (editTouched[field]) {
      const err = field === "password" && !value ? "" : validateField(field, value);
      setEditErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleEditInputBlur = (field: string) => {
    setEditTouched((prev) => ({ ...prev, [field]: true }));
    const val = (editFormData as any)[field];
    const err = field === "password" && !val ? "" : validateField(field, val);
    setEditErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClerk) return;

    const allTouched: Record<string, boolean> = {
      name: true,
      email: true,
      department: true,
      contact: true,
    };
    if (editFormData.password) {
      allTouched.password = true;
    }
    setEditTouched(allTouched);

    const errors: Record<string, string> = {};
    const nameErr = validateField("name", editFormData.name);
    if (nameErr) errors.name = nameErr;
    const emailErr = validateField("email", editFormData.email);
    if (emailErr) errors.email = emailErr;
    const deptErr = validateField("department", editFormData.department);
    if (deptErr) errors.department = deptErr;
    const contactErr = validateField("contact", editFormData.contact);
    if (contactErr) errors.contact = contactErr;
    if (editFormData.password) {
      const pwdErr = validateField("password", editFormData.password);
      if (pwdErr) errors.password = pwdErr;
    }

    setEditErrors(errors);

    if (Object.keys(errors).length > 0) {
      setEditModalError("Please correct the errors highlighted below before saving.");
      return;
    }

    try {
      setEditSaving(true);
      setEditModalError(null);
      const payload: any = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        contact: editFormData.contact.trim(),
        department: editFormData.department.trim(),
        isActive: editFormData.isActive,
      };
      if (editFormData.password && editFormData.password.trim().length > 0) {
        payload.password = editFormData.password.trim();
      }

      const updated = await clerksApi.update(editingClerk.clerkId, payload);
      closeEditModal();
      setSuccessMessage(`Clerk "${updated.fullName}" updated successfully.`);
      await fetchClerks();
    } catch (err: any) {
      setEditModalError(err.response?.data?.message || err.message || "Failed to update clerk details");
    } finally {
      setEditSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClerk) return;
    try {
      setDeleteLoading(true);
      await clerksApi.delete(deletingClerk.clerkId);
      setSuccessMessage(`Clerk "${deletingClerk.fullName}" has been permanently deleted.`);
      setDeletingClerk(null);
      await fetchClerks();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to delete clerk");
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchClerks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clerksApi.getAll();
      setClerks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load clerks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClerks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all inputs as touched
    const allTouched: Record<string, boolean> = {
      name: true,
      email: true,
      password: true,
      department: true,
      contact: true,
    };
    setTouched(allTouched);

    const errors = validateAll(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setModalError("Please correct the errors highlighted below before submitting.");
      return;
    }

    try {
      setSaving(true);
      setModalError(null);
      const created = await clerksApi.create(formData);
      closeAddModal();
      setSuccessMessage(`Clerk "${created.fullName}" registered successfully with username/email: ${created.email || formData.email}`);
      await fetchClerks();
    } catch (err: any) {
      setModalError(err.response?.data?.message || err.message || "Failed to create clerk");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmClerk) return;
    try {
      setStatusLoading(true);
      await clerksApi.toggleStatus(confirmClerk.clerkId);
      const actionName = confirmClerk.isActive ? "deactivated" : "activated";
      setSuccessMessage(`Clerk "${confirmClerk.fullName}" has been ${actionName} successfully.`);
      setConfirmClerk(null);
      await fetchClerks();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to update clerk status");
    } finally {
      setStatusLoading(false);
    }
  };


  return (
    <AdminLayout
      title="Clerk Management"
      subtitle="Monitor clerk availability, workload distribution, and documentation task assignments."
    >
      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-3 text-sm text-slate-600">
          <span className="bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm font-medium">
            Total Clerks: <strong className="text-slate-900">{clerks.length}</strong>
          </span>
          <span className="bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm font-medium">
            Active: <strong className="text-emerald-600">{clerks.filter((c) => c.isActive).length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchClerks()}
            disabled={loading}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            title="Refresh list"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Register New Clerk</span>
          </button>
        </div>
      </div>

      {/* Success state */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs">✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-950 text-base font-bold px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6 text-sm flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => fetchClerks()}
            className="ml-4 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading clerk records...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-3">Clerk ID</th>
                <th className="px-6 py-3">Clerk / Username</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Active Tasks</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clerks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No clerks found. Click "Register New Clerk" to add one.
                  </td>
                </tr>
              ) : (
                clerks.map((clerk) => (
                  <tr key={clerk.clerkId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {formatClerkId(clerk.clerkId)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{clerk.fullName || "Unnamed Clerk"}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400">✉</span>
                        <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                          {clerk.email || "No email"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{clerk.department}</td>
                    <td className="px-6 py-4 text-slate-600">{clerk.contact}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {clerk.activeAssignmentsCount} tasks
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {clerk.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/documentation-requests?clerkId=${clerk.clerkId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                          title="View assigned cases"
                        >
                          📋 Cases ({clerk.activeAssignmentsCount})
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(clerk)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs cursor-pointer"
                          title="Edit Clerk Details"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClerk(clerk)}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors shadow-2xs cursor-pointer ${
                            clerk.isActive
                              ? "text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200"
                              : "text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                          }`}
                          title={clerk.isActive ? "Deactivate clerk account" : "Activate clerk account"}
                        >
                          {clerk.isActive ? "⏸️ Deactivate" : "▶️ Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingClerk(clerk)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs cursor-pointer"
                          title="Permanently delete clerk account"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

            </tbody>
          </table>
        </div>
      )}

      {/* Add Clerk Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register New Clerk</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set clerk details and configure login credentials (username & password).
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg px-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Error Banner */}
            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-fade-in mb-4">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="flex-1 font-medium">{modalError}</span>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="text-rose-400 hover:text-rose-700 font-bold px-1"
                >
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleCreate} noValidate className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clerk Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priyantha Silva"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={() => handleInputBlur("name")}
                  className={getInputClass("name")}
                />
                {renderFieldError("name")}
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username / Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. priyantha@lexintelligence.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => handleInputBlur("email")}
                  className={getInputClass("email", "font-mono")}
                />
                {renderFieldError("email")}
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 This email serves as the username the clerk will use to log into the system.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password (minimum 6 characters)"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    onBlur={() => handleInputBlur("password")}
                    className={getInputClass("password", "font-mono pr-16")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {renderFieldError("password")}

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Password strength:</span>
                      <span className={`font-semibold ${getPasswordStrength(formData.password).textClass}`}>
                        {getPasswordStrength(formData.password).label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength(formData.password).barClass}`} />
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 mt-1">
                  🔒 Provide this password and email to the clerk for accessing their dashboard.
                </p>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="departments-list"
                  placeholder="e.g. Corporate Registration, Property, Power of Attorney"
                  value={formData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  onBlur={() => handleInputBlur("department")}
                  className={getInputClass("department")}
                />
                {renderFieldError("department")}
                <datalist id="departments-list">
                  <option value="Property" />
                  <option value="Corporate" />
                  <option value="Corporate Registration & Documentation" />
                  <option value="Power of Attorney" />
                  <option value="Legal Operations" />
                  <option value="Notarial & Attestation" />
                </datalist>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone / Mobile <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +94 77 123 4567 or 0771234567"
                  value={formData.contact}
                  onChange={(e) => handleInputChange("contact", e.target.value)}
                  onBlur={() => handleInputBlur("contact")}
                  className={getInputClass("contact")}
                />
                {renderFieldError("contact")}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{saving ? "Registering…" : "Register Clerk & Create Credentials"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal Popup for Activate / Deactivate */}
      {confirmClerk && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fade-up">
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  confirmClerk.isActive
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {confirmClerk.isActive ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmClerk.isActive ? "Deactivate Clerk Account?" : "Activate Clerk Account?"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to {confirmClerk.isActive ? "deactivate" : "activate"}{" "}
                  <strong className="text-slate-800">{confirmClerk.fullName}</strong> ({formatClerkId(confirmClerk.clerkId)})?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-600 border border-slate-200 mb-4 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-slate-800">{confirmClerk.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Username / Email:</span>
                <span className="font-mono text-slate-800">{confirmClerk.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className={`font-semibold ${confirmClerk.isActive ? "text-emerald-600" : "text-slate-500"}`}>
                  {confirmClerk.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {confirmClerk.isActive && confirmClerk.activeAssignmentsCount > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-medium">
                <span>⚠️</span>
                <span>
                  This clerk currently has <strong>{confirmClerk.activeAssignmentsCount}</strong> active assigned case(s).
                </span>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-5">
              {confirmClerk.isActive
                ? "Deactivating will immediately prevent this clerk from logging into the platform or receiving new case assignments."
                : "Activating will restore login privileges and allow this clerk to be assigned client documentation cases."}
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={statusLoading}
                onClick={() => setConfirmClerk(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusLoading}
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5 ${
                  confirmClerk.isActive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {statusLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>{confirmClerk.isActive ? "Yes, Deactivate" : "Yes, Activate"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Clerk Modal */}
      {editingClerk && (

        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Clerk Details: {formatClerkId(editingClerk.clerkId)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update contact information, assigned department, username, status, or set a new password.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Error Banner */}
            {editModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-fade-in mb-4">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="flex-1 font-medium">{editModalError}</span>
                <button
                  type="button"
                  onClick={() => setEditModalError(null)}
                  className="text-rose-400 hover:text-rose-700 font-bold px-1"
                >
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleUpdate} noValidate className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clerk Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Priyantha Silva"
                  value={editFormData.name}
                  onChange={(e) => handleEditInputChange("name", e.target.value)}
                  onBlur={() => handleEditInputBlur("name")}
                  className={`w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    editTouched.name && editErrors.name
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400 focus:border-rose-400"
                      : "border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                  }`}
                />
                {editTouched.name && editErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{editErrors.name}</p>
                )}
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username / Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="clerk.username@legal.lk"
                  value={editFormData.email}
                  onChange={(e) => handleEditInputChange("email", e.target.value)}
                  onBlur={() => handleEditInputBlur("email")}
                  className={`w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    editTouched.email && editErrors.email
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400 focus:border-rose-400"
                      : "border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                  }`}
                />
                {editTouched.email && editErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{editErrors.email}</p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Division <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Documentation & Verification"
                  value={editFormData.department}
                  onChange={(e) => handleEditInputChange("department", e.target.value)}
                  onBlur={() => handleEditInputBlur("department")}
                  className={`w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    editTouched.department && editErrors.department
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400 focus:border-rose-400"
                      : "border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                  }`}
                />
                {editTouched.department && editErrors.department && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{editErrors.department}</p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Mobile / Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 077 123 4567 or +94 77 123 4567"
                  value={editFormData.contact}
                  onChange={(e) => handleEditInputChange("contact", e.target.value)}
                  onBlur={() => handleEditInputBlur("contact")}
                  className={`w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    editTouched.contact && editErrors.contact
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400 focus:border-rose-400"
                      : "border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                  }`}
                />
                {editTouched.contact && editErrors.contact ? (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{editErrors.contact}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Valid formats: Sri Lankan mobile (07X...), landline (011...), or international (+94...)
                  </p>
                )}
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Status
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={editFormData.isActive === true}
                      onChange={() => handleEditInputChange("isActive", true)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-emerald-700 font-semibold">Active</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={editFormData.isActive === false}
                      onChange={() => handleEditInputChange("isActive", false)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-500">Inactive / Deactivated</span>
                  </label>
                </div>
              </div>

              {/* Optional New Password */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Reset Login Password <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="text-[11px] text-amber-600 hover:text-amber-800 font-medium transition-colors"
                  >
                    {showEditPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showEditPassword ? "text" : "password"}
                  placeholder="Leave blank to keep current password"
                  value={editFormData.password}
                  onChange={(e) => handleEditInputChange("password", e.target.value)}
                  onBlur={() => handleEditInputBlur("password")}
                  className={`w-full text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    editTouched.password && editErrors.password
                      ? "border-rose-400 bg-rose-50/20 focus:ring-rose-400 focus:border-rose-400"
                      : "border-slate-300 focus:ring-amber-500 focus:border-amber-500"
                  }`}
                />
                {editTouched.password && editErrors.password ? (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{editErrors.password}</p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Only enter a new password if you want to reset this clerk's login password.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {editSaving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Clerk Confirmation Modal */}
      {deletingClerk && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fade-up">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Permanently Delete Clerk?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to delete <strong className="text-slate-800">{deletingClerk.fullName}</strong> ({formatClerkId(deletingClerk.clerkId)})?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-600 border border-slate-200 mb-4 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-slate-800">{deletingClerk.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Username / Email:</span>
                <span className="font-mono text-slate-800">{deletingClerk.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contact:</span>
                <span className="text-slate-800">{deletingClerk.contact}</span>
              </div>
            </div>

            {deletingClerk.activeAssignmentsCount > 0 && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <span className="text-base shrink-0 mt-0.5">⚠️</span>
                <span>
                  This clerk currently has <strong>{deletingClerk.activeAssignmentsCount}</strong> active assigned documentation case(s). Deleting this clerk will automatically unassign these cases so they can be reassigned to other clerks.
                </span>
              </div>
            )}

            <p className="text-xs text-rose-600 font-medium mb-5 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
              Notice: This action is irreversible. The clerk profile, associated user credentials, and role permissions will be permanently removed.
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeletingClerk(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>

  );
};
