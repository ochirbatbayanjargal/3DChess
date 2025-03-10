// Game state and variables
let scene, camera, renderer, board, pieces = {};
let selectedPiece = null;
let possibleMoves = [];
let playerColor = null;
let currentTurn = 'white';
let gameActive = false;
let socket;

// Chess piece positions and types
const initialBoardState = {
    a8: { type: 'rook', color: 'black' },
    b8: { type: 'knight', color: 'black' },
    c8: { type: 'bishop', color: 'black' },
    d8: { type: 'queen', color: 'black' },
    e8: { type: 'king', color: 'black' },
    f8: { type: 'bishop', color: 'black' },
    g8: { type: 'knight', color: 'black' },
    h8: { type: 'rook', color: 'black' },
    a7: { type: 'pawn', color: 'black' },
    b7: { type: 'pawn', color: 'black' },
    c7: { type: 'pawn', color: 'black' },
    d7: { type: 'pawn', color: 'black' },
    e7: { type: 'pawn', color: 'black' },
    f7: { type: 'pawn', color: 'black' },
    g7: { type: 'pawn', color: 'black' },
    h7: { type: 'pawn', color: 'black' },
    
    a2: { type: 'pawn', color: 'white' },
    b2: { type: 'pawn', color: 'white' },
    c2: { type: 'pawn', color: 'white' },
    d2: { type: 'pawn', color: 'white' },
    e2: { type: 'pawn', color: 'white' },
    f2: { type: 'pawn', color: 'white' },
    g2: { type: 'pawn', color: 'white' },
    h2: { type: 'pawn', color: 'white' },
    a1: { type: 'rook', color: 'white' },
    b1: { type: 'knight', color: 'white' },
    c1: { type: 'bishop', color: 'white' },
    d1: { type: 'queen', color: 'white' },
    e1: { type: 'king', color: 'white' },
    f1: { type: 'bishop', color: 'white' },
    g1: { type: 'knight', color: 'white' },
    h1: { type: 'rook', color: 'white' }
};

let boardState = JSON.parse(JSON.stringify(initialBoardState));
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Connect to WebSocket server
function connectToServer() {
    socket = io.connect(window.location.origin);
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('player-assigned', (data) => {
        playerColor = data.color;
        document.getElementById('player-color').textContent = playerColor;
        
        if (data.opponentConnected) {
            gameActive = true;
            document.getElementById('status').textContent = 'Game in progress';
            document.getElementById('reset-btn').disabled = false;
            
            // Set camera position based on player color
            if (playerColor === 'black') {
                camera.position.set(0, 15, -10);
                camera.lookAt(0, 0, 0);
            }
        } else {
            document.getElementById('status').textContent = 'Waiting for opponent...';
        }
    });
    
    socket.on('opponent-connected', () => {
        gameActive = true;
        document.getElementById('status').textContent = 'Game in progress';
        document.getElementById('reset-btn').disabled = false;
    });
    
    socket.on('opponent-disconnected', () => {
        gameActive = false;
        document.getElementById('status').textContent = 'Opponent disconnected. Waiting for new opponent...';
        document.getElementById('reset-btn').disabled = true;
    });
    
    socket.on('move-made', (data) => {
        movePiece(data.from, data.to, false);
        currentTurn = currentTurn === 'white' ? 'black' : 'white';
        document.getElementById('current-turn').textContent = 
            currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1);
    });
    
    socket.on('game-reset', () => {
        resetGame();
    });
}

// Initialize Three.js scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 10);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth - 250, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    scene.add(directionalLight);
    
    // Create chessboard
    createChessboard();
    
    // Create chess pieces
    createPieces();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Handle mouse clicks
    renderer.domElement.addEventListener('click', onMouseClick);
    
    // Set up reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
        socket.emit('reset-game');
    });
    
    // Connect to server
    connectToServer();
    
    // Start animation loop
    animate();
}

// Create chessboard
function createChessboard() {
    board = new THREE.Group();
    scene.add(board);
    
    const boardGeometry = new THREE.BoxGeometry(8, 0.5, 8);
    const boardMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 });
    const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
    boardMesh.position.y = -0.25;
    board.add(boardMesh);
    
    // Create squares
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const squareGeometry = new THREE.BoxGeometry(1, 0.1, 1);
            const color = (i + j) % 2 === 0 ? 0xEEEED2 : 0x769656;
            const squareMaterial = new THREE.MeshBasicMaterial({ color: color });
            const square = new THREE.Mesh(squareGeometry, squareMaterial);
            
            square.position.set(i - 3.5, 0, j - 3.5);
            square.userData = { 
                position: files[i] + ranks[7-j],
                highlight: false 
            };
            
            board.add(square);
        }
    }
}

