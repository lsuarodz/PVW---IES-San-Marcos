export function getGroupColor(groupName: string): string {
  if (!groupName) return 'text-stone-600';
  
  const colors = [
    'text-red-600',
    'text-blue-600',
    'text-emerald-600',
    'text-purple-600',
    'text-orange-600',
    'text-pink-600',
    'text-teal-600',
    'text-indigo-600',
    'text-rose-600',
    'text-cyan-600'
  ];
  
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
