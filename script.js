let currentStep = 1;
let currentNumber = 0; // Changed from currentDay, now 0-9
let currentView = 'one';
let numbers = {}; // Changed from days, stores data for numbers 0-9
let canvas, ctx;
let colorLevel = 0;
let blendLevel = 0;
let stackLevel = 0;
let effect01Level = 0;
let effectInterval = null;
let currentEffectAdjustment = null;
let currentShape = 'stone'; // Current shape type: stone, brick, concrete, mat4
let clickCounts = {}; // Track click counts per position for shape cycling
let currentMonth = 0; // 0-11 for January-December
let monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
let currentOutputType = null; // Track which output type is selected: 'calendar' or 'clock'

// Load numbers from localStorage on initialization
function loadNumbersFromStorage() {
    try {
        const savedNumbers = localStorage.getItem('numberDesigns');
        if (savedNumbers) {
            const parsed = JSON.parse(savedNumbers);
            // Merge with default structure to ensure all properties exist
for (let i = 0; i <= 9; i++) {
                if (parsed[i]) {
                    numbers[i] = {
                        stones: parsed[i].stones || [],
                        clickData: parsed[i].clickData || {},
                        materials: parsed[i].materials || [],
                        drillClickCount: parsed[i].drillClickCount || 0
                    };
                } else {
                    numbers[i] = { stones: [], clickData: {}, materials: [], drillClickCount: 0 };
                }
            }
        } else {
            // Initialize 10 numbers (0-9) if no saved data
            for (let i = 0; i <= 9; i++) {
                numbers[i] = { stones: [], clickData: {}, materials: [], drillClickCount: 0 };
            }
        }
    } catch (e) {
        console.error('Error loading numbers from storage:', e);
        // Initialize 10 numbers (0-9) on error
        for (let i = 0; i <= 9; i++) {
            numbers[i] = { stones: [], clickData: {}, materials: [], drillClickCount: 0 };
        }
    }
}

// Save numbers to localStorage
function saveNumbersToStorage() {
    try {
        localStorage.setItem('numberDesigns', JSON.stringify(numbers));
    } catch (e) {
        console.error('Error saving numbers to storage:', e);
    }
}

// Initialize 10 numbers (0-9) - now called after loading from storage
function initializeNumbers() {
    for (let i = 0; i <= 9; i++) {
        if (!numbers[i]) {
            numbers[i] = { stones: [], clickData: {}, materials: [], drillClickCount: 0 };
        }
    }
}

function init() {
    loadNumbersFromStorage();
    initializeNumbers();
    createFallingStones();
}

// Generate random stone shape (organic, pebble-like)
function generateStoneShape(size, forMaterial = false) {
    const points = [];
    
    if (forMaterial) {
        // For materials: more regular shape with minimal variation
        const baseSize = size * 0.8;
        const numPoints = 16; // Fixed number of points for consistency
        const baseRadius = baseSize / 2;
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            // Very slight variation for outline
            const radiusVariation = 0.95 + Math.random() * 0.05; // 0.95 to 1.0 - minimal variation
            const radius = baseRadius * radiusVariation;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            points.push({ x, y });
        }
    } else {
        // For stones: original organic shape
        const numPoints = 20 + Math.floor(Math.random() * 10);
    const widthRatio = 0.8 + Math.random() * 0.3; // 0.8 to 1.1
    const heightRatio = 0.8 + Math.random() * 0.3;
    const baseRadiusX = (size / 2) * widthRatio;
    const baseRadiusY = (size / 2) * heightRatio;
    
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const radiusVariation = 0.85 + Math.random() * 0.15; // 0.85 to 1.0
        const radiusX = baseRadiusX * radiusVariation;
        const radiusY = baseRadiusY * radiusVariation;
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
        points.push({ x, y });
        }
    }
    
    return points;
}

