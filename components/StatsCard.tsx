interface StatsCardProps {
  title: string;
  value: number;
  gradient: string;
}

export default function StatsCard({ title, value, gradient }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-r ${gradient} p-4 sm:p-6 rounded-lg text-white`}>
      <p className="text-xs sm:text-sm opacity-90">{title}</p>
      <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2">
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