// Create chess pieces
function createPieces() {
    // Simple geometric shapes for pieces
    for (const position in boardState) {
        const piece = boardState[position];
        createPiece(position, piece.type, piece.color);
    }
}

// Create individual chess piece
function createPiece(position, type, color) {
    let geometry, material;
    
    // Create different geometries for different piece types
    switch (type) {
        case 'pawn':
            geometry = new THREE.ConeGeometry(0.3, 0.8, 16);
            break;
        case 'rook':
            geometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
            break;
        case 'knight':
            geometry = new THREE.TorusGeometry(0.3, 0.15, 8, 16);
            break;
        case 'bishop':
            geometry = new THREE.ConeGeometry(0.35, 1, 16);
            break;
        case 'queen':
            geometry = new THREE.DodecahedronGeometry(0.4);
            break;
        case 'king':
            geometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
            break;
    }
    
    // Create material based on piece color
    material = new THREE.MeshStandardMaterial({
        color: color === 'white' ? 0xf0f0f0 : 0x202020,
        metalness: 0.5,
        roughness: 0.5
    });
    
    const piece = new THREE.Mesh(geometry, material);
    
    // Position the piece
    const file = position.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(position[1]) - 1;
    piece.position.set(file - 3.5, 0.5, 7 - rank - 3.5);
    
    // Add metadata
    piece.userData = {
        type: type,
        color: color,
        position: position,
        originalY: 0.5
    };
    
    pieces[position] = piece;
    scene.add(piece);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = (window.innerWidth - 250) / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - 250, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Animate selected piece hovering
    if (selectedPiece) {
        pieces[selectedPiece].position.y = pieces[selectedPiece].userData.originalY + 
            0.2 * Math.sin(Date.now() * 0.005);
    }
    
    renderer.render(scene, camera);
}

// Convert screen coordinates to chess position
function screenToPosition(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, camera);
    
    // Check for intersections with board squares
    const intersects = raycaster.intersectObjects(board.children);
    
    if (intersects.length > 0) {
        return intersects[0].object.userData.position;
    }
    
    return null;
}

// Handle mouse clicks
function onMouseClick(event) {
    if (!gameActive || currentTurn !== playerColor) return;
    
    const position = screenToPosition(event);
    if (!position) return;
    
    if (selectedPiece) {
        // Check if clicked on a possible move square
        if (possibleMoves.includes(position)) {
            // Make move
            socket.emit('make-move', { from: selectedPiece, to: position });
            movePiece(selectedPiece, position, true);
            
            // Switch turns
            currentTurn = currentTurn === 'white' ? 'black' : 'white';
            document.getElementById('current-turn').textContent = 
                currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1);
        }
        
        // Remove highlighting from possible moves
        clearHighlights();
        selectedPiece = null;
    } else {
        // Check if there's a piece at the selected position
        if (boardState[position] && boardState[position].color === playerColor) {
            selectedPiece = position;
            highlightPossibleMoves(position);
        }
    }
}

// Move piece
function movePiece(from, to, isLocalMove) {
    if (!pieces[from]) return;
    
    // If there's a piece at the destination, remove it
    if (pieces[to]) {
        scene.remove(pieces[to]);
        delete pieces[to];
    }
    
    // Update board state
    boardState[to] = boardState[from];
    delete boardState[from];
    
    // Move the piece in 3D space
    const file = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(to[1]) - 1;
    pieces[from].position.set(file - 3.5, pieces[from].userData.originalY, 7 - rank - 3.5);
    
    // Update piece metadata
    pieces[from].userData.position = to;
    pieces[to] = pieces[from];
    delete pieces[from];
    
    // If this was a locally initiated move, check for promotion
    if (isLocalMove && boardState[to].type === 'pawn') {
        // Promotion for white pawns reaching rank 8
        if (boardState[to].color === 'white' && to[1] === '8') {
            promotePawn(to, 'queen', 'white');
        }
        // Promotion for black pawns reaching rank 1
        else if (boardState[to].color === 'black' && to[1] === '1') {
            promotePawn(to, 'queen', 'black');
        }
    }
    
    // Deselect the piece
    selectedPiece = null;
    clearHighlights();
}

