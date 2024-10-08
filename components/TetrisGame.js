import React, { useEffect, useState, useRef } from 'react';
import Phaser from 'phaser';
import { useRouter } from 'next/router';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const TetrisGame = () => {
  const [score, setScore] = useState(0);
  const [nextTetromino, setNextTetromino] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(500); // Initial drop speed
  const gameRef = useRef(null);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const router = useRouter();

  // Pool address constant
  const POOL_ADDRESS = new PublicKey('3YosZn2iZ6X9xVXCDJ2jrquvgv4spovFNjPuk5KwLH9c');
  const TRANSFER_AMOUNT = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL in lamports

  useEffect(() => {
    let game;

    class GameScene extends Phaser.Scene {
      constructor() {
        super('GameScene');
        this.gridWidth = 10;
        this.gridHeight = 20;
        this.cellSize = 32;
        this.grid = [];
        this.currentTetromino = null;
        this.nextTetromino = null;
        this.score = 0;
        this.isGameOver = false;
        this.dropSpeed = gameSpeed;
      }

      preload() {}

      create() {
        this.createGrid();
        this.spawnTetromino();
        this.createControls();

        this.timeEvent = this.time.addEvent({
          delay: this.dropSpeed,
          callback: this.dropTetromino,
          callbackScope: this,
          loop: true,
        });

        this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '16px', fill: '#fff' });
      }

      createGrid() {
        for (let y = 0; y < this.gridHeight; y++) {
          this.grid[y] = [];
          for (let x = 0; x < this.gridWidth; x++) {
            this.grid[y][x] = null;
          }
        }
        this.graphics = this.add.graphics();
      }

      createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-SPACE', this.dropInstantly, this);
      }

      spawnTetromino() {
        const tetrominoes = [
          { shape: [[1, 1, 1, 1]], color: 0x00ffff },
          { shape: [[1, 0, 0], [1, 1, 1]], color: 0x0000ff },
          { shape: [[0, 0, 1], [1, 1, 1]], color: 0xffa500 },
          { shape: [[1, 1], [1, 1]], color: 0xffff00 },
          { shape: [[0, 1, 1], [1, 1, 0]], color: 0x00ff00 },
          { shape: [[0, 1, 0], [1, 1, 1]], color: 0x800080 },
          { shape: [[1, 1, 0], [0, 1, 1]], color: 0xff0000 },
        ];

        if (!this.currentTetromino) {
          const index = Phaser.Math.Between(0, tetrominoes.length - 1);
          this.currentTetromino = { ...tetrominoes[index] };
        } else {
          this.currentTetromino = this.nextTetromino || { ...tetrominoes[0] };
        }

        const nextIndex = Phaser.Math.Between(0, tetrominoes.length - 1);
        this.nextTetromino = { ...tetrominoes[nextIndex] };
        setNextTetromino(this.nextTetromino);

        this.currentTetromino.x = Math.floor(this.gridWidth / 2) - Math.ceil(this.currentTetromino.shape[0].length / 2);
        this.currentTetromino.y = 0;

        if (this.checkCollision(0, 0, this.currentTetromino.shape)) {
          this.isGameOver = true;
          setIsGameOver(true);
          this.add.text(50, 300, 'Game Over', { fontSize: '32px', fill: '#fff' });
          transferSol();
        }
      }

      update() {
        if (this.isGameOver || isPaused) return;

        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
          this.moveTetromino(-1);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
          this.moveTetromino(1);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
          this.dropTetromino();
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
          this.rotateTetromino();
        }
      }

      moveTetromino(direction) {
        if (!this.checkCollision(direction, 0, this.currentTetromino.shape)) {
          this.currentTetromino.x += direction;
          this.redraw();
        }
      }

      dropTetromino() {
        if (!this.checkCollision(0, 1, this.currentTetromino.shape)) {
          this.currentTetromino.y += 1;
          this.redraw();
        } else {
          this.lockTetromino();
          this.clearLines();
          this.spawnTetromino();
        }
      }

      dropInstantly() {
        while (!this.checkCollision(0, 1, this.currentTetromino.shape)) {
          this.currentTetromino.y += 1;
        }
        this.lockTetromino();
        this.clearLines();
        this.spawnTetromino();
      }

      rotateTetromino() {
        const rotatedShape = this.rotateMatrix(this.currentTetromino.shape);
        if (!this.checkCollision(0, 0, rotatedShape)) {
          this.currentTetromino.shape = rotatedShape;
          this.redraw();
        }
      }

      rotateMatrix(matrix) {
        return matrix[0].map((_, i) => matrix.map(row => row[i])).reverse();
      }

      checkCollision(offsetX, offsetY, shape) {
        const { x: posX, y: posY } = this.currentTetromino;
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
              const newX = posX + x + offsetX;
              const newY = posY + y + offsetY;
              if (newX < 0 || newX >= this.gridWidth || newY >= this.gridHeight || (newY >= 0 && this.grid[newY][newX])) {
                return true;
              }
            }
          }
        }
        return false;
      }

      lockTetromino() {
        const { x: posX, y: posY, shape, color } = this.currentTetromino;
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
              const gridX = posX + x;
              const gridY = posY + y;
              if (gridY >= 0) {
                this.grid[gridY][gridX] = color;
              }
            }
          }
        }
      }

      clearLines() {
        let linesCleared = 0;

        for (let y = this.gridHeight - 1; y >= 0; y--) {
          if (this.grid[y].every(cell => cell !== null)) {
            this.grid.splice(y, 1);
            this.grid.unshift(Array(this.gridWidth).fill(null));
            linesCleared++;
            y++;
          }
        }

        if (linesCleared > 0) {
          this.score += linesCleared * 100;
          setScore(this.score);
          this.scoreText.setText('Score: ' + this.score);
          this.adjustGameSpeed();
        }
      }

      adjustGameSpeed() {
        let newSpeed = gameSpeed;
        if (this.score >= 500 && this.score < 1000) {
          newSpeed = 400;
        } else if (this.score >= 1000 && this.score < 2000) {
          newSpeed = 300;
        } else if (this.score >= 2000) {
          newSpeed = 200;
        }

        if (newSpeed !== this.dropSpeed) {
          this.dropSpeed = newSpeed;
          this.timeEvent.delay = newSpeed;
        }
      }

      redraw() {
        this.graphics.clear();

        for (let y = 0; y < this.gridHeight; y++) {
          for (let x = 0; x < this.gridWidth; x++) {
            if (this.grid[y][x]) {
              this.drawCell(x, y, this.grid[y][x]);
            }
          }
        }

        const { x: posX, y: posY, shape, color } = this.currentTetromino;
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
              const drawX = posX + x;
              const drawY = posY + y;
              if (drawY >= 0) {
                this.drawCell(drawX, drawY, color);
              }
            }
          }
        }
      }

      drawCell(x, y, color) {
        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize - 1, this.cellSize - 1);
      }
    }

    const config = {
      type: Phaser.AUTO,
      width: 320,
      height: 640,
      parent: 'phaser-game',
      scene: GameScene,
      physics: {
        default: 'arcade',
      },
    };

    game = new Phaser.Game(config);
    gameRef.current = game;

    return () => {
      if (game) {
        game.destroy(true);
      }
    };
  }, [gameSpeed]);

  const transferSol = async () => {
    if (!publicKey) {
      alert("Please connect your Phantom wallet first.");
      return;
    }

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: POOL_ADDRESS,
          lamports: TRANSFER_AMOUNT,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      alert(`0.01 SOL has been transferred to the pool! Transaction signature: ${signature}`);
      console.log(`Transaction URL: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (error) {
      console.error('Failed to send transaction:', error);
      alert(`Failed to transfer SOL: ${error.message}`);
    }
  };

  const handlePause = () => {
    if (isPaused) {
      gameRef.current.scene.resume('GameScene');
    } else {
      gameRef.current.scene.pause('GameScene');
    }
    setIsPaused(!isPaused);
  };

  const handleRestart = () => {
    setIsPaused(false);
    setScore(0);
    setIsGameOver(false);
    setGameSpeed(500);
    gameRef.current.scene.restart('GameScene');
  };

  return (
    <div style={styles.container}>
      <div id="phaser-game" style={styles.gameBoard}></div>
      <div style={styles.sidebar}>
        <WalletMultiButton style={styles.walletButton} />
        <h3>Next Block:</h3>
        {nextTetromino ? (
          <div style={styles.nextBlock}>
            {nextTetromino.shape.map((row, rowIndex) => (
              <div key={rowIndex} style={{ display: 'flex' }}>
                {row.map((cell, cellIndex) => (
                  <div
                    key={cellIndex}
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: cell ? `#${nextTetromino.color.toString(16)}` : 'transparent',
                      border: cell ? '1px solid #fff' : 'none',
                    }}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p>No next block</p>
        )}
        <h3 style={styles.score}>Score: {score}</h3>
        <div style={styles.buttons}>
          <button onClick={handlePause} style={styles.button}>{isPaused ? 'Resume' : 'Pause'}</button>
          <button onClick={handleRestart} style={{ ...styles.button, marginLeft: '10px' }}>Restart</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    height: '100vh',
    padding: '20px',
  },
  gameBoard: {
    backgroundColor: '#000',
    width: '320px',
    height: '640px',
    marginRight: '20px',
    border: '2px solid #000',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
  },
  walletButton: {
    marginBottom: '20px',
  },
  nextBlock: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '20px',
  },
  score: {
    color: '#1d72b8',
    marginBottom: '20px',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '10px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#1d72b8',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    transition: 'background-color 0.3s ease',
  },
};

export default TetrisGame;