function drawStone(ctx, points, x, y, color = '#000') {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    
    if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            const ctrlX = (current.x + next.x) / 2;
            const ctrlY = (current.y + next.y) / 2;
            ctx.quadraticCurveTo(current.x, current.y, ctrlX, ctrlY);
        }
        
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// Generate SVG path string from stone points
function generateSVGPath(points) {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y} `;
    
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        const ctrlX = (current.x + next.x) / 2;
        const ctrlY = (current.y + next.y) / 2;
        path += `Q ${current.x} ${current.y} ${ctrlX} ${ctrlY} `;
    }
    
    path += 'Z';
    return path;
}

// Draw material on canvas (for Calendar and Clock rendering)
function drawMaterial(ctx, material, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((material.rotation * Math.PI) / 180);
    
    switch(material.type) {
        case 'brick':
            const brickShape = generateBrickShape(material.size);
            
            // Draw brick rectangle
            ctx.fillStyle = '#add8e6'; // Light blue
            ctx.beginPath();
            ctx.moveTo(brickShape[0].x, brickShape[0].y);
            for (let i = 1; i < brickShape.length; i++) {
                ctx.lineTo(brickShape[i].x, brickShape[i].y);
            }
            ctx.closePath();
            ctx.fill();
            
            // Draw gray circles (holes) in 2x2 grid
            const width = Math.abs(brickShape[1].x - brickShape[0].x);
            const height = Math.abs(brickShape[2].y - brickShape[1].y);
            const circleRadius = Math.min(width, height) * 0.15;
            const spacingX = width * 0.3;
            const spacingY = height * 0.3;
            
            const centerX = (brickShape[0].x + brickShape[1].x + brickShape[2].x + brickShape[3].x) / 4;
            const centerY = (brickShape[0].y + brickShape[1].y + brickShape[2].y + brickShape[3].y) / 4;
            
            ctx.fillStyle = '#808080'; // Gray
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    const circleX = centerX + (col - 0.5) * spacingX;
                    const circleY = centerY + (row - 0.5) * spacingY;
                    ctx.beginPath();
                    ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;
            
        case 'grid':
            const gridData = generateGridShape(material.size);
            
            // Draw grid outline
            ctx.strokeStyle = '#d00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gridData.corners[0].x, gridData.corners[0].y);
            for (let i = 1; i < gridData.corners.length; i++) {
                ctx.lineTo(gridData.corners[i].x, gridData.corners[i].y);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Draw grid lines
            for (let i = 1; i < gridData.numCells; i++) {
                const pos = -gridData.corners[0].x * 2 / gridData.numCells * i + gridData.corners[0].x;
                
                // Vertical line
                ctx.beginPath();
                ctx.moveTo(pos, gridData.corners[0].y);
                ctx.lineTo(pos, gridData.corners[2].y);
                ctx.stroke();
                
                // Horizontal line
                ctx.beginPath();
                ctx.moveTo(gridData.corners[0].x, pos);
                ctx.lineTo(gridData.corners[1].x, pos);
                ctx.stroke();
            }
            break;
    }
    
    ctx.restore();
}

// Generate brick shape (slightly irregular rectangle)
function generateBrickShape(size) {
    // All materials should have the same size - no variation
    const baseSize = size; // Use full size, no reduction
    const width = baseSize; // No variation
    const height = baseSize; // No variation
    
    // Create slightly irregular rectangle with 4 corners (minimal variation)
    const cornerVariation = size * 0.02; // 2% variation - very slight
    const corners = [
        { x: -width/2 + (Math.random() - 0.5) * cornerVariation, y: -height/2 + (Math.random() - 0.5) * cornerVariation },
        { x: width/2 + (Math.random() - 0.5) * cornerVariation, y: -height/2 + (Math.random() - 0.5) * cornerVariation },
        { x: width/2 + (Math.random() - 0.5) * cornerVariation, y: height/2 + (Math.random() - 0.5) * cornerVariation },
        { x: -width/2 + (Math.random() - 0.5) * cornerVariation, y: height/2 + (Math.random() - 0.5) * cornerVariation }
    ];
    
    return corners;
}

// Generate grid shape (slightly irregular grid pattern)
function generateGridShape(size) {
    // All materials should have the same size - no variation
    const baseSize = size; // Use full size, no reduction
    const gridSize = baseSize; // No variation
    const numCells = 3; // Fixed number of cells for consistency
    const cellSize = gridSize / numCells;
    const cornerVariation = size * 0.02; // 2% variation - very slight
    
    // Create a grid pattern with slightly irregular lines
    // For simplicity, create a square grid outline
    const corners = [
        { x: -gridSize/2 + (Math.random() - 0.5) * cornerVariation, y: -gridSize/2 + (Math.random() - 0.5) * cornerVariation },
        { x: gridSize/2 + (Math.random() - 0.5) * cornerVariation, y: -gridSize/2 + (Math.random() - 0.5) * cornerVariation },
        { x: gridSize/2 + (Math.random() - 0.5) * cornerVariation, y: gridSize/2 + (Math.random() - 0.5) * cornerVariation },
        { x: -gridSize/2 + (Math.random() - 0.5) * cornerVariation, y: gridSize/2 + (Math.random() - 0.5) * cornerVariation }
    ];
    
    return { corners, cellSize, numCells };
}

// STEP 1: Falling stones animation
function createFallingStones() {
    const container = document.getElementById('fallingStones');
    const numStones = 15;
    
    for (let i = 0; i < numStones; i++) {
        const size = 100 + Math.random() * 150; // Larger, more like pebbles
        // Make canvas larger to prevent clipping of rounded stones
        const padding = 20;
        const canvasSize = size + padding * 2;
        const stoneCanvas = document.createElement('canvas');
        stoneCanvas.width = canvasSize;
        stoneCanvas.height = canvasSize;
        stoneCanvas.className = 'falling-stone';
        
        const stoneCtx = stoneCanvas.getContext('2d');
        const stoneShape = generateStoneShape(size);
        // Draw stone centered in the larger canvas
        drawStone(stoneCtx, stoneShape, canvasSize / 2, canvasSize / 2);
        
        const xPos = Math.random() * (window.innerWidth - size);
        stoneCanvas.style.left = xPos + 'px';
        stoneCanvas.style.top = '-300px';
        
        stoneCanvas.addEventListener('click', () => goToStep(2));
        
        container.appendChild(stoneCanvas);
        
        animateStoneFall(stoneCanvas, Math.random() * 500, size);
    }
}

function animateStoneFall(element, delay, size) {
    setTimeout(() => {
        const duration = 1500 + Math.random() * 800;
        const startTime = Date.now();
        const startX = parseFloat(element.style.left);
        const drift = (Math.random() - 0.5) * 150;
        const targetX = Math.max(0, Math.min(window.innerWidth - size, startX + drift));
        const targetY = window.innerHeight - size - (Math.random() * 200);
        const rotation = (Math.random() - 0.5) * 40;
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentY = (easeProgress * (targetY + 300) - 300);
            const currentX = startX + (targetX - startX) * easeProgress;
            const currentRotation = rotation * easeProgress;
            
            element.style.top = currentY + 'px';
            element.style.left = currentX + 'px';
            element.style.transform = `rotate(${currentRotation}deg)`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        animate();
    }, delay);
}

// Navigation
function goToStep(step) {
    // Save numbers before leaving step 2
    if (currentStep === 2) {
        saveNumbersToStorage();
    }
    
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    currentStep = step;
    
    if (step === 2) {
        initCanvas();
        document.getElementById('oneView').classList.add('active');
        initDrillButton();
        updateDrillButtonNumber(); // Update button with current number
        currentShape = 'stone'; // Reset to stone
        renderCanvas(); // Re-render with saved data
    } else if (step === 3) {
        // Show selection buttons
        const outputSelection = document.getElementById('outputSelection');
        if (outputSelection) {
            outputSelection.style.display = 'grid';
        }
        
        // Show back button to Step 2
        const selectionBackButton = document.getElementById('selectionBackButton');
        if (selectionBackButton) {
            selectionBackButton.style.display = 'block';
        }
        
        // Show top and bottom bars
        const topBar = document.querySelector('#step3 .top-bar');
        const bottomBar = document.querySelector('#step3 .bottom-bar');
        if (topBar) topBar.style.display = 'block';
        if (bottomBar) bottomBar.style.display = 'block';
        
        // Hide both views initially
        if (document.getElementById('clockView')) {
            document.getElementById('clockView').style.display = 'none';
        }
        if (document.getElementById('calendarView')) {
            document.getElementById('calendarView').style.display = 'none';
        }
        
        // Don't auto-restore output type - always show selection first
        currentOutputType = null;
    }
}

function selectOutput(type) {
    // Load numbers from storage before rendering
    loadNumbersFromStorage();
    
    // Store the selected output type
    currentOutputType = type;
    
    // Hide the selection buttons
    const outputSelection = document.getElementById('outputSelection');
    if (outputSelection) {
        outputSelection.style.display = 'none';
    }
    
    // Hide the back button to Step 2
    const selectionBackButton = document.getElementById('selectionBackButton');
    if (selectionBackButton) {
        selectionBackButton.style.display = 'none';
    }
    
    // Hide top and bottom bars
    const topBar = document.querySelector('#step3 .top-bar');
    const bottomBar = document.querySelector('#step3 .bottom-bar');
    if (topBar) topBar.style.display = 'none';
    if (bottomBar) bottomBar.style.display = 'none';
    
    if (type === 'calendar') {
        document.getElementById('calendarView').style.display = 'block';
        document.getElementById('clockView').style.display = 'none';
        selectMonth(currentMonth); // Use saved month or default to 0
        renderCalendarPages(); // Re-render calendar
    } else if (type === 'clock') {
        document.getElementById('clockView').style.display = 'block';
        document.getElementById('calendarView').style.display = 'none';
        initClock();
    }
}

// Go back to selection screen from Clock or Calendar
function goBackToSelection() {
    // Hide Clock and Calendar views
    if (document.getElementById('clockView')) {
        document.getElementById('clockView').style.display = 'none';
    }
    if (document.getElementById('calendarView')) {
        document.getElementById('calendarView').style.display = 'none';
    }
    
    // Show selection buttons
    const outputSelection = document.getElementById('outputSelection');
    if (outputSelection) {
        outputSelection.style.display = 'grid';
    }
    
    // Show back button to Step 2
    const selectionBackButton = document.getElementById('selectionBackButton');
    if (selectionBackButton) {
        selectionBackButton.style.display = 'block';
    }
    
    // Show top and bottom bars
    const topBar = document.querySelector('#step3 .top-bar');
    const bottomBar = document.querySelector('#step3 .bottom-bar');
    if (topBar) topBar.style.display = 'block';
    if (bottomBar) bottomBar.style.display = 'block';
    
    // Reset output type
    currentOutputType = null;
}

// Auto-start clock when step 3 is reached (if coming from calendar selection)
function autoStartClock() {
    // This can be called if needed
    if (document.getElementById('clockView')) {
        document.getElementById('clockView').style.display = 'block';
        initClock();
    }
}

// Grid configuration
const GRID_COLS = 5; // Number of columns (larger cells)
const GRID_ROWS = 7; // Number of rows (larger cells)
let gridCellSize = 0; // Will be calculated based on canvas size

// Setup high-resolution canvas using devicePixelRatio
function setupHighResCanvas(canvasElement, width, height) {
    const dpr = window.devicePixelRatio || 1;
    
    // Set the actual size in memory (scaled for high DPI)
    canvasElement.width = width * dpr;
    canvasElement.height = height * dpr;
    
    // Set the display size (CSS pixels)
    canvasElement.style.width = width + 'px';
    canvasElement.style.height = height + 'px';
    
    // Scale the context to account for the device pixel ratio
    const ctx = canvasElement.getContext('2d');
    ctx.scale(dpr, dpr);
    
    return ctx;
}

// Canvas setup
function initCanvas() {
    canvas = document.getElementById('mainCanvas');
    canvas.width = 700;
    canvas.height = 1050;
    ctx = canvas.getContext('2d');
    
    // Calculate grid cell size
    gridCellSize = Math.min(canvas.width / GRID_COLS, canvas.height / GRID_ROWS);
    
    canvas.addEventListener('click', handleCanvasClick);
    
    renderCanvas();
}

// Snap coordinates to grid center with precise calculation
function snapToGrid(x, y) {
    // Calculate which grid cell the point is in
    const gridCol = Math.floor(x / gridCellSize);
    const gridRow = Math.floor(y / gridCellSize);
    
    // Clamp to valid grid bounds
    const clampedCol = Math.max(0, Math.min(GRID_COLS - 1, gridCol));
    const clampedRow = Math.max(0, Math.min(GRID_ROWS - 1, gridRow));
    
    // Center the position in the grid cell
    const gridX = clampedCol * gridCellSize + gridCellSize / 2;
    const gridY = clampedRow * gridCellSize + gridCellSize / 2;
    
    return { x: gridX, y: gridY };
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const rawX = (e.clientX - rect.left) * scaleX;
    const rawY = (e.clientY - rect.top) * scaleY;
    
    // Snap to grid
    const snapped = snapToGrid(rawX, rawY);
    const x = snapped.x;
    const y = snapped.y;
    
    // Create a key for this position (using grid coordinates)
    const clickKey = `${x},${y}`;
    
    // Check if we've clicked here before
    if (!numbers[currentNumber].clickData[clickKey]) {
        // First click: add stone
        addStone(x, y, 'stone');
        numbers[currentNumber].clickData[clickKey] = { count: 1, shape: 'stone' };
    } else {
        // Subsequent clicks: cycle through shapes
        const clickData = numbers[currentNumber].clickData[clickKey];
        clickData.count++;
        
        // Cycle: stone -> brick -> concrete -> mat4 -> stone
        const shapeCycle = ['stone', 'brick', 'concrete', 'mat4'];
        const currentIndex = shapeCycle.indexOf(clickData.shape);
        const nextIndex = (currentIndex + 1) % shapeCycle.length;
        const nextShape = shapeCycle[nextIndex];
        
        clickData.shape = nextShape;
        
        // Update the stone at this position
        updateStoneAtPosition(x, y, nextShape);
    }
    
    saveNumbersToStorage(); // Save after canvas click
    renderCanvas();
}

function addStone(x, y, shapeType = 'stone') {
    // Size based on grid cell size - stones should fit in grid cells
    const size = gridCellSize * 0.8 + Math.random() * gridCellSize * 0.2; // 80-100% of grid cell size
    
    // Generate shape based on shape type
    let shapePoints;
    switch(shapeType) {
        case 'stone':
            shapePoints = generateStoneShape(size);
            break;
        case 'brick':
            // TODO: Implement brick shape
            shapePoints = generateStoneShape(size); // Placeholder
            break;
        case 'concrete':
            // TODO: Implement concrete shape
            shapePoints = generateStoneShape(size); // Placeholder
            break;
        case 'mat4':
            // TODO: Implement mat4 shape
            shapePoints = generateStoneShape(size); // Placeholder
            break;
        default:
            shapePoints = generateStoneShape(size);
    }
    
    const stone = {
        x: x,
        y: y,
        size: size,
        shape: shapePoints,
        shapeType: shapeType,
        color: getStoneColor(),
        rotation: Math.random() * 360
    };
    
    numbers[currentNumber].stones.push(stone);
    saveNumbersToStorage(); // Save after adding stone
}

function updateStoneAtPosition(x, y, newShape) {
    // Find stone at this position and update its shape
    const stones = numbers[currentNumber].stones;
    for (let i = stones.length - 1; i >= 0; i--) {
        const stone = stones[i];
        // Check if stone is at this position (with some tolerance)
        const distance = Math.sqrt(Math.pow(stone.x - x, 2) + Math.pow(stone.y - y, 2));
        if (distance < stone.size / 2) {
            // Update shape
            const size = stone.size;
            let shapePoints;
            switch(newShape) {
                case 'stone':
                    shapePoints = generateStoneShape(size);
                    break;
                case 'brick':
                    shapePoints = generateStoneShape(size); // Placeholder
                    break;
                case 'concrete':
                    shapePoints = generateStoneShape(size); // Placeholder
                    break;
                case 'mat4':
                    shapePoints = generateStoneShape(size); // Placeholder
                    break;
                default:
                    shapePoints = generateStoneShape(size);
            }
            stone.shape = shapePoints;
            stone.shapeType = newShape;
            break;
        }
    }
}

// Shape selection function
function selectShape(shape) {
    currentShape = shape;
    
    // Update active state in UI
    document.querySelectorAll('.shape-option').forEach(opt => opt.classList.remove('active'));
    
    // Map shape names to element IDs
    const shapeIdMap = {
        'stone': 'shapeStone',
        'brick': 'shapeBrick',
        'concrete': 'shapeConcrete',
        'mat4': 'shapeMat4'
    };
    
    const shapeId = shapeIdMap[shape];
    if (shapeId) {
        const shapeElement = document.getElementById(shapeId);
        if (shapeElement) {
            shapeElement.classList.add('active');
        }
    }
}

function getStoneColor() {
    if (colorLevel === 0) return '#000000';
    
    const hue = (colorLevel * 30) % 360;
    return `hsl(${hue}, 70%, 40%)`;
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines (optional - can be removed if not needed visually)
    if (gridCellSize > 0) {
        ctx.save();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        for (let col = 0; col <= GRID_COLS; col++) {
            const x = col * gridCellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let row = 0; row <= GRID_ROWS; row++) {
            const y = row * gridCellSize;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();
    }
    
    // Gray background number removed - number now shown in drill button
    
    // Render stones as SVG elements (vector-based)
    const svg = document.getElementById('stonesSvg');
    svg.innerHTML = ''; // Clear existing stones
    
    // Set SVG viewBox to match canvas dimensions
    svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
    svg.setAttribute('width', canvas.width);
    svg.setAttribute('height', canvas.height);
    
    // Render material layers first (so they appear behind stones)
    numbers[currentNumber].materials.forEach((material) => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('transform', `translate(${material.x}, ${material.y}) rotate(${material.rotation})`);
        
        switch(material.type) {
            case 'stone':
                const stoneShape = generateStoneShape(material.size, true);
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', generateSVGPath(stoneShape));
                path.setAttribute('fill', '#000');
                group.appendChild(path);
                break;
            case 'brick':
                const brickShape = generateBrickShape(material.size);
                
                // Calculate dimensions for holes
                const width = Math.abs(brickShape[1].x - brickShape[0].x);
                const height = Math.abs(brickShape[2].y - brickShape[1].y);
                const circleRadius = Math.min(width, height) * 0.15;
                const spacingX = width * 0.3;
                const spacingY = height * 0.3;
                
                // Calculate center of brick
                const centerX = (brickShape[0].x + brickShape[1].x + brickShape[2].x + brickShape[3].x) / 4;
                const centerY = (brickShape[0].y + brickShape[1].y + brickShape[2].y + brickShape[3].y) / 4;
                
                // Create path with holes cut out using evenodd fill rule
                let brickPathData = `M ${brickShape[0].x} ${brickShape[0].y} `;
                for (let i = 1; i < brickShape.length; i++) {
                    brickPathData += `L ${brickShape[i].x} ${brickShape[i].y} `;
                }
                brickPathData += 'Z';
                
                // Add holes as cut-out circles (using evenodd to subtract from main shape)
                for (let row = 0; row < 2; row++) {
                    for (let col = 0; col < 2; col++) {
                        const circleX = centerX + (col - 0.5) * spacingX;
                        const circleY = centerY + (row - 0.5) * spacingY;
                        // Create circle path for hole (counter-clockwise to subtract)
                        const numPoints = 16;
                        const angleStep = (Math.PI * 2) / numPoints;
                        brickPathData += ` M ${circleX + circleRadius} ${circleY}`;
                        for (let i = 1; i <= numPoints; i++) {
                            const angle = i * angleStep;
                            const x = circleX + Math.cos(angle) * circleRadius;
                            const y = circleY + Math.sin(angle) * circleRadius;
                            brickPathData += ` L ${x} ${y}`;
                        }
                        brickPathData += ' Z';
                    }
                }
                
                const brickPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                brickPath.setAttribute('d', brickPathData);
                brickPath.setAttribute('fill', '#add8e6'); // Light blue
                brickPath.setAttribute('fill-rule', 'evenodd'); // This allows holes to be cut out
                group.appendChild(brickPath);
                break;
            case 'grid':
                const gridData = generateGridShape(material.size);
                const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                gridGroup.setAttribute('stroke', '#d00');
                gridGroup.setAttribute('stroke-width', '2');
                gridGroup.setAttribute('fill', 'none');
                
                // Draw grid outline
                const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                let outlinePath = `M ${gridData.corners[0].x} ${gridData.corners[0].y} `;
                for (let i = 1; i < gridData.corners.length; i++) {
                    outlinePath += `L ${gridData.corners[i].x} ${gridData.corners[i].y} `;
                }
                outlinePath += 'Z';
                outline.setAttribute('d', outlinePath);
                gridGroup.appendChild(outline);
                
                // Draw grid lines
                for (let i = 1; i < gridData.numCells; i++) {
                    const pos = -gridData.corners[0].x * 2 / gridData.numCells * i + gridData.corners[0].x;
                    const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    vLine.setAttribute('x1', pos);
                    vLine.setAttribute('y1', gridData.corners[0].y);
                    vLine.setAttribute('x2', pos);
                    vLine.setAttribute('y2', gridData.corners[2].y);
                    gridGroup.appendChild(vLine);
                    
                    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    hLine.setAttribute('x1', gridData.corners[0].x);
                    hLine.setAttribute('y1', pos);
                    hLine.setAttribute('x2', gridData.corners[1].x);
                    hLine.setAttribute('y2', pos);
                    gridGroup.appendChild(hLine);
                }
                group.appendChild(gridGroup);
                break;
        }
        
        svg.appendChild(group);
    });
    
    // Render stones on top of materials
    numbers[currentNumber].stones.forEach((stone, stoneIndex) => {
        const copies = Math.max(1, stackLevel);
        
        for (let i = 0; i < copies; i++) {
            const offset = i * 3;
            
            // Create SVG group for transformation
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('transform', `translate(${stone.x + offset}, ${stone.y + offset}) rotate(${stone.rotation})`);
            
            // Apply blend mode if enabled
            if (blendLevel > 0) {
                group.setAttribute('style', `mix-blend-mode: multiply;`);
            }
            
            // Create path element
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = generateSVGPath(stone.shape);
            path.setAttribute('d', pathData);
            path.setAttribute('fill', stone.color);
            
            group.appendChild(path);
            svg.appendChild(group);
        }
    });
}

// Initialize drill button with click functionality
function initDrillButton() {
    const drillButton = document.getElementById('drillButton');
    if (!drillButton) return;
    
    // Click functionality
    drillButton.addEventListener('click', (e) => {
        e.preventDefault();
        handleDrillClick();
    });
    
    // Update button with current number
    updateDrillButtonNumber();
}

// Update drill button to show current number
function updateDrillButtonNumber() {
    const drillButton = document.getElementById('drillButton');
    if (!drillButton) return;
    
    const drillText = drillButton.querySelector('.drill-text');
    if (drillText) {
        drillText.textContent = currentNumber.toString();
    }
}

function handleDrillClick() {
    // Only work if we have stones
    if (numbers[currentNumber].stones.length === 0) {
        return;
    }
    
    // Initialize drillClickCount if not exists
    if (!numbers[currentNumber].drillClickCount) {
        numbers[currentNumber].drillClickCount = 0;
    }
    
    // Maximum 2 clicks - no more layers after that
    if (numbers[currentNumber].drillClickCount >= 2) {
        return;
    }
    
    numbers[currentNumber].drillClickCount++;
    
    // First click: Brick, Second click: Grid
    if (numbers[currentNumber].drillClickCount === 1) {
        addMaterialLayer('brick');
    } else if (numbers[currentNumber].drillClickCount === 2) {
        addMaterialLayer('grid');
    }
    
    saveNumbersToStorage(); // Save after drill click
}


// Calculate bounds of a number design (stones and materials)
function getNumberBounds(numberData) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    if (numberData.stones && numberData.stones.length > 0) {
        numberData.stones.forEach(stone => {
            stone.shape.forEach(point => {
                const x = stone.x + point.x;
                const y = stone.y + point.y;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            });
        });
    }
    
    if (numberData.materials && numberData.materials.length > 0) {
        numberData.materials.forEach(material => {
            const materialSize = material.size;
            minX = Math.min(minX, material.x - materialSize / 2);
            maxX = Math.max(maxX, material.x + materialSize / 2);
            minY = Math.min(minY, material.y - materialSize / 2);
            maxY = Math.max(maxY, material.y + materialSize / 2);
        });
    }
    
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

// Render a number design at a specific position
function renderNumberDesign(ctx, numberData, offsetX, offsetY) {
    if (!numberData) return;
    
    // Draw materials first (behind stones)
    if (numberData.materials && numberData.materials.length > 0) {
        numberData.materials.forEach(material => {
            ctx.save();
            ctx.translate(offsetX, offsetY);
            drawMaterial(ctx, material, material.x, material.y);
            ctx.restore();
        });
    }
    
    // Draw stones on top
    if (numberData.stones && numberData.stones.length > 0) {
        if (blendLevel > 0) {
            ctx.globalCompositeOperation = 'multiply';
        }
        
        numberData.stones.forEach(stone => {
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.translate(stone.x, stone.y);
            ctx.rotate((stone.rotation * Math.PI) / 180);
            
            const copies = Math.max(1, stackLevel);
            for (let j = 0; j < copies; j++) {
                const offset = j * 3;
                drawStone(ctx, stone.shape, offset, offset, stone.color);
            }
            
            ctx.restore();
        });
        
        ctx.globalCompositeOperation = 'source-over';
    }
}

// Check if a stone already has a specific material type
function stoneHasMaterial(stone, materialType) {
    const tolerance = 5; // Small tolerance for position matching
    const baseOffset = 40;
    
    let expectedX, expectedY;
    if (materialType === 'brick') {
        expectedX = stone.x + baseOffset;
        expectedY = stone.y + baseOffset;
    } else if (materialType === 'grid') {
        expectedX = stone.x + baseOffset * 2;
        expectedY = stone.y + baseOffset * 2;
    } else {
        return false;
    }
    
    return numbers[currentNumber].materials.some(material => {
        if (material.type !== materialType) {
            return false;
        }
        
        const distance = Math.sqrt(
            Math.pow(material.x - expectedX, 2) + 
            Math.pow(material.y - expectedY, 2)
        );
        
        return distance < tolerance;
    });
}

// Add material layer behind stones
function addMaterialLayer(materialType) {
    // Material layers appear offset behind stones
    // Only add materials if there are stones
    if (numbers[currentNumber].stones.length === 0) {
        return;
    }
    
    // Calculate offset based on material type
    // Bricks: offset from stones
    // Grid: offset from bricks (same offset as bricks from stones)
    let offsetX, offsetY;
    const baseOffset = 40; // Base offset amount
    
    if (materialType === 'brick') {
        // Bricks offset from stones
        offsetX = baseOffset;
        offsetY = baseOffset;
    } else if (materialType === 'grid') {
        // Grid offset from bricks (same as bricks from stones)
        // Find brick positions and offset from them
        const brickMaterials = numbers[currentNumber].materials.filter(m => m.type === 'brick');
        if (brickMaterials.length === 0) {
            // If no bricks exist, offset from stones
            offsetX = baseOffset;
            offsetY = baseOffset;
        } else {
            // Offset from bricks (add same offset as bricks have from stones)
            offsetX = baseOffset * 2; // 40 from stones + 40 from bricks = 80 total
            offsetY = baseOffset * 2;
        }
    } else {
        offsetX = baseOffset;
        offsetY = baseOffset;
    }
    
    // Create material layer only for stones that don't have this specific material type yet
    // For sequential adding: only add to stones that don't have materials yet (for brick)
    // or only add to stones that already have brick (for grid)
    let materialsAdded = 0;
    numbers[currentNumber].stones.forEach((stone, index) => {
        // Skip stones that already have this material type
        if (stoneHasMaterial(stone, materialType)) {
            return;
        }
        
        // For sequential adding:
        if (materialType === 'brick') {
            // For brick: only add if stone has no materials at all
            const hasAnyMaterial = numbers[currentNumber].materials.some(m => {
                const tolerance = 5;
                const baseOffset = 40;
                // Check for any material near this stone (brick or grid)
                const distanceBrick = Math.sqrt(
                    Math.pow(m.x - (stone.x + baseOffset), 2) + 
                    Math.pow(m.y - (stone.y + baseOffset), 2)
                );
                const distanceGrid = Math.sqrt(
                    Math.pow(m.x - (stone.x + baseOffset * 2), 2) + 
                    Math.pow(m.y - (stone.y + baseOffset * 2), 2)
                );
                return distanceBrick < tolerance || distanceGrid < tolerance;
            });
            if (hasAnyMaterial) {
                return; // Skip stones that already have any material
            }
        } else if (materialType === 'grid') {
            // For grid: only add if stone already has brick
            if (!stoneHasMaterial(stone, 'brick')) {
                return; // Skip stones that don't have brick yet
            }
        }
        
        // Use same size for all materials - slightly smaller than before
        // Use stone size as reference if available, otherwise use gridCellSize
        const baseSize = gridCellSize > 0 ? gridCellSize * 1.0 : 130; // Reduced from 1.2 to 1.0
        
        const material = {
            type: materialType,
            x: stone.x + offsetX,
            y: stone.y + offsetY,
            size: baseSize, // No variation - always the same size
            rotation: 0 // Always horizontal (no rotation)
        };
        
        numbers[currentNumber].materials.push(material);
        materialsAdded++;
    });
    
    // Render canvas to show the new materials only if materials were added
    if (materialsAdded > 0) {
        renderCanvas();
    }
}

function startEffectAdjustment(effect, delta) {
    // Stop any existing adjustment
    stopEffectAdjustment();
    
    currentEffectAdjustment = { effect, delta };
    
    // Apply immediately
    adjustEffect(effect, delta);
    
    // Then continue applying at intervals
    effectInterval = setInterval(() => {
        adjustEffect(effect, delta);
    }, 50); // Adjust every 50ms for smooth continuous change
}

function stopEffectAdjustment() {
    if (effectInterval) {
        clearInterval(effectInterval);
        effectInterval = null;
        currentEffectAdjustment = null;
    }
}

// Effects
function adjustEffect(effect, delta) {
    switch(effect) {
        case 'color':
            colorLevel = Math.max(0, Math.min(10, colorLevel + delta));
            // Update colors of existing stones
            numbers[currentNumber].stones.forEach(stone => {
                stone.color = getStoneColor();
            });
            break;
        case 'blend':
            blendLevel = Math.max(0, Math.min(1, blendLevel + delta));
            break;
        case 'stack':
            stackLevel = Math.max(0, Math.min(5, stackLevel + delta));
            break;
        case 'effect01':
            effect01Level = Math.max(0, Math.min(10, effect01Level + delta));
            // Add rotation or size variation
            numbers[currentNumber].stones.forEach(stone => {
                stone.rotation += delta * 5;
            });
            break;
    }
    renderCanvas();
}

// View switching
function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.view-option').forEach(opt => opt.classList.remove('active'));
    
    if (view === 'one') {
        document.getElementById('oneView').classList.add('active');
        document.querySelector('.workspace').classList.remove('hidden');
        document.getElementById('allViewContainer').classList.remove('active');
    } else {
        document.getElementById('allView').classList.add('active');
        document.querySelector('.workspace').classList.add('hidden');
        document.getElementById('allViewContainer').classList.add('active');
        renderAllView();
    }
}

function renderAllView() {
    const grid = document.getElementById('allViewGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i <= 9; i++) {
        const item = document.createElement('div');
        item.className = 'grid-item';
        
        const itemCanvas = document.createElement('canvas');
        itemCanvas.width = 700;
        itemCanvas.height = 1050;
        
        const itemCtx = itemCanvas.getContext('2d');
        
        // Draw gray number
        itemCtx.save();
        itemCtx.fillStyle = '#d0d0d0';
        itemCtx.font = '300 800px Lausanne, Helvetica, Arial, sans-serif';
        itemCtx.textAlign = 'center';
        itemCtx.textBaseline = 'middle';
        itemCtx.fillText(i.toString(), 350, 525);
        itemCtx.restore();
        
        // Render materials first (behind stones)
        if (numbers[i].materials && numbers[i].materials.length > 0) {
            numbers[i].materials.forEach(material => {
                drawMaterial(itemCtx, material, material.x, material.y);
            });
        }
        
        // Render stones on top
        if (blendLevel > 0) {
            itemCtx.globalCompositeOperation = 'multiply';
        }
        
        numbers[i].stones.forEach(stone => {
            itemCtx.save();
            itemCtx.translate(stone.x, stone.y);
            itemCtx.rotate((stone.rotation * Math.PI) / 180);
            
            const copies = Math.max(1, stackLevel);
            for (let j = 0; j < copies; j++) {
                const offset = j * 3;
                drawStone(itemCtx, stone.shape, offset, offset, stone.color);
            }
            
            itemCtx.restore();
        });
        
        itemCtx.globalCompositeOperation = 'source-over';
        
        item.appendChild(itemCanvas);
        
        item.onclick = () => {
            currentNumber = i;
            switchView('one');
            renderCanvas();
        };
        
        grid.appendChild(item);
    }
}

function changeNumber(delta) {
    saveNumbersToStorage(); // Save before changing number
    currentNumber = Math.max(0, Math.min(9, currentNumber + delta));
    // Note: drillClickCount is now per number, stored in numbers[i].drillClickCount
    updateDrillButtonNumber(); // Update button with new number
    renderCanvas();
}

async function clearCanvas() {
    // Clear all stones and materials from the current number
    numbers[currentNumber].stones = [];
    numbers[currentNumber].clickData = {};
    numbers[currentNumber].materials = [];
    numbers[currentNumber].drillClickCount = 0; // Reset drill click count
    saveNumbersToStorage(); // Save after clearing
    renderCanvas();
}

async function exportPDF() {
    // Create a container for all pages
    const pdfContainer = document.createElement('div');
    pdfContainer.style.width = '700px';
    pdfContainer.style.background = '#fff';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    document.body.appendChild(pdfContainer);
    
    // Render all 31 pages
    for (let day = 1; day <= 31; day++) {
        const page = document.createElement('div');
        page.style.width = '700px';
        page.style.height = '1050px';
        page.style.position = 'relative';
        page.style.background = '#fff';
        page.style.marginBottom = '20px';
        page.style.border = '1px solid #000';
        
        // Create canvas for this page
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = 700;
        pageCanvas.height = 1050;
        const pageCtx = pageCanvas.getContext('2d');
        
        // Draw gray day number
        pageCtx.save();
        pageCtx.fillStyle = '#d0d0d0';
        pageCtx.font = '300 800px Lausanne, Helvetica, Arial, sans-serif';
        pageCtx.textAlign = 'center';
        pageCtx.textBaseline = 'middle';
        pageCtx.fillText(day.toString(), 350, 525);
        pageCtx.restore();
        
        // Draw stones
        if (blendLevel > 0) {
            pageCtx.globalCompositeOperation = 'multiply';
        }
        
        days[day].stones.forEach(stone => {
            pageCtx.save();
            pageCtx.translate(stone.x, stone.y);
            pageCtx.rotate((stone.rotation * Math.PI) / 180);
            
            const copies = Math.max(1, stackLevel);
            for (let i = 0; i < copies; i++) {
                const offset = i * 3;
                drawStone(pageCtx, stone.shape, offset, offset, stone.color);
            }
            
            pageCtx.restore();
        });
        
        pageCtx.globalCompositeOperation = 'source-over';
        
        // Add labels
        const yearLabel = document.createElement('div');
        yearLabel.textContent = '2026';
        yearLabel.style.position = 'absolute';
        yearLabel.style.top = '20px';
        yearLabel.style.left = '20px';
        yearLabel.style.fontSize = '18px';
        yearLabel.style.fontFamily = 'Lausanne, Helvetica, Arial, sans-serif';
        
        const monthLabel = document.createElement('div');
        monthLabel.textContent = String(day).padStart(2, '0');
        monthLabel.style.position = 'absolute';
        monthLabel.style.top = '20px';
        monthLabel.style.right = '20px';
        monthLabel.style.fontSize = '18px';
        monthLabel.style.fontFamily = 'Lausanne, Helvetica, Arial, sans-serif';
        
        page.appendChild(pageCanvas);
        page.appendChild(yearLabel);
        page.appendChild(monthLabel);
        pdfContainer.appendChild(page);
    }
    
    // Wait a bit for rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generate PDF
    const opt = {
        margin: 0,
        filename: 'calendar-2026-01.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'px', format: [700, 1070], orientation: 'portrait' }
    };
    
    try {
        await html2pdf().set(opt).from(pdfContainer).save();
    } catch (error) {
        console.error('PDF export error:', error);
        alert('Fehler beim Exportieren des PDFs. Bitte versuchen Sie es erneut.');
    } finally {
        // Clean up
        document.body.removeChild(pdfContainer);
    }
}

// Calendar functions
function getDaysInMonth(monthIndex, year = 2026) {
    // monthIndex is 0-based (0 = January, 11 = December)
    return new Date(year, monthIndex + 1, 0).getDate();
}

function selectMonth(monthIndex) {
    currentMonth = monthIndex;
    
    // Update active state in UI
    document.querySelectorAll('.month-option').forEach((opt, idx) => {
        if (idx === monthIndex) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
    
    renderCalendarPages();
}

function renderCalendarPages() {
    const grid = document.getElementById('calendarPagesGrid');
    grid.innerHTML = '';
    
    // Get correct number of days in month
    const daysInMonth = getDaysInMonth(currentMonth, 2026);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const page = document.createElement('div');
        page.className = 'calendar-page';
        
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = 700;
        pageCanvas.height = 1050;
        const pageCtx = pageCanvas.getContext('2d');
        
        // Draw background
        pageCtx.fillStyle = '#fff';
        pageCtx.fillRect(0, 0, 700, 1050);
        
        // Draw year label (top left)
        pageCtx.save();
        pageCtx.fillStyle = '#000';
        pageCtx.font = '18px Lausanne, Helvetica, Arial, sans-serif';
        pageCtx.textAlign = 'left';
        pageCtx.textBaseline = 'top';
        pageCtx.fillText('2026', 20, 20);
        pageCtx.restore();
        
        // Draw month label (top right)
        pageCtx.save();
        pageCtx.fillStyle = '#000';
        pageCtx.font = '18px Lausanne, Helvetica, Arial, sans-serif';
        pageCtx.textAlign = 'right';
        pageCtx.textBaseline = 'top';
        pageCtx.fillText(monthNames[currentMonth], 680, 20);
        pageCtx.restore();
        
        // Get the number design(s) to use for this day
        // For days 1-9: use single digit (not "01" but "1")
        // For days 10-31: combine two digits
        const canvasWidth = 700;
        const canvasHeight = 1050;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const targetWidth = 200; // Fixed target width for all numbers (single or double digit)
        
        if (day < 10) {
            // Single digit: center it, scale to fixed size
            const numberData = numbers[day];
            if (numberData) {
                const bounds = getNumberBounds(numberData);
                const scale = targetWidth / bounds.width;
                const scaledHeight = bounds.height * scale;
                
                // Center the scaled number
                const offsetX = centerX - (bounds.minX + bounds.maxX) / 2 * scale;
                const offsetY = centerY - (bounds.minY + bounds.maxY) / 2 * scale;
                
                pageCtx.save();
                pageCtx.scale(scale, scale);
                renderNumberDesign(pageCtx, numberData, offsetX / scale, offsetY / scale);
                pageCtx.restore();
            }
        } else {
            // Two digits: each digit same size as single digit, position them next to each other, no gap
            const dayStr = String(day);
        const digit1 = parseInt(dayStr[0]);
        const digit2 = parseInt(dayStr[1]);
        
            const numberData1 = numbers[digit1];
            const numberData2 = numbers[digit2];
            
            if (numberData1 && numberData2) {
                const bounds1 = getNumberBounds(numberData1);
                const bounds2 = getNumberBounds(numberData2);
                
                // Scale each digit to targetWidth (same as single digit)
                const scale1 = targetWidth / bounds1.width;
                const scale2 = targetWidth / bounds2.width;
                
                // Calculate positions for both digits (centered, no gap)
                const scaledWidth1 = bounds1.width * scale1;
                const scaledWidth2 = bounds2.width * scale2;
                const totalScaledWidth = scaledWidth1 + scaledWidth2;
                
                // Position first digit (left)
                const offsetX1 = centerX - totalScaledWidth / 2 - bounds1.minX * scale1;
                const offsetY1 = centerY - (bounds1.minY + bounds1.maxY) / 2 * scale1;
                
                // Position second digit (right, directly next to first, no gap)
                const offsetX2 = centerX - totalScaledWidth / 2 + scaledWidth1 - bounds2.minX * scale2;
                const offsetY2 = centerY - (bounds2.minY + bounds2.maxY) / 2 * scale2;
                
                // Render first digit
                pageCtx.save();
                pageCtx.scale(scale1, scale1);
                renderNumberDesign(pageCtx, numberData1, offsetX1 / scale1, offsetY1 / scale1);
                pageCtx.restore();
                
                // Render second digit
                pageCtx.save();
                pageCtx.scale(scale2, scale2);
                renderNumberDesign(pageCtx, numberData2, offsetX2 / scale2, offsetY2 / scale2);
                pageCtx.restore();
            }
        }
        
        page.appendChild(pageCanvas);
        grid.appendChild(page);
    }
}

async function exportCalendarPDF() {
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
        alert('PDF-Bibliothek nicht geladen. Bitte Seite neu laden.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    
    // Get correct number of days in month
    const daysInMonth = getDaysInMonth(currentMonth, 2026);
    
    // Create PDF document
    const pdf = new jsPDF({
        unit: 'px',
        format: [700, 1050],
        orientation: 'portrait'
    });
    
    // Create all pages
    for (let day = 1; day <= daysInMonth; day++) {
        // Create canvas for this page with higher resolution for better quality
        const scale = 2; // 2x resolution for better quality
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = 700 * scale;
        pageCanvas.height = 1050 * scale;
        const pageCtx = pageCanvas.getContext('2d');
        
        // Scale context for higher resolution
        pageCtx.scale(scale, scale);
        
        // Fill white background
        pageCtx.fillStyle = '#fff';
        pageCtx.fillRect(0, 0, 700, 1050);
        
        // Draw border
        pageCtx.strokeStyle = '#000';
        pageCtx.lineWidth = 1;
        pageCtx.strokeRect(0, 0, 700, 1050);
        
        // Year label (top left)
        pageCtx.save();
        pageCtx.fillStyle = '#000';
        pageCtx.font = '18px Lausanne, Helvetica, Arial, sans-serif';
        pageCtx.textAlign = 'left';
        pageCtx.textBaseline = 'top';
        pageCtx.fillText('2026', 20, 20);
        pageCtx.restore();
        
        // Month label (top right)
        pageCtx.save();
        pageCtx.fillStyle = '#000';
        pageCtx.font = '18px Lausanne, Helvetica, Arial, sans-serif';
        pageCtx.textAlign = 'right';
        pageCtx.textBaseline = 'top';
        pageCtx.fillText(monthNames[currentMonth], 680, 20);
        pageCtx.restore();
        
        // Get the number design(s) to use for this day
        // For days 1-9: use single digit (not "01" but "1")
        // For days 10-31: combine two digits
        const canvasWidth = 700;
        const canvasHeight = 1050;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const targetWidth = 200; // Fixed target width for all numbers (single or double digit)
        
        if (day < 10) {
            // Single digit: center it, scale to fixed size
            const numberData = numbers[day];
            if (numberData) {
                const bounds = getNumberBounds(numberData);
                const scale = targetWidth / bounds.width;
                const scaledHeight = bounds.height * scale;
                
                // Center the scaled number
                const offsetX = centerX - (bounds.minX + bounds.maxX) / 2 * scale;
                const offsetY = centerY - (bounds.minY + bounds.maxY) / 2 * scale;
                
                pageCtx.save();
                pageCtx.scale(scale, scale);
                renderNumberDesign(pageCtx, numberData, offsetX / scale, offsetY / scale);
                pageCtx.restore();
            }
        } else {
            // Two digits: each digit same size as single digit, position them next to each other, no gap
            const dayStr = String(day);
        const digit1 = parseInt(dayStr[0]);
        const digit2 = parseInt(dayStr[1]);
        
            const numberData1 = numbers[digit1];
            const numberData2 = numbers[digit2];
            
            if (numberData1 && numberData2) {
                const bounds1 = getNumberBounds(numberData1);
                const bounds2 = getNumberBounds(numberData2);
                
                // Scale each digit to targetWidth (same as single digit)
                const scale1 = targetWidth / bounds1.width;
                const scale2 = targetWidth / bounds2.width;
                
                // Calculate positions for both digits (centered, no gap)
                const scaledWidth1 = bounds1.width * scale1;
                const scaledWidth2 = bounds2.width * scale2;
                const totalScaledWidth = scaledWidth1 + scaledWidth2;
                
                // Position first digit (left)
                const offsetX1 = centerX - totalScaledWidth / 2 - bounds1.minX * scale1;
                const offsetY1 = centerY - (bounds1.minY + bounds1.maxY) / 2 * scale1;
                
                // Position second digit (right, directly next to first, no gap)
                const offsetX2 = centerX - totalScaledWidth / 2 + scaledWidth1 - bounds2.minX * scale2;
                const offsetY2 = centerY - (bounds2.minY + bounds2.maxY) / 2 * scale2;
                
                // Render first digit
                pageCtx.save();
                pageCtx.scale(scale1, scale1);
                renderNumberDesign(pageCtx, numberData1, offsetX1 / scale1, offsetY1 / scale1);
                pageCtx.restore();
                
                // Render second digit
                pageCtx.save();
                pageCtx.scale(scale2, scale2);
                renderNumberDesign(pageCtx, numberData2, offsetX2 / scale2, offsetY2 / scale2);
                pageCtx.restore();
            }
        }
        
        // Convert canvas to image data URL with high quality
        const imgData = pageCanvas.toDataURL('image/png', 1.0);
        
        // Add page to PDF (except for first page which is already created)
        if (day > 1) {
            pdf.addPage([700, 1050], 'portrait');
        }
        
        // Add image to PDF page with original dimensions
        pdf.addImage(imgData, 'PNG', 0, 0, 700, 1050, undefined, 'FAST');
    }
    
    // Save PDF
    try {
        pdf.save(`calendar-2026-${monthNames[currentMonth]}.pdf`);
    } catch (error) {
        console.error('PDF export error:', error);
        alert('Fehler beim Exportieren des PDFs: ' + error.message);
    }
}

// Clock functionality
let clockInterval = null;

function initClock() {
    // Clear any existing interval
    if (clockInterval) {
        clearInterval(clockInterval);
    }
    
    // Update clock immediately
    updateClock();
    
    // Update clock every minute
    clockInterval = setInterval(updateClock, 60000);
}

function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Format as HH:MM (4 digits)
    const hourStr = String(hours).padStart(2, '0');
    const minuteStr = String(minutes).padStart(2, '0');
    
    const clockDisplay = document.getElementById('clockDisplay');
    clockDisplay.innerHTML = '';
    
    // Create container for clock numbers
    const clockNumbersContainer = document.createElement('div');
    clockNumbersContainer.className = 'clock-numbers-container';
    
    // Render hours as two-digit number (close together, no gap)
    const hoursContainer = document.createElement('div');
    hoursContainer.className = 'clock-two-digit';
    hoursContainer.style.display = 'flex';
    hoursContainer.style.alignItems = 'center';
    hoursContainer.style.gap = '0'; // No gap between digits
    renderTwoDigits(parseInt(hourStr[0]), parseInt(hourStr[1]), hoursContainer);
    clockNumbersContainer.appendChild(hoursContainer);
    
    // Add colon between hours and minutes
    const colon = document.createElement('div');
    colon.className = 'clock-colon';
    colon.textContent = ':';
    clockNumbersContainer.appendChild(colon);
    
    // Render minutes as two-digit number (close together, no gap)
    const minutesContainer = document.createElement('div');
    minutesContainer.className = 'clock-two-digit';
    minutesContainer.style.display = 'flex';
    minutesContainer.style.alignItems = 'center';
    minutesContainer.style.gap = '0'; // No gap between digits
    renderTwoDigits(parseInt(minuteStr[0]), parseInt(minuteStr[1]), minutesContainer);
    clockNumbersContainer.appendChild(minutesContainer);
    
    clockDisplay.appendChild(clockNumbersContainer);
}

// Render two digits next to each other with no gap
function renderTwoDigits(digit1, digit2, container) {
    const numberData1 = numbers[digit1];
    const numberData2 = numbers[digit2];
    
    if (!numberData1 || !numberData2) {
        // Fallback: render individual digits
        renderClockDigit(digit1, container);
        renderClockDigit(digit2, container);
        return;
    }
    
    // Calculate bounds for both digits
    const bounds1 = getNumberBounds(numberData1);
    const bounds2 = getNumberBounds(numberData2);
    
    // Create a container canvas for the two-digit number with high resolution
    const twoDigitCanvas = document.createElement('canvas');
    const canvasSize = 800; // Increased size to prevent clipping
    twoDigitCanvas.className = 'clock-digit-canvas';
    
    const twoDigitCtx = setupHighResCanvas(twoDigitCanvas, canvasSize, canvasSize);
    
    // Calculate total width and positioning
    const totalWidth = bounds1.width + bounds2.width;
    const maxHeight = Math.max(bounds1.height, bounds2.height);
    
    // Scale to fit in canvas (original size)
    const padding = 80;
    const scaleX = (canvasSize - padding * 2) / totalWidth;
    const scaleY = (canvasSize - padding * 2) / maxHeight;
    const scale = Math.min(scaleX, scaleY) * 0.8; // Back to original 0.8
    
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    
    // Position first digit (left)
    const offsetX1 = centerX - (totalWidth * scale) / 2 - bounds1.minX * scale;
    const offsetY1 = centerY - (bounds1.minY + bounds1.maxY) / 2 * scale;
    
    // Position second digit (right, directly next to first, no gap)
    const offsetX2 = centerX - (totalWidth * scale) / 2 + bounds1.width * scale - bounds2.minX * scale;
    const offsetY2 = centerY - (bounds2.minY + bounds2.maxY) / 2 * scale;
    
    // Render both digits
    twoDigitCtx.save();
    twoDigitCtx.scale(scale, scale);
    
    // Draw materials first (behind stones) - always keep their color
    if (numberData1.materials && numberData1.materials.length > 0) {
        numberData1.materials.forEach(material => {
            twoDigitCtx.save();
            twoDigitCtx.translate(offsetX1 / scale, offsetY1 / scale);
            drawMaterial(twoDigitCtx, material, material.x, material.y);
            twoDigitCtx.restore();
        });
    }
    if (numberData2.materials && numberData2.materials.length > 0) {
        numberData2.materials.forEach(material => {
            twoDigitCtx.save();
            twoDigitCtx.translate(offsetX2 / scale, offsetY2 / scale);
            drawMaterial(twoDigitCtx, material, material.x, material.y);
            twoDigitCtx.restore();
        });
    }
    
    // Draw stones on top - invert color if needed
    if (numberData1.stones && numberData1.stones.length > 0) {
        if (blendLevel > 0) {
            twoDigitCtx.globalCompositeOperation = 'multiply';
        }
        numberData1.stones.forEach(stone => {
            twoDigitCtx.save();
            twoDigitCtx.translate(offsetX1 / scale, offsetY1 / scale);
            twoDigitCtx.translate(stone.x, stone.y);
            twoDigitCtx.rotate((stone.rotation * Math.PI) / 180);
            const copies = Math.max(1, stackLevel);
            for (let j = 0; j < copies; j++) {
                const offset = j * 3;
                const stoneColor = clockInverted && stone.color === '#000000' ? '#ffffff' : stone.color;
                drawStone(twoDigitCtx, stone.shape, offset, offset, stoneColor);
            }
            twoDigitCtx.restore();
        });
    }
    if (numberData2.stones && numberData2.stones.length > 0) {
        if (blendLevel > 0) {
            twoDigitCtx.globalCompositeOperation = 'multiply';
        }
        numberData2.stones.forEach(stone => {
            twoDigitCtx.save();
            twoDigitCtx.translate(offsetX2 / scale, offsetY2 / scale);
            twoDigitCtx.translate(stone.x, stone.y);
            twoDigitCtx.rotate((stone.rotation * Math.PI) / 180);
            const copies = Math.max(1, stackLevel);
            for (let j = 0; j < copies; j++) {
                const offset = j * 3;
                const stoneColor = clockInverted && stone.color === '#000000' ? '#ffffff' : stone.color;
                drawStone(twoDigitCtx, stone.shape, offset, offset, stoneColor);
            }
            twoDigitCtx.restore();
        });
    }
    
    twoDigitCtx.globalCompositeOperation = 'source-over';
    twoDigitCtx.restore();
    
    const digitContainer = document.createElement('div');
    digitContainer.className = 'clock-digit';
    digitContainer.appendChild(twoDigitCanvas);
    container.appendChild(digitContainer);
}

function renderClockDigit(digit, container) {
    const digitContainer = document.createElement('div');
    digitContainer.className = 'clock-digit';
    
    // Create larger canvas for better visibility with high resolution
    const digitCanvas = document.createElement('canvas');
    const canvasSize = 800; // Increased size to prevent clipping
    digitCanvas.className = 'clock-digit-canvas';
    
    const digitCtx = setupHighResCanvas(digitCanvas, canvasSize, canvasSize);
    
    // Transparent background (no white fill, no border)
    
    // Get the number design from Step 2
    const numberData = numbers[digit];
    
    if (numberData && ((numberData.stones && numberData.stones.length > 0) || (numberData.materials && numberData.materials.length > 0))) {
        // Calculate scale to fit the design in the canvas
        // Find the bounds of the design (including both stones and materials)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        if (numberData.stones && numberData.stones.length > 0) {
            numberData.stones.forEach(stone => {
                stone.shape.forEach(point => {
                    const x = stone.x + point.x;
                    const y = stone.y + point.y;
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                });
            });
        }
        
        if (numberData.materials && numberData.materials.length > 0) {
            numberData.materials.forEach(material => {
                // Approximate bounds for materials
                const materialSize = material.size;
                minX = Math.min(minX, material.x - materialSize / 2);
                maxX = Math.max(maxX, material.x + materialSize / 2);
                minY = Math.min(minY, material.y - materialSize / 2);
                maxY = Math.max(maxY, material.y + materialSize / 2);
            });
        }
        
        const designWidth = maxX - minX;
        const designHeight = maxY - minY;
        const designCenterX = (minX + maxX) / 2;
        const designCenterY = (minY + maxY) / 2;
        
        // Scale to fit with some padding (original size)
        const padding = 80;
        const scaleX = (canvasSize - padding * 2) / designWidth;
        const scaleY = (canvasSize - padding * 2) / designHeight;
        const scale = Math.min(scaleX, scaleY) * 0.8; // Back to original 0.8
        
        // Center offset
        const offsetX = canvasSize / 2 - designCenterX * scale;
        const offsetY = canvasSize / 2 - designCenterY * scale;
        
        // Draw materials first (behind stones) - always keep their color
        if (numberData.materials && numberData.materials.length > 0) {
            numberData.materials.forEach(material => {
                digitCtx.save();
                digitCtx.translate(offsetX + material.x * scale, offsetY + material.y * scale);
                digitCtx.rotate((material.rotation * Math.PI) / 180);
                digitCtx.scale(scale, scale);
                
                // Draw material at origin (already translated)
                drawMaterial(digitCtx, material, 0, 0);
            
            digitCtx.restore();
        });
    }
    
        // Draw stones on top - invert color if needed
        if (numberData.stones && numberData.stones.length > 0) {
            // Apply blend mode if enabled
            if (blendLevel > 0) {
                digitCtx.globalCompositeOperation = 'multiply';
            }
            
            numberData.stones.forEach(stone => {
            digitCtx.save();
                digitCtx.translate(offsetX + stone.x * scale, offsetY + stone.y * scale);
            digitCtx.rotate((stone.rotation * Math.PI) / 180);
            digitCtx.scale(scale, scale);
            
            const copies = Math.max(1, stackLevel);
            for (let j = 0; j < copies; j++) {
                const offset = j * 3;
                    // Invert stone color if needed (black -> white)
                    const stoneColor = clockInverted && stone.color === '#000000' ? '#ffffff' : stone.color;
                    drawStone(digitCtx, stone.shape, offset, offset, stoneColor);
            }
            
            digitCtx.restore();
        });
    
    digitCtx.globalCompositeOperation = 'source-over';
        }
    } else {
        // If no design exists, draw a placeholder (transparent background)
        digitCtx.fillStyle = '#d0d0d0';
        digitCtx.font = '300px Lausanne, Helvetica, Arial, sans-serif';
        digitCtx.textAlign = 'center';
        digitCtx.textBaseline = 'middle';
        digitCtx.fillText(digit.toString(), canvasSize / 2, canvasSize / 2);
    }
    
    digitContainer.appendChild(digitCanvas);
    container.appendChild(digitContainer);
}

// Clock invert functionality
let clockInverted = false;

function toggleClockInvert() {
    clockInverted = !clockInverted;
    const clockView = document.getElementById('clockView');

        if (clockInverted) {
        // Invert: black background, white stones, materials keep their color
        clockView.style.background = '#000';
        } else {
        // Normal: white background
        clockView.style.background = '#fff';
        }
    
    // Re-render clock with inverted state
    updateClock();
}

window.addEventListener('load', init);
