import { Brain } from 'lucide-react';

const MemoryIndicator = () => {
  return (
    <div className="flex items-center gap-2 text-purple-400 text-sm mb-2">
      <Brain className="animate-pulse" size={16} />
      <span>Extracting memories...</span>
    </div>
  );
};

export default MemoryIndicator;
