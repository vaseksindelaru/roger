
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MissionEvent {
  id: string;
  username: string;
  sector_id: string;
  timestamp: number;
}

const MissionFeed: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [events, setEvents] = useState<MissionEvent[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'MISSION_COMPLETE') {
        const newEvent: MissionEvent = {
          id: Math.random().toString(36).substr(2, 9),
          username: data.username,
          sector_id: data.sector_id,
          timestamp: Date.now()
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 5));
      }
    };

    return () => socket.close();
  }, []);

  return (
    <div className={`p-4 border-2 ${isDarkMode ? 'border-green-900 bg-black/50' : 'border-slate-200 bg-white/50'} rounded-lg backdrop-blur-sm`}>
      <h4 className="text-[8px] font-mystic text-green-700 uppercase mb-3 tracking-widest">Transmisiones de Flota</h4>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <div className="text-[8px] font-mono text-green-900 uppercase animate-pulse">Esperando señales...</div>
          ) : (
            events.map(event => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 text-[8px] font-mono"
              >
                <span className="text-green-500">[{new Date(event.timestamp).toLocaleTimeString()}]</span>
                <span className="text-green-400 font-bold">{event.username.toUpperCase()}</span>
                <span className="text-green-700">HA DESPEJADO EL SECTOR</span>
                <span className="text-green-500 font-mystic">{event.sector_id}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MissionFeed;
