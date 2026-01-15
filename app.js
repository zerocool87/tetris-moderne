import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Square, Pause, Play, RotateCw } from 'lucide-react';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 30;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

const COLORS = {
  I: 'from-cyan-400 to-cyan-600',
  O: 'from-yellow-400 to-yellow-600',
  T: 'from-purple-400 to-purple-600',
  S: 'from-green-400 to-green-600',
  Z: 'from-red-400 to-red-600',
  J: 'from-blue-400 to-blue-600',
  L: 'from-orange-400 to-orange-600'
};

const TetrisGame = () => {
  const [board, setBoard] = useState(Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null)));
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [particles, setParticles] = useState([]);
  const gameLoopRef = useRef(null);

  const createPiece = useCallback(() => {
    const shapes = Object.keys(SHAPES);
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    return { shape: randomShape, matrix: SHAPES[randomShape], rotation: 0 };
  }, []);

  const getGhostPosition = useCallback(() => {
    if (!currentPiece) return null;
    let ghostY = position.y;
    while (!checkCollision({ x: position.x, y: ghostY + 1 }, currentPiece.matrix)) {
      ghostY++;
    }
    return ghostY;
  }, [currentPiece, position]);

  const checkCollision = useCallback((pos, matrix) => {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
          if (newY >= 0 && board[newY][newX]) return true;
        }
      }
    }
    return false;
  }, [board]);

  const rotate = useCallback((matrix) => {
    const rotated = matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
    return rotated;
  }, []);

  const mergePiece = useCallback(() => {
    const newBoard = board.map(row => [...row]);
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const boardY = position.y + y;
          const boardX = position.x + x;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = currentPiece.shape;
          }
        }
      });
    });
    return newBoard;
  }, [board, currentPiece, position]);

  const clearLines = useCallback((newBoard) => {
    let linesCleared = 0;
    const clearedBoard = [];
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== null)) {
        linesCleared++;
        // Create particles for cleared line
        for (let x = 0; x < BOARD_WIDTH; x++) {
          setParticles(prev => [...prev, { x, y, id: Math.random() }]);
        }
      } else {
        clearedBoard.unshift(newBoard[y]);
      }
    }
    
    while (clearedBoard.length < BOARD_HEIGHT) {
      clearedBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }
    
    if (linesCleared > 0) {
      const points = [0, 100, 300, 500, 800][linesCleared] * level;
      setScore(prev => prev + points);
      setLines(prev => prev + linesCleared);
      setLevel(Math.floor(lines / 10) + 1);
      
      setTimeout(() => setParticles([]), 500);
    }
    
    return clearedBoard;
  }, [level, lines]);

  const moveDown = useCallback(() => {
    if (!currentPiece || paused || gameOver) return;
    
    const newPos = { x: position.x, y: position.y + 1 };
    
    if (!checkCollision(newPos, currentPiece.matrix)) {
      setPosition(newPos);
    } else {
      const mergedBoard = mergePiece();
      const clearedBoard = clearLines(mergedBoard);
      setBoard(clearedBoard);
      
      const newPiece = nextPiece || createPiece();
      const startPos = { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 };
      
      if (checkCollision(startPos, newPiece.matrix)) {
        setGameOver(true);
      } else {
        setCurrentPiece(newPiece);
        setNextPiece(createPiece());
        setPosition(startPos);
      }
    }
  }, [currentPiece, position, paused, gameOver, checkCollision, mergePiece, clearLines, nextPiece, createPiece]);

  const moveHorizontal = useCallback((dir) => {
    if (!currentPiece || paused || gameOver) return;
    const newPos = { x: position.x + dir, y: position.y };
    if (!checkCollision(newPos, currentPiece.matrix)) {
      setPosition(newPos);
    }
  }, [currentPiece, position, paused, gameOver, checkCollision]);

  const rotatePiece = useCallback(() => {
    if (!currentPiece || paused || gameOver) return;
    const rotated = rotate(currentPiece.matrix);
    if (!checkCollision(position, rotated)) {
      setCurrentPiece({ ...currentPiece, matrix: rotated });
    }
  }, [currentPiece, position, paused, gameOver, rotate, checkCollision]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || paused || gameOver) return;
    const ghostY = getGhostPosition();
    setPosition({ ...position, y: ghostY });
    setTimeout(moveDown, 50);
  }, [currentPiece, paused, gameOver, getGhostPosition, position, moveDown]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameOver) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveHorizontal(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotatePiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'p':
        case 'P':
          setPaused(p => !p);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [moveHorizontal, moveDown, rotatePiece, hardDrop, gameOver]);

  useEffect(() => {
    if (!currentPiece && !gameOver) {
      const newPiece = createPiece();
      setCurrentPiece(newPiece);
      setNextPiece(createPiece());
      setPosition({ x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 });
    }
  }, [currentPiece, gameOver, createPiece]);

  useEffect(() => {
    if (gameOver || paused) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }
    
    const speed = Math.max(100, 1000 - (level - 1) * 50);
    gameLoopRef.current = setInterval(moveDown, speed);
    
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [level, moveDown, gameOver, paused]);

  const resetGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(null)));
    setCurrentPiece(null);
    setNextPiece(null);
    setPosition({ x: 0, y: 0 });
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setPaused(false);
    setParticles([]);
  };

  const renderCell = (cell, x, y, isGhost = false) => {
    const color = cell ? COLORS[cell] : 'from-gray-800 to-gray-900';
    const opacity = isGhost ? 'opacity-30' : 'opacity-100';
    
    return (
      <div
        key={`${x}-${y}`}
        className={`w-full h-full bg-gradient-to-br ${color} ${opacity} border border-gray-700 rounded-sm transition-all duration-150`}
        style={{
          boxShadow: cell && !isGhost ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
        }}
      />
    );
  };

  const ghostY = getGhostPosition();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="flex gap-8 items-start">
        {/* Game Board */}
        <div className="relative">
          <div 
            className="relative bg-black/50 backdrop-blur-sm p-4 rounded-lg shadow-2xl border border-purple-500/30"
            style={{ width: BOARD_WIDTH * CELL_SIZE + 32, height: BOARD_HEIGHT * CELL_SIZE + 32 }}
          >
            <div className="grid gap-0" style={{ 
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${CELL_SIZE}px)`
            }}>
              {board.map((row, y) =>
                row.map((cell, x) => {
                  let displayCell = cell;
                  let isGhost = false;
                  
                  if (currentPiece) {
                    currentPiece.matrix.forEach((pieceRow, py) => {
                      pieceRow.forEach((pieceCell, px) => {
                        if (pieceCell && position.x + px === x && position.y + py === y) {
                          displayCell = currentPiece.shape;
                        }
                        if (pieceCell && position.x + px === x && ghostY + py === y && ghostY !== position.y) {
                          if (!displayCell) {
                            displayCell = currentPiece.shape;
                            isGhost = true;
                          }
                        }
                      });
                    });
                  }
                  
                  return renderCell(displayCell, x, y, isGhost);
                })
              )}
            </div>
            
            {/* Particles */}
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute w-6 h-6 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: particle.x * CELL_SIZE + 16,
                  top: particle.y * CELL_SIZE + 16,
                }}
              />
            ))}
            
            {/* Pause/Game Over Overlay */}
            {(paused || gameOver) && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-white mb-4">
                    {gameOver ? 'GAME OVER' : 'PAUSED'}
                  </h2>
                  {gameOver && (
                    <button
                      onClick={resetGame}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      Nouvelle Partie
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Side Panel */}
        <div className="space-y-4">
          {/* Score Panel */}
          <div className="bg-black/50 backdrop-blur-sm p-6 rounded-lg border border-purple-500/30 w-48">
            <div className="space-y-4 text-white">
              <div>
                <p className="text-sm text-gray-400 mb-1">Score</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {score}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Lignes</p>
                <p className="text-2xl font-bold text-cyan-400">{lines}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Niveau</p>
                <p className="text-2xl font-bold text-purple-400">{level}</p>
              </div>
            </div>
          </div>
          
          {/* Next Piece */}
          <div className="bg-black/50 backdrop-blur-sm p-6 rounded-lg border border-purple-500/30 w-48">
            <p className="text-sm text-gray-400 mb-3">Suivant</p>
            <div className="flex justify-center items-center h-20">
              {nextPiece && (
                <div className="grid gap-0" style={{
                  gridTemplateColumns: `repeat(${nextPiece.matrix[0].length}, 20px)`,
                  gridTemplateRows: `repeat(${nextPiece.matrix.length}, 20px)`
                }}>
                  {nextPiece.matrix.map((row, y) =>
                    row.map((cell, x) => (
                      <div
                        key={`${x}-${y}`}
                        className={`w-5 h-5 rounded-sm ${
                          cell ? `bg-gradient-to-br ${COLORS[nextPiece.shape]}` : 'bg-transparent'
                        }`}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div className="bg-black/50 backdrop-blur-sm p-6 rounded-lg border border-purple-500/30 w-48">
            <p className="text-sm text-gray-400 mb-3">Contrôles</p>
            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                <span>← → : Déplacer</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                <span>↑ : Rotation</span>
              </div>
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                <span>↓ : Descente</span>
              </div>
              <div className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                <span>Espace : Chute</span>
              </div>
            </div>
            
            <button
              onClick={() => setPaused(!paused)}
              disabled={gameOver}
              className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {paused ? 'Reprendre' : 'Pause'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;