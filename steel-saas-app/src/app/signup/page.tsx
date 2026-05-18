import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../../lib/passwordHash";
import { signIn } from "../../lib/auth";
import { AuthError } from "next-auth";

// ── validation ────────────────────────────────────────────────────────────────

function validate(formData: FormData): { error: string } | null {
  const org      = (formData.get("orgName") as string)?.trim();
  const email    = (formData.get("email")   as string)?.trim();
  const password = formData.get("password") as string;
  const confirm  = formData.get("confirm")  as string;

  if (!org)               return { error: "Organisation name is required." };
  if (!email)             return { error: "Email is required." };
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };
  return null;
}

// ── server action ─────────────────────────────────────────────────────────────

async function signUpAction(formData: FormData) {
  "use server";

  const validationError = validate(formData);
  if (validationError) {
    redirect(`/signup?error=${encodeURIComponent(validationError.error)}`);
  }

  const orgName  = (formData.get("orgName")  as string).trim();
  const email    = (formData.get("email")    as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  // Check email not already taken
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("An account with that email already exists.")}`);
  }

  const passwordHash = await hashPassword(password);

  // Create org then user in a transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).$transaction(async (tx: any) => {
    const org = await tx.organization.create({
      data: {
        name: orgName,
        plan: "beta",
        status: "active",
        subscriptionStatus: "none",  // Stripe will set this to "active" via webhook
      },
    });
    await tx.user.create({
      data: {
        organizationId: org.id,
        email,
        passwordHash,
        role: "admin",
        status: "active",
      },
    });
  });

  // Sign in immediately after registration
  try {
    await signIn("credentials", { email, password, redirectTo: "/projects" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error; // NEXT_REDIRECT propagates
  }
}

// ── page ──────────────────────────────────────────────────────────────────────

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SignUpPage({ searchParams }: Props) {
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
          maxWidth: "420px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        }}
      >
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
          Create your account
        </h1>
        <p style={{ margin: "0 0 1.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#1d4ed8" }}>Sign in</Link>
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
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={signUpAction}>
          <Field id="orgName" label="Organisation name" type="text" placeholder="e.g. Acme Structural" required />
          <Field id="email"   label="Work email"        type="email" placeholder="you@firm.com" required />
          <Field id="password" label="Password" type="password" placeholder="At least 8 characters" required />
          <Field id="confirm"  label="Confirm password" type="password" placeholder="Repeat password" required />

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
              marginTop: "0.5rem",
            }}
          >
            Create account
          </button>
        </form>

        <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#9ca3af", textAlign: "center" }}>
          Your organisation starts on the beta plan. A subscription is required to run calculations.
        </p>
      </div>
    </main>
  );
}

function Field({
  id, label, type, placeholder, required,
}: {
  id: string; label: string; type: string; placeholder: string; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label
        htmlFor={id}
        style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        style={{
          display: "block",
          width: "100%",
          padding: "0.5rem 0.75rem",
          border: "1px solid #d1d5db",
          borderRadius: "4px",
          fontSize: "1rem",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
