
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { soundManager } from '../services/SoundManager';

interface Sector {
  id: string;
  name: string;
  x: number;
  y: number;
  difficulty: number;
  image?: string;
}

interface SectorMapProps {
  completedSectors: string[];
  onSelectSector: (sector: Sector) => void;
  isDarkMode: boolean;
}

// Pre-generated pixel art images for sectors (SVG data URLs)
const SECTOR_IMAGES: Record<string, string> = {
  'S1': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%230a0a1a' width='64' height='64'/%3E%3Ccircle cx='32' cy='32' r='20' fill='%231a3a5a' opacity='0.5'/%3E%3Ccircle cx='25' cy='28' r='8' fill='%232a5a8a' opacity='0.3'/%3E%3Ccircle cx='40' cy='35' r='6' fill='%233a7aba' opacity='0.2'/%3E%3Ccircle cx='15' cy='15' r='1' fill='%23fff'/%3E%3Ccircle cx='50' cy='20' r='1' fill='%23fff'/%3E%3Ccircle cx='45' cy='50' r='1' fill='%23fff'/%3E%3Ccircle cx='10' cy='45' r='1' fill='%23fff'/%3E%3C/svg%3E",
  'S2': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%230a0a1a' width='64' height='64'/%3E%3Cpolygon points='10,30 15,20 20,30' fill='%234a4a4a'/%3E%3Cpolygon points='30,40 38,25 46,40' fill='%235a5a5a'/%3E%3Cpolygon points='50,35 55,28 60,35' fill='%233a3a3a'/%3E%3Ccircle cx='15' cy='15' r='1' fill='%23fff'/%3E%3Ccircle cx='45' cy='10' r='1' fill='%23fff'/%3E%3Ccircle cx='55' cy='55' r='1' fill='%23fff'/%3E%3C/svg%3E",
  'S3': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%230a0a1a' width='64' height='64'/%3E%3Ccircle cx='32' cy='32' r='15' fill='%23000'/%3E%3Ccircle cx='32' cy='32' r='20' fill='none' stroke='%23ff6600' stroke-width='2' opacity='0.5'/%3E%3Ccircle cx='32' cy='32' r='25' fill='none' stroke='%23ff9900' stroke-width='1' opacity='0.3'/%3E%3Ccircle cx='10' cy='10' r='1' fill='%23fff'/%3E%3Ccircle cx='55' cy='15' r='1' fill='%23fff'/%3E%3Ccircle cx='50' cy='55' r='1' fill='%23fff'/%3E%3C/svg%3E",
  'S4': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%230a0a1a' width='64' height='64'/%3E%3Cellipse cx='32' cy='40' rx='25' ry='15' fill='%232a4a2a'/%3E%3Cellipse cx='32' cy='38' rx='20' ry='12' fill='%233a6a3a'/%3E%3Ccircle cx='25' cy='35' r='3' fill='%234a8a4a'/%3E%3Ccircle cx='40' cy='38' r='2' fill='%235aba5a'/%3E%3Ccircle cx='15' cy='12' r='1' fill='%23fff'/%3E%3Ccircle cx='50' cy='18' r='1' fill='%23fff'/%3E%3C/svg%3E",
  'S5': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%230a0a1a' width='64' height='64'/%3E%3Cellipse cx='32' cy='32' rx='28' ry='10' fill='%231a1a3a' transform='rotate(30 32 32)'/%3E%3Cellipse cx='32' cy='32' rx='20' ry='6' fill='%232a2a5a' transform='rotate(30 32 32)'/%3E%3Ccircle cx='20' cy='20' r='1' fill='%23fff'/%3E%3Ccircle cx='45' cy='15' r='1' fill='%23fff'/%3E%3Ccircle cx='55' cy='45' r='1' fill='%23fff'/%3E%3Ccircle cx='10' cy='50' r='1' fill='%23fff'/%3E%3C/svg%3E",
  'S6': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%230a0a1a' width='64' height='64'/%3E%3Ccircle cx='32' cy='32' r='12' fill='%23ffcc00'/%3E%3Ccircle cx='32' cy='32' r='18' fill='none' stroke='%23ff9900' stroke-width='2' opacity='0.5'/%3E%3Ccircle cx='32' cy='32' r='24' fill='none' stroke='%23ff6600' stroke-width='1' opacity='0.3'/%3E%3Ccircle cx='15' cy='15' r='1' fill='%23fff'/%3E%3Ccircle cx='50' cy='12' r='1' fill='%23fff'/%3E%3Ccircle cx='55' cy='50' r='1' fill='%23fff'/%3E%3Ccircle cx='10' cy='55' r='1' fill='%23fff'/%3E%3C/svg%3E",
};

