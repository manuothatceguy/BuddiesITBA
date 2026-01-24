type StatItem = {
  value: string;
  label: string;
};

export function StatsSection({ stats }: { stats: StatItem[] }) {
  return (
    <section className="bg-background/80">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-surface px-6 py-8 text-center shadow-sm"
            >
              <p className="text-3xl font-heading font-bold text-primary">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

