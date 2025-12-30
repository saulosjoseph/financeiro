interface StatsCardProps {
  title: string;
  value: number;
  gradient: string;
  breakdown?: {
    label: string;
    value: number;
  }[];
}

export default function StatsCard({ title, value, gradient, breakdown }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-r ${gradient} p-4 sm:p-6 rounded-lg text-white`}>
      <p className="text-xs sm:text-sm opacity-90">{title}</p>
      <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
      {breakdown && breakdown.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
          {breakdown.map((item, index) => (
            <div key={index} className="flex justify-between text-xs opacity-80">
              <span>{item.label}:</span>
              <span>R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
