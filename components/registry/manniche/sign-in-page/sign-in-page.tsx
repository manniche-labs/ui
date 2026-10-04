// A split-screen sign-in page. "Sign in" and "Create account" share one form and swap with two radio buttons and :has(),
// and fields show their error state with :user-invalid, so it all works without JavaScript. Colours come from the theme tokens.
import { ArrowRight, Fingerprint, KeyRound, Mail, Star } from 'lucide-react'

function Logo({ className }: { className?: string }) {
  return (
    <a href="#top" className={`flex items-center gap-2 font-semibold tracking-tight ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <rect width="24" height="24" rx="7" className="fill-primary" />
        <path d="M6 15c3-2 9-2 12 0M6 10.5c3-2 9-2 12 0" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-primary-foreground" />
      </svg>
      Quayside
    </a>
  )
}

const field =
  'peer h-11 w-full rounded-xl border bg-card px-3.5 text-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-foreground/25 focus:border-ring focus:ring-4 focus:ring-ring/15 user-invalid:border-destructive user-invalid:ring-destructive/15'

/** Sign-in page: form with passkey, email link and password, a sign-up variant, and a brand panel with a customer quote. */
export function SignInPage() {
  return (
    <div id="top" className="group/auth grid min-h-dvh bg-background font-sans text-foreground antialiased lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <a href="#help" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Need help?
          </a>
        </div>

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <div className="transition-[opacity,translate] duration-500 ease-out-quint starting:translate-y-2 starting:opacity-0">
            <h1 className="text-3xl font-semibold tracking-tight">
              <span className="group-has-[[value=signup]:checked]/auth:hidden">Welcome back</span>
              <span className="hidden group-has-[[value=signup]:checked]/auth:inline">Open your shop</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              <span className="group-has-[[value=signup]:checked]/auth:hidden">Sign in to see today’s orders.</span>
              <span className="hidden group-has-[[value=signup]:checked]/auth:inline">14 days free. No card needed.</span>
            </p>

            <fieldset className="mt-8 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-medium">
              <legend className="sr-only">Choose</legend>
              {[
                ['signin', 'Sign in'],
                ['signup', 'Create account'],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-lg py-2 text-center text-muted-foreground transition-[background-color,color,box-shadow] duration-200 has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  <input type="radio" name="auth-mode" value={value} defaultChecked={value === 'signin'} className="sr-only" />
                  {label}
                </label>
              ))}
            </fieldset>

            <button
              type="button"
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-card text-sm font-medium transition-[background-color,scale] duration-150 ease-out hover:bg-muted active:scale-[0.98]"
            >
              <Fingerprint className="size-4 text-primary" aria-hidden />
              Continue with a passkey
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or with email
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" action="#">
              <div className="hidden space-y-1.5 group-has-[[value=signup]:checked]/auth:block">
                <label htmlFor="auth-shop" className="text-sm font-medium">
                  Shop name
                </label>
                <input id="auth-shop" name="shop" placeholder="Linden Homeware" className={field} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="auth-email" className="text-sm font-medium">
                  Email
                </label>
                <div className="relative">
                  <input id="auth-email" name="email" type="email" required autoComplete="email" placeholder="you@shop.com" className={`${field} pl-10`} />
                  <Mail
                    className="pointer-events-none absolute top-5.5 left-3.5 size-4 -translate-y-1/2 text-muted-foreground peer-focus:text-primary"
                    aria-hidden
                  />
                  <p className="mt-1.5 hidden text-xs text-destructive peer-user-invalid:block">Enter an email address like name@shop.com.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="text-sm font-medium">
                    Password
                  </label>
                  <a
                    href="#reset"
                    className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline group-has-[[value=signup]:checked]/auth:hidden"
                  >
                    Forgot it?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    placeholder="At least 8 characters"
                    className={`${field} pl-10`}
                  />
                  <KeyRound
                    className="pointer-events-none absolute top-5.5 left-3.5 size-4 -translate-y-1/2 text-muted-foreground peer-focus:text-primary"
                    aria-hidden
                  />
                  <p className="mt-1.5 hidden text-xs text-destructive peer-user-invalid:block">Use at least 8 characters.</p>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground group-has-[[value=signup]:checked]/auth:hidden">
                <input type="checkbox" name="remember" defaultChecked className="size-4 rounded accent-primary" />
                Keep me signed in on this device
              </label>
              <label className="hidden cursor-pointer items-start gap-2.5 text-sm text-muted-foreground group-has-[[value=signup]:checked]/auth:flex">
                <input type="checkbox" name="news" className="mt-0.5 size-4 rounded accent-primary" />
                Send me one email a month with tips for new shops
              </label>

              <button
                type="submit"
                className="group/submit flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-sm shadow-primary/30 transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-[0.98]"
              >
                <span className="group-has-[[value=signup]:checked]/auth:hidden">Sign in</span>
                <span className="hidden group-has-[[value=signup]:checked]/auth:inline">Create account</span>
                <ArrowRight className="size-4 transition-transform duration-200 group-hover/submit:translate-x-0.5" aria-hidden />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-pretty text-muted-foreground">
              By continuing you agree to the{' '}
              <a href="#terms" className="underline underline-offset-4 hover:text-foreground">
                terms
              </a>{' '}
              and the{' '}
              <a href="#privacy" className="underline underline-offset-4 hover:text-foreground">
                privacy notice
              </a>
              .
            </p>
          </div>
        </main>

        <p className="text-xs text-muted-foreground">© 2026 Quayside. A template from Manniche UI.</p>
      </div>

      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col">
        <svg aria-hidden className="absolute inset-0 size-full opacity-[0.12]">
          <defs>
            <pattern id="auth-waves" width="56" height="28" patternUnits="userSpaceOnUse">
              <path d="M0 14c14-10 28-10 28 0s14 10 28 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-waves)" />
        </svg>
        <div aria-hidden className="absolute -right-24 -bottom-24 size-96 rounded-full bg-primary-foreground/10 blur-2xl" />

        <div className="relative mt-auto max-w-lg">
          <ul className="mb-10 grid grid-cols-3 gap-3">
            {[
              ['4,000', 'shops'],
              ['€0', 'cut of sales'],
              ['2 min', 'to first sale'],
            ].map(([n, l]) => (
              <li
                key={l}
                className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur-sm transition-[opacity,translate] duration-700 ease-out-quint starting:translate-y-3 starting:opacity-0"
              >
                <p className="text-2xl font-semibold tracking-tight">{n}</p>
                <p className="text-sm text-primary-foreground/75">{l}</p>
              </li>
            ))}
          </ul>
          <figure>
            <span className="flex gap-0.5" aria-label="5 out of 5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-4 fill-current" aria-hidden />
              ))}
            </span>
            <blockquote className="mt-4 text-2xl leading-snug font-medium text-balance">
              “We moved our shop over on a Sunday and took the first order before dinner. The admin is the calmest software we use.”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-primary-foreground text-sm font-semibold text-primary">ER</span>
              <span>
                <span className="block font-medium">Ella Rasmussen</span>
                <span className="block text-sm text-primary-foreground/75">Owner, Saltwork Ceramics</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </aside>
    </div>
  )
}
