import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "../../lib/auth";

async function loginAction(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/projects",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Auth failure — bounce back with error flag
      redirect("/login?error=1");
    }
    // NEXT_REDIRECT (successful sign-in) or unexpected error — propagate
    throw error;
  }
}

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2.5rem",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        }}
      >
        <h1
          style={{
            margin: "0 0 0.25rem",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          Steel SaaS
        </h1>
        <p style={{ margin: "0 0 2rem", fontSize: "0.875rem", color: "#6b7280" }}>
          Sign in to your account
        </p>

        {error && (
          <p
            role="alert"
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              color: "#dc2626",
              borderRadius: "4px",
              padding: "0.625rem 0.75rem",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
            }}
          >
            Invalid email or password. Please try again.
          </p>
        )}

        <form action={loginAction}>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#374151",
              marginBottom: "0.25rem",
            }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{
              display: "block",
              width: "100%",
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "1rem",
              marginBottom: "1rem",
              boxSizing: "border-box",
            }}
          />

          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#374151",
              marginBottom: "0.25rem",
            }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{
              display: "block",
              width: "100%",
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "1rem",
              marginBottom: "1.5rem",
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            style={{
              display: "block",
              width: "100%",
              padding: "0.625rem",
              background: "#1d4ed8",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
