import type { Accommodation } from '../../types/accommodation'

interface CategoryFilterProps {
  grouped: {
    hostel: Accommodation[]
    camping: Accommodation[]
    youth_movement: Accommodation[]
  }
  activeFilter: 'all' | 'hostel' | 'camping' | 'youth_movement'
  onFilterChange: (filter: 'all' | 'hostel' | 'camping' | 'youth_movement') => void
}

export default function CategoryFilter({ grouped, activeFilter, onFilterChange }: CategoryFilterProps) {
  const categories = [
    {
      id: 'all' as const,
      label: 'Alles',
      count: grouped.hostel.length + grouped.camping.length + grouped.youth_movement.length,
      icon: 'list',
    },
    {
      id: 'hostel' as const,
      label: 'Jeugdherbergen',
      count: grouped.hostel.length,
      icon: 'hotel',
    },
    {
      id: 'camping' as const,
      label: 'Campings',
      count: grouped.camping.length,
      icon: 'camping',
    },
    {
      id: 'youth_movement' as const,
      label: 'Jeugdbewegingen',
      count: grouped.youth_movement.length,
      icon: 'groups',
    },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onFilterChange(category.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            activeFilter === category.id
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-white dark:bg-background-dark border-[#dbe0e6] dark:border-gray-700 text-[#111418] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {category.icon}
          </span>
          <span className="text-sm font-semibold">{category.label}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeFilter === category.id
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-[#617589] dark:text-gray-400'
            }`}
          >
            {category.count}
          </span>
        </button>
      ))}
    </div>
  )
}

