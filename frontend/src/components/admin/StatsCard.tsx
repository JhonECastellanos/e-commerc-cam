interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
}

export default function StatsCard({ title, value, icon, color = 'bg-primary-500' }: StatsCardProps) {
  return (
    <div className="card flex items-center space-x-4">
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-white text-xl`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
