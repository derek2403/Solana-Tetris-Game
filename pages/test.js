// pages/index.js
import React from 'react';
import dynamic from 'next/dynamic';

const TetrisGame = dynamic(() => import('../components/TetrisGame'), { ssr: false });

const HomePage = () => {
  return (
    <div>
      <h1>Tetris Game</h1>
      <TetrisGame />
    </div>
  );
};

export default HomePage;