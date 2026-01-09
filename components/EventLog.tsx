
import React from 'react';
import { GameEvent } from '../types';

interface EventLogProps {
  history: GameEvent[];
}

const EventLog: React.FC<EventLogProps> = ({ history }) => {
  return (
    <div className="space-y-4">
      {history.slice().reverse().map((event, idx) => (
        <div key={idx} className="relative pl-6 border-l-2 border-indigo-100 py-2">
          <div className="absolute left-[-9px] top-2 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white"></div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
              {event.age} 岁
            </span>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{event.description}</p>
          {event.effect && (
            <p className="text-xs text-indigo-500 mt-1 font-medium italic">
              影响: {event.effect}
            </p>
          )}
        </div>
      ))}
      {history.length === 0 && (
        <div className="text-center py-10 text-gray-400 italic text-sm">
          人生的卷轴尚未展开...
        </div>
      )}
    </div>
  );
};

export default EventLog;
