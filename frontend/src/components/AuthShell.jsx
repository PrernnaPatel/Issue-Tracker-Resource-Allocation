import LoginVector from "../admin/assets/login.png";

const AuthShell = ({
  title,
  subtitle,
  children,
  footer,
  contentAlign = "center",
}) => {
  const sectionAlignment =
    contentAlign === "start"
      ? "items-start justify-start"
      : "items-center justify-center";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff_0%,#f8fafc_35%,#eef2ff_100%)]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-700">Unified Access</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">Issue Resolution Portal</h1>
          </div> */}
          {/* <p className="hidden text-sm text-slate-500 md:block">
            One sign-in experience for administrators, engineers, and users
          </p> */}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-10 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.14)]">
          <div className="grid min-h-[720px] lg:grid-cols-[1.03fr_1fr]">
            <section className={`flex bg-white px-6 py-10 sm:px-10 lg:px-12 ${sectionAlignment}`}>
              <div className="w-full max-w-xl">
                {title ? (
                  <h2 className="text-4xl font-semibold tracking-tight text-blue-700">{title}</h2>
                ) : null}
                {subtitle ? (
                  <p className="mt-4 text-base leading-8 text-slate-600">{subtitle}</p>
                ) : null}
                <div className={title || subtitle ? "mt-10" : ""}>{children}</div>
                {footer ? <div className="mt-10 border-t border-slate-200 pt-6">{footer}</div> : null}
              </div>
            </section>

            <section className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#0b4a7a_0%,#173f72_45%,#4038d6_100%)] lg:flex">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.18),transparent_28%)]" />
              <div className="relative z-10 flex w-full flex-col items-center justify-center px-12 text-center text-white">
                <img
                  src={LoginVector}
                  alt="Login illustration"
                  className="h-72 w-full max-w-md object-contain drop-shadow-[0_18px_38px_rgba(15,23,42,0.28)]"
                />
                <h3 className="mt-6 text-5xl font-semibold tracking-tight">Login</h3>
                <p className="mt-6 max-w-xl text-lg leading-9 text-blue-50/90">
                  A focused workspace where every request stays visible, every assignment stays accountable, and every update moves work forward.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
