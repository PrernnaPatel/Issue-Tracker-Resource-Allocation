const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const resolveUserByEmail = async (email) => {
  const params = new URLSearchParams({ email: email.trim().toLowerCase() });
  const response = await fetch(`${API_BASE}/api/auth/resolve-user?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to resolve user.");
  }

  return data;
};