// Promote pawn to another piece (simplified - always to queen)
function promotePawn(position, promoteTo, color) {
    // Remove the pawn
    scene.remove(pieces[position]);
    
    // Update board state
    boardState[position] = { type: promoteTo, color: color };
    
    // Create the new piece
    createPiece(position, promoteTo, color);
}

// Get possible moves for a piece (simplified logic)
function getPossibleMoves(position) {
    const piece = boardState[position];
    if (!piece) return [];
    
    const file = position.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(position[1]);
    const moves = [];
    
    // Simplified move logic - not full chess rules
    switch (piece.type) {
        case 'pawn':
            // Direction depends on color
            const direction = piece.color === 'white' ? 1 : -1;
            
            // Forward move
            const forwardPos = String.fromCharCode(file + 'a'.charCodeAt(0)) + (rank + direction);
            if (!boardState[forwardPos]) {
                moves.push(forwardPos);
                
                // Double move from starting position
                if ((piece.color === 'white' && rank === 2) || (piece.color === 'black' && rank === 7)) {
                    const doublePos = String.fromCharCode(file + 'a'.charCodeAt(0)) + (rank + 2 * direction);
                    if (!boardState[doublePos]) {
                        moves.push(doublePos);
                    }
                }
            }
            
            // Captures
            const capturePositions = [
                String.fromCharCode(file - 1 + 'a'.charCodeAt(0)) + (rank + direction),
                String.fromCharCode(file + 1 + 'a'.charCodeAt(0)) + (rank + direction)
            ];
            
            capturePositions.forEach(pos => {
                // Check if position is valid
                if (pos[0] >= 'a' && pos[0] <= 'h' && pos[1] >= '1' && pos[1] <= '8') {
                    // Check if there's an enemy piece
                    if (boardState[pos] && boardState[pos].color !== piece.color) {
                        moves.push(pos);
                    }
                }
            });
            break;
            
        case 'rook':
            // Horizontal and vertical moves
            for (let i = 1; i <= 7; i++) {
                // Right
                if (file + i < 8) {
                    const pos = String.fromCharCode(file + i + 'a'.charCodeAt(0)) + rank;
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Left
                if (file - i >= 0) {
                    const pos = String.fromCharCode(file - i + 'a'.charCodeAt(0)) + rank;
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Up
                if (rank + i <= 8) {
                    const pos = String.fromCharCode(file + 'a'.charCodeAt(0)) + (rank + i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Down
                if (rank - i >= 1) {
                    const pos = String.fromCharCode(file + 'a'.charCodeAt(0)) + (rank - i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            break;
            
        case 'knight':
            // Knight moves
            const knightMoves = [
                { fileOffset: 1, rankOffset: 2 },
                { fileOffset: 2, rankOffset: 1 },
                { fileOffset: 2, rankOffset: -1 },
                { fileOffset: 1, rankOffset: -2 },
                { fileOffset: -1, rankOffset: -2 },
                { fileOffset: -2, rankOffset: -1 },
                { fileOffset: -2, rankOffset: 1 },
                { fileOffset: -1, rankOffset: 2 }
            ];
            
            knightMoves.forEach(move => {
                const newFile = file + move.fileOffset;
                const newRank = rank + move.rankOffset;
                
                if (newFile >= 0 && newFile < 8 && newRank >= 1 && newRank <= 8) {
                    const pos = String.fromCharCode(newFile + 'a'.charCodeAt(0)) + newRank;
                    if (!boardState[pos] || boardState[pos].color !== piece.color) {
                        moves.push(pos);
                    }
                }
            });
            break;
            
        case 'bishop':
            // Diagonal moves
            for (let i = 1; i <= 7; i++) {
                // Top-right
                if (file + i < 8 && rank + i <= 8) {
                    const pos = String.fromCharCode(file + i + 'a'.charCodeAt(0)) + (rank + i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Top-left
                if (file - i >= 0 && rank + i <= 8) {
                    const pos = String.fromCharCode(file - i + 'a'.charCodeAt(0)) + (rank + i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Bottom-right
                if (file + i < 8 && rank - i >= 1) {
                    const pos = String.fromCharCode(file + i + 'a'.charCodeAt(0)) + (rank - i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Bottom-left
                if (file - i >= 0 && rank - i >= 1) {
                    const pos = String.fromCharCode(file - i + 'a'.charCodeAt(0)) + (rank - i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            break;
            
        case 'queen':
            // Combine rook and bishop moves
            // Horizontal and vertical moves (like rook)
            for (let i = 1; i <= 7; i++) {
                // Right
                if (file + i < 8) {
                    const pos = String.fromCharCode(file + i + 'a'.charCodeAt(0)) + rank;
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Left
                if (file - i >= 0) {
                    const pos = String.fromCharCode(file - i + 'a'.charCodeAt(0)) + rank;
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Up
                if (rank + i <= 8) {
                    const pos = String.fromCharCode(file + 'a'.charCodeAt(0)) + (rank + i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Down
                if (rank - i >= 1) {
                    const pos = String.fromCharCode(file + 'a'.charCodeAt(0)) + (rank - i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            
            // Diagonal moves (like bishop)
            for (let i = 1; i <= 7; i++) {
                // Top-right
                if (file + i < 8 && rank + i <= 8) {
                    const pos = String.fromCharCode(file + i + 'a'.charCodeAt(0)) + (rank + i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Top-left
                if (file - i >= 0 && rank + i <= 8) {
                    const pos = String.fromCharCode(file - i + 'a'.charCodeAt(0)) + (rank + i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Bottom-right
                if (file + i < 8 && rank - i >= 1) {
                    const pos = String.fromCharCode(file + i + 'a'.charCodeAt(0)) + (rank - i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            for (let i = 1; i <= 7; i++) {
                // Bottom-left
                if (file - i >= 0 && rank - i >= 1) {
                    const pos = String.fromCharCode(file - i + 'a'.charCodeAt(0)) + (rank - i);
                    if (!boardState[pos]) moves.push(pos);
                    else {
                        if (boardState[pos].color !== piece.color) moves.push(pos);
                        break;
                    }
                }
            }
            break;
            
        case 'king':
            // King moves (one square in any direction)
            const kingMoves = [
                { fileOffset: 1, rankOffset: 0 },
                { fileOffset: 1, rankOffset: 1 },
                { fileOffset: 0, rankOffset: 1 },
                { fileOffset: -1, rankOffset: 1 },
                { fileOffset: -1, rankOffset: 0 },
                { fileOffset: -1, rankOffset: -1 },
                { fileOffset: 0, rankOffset: -1 },
                { fileOffset: 1, rankOffset: -1 }
            ];
            
            kingMoves.forEach(move => {
                const newFile = file + move.fileOffset;
                const newRank = rank + move.rankOffset;
                
                if (newFile >= 0 && newFile < 8 && newRank >= 1 && newRank <= 8) {
                    const pos = String.fromCharCode(newFile + 'a'.charCodeAt(0)) + newRank;
                    if (!boardState[pos] || boardState[pos].color !== piece.color) {
                        moves.push(pos);
                    }
                }
            });
            break;
    }
    
    return moves;
}

// Highlight possible moves
function highlightPossibleMoves(position) {
    possibleMoves = getPossibleMoves(position);
    
    // Highlight board squares
    board.children.forEach(child => {
        if (child.userData && child.userData.position) {
            if (possibleMoves.includes(child.userData.position)) {
                // Store original color
                if (!child.userData.originalColor) {
                    child.userData.originalColor = child.material.color.clone();
                }
                
                // Highlight square
                child.material.color.set(0x00ff00);
                child.userData.highlight = true;
            }
        }
    });
}

// Clear highlights
function clearHighlights() {
    board.children.forEach(child => {
        if (child.userData && child.userData.highlight) {
            child.material.color.copy(child.userData.originalColor);
            child.userData.highlight = false;
        }
    });
    
    possibleMoves = [];
}

// Reset game
function resetGame() {
    // Remove all pieces
    for (const pos in pieces) {
        scene.remove(pieces[pos]);
    }
    
    // Reset board state
    pieces = {};
    boardState = JSON.parse(JSON.stringify(initialBoardState));
    
    // Recreate pieces
    createPieces();
    
    // Reset game state
    selectedPiece = null;
    possibleMoves = [];
    currentTurn = 'white';
    document.getElementById('current-turn').textContent = 'White';
    
    // Clear highlights
    clearHighlights();
}

// Initialize the game
window.onload = init;