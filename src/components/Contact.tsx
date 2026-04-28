import { useState } from 'react';
import {
  ChevronDown,
  Clock,
  Mail,
  MessageCircleHeart,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SectionHeadingAccent } from './SectionHeadingAccent';

const CONTACT_EMAIL = 'jmheatingservices@hotmail.com';

const SERVICE_OPTIONS = [
  { value: 'general', label: 'General enquiry / not sure' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'heating', label: 'Heating' },
  { value: 'gas', label: 'Gas' },
  { value: 'renewable', label: 'Renewable heating / heat pumps' },
  { value: 'air-conditioning', label: 'Air conditioning' },
  { value: 'emergency', label: 'Emergency / urgent' },
  { value: 'other', label: 'Other' },
];

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('general');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    const interest =
      SERVICE_OPTIONS.find((o) => o.value === service)?.label ?? 'General enquiry';
    const subject = `Enquiry — JM Heating Services (${interest})`;
    const body = [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      `Phone: ${phone.trim() || '—'}`,
      `Interest: ${interest}`,
      '',
      'Message:',
      message.trim(),
    ].join('\n');

    const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    window.setTimeout(() => setPending(false), 1500);
  };

  return (
    <section
      id="contact"
      className="relative scroll-mt-20 py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-white via-purple-50/40 to-pink-50/30"
    >
      <div
        className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-purple-600/15 blur-3xl"
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-white/80 px-4 py-1.5 text-sm font-semibold text-purple-800 shadow-sm backdrop-blur-sm mb-5">
            <Sparkles className="h-4 w-4 text-pink-500" aria-hidden />
            Free quotes · No obligation
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-950 via-purple-800 to-slate-900">
            Get in touch
          </h2>
          <SectionHeadingAccent variant="brand" />
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Tell us what you need — we’ll reply as soon as we can. For urgent issues, call us
            on{' '}
            <a
              href="tel:07707080781"
              className="font-semibold text-pink-600 hover:text-pink-700 underline decoration-pink-300 underline-offset-2"
            >
              07707 080 781
            </a>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between gap-8">
            <div className="rounded-3xl border border-purple-100/80 bg-gradient-to-br from-white via-purple-50/50 to-pink-50/40 p-8 sm:p-10 shadow-xl shadow-purple-900/5 ring-1 ring-purple-100">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-700 to-pink-500 text-white shadow-lg shadow-purple-900/25 mb-6">
                <MessageCircleHeart className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                We’re here to help
              </h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                Gas Safe registered engineers covering South Cheshire, Staffordshire & Shropshire.
                Whether it’s a quick question or a full project, send a message and we’ll take it
                from there.
              </p>

              <ul className="space-y-4">
                <li>
                  <a
                    href="tel:07707080781"
                    className="group flex items-start gap-4 rounded-2xl border border-transparent bg-white/70 p-4 transition hover:border-pink-200 hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-500 text-white shadow-md group-hover:scale-105 transition">
                      <Phone className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Call 24/7
                      </span>
                      <span className="text-lg font-bold text-slate-900">07707 080 781</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="group flex items-start gap-4 rounded-2xl border border-transparent bg-white/70 p-4 transition hover:border-purple-200 hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white shadow-md group-hover:scale-105 transition">
                      <Mail className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 break-all">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </span>
                      <span className="text-base font-bold text-slate-900">{CONTACT_EMAIL}</span>
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 rounded-2xl bg-white/60 p-4 border border-purple-100/80">
                  <Clock className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Typical reply:</span> within one
                    working day for form messages.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-green-200/80 bg-green-50/80 px-5 py-4 text-green-900">
              <ShieldCheck className="h-10 w-10 shrink-0 text-green-600" />
              <p className="text-sm leading-snug">
                <span className="font-bold">Gas Safe registered.</span> We only use your details
                to respond to your enquiry.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              className="relative rounded-3xl border-2 border-purple-100 bg-white p-8 sm:p-10 shadow-2xl shadow-purple-950/10 ring-1 ring-purple-50"
            >
              <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-purple-200/40 via-transparent to-pink-200/40 opacity-60 pointer-events-none -z-10 blur-sm" aria-hidden />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="contact-name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Your name <span className="text-pink-600">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full rounded-xl border border-purple-100 bg-slate-50/50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-inner transition focus:border-pink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/35"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email <span className="text-pink-600">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-purple-100 bg-slate-50/50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-inner transition focus:border-pink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/35"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07700 900 123"
                    className="w-full rounded-xl border border-purple-100 bg-slate-50/50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-inner transition focus:border-pink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/35"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="contact-service" className="block text-sm font-semibold text-slate-700 mb-2">
                    I’m interested in
                  </label>
                  <div className="relative">
                    <select
                      id="contact-service"
                      name="service"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-purple-100 bg-slate-50/50 px-4 py-3.5 pr-11 text-slate-900 shadow-inner transition focus:border-pink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/35"
                    >
                      {SERVICE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-700 mb-2">
                    Your message <span className="text-pink-600">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the job, your address area, and any times that suit you."
                    className="w-full resize-y min-h-[140px] rounded-xl border border-purple-100 bg-slate-50/50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-inner transition focus:border-pink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400/35"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="group mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-purple-700 via-purple-600 to-pink-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-purple-900/25 transition hover:shadow-xl hover:shadow-pink-500/20 hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 disabled:opacity-70"
              >
                {pending ? (
                  <>Opening email…</>
                ) : (
                  <>
                    <Send className="h-5 w-5 transition group-hover:translate-x-0.5" />
                    Send message
                  </>
                )}
              </button>

              <p className="mt-5 text-center text-xs text-slate-500 leading-relaxed">
                Submitting opens your email app with your message filled in — you can edit before
                sending.{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-600 font-medium hover:underline">
                  Email us directly
                </a>{' '}
                if you prefer.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
