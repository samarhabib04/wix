import { Calendar, Zap, DollarSign, Star, Wrench, Clock } from 'lucide-react';
import { SectionHeadingAccent } from './SectionHeadingAccent';

export default function ValueProps() {
  const props = [
    {
      icon: Calendar,
      title: '30+ Years Experience',
      description: 'Family-run care since 1990',
    },
    {
      icon: Zap,
      title: 'Gas Safe Registered',
      description: 'Certified, insured engineers',
    },
    {
      icon: Wrench,
      title: 'British Gas Trained',
      description: 'Trained to expert standards',
    },
    {
      icon: DollarSign,
      title: 'Transparent Pricing',
      description: 'Clear quotes, no hidden fees',
    },
    {
      icon: Star,
      title: '5-Star Service',
      description: 'Trusted by local homeowners',
    },
    {
      icon: Clock,
      title: 'Same Day & Emergency',
      description: 'Rapid response when you need it',
    },
  ];

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 border-y border-purple-200/50 bg-gradient-to-b from-slate-100/95 via-purple-50/40 to-pink-50/30">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(88,28,135,0.1),transparent)]"
        aria-hidden
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-950 via-purple-800 to-slate-900">
            Why Choose JM Heating Services?
          </h2>
          <SectionHeadingAccent variant="brand" />
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Six reasons our customers trust us with their homes
          </p>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 list-none p-0 m-0">
          {props.map((prop, idx) => {
            const Icon = prop.icon;
            const num = String(idx + 1).padStart(2, '0');
            return (
              <li key={idx}>
                <article className="group h-full flex flex-col overflow-hidden rounded-2xl border-2 border-purple-200/70 bg-white/90 shadow-sm ring-1 ring-purple-100/50 backdrop-blur-sm transition duration-200 hover:border-pink-200/80 hover:shadow-lg hover:shadow-purple-900/10 hover:ring-pink-200/50">
                  <div
                    className="h-1 w-full bg-gradient-to-r from-purple-900 via-purple-700 to-pink-500 opacity-90 transition duration-200 group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-4 border-b border-purple-100/80 bg-gradient-to-br from-white via-purple-50/50 to-pink-50/30 px-6 pb-4 pt-6">
                    <div
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-purple-200/60 bg-gradient-to-br from-white to-purple-50/80 text-purple-800 shadow-sm transition duration-200 group-hover:border-pink-300/70 group-hover:from-pink-50/80 group-hover:to-fuchsia-50/60 group-hover:text-pink-600"
                      aria-hidden
                    >
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <span
                      className="select-none text-3xl font-extrabold leading-none text-purple-200/90 tabular-nums transition duration-200 group-hover:text-pink-200/90"
                      aria-hidden
                    >
                      {num}
                    </span>
                  </div>
                  <div className="flex-1 border-t border-purple-100/30 bg-gradient-to-b from-purple-50/20 to-white px-6 py-5">
                    <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-900 transition group-hover:text-purple-900">
                      {prop.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 group-hover:text-slate-700">
                      {prop.description}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
