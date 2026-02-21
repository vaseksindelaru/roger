
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { soundManager } from '../services/SoundManager';

interface Sector {
  id: string;
  name: string;
  x: number;
  y: number;
  difficulty: number;
}

interface SectorMapProps {
  completedSectors: string[];
  onSelectSector: (sector: Sector) => void;
  isDarkMode: boolean;
}

const SECTORS: Sector[] = [
  { id: 'S1', name: 'Nebulosa de Novatos', x: 100, y: 100, difficulty: 1 },
  { id: 'S2', name: 'Cinturón de Asteroides', x: 300, y: 150, difficulty: 2 },
  { id: 'S3', name: 'Agujero Negro de Gramática', x: 500, y: 100, difficulty: 3 },
  { id: 'S4', name: 'Planeta de los Verbos', x: 200, y: 300, difficulty: 2 },
  { id: 'S5', name: 'Galaxia de Modismos', x: 450, y: 350, difficulty: 4 },
  { id: 'S6', name: 'Centro del Universo Lingüístico', x: 700, y: 250, difficulty: 5 },
];

const SectorMap: React.FC<SectorMapProps> = ({ completedSectors, onSelectSector, isDarkMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);

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
        onSelectSector(d);
      })
      .on('mouseover', function() {
        d3.select(this).select('circle').transition().attr('r', 15);
        d3.select(this).select('text').transition().attr('opacity', 1);
      })
      .on('mouseout', function() {
        d3.select(this).select('circle').transition().attr('r', 10);
        d3.select(this).select('text').transition().attr('opacity', 0.7);
      });

    nodes.append('circle')
      .attr('r', 10)
      .attr('fill', d => completedSectors.includes(d.id) ? '#22c55e' : '#000')
      .attr('stroke', '#22c55e')
      .attr('stroke-width', 2)
      .attr('class', d => completedSectors.includes(d.id) ? 'flicker' : '');

    nodes.append('text')
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .attr('fill', '#22c55e')
      .attr('font-family', 'mystic')
      .attr('font-size', '10px')
      .attr('opacity', 0.7)
      .text(d => d.name.toUpperCase());

    // Pulsing effect for current mission?
    // ...

  }, [completedSectors, isDarkMode]);

  return (
    <div className={`relative border-4 ${isDarkMode ? 'border-green-900 bg-black' : 'border-slate-200 bg-white'} rounded-xl overflow-hidden shadow-2xl`}>
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-[10px] font-mystic text-green-500 uppercase tracking-widest">Mapa Estelar de Sectores</h3>
      </div>
      <svg 
        ref={svgRef} 
        viewBox="0 0 800 450" 
        className="w-full h-auto"
      />
    </div>
  );
};

export default SectorMap;