const SECTORS: Sector[] = [
  { id: 'S1', name: 'Nebulosa de Novatos', x: 100, y: 100, difficulty: 1, image: SECTOR_IMAGES['S1'] },
  { id: 'S2', name: 'Cinturón de Asteroides', x: 300, y: 150, difficulty: 2, image: SECTOR_IMAGES['S2'] },
  { id: 'S3', name: 'Agujero Negro de Gramática', x: 500, y: 100, difficulty: 3, image: SECTOR_IMAGES['S3'] },
  { id: 'S4', name: 'Planeta de los Verbos', x: 200, y: 300, difficulty: 2, image: SECTOR_IMAGES['S4'] },
  { id: 'S5', name: 'Galaxia de Modismos', x: 450, y: 350, difficulty: 4, image: SECTOR_IMAGES['S5'] },
  { id: 'S6', name: 'Centro del Universo Lingüístico', x: 700, y: 250, difficulty: 5, image: SECTOR_IMAGES['S6'] },
];

const SectorMap: React.FC<SectorMapProps> = ({ completedSectors, onSelectSector, isDarkMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [hoveredSector, setHoveredSector] = useState<Sector | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 450;

    // Background stars
    const stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.5
    }));

    svg.selectAll('.star')
      .data(stars)
      .enter()
      .append('circle')
      .attr('class', 'star')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', isDarkMode ? '#fff' : '#000')
      .attr('opacity', 0.5);

    // Connections (lines)
    const links = [
      { source: SECTORS[0], target: SECTORS[1] },
      { source: SECTORS[1], target: SECTORS[2] },
      { source: SECTORS[0], target: SECTORS[3] },
      { source: SECTORS[3], target: SECTORS[4] },
      { source: SECTORS[1], target: SECTORS[4] },
      { source: SECTORS[2], target: SECTORS[5] },
      { source: SECTORS[4], target: SECTORS[5] },
    ];

    svg.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', isDarkMode ? '#1a4a1a' : '#ccc')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Sector nodes
    const nodes = svg.selectAll('.sector')
      .data(SECTORS)
      .enter()
      .append('g')
      .attr('class', 'sector')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        soundManager.playSFX('click');
        setSelectedSector(d);
        onSelectSector(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).select('circle').transition().attr('r', 18);
        d3.select(this).select('text').transition().attr('opacity', 1);
        setHoveredSector(d);
      })
      .on('mouseout', function() {
        d3.select(this).select('circle').transition().attr('r', 12);
        d3.select(this).select('text').transition().attr('opacity', 0.7);
        setHoveredSector(null);
      });

    nodes.append('circle')
      .attr('r', 12)
      .attr('fill', d => completedSectors.includes(d.id) ? '#22c55e' : '#000')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 2)
      .attr('class', d => completedSectors.includes(d.id) ? 'flicker' : '');

    nodes.append('text')
      .attr('dy', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#22c55e')
      .attr('font-family', 'mystic')
      .attr('font-size', '10px')
      .attr('opacity', 0.7)
      .text(d => d.name.toUpperCase());

  }, [completedSectors, isDarkMode]);

  return (
    <div className={`relative border-4 ${isDarkMode ? 'border-green-900 bg-black' : 'border-slate-200 bg-white'} rounded-xl overflow-hidden shadow-2xl`}>
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-[10px] font-mystic text-green-500 uppercase tracking-widest">Mapa Estelar de Sectores</h3>
      </div>
      
      {/* Sector Image Preview */}
      {hoveredSector && (
        <div className="absolute top-4 right-4 z-10 border-2 border-cyan-500 bg-black/90 p-2 rounded">
          <img 
            src={SECTOR_IMAGES[hoveredSector.id] || SECTOR_IMAGES['S1']} 
            alt={hoveredSector.name}
            className="w-16 h-16 pixelated"
          />
          <div className="text-[8px] font-mono text-cyan-300 uppercase mt-1 text-center">{hoveredSector.name}</div>
        </div>
      )}
      
      <svg 
        ref={svgRef} 
        viewBox="0 0 800 450" 
        className="w-full h-auto"
      />
    </div>
  );
};

export default SectorMap;
