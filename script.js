let currentDay = 1;
let currentView = 'day';
let days = {};
let draggedShape = null;
let dragOffset = { x: 0, y: 0 };
let resizing = false;
let selectedShape = null;
let selectedShapeIndex = null;
let isDarkMode = false;

for (let i = 1; i <= 31; i++) {
    days[i] = { 
        shapes: [],
        textElements: {
            month: null,
            year: null,
            custom: null
        }
    };
}

const forms = [
    { name: 'Circle', svg: '<circle cx="50" cy="50" r="40"/>' },
    { name: 'Rectangle', svg: '<rect x="10" y="10" width="80" height="80"/>' },
    ...Array(18).fill(null).map((_, i) => ({
        name: `Form ${i + 3}`,
        svg: '<circle cx="50" cy="50" r="40"/>'
    }))
];

function init() {
    createFormsGrid();
    updatePreviewSize();
    updateGrid();
    setupEventListeners();
    createGridView();
    renderDay();
}

function createFormsGrid() {
    const grid = document.getElementById('formsGrid');
    forms.forEach((form, index) => {
        const item = document.createElement('div');
        item.className = 'form-item';
        item.innerHTML = `<svg viewBox="0 0 100 100">${form.svg}</svg>`;
        item.dataset.formIndex = index;
        
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const clone = item.cloneNode(true);
            clone.style.position = 'fixed';
            clone.style.left = e.clientX - 25 + 'px';
            clone.style.top = e.clientY - 25 + 'px';
            clone.style.width = '50px';
            clone.style.height = '50px';
            clone.style.pointerEvents = 'none';
            clone.style.zIndex = '1000';
            document.body.appendChild(clone);
            
            const handleMove = (moveE) => {
                clone.style.left = moveE.clientX - 25 + 'px';
                clone.style.top = moveE.clientY - 25 + 'px';
            };
            
            const handleUp = (upE) => {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleUp);
                document.body.removeChild(clone);
                
                const previewArea = document.getElementById('previewArea');
                const rect = previewArea.getBoundingClientRect();
                
                if (upE.clientX >= rect.left && upE.clientX <= rect.right &&
                    upE.clientY >= rect.top && upE.clientY <= rect.bottom) {
                    const x = upE.clientX - rect.left;
                    const y = upE.clientY - rect.top;
                    addShape(parseInt(item.dataset.formIndex), x, y);
                }
            };
            
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
        });
        
        grid.appendChild(item);
    });
}

function setupEventListeners() {
    document.getElementById('width').addEventListener('input', updatePreviewSize);
    document.getElementById('height').addEventListener('input', updatePreviewSize);
    document.getElementById('gridColor').addEventListener('input', updateGrid);
    document.getElementById('columns').addEventListener('input', (e) => {
        document.getElementById('columnsValue').textContent = e.target.value;
        updateGrid();
    });
    document.getElementById('rows').addEventListener('input', (e) => {
        document.getElementById('rowsValue').textContent = e.target.value;
        updateGrid();
    });
    document.getElementById('gridType').addEventListener('change', updateGrid);
    document.getElementById('gridEnabled').addEventListener('change', updateGrid);
    document.getElementById('blendEnabled').addEventListener('change', renderDay);
    document.getElementById('numberEnabled').addEventListener('change', toggleDayNumber);
    
    document.getElementById('monthEnabled').addEventListener('change', updateTextElements);
    document.getElementById('monthSelect').addEventListener('change', updateTextElements);
    document.getElementById('monthFontSize').addEventListener('input', (e) => {
        document.getElementById('monthFontValue').textContent = e.target.value;
        updateTextElements();
    });
    document.getElementById('yearEnabled').addEventListener('change', updateTextElements);
    document.getElementById('yearSelect').addEventListener('change', updateTextElements);
    document.getElementById('yearFontSize').addEventListener('input', (e) => {
        document.getElementById('yearFontValue').textContent = e.target.value;
        updateTextElements();
    });
    document.getElementById('customTextEnabled').addEventListener('change', updateTextElements);
    document.getElementById('customText').addEventListener('input', updateTextElements);
    document.getElementById('customFontSize').addEventListener('input', (e) => {
        document.getElementById('customFontValue').textContent = e.target.value;
        updateTextElements();
    });

    const canvas = document.getElementById('shapesCanvas');
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            if (selectedShapeIndex !== null) {
                const color = e.target.dataset.color;
                days[currentDay].shapes[selectedShapeIndex].color = color;
                renderDay();
                hideColorPalette();
            }
        });
    });

    document.addEventListener('click', (e) => {
        const palette = document.getElementById('colorPalette');
        if (!palette.contains(e.target) && !e.target.closest('.shapes-canvas')) {
            hideColorPalette();
        }
    });
}

function snapToGrid(value, gridSize) {
    if (gridSize === 0) return value;
    return Math.round(value / gridSize) * gridSize;
}

function addShape(formIndex, x, y) {
    const previewArea = document.getElementById('previewArea');
    const columns = parseInt(document.getElementById('columns').value);
    const rows = parseInt(document.getElementById('rows').value);
    
    const gridWidth = columns > 0 ? previewArea.offsetWidth / columns : 0;
    const gridHeight = rows > 0 ? previewArea.offsetHeight / rows : 0;
    
    const snappedX = columns > 0 ? snapToGrid(x - 50, gridWidth) : x - 50;
    const snappedY = rows > 0 ? snapToGrid(y - 50, gridHeight) : y - 50;
    const snappedWidth = columns > 0 ? Math.max(gridWidth, snapToGrid(100, gridWidth)) : 100;
    const snappedHeight = rows > 0 ? Math.max(gridHeight, snapToGrid(100, gridHeight)) : 100;
    
    const shape = {
        formIndex,
        x: snappedX,
        y: snappedY,
        width: snappedWidth,
        height: snappedHeight,
        color: '#000000'
    };
    days[currentDay].shapes.push(shape);
    renderDay();
}

function handleCanvasMouseDown(e) {
    const canvas = document.getElementById('shapesCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    for (let i = days[currentDay].shapes.length - 1; i >= 0; i--) {
        const shape = days[currentDay].shapes[i];
        if (x >= shape.x && x <= shape.x + shape.width &&
            y >= shape.y && y <= shape.y + shape.height) {
            
            const handleSize = 20;
            if (x >= shape.x + shape.width - handleSize &&
                y >= shape.y + shape.height - handleSize) {
                resizing = true;
                selectedShape = shape;
                selectedShapeIndex = i;
            } else {
                draggedShape = shape;
                selectedShapeIndex = i;
                dragOffset.x = x - shape.x;
                dragOffset.y = y - shape.y;
                showColorPalette(e.clientX, e.clientY);
            }
            return;
        }
    }
}

function handleMouseMove(e) {
    if (draggedShape) {
        const canvas = document.getElementById('shapesCanvas');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffset.x;
        const y = e.clientY - rect.top - dragOffset.y;
        
        const columns = parseInt(document.getElementById('columns').value);
        const rows = parseInt(document.getElementById('rows').value);
        const previewArea = document.getElementById('previewArea');
        
        const gridWidth = columns > 0 ? previewArea.offsetWidth / columns : 0;
        const gridHeight = rows > 0 ? previewArea.offsetHeight / rows : 0;
        
        draggedShape.x = columns > 0 ? snapToGrid(x, gridWidth) : x;
        draggedShape.y = rows > 0 ? snapToGrid(y, gridHeight) : y;
        
        renderDay();
    } else if (resizing && selectedShape) {
        const canvas = document.getElementById('shapesCanvas');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const columns = parseInt(document.getElementById('columns').value);
        const rows = parseInt(document.getElementById('rows').value);
        const previewArea = document.getElementById('previewArea');
        
        const gridWidth = columns > 0 ? previewArea.offsetWidth / columns : 0;
        const gridHeight = rows > 0 ? previewArea.offsetHeight / rows : 0;
        
        const newWidth = Math.max(20, x - selectedShape.x);
        const newHeight = Math.max(20, y - selectedShape.y);
        
        selectedShape.width = columns > 0 ? Math.max(gridWidth, snapToGrid(newWidth, gridWidth)) : newWidth;
        selectedShape.height = rows > 0 ? Math.max(gridHeight, snapToGrid(newHeight, gridHeight)) : newHeight;
        
        renderDay();
    }
}

function handleMouseUp() {
    draggedShape = null;
    resizing = false;
    selectedShape = null;
}

function showColorPalette(x, y) {
    const palette = document.getElementById('colorPalette');
    palette.style.display = 'flex';
    palette.style.left = x + 'px';
    palette.style.top = y + 'px';
}

function hideColorPalette() {
    const palette = document.getElementById('colorPalette');
    palette.style.display = 'none';
    selectedShapeIndex = null;
}

function renderDay() {
    const canvas = document.getElementById('shapesCanvas');
    const previewArea = document.getElementById('previewArea');
    canvas.width = previewArea.offsetWidth;
    canvas.height = previewArea.offsetHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const blendEnabled = document.getElementById('blendEnabled').checked;
    if (blendEnabled) {
        ctx.globalCompositeOperation = 'multiply';
    }
    
    days[currentDay].shapes.forEach((shape, index) => {
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.scale(shape.width / 100, shape.height / 100);
        ctx.fillStyle = shape.color;
        
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(`<svg>${forms[shape.formIndex].svg}</svg>`, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('circle, rect, path, polygon');
        
        if (svgElement.tagName === 'circle') {
            const cx = parseFloat(svgElement.getAttribute('cx'));
            const cy = parseFloat(svgElement.getAttribute('cy'));
            const r = parseFloat(svgElement.getAttribute('r'));
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        } else if (svgElement.tagName === 'rect') {
            const x = parseFloat(svgElement.getAttribute('x'));
            const y = parseFloat(svgElement.getAttribute('y'));
            const w = parseFloat(svgElement.getAttribute('width'));
            const h = parseFloat(svgElement.getAttribute('height'));
            ctx.fillRect(x, y, w, h);
        }
        
        ctx.restore();
        
        if (index === selectedShapeIndex) {
            ctx.strokeStyle = isDarkMode ? '#fff' : '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            
            ctx.fillStyle = isDarkMode ? '#000' : '#fff';
            ctx.fillRect(shape.x + shape.width - 6, shape.y + shape.height - 6, 12, 12);
            ctx.strokeStyle = isDarkMode ? '#fff' : '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(shape.x + shape.width - 6, shape.y + shape.height - 6, 12, 12);
        }
    });
    
    ctx.globalCompositeOperation = 'source-over';
    updateTextElements();
}

function updateTextElements() {
    const previewArea = document.getElementById('previewArea');
    const existingText = previewArea.querySelectorAll('.text-element');
    existingText.forEach(el => el.remove());

    const monthEnabled = document.getElementById('monthEnabled').checked;
    const yearEnabled = document.getElementById('yearEnabled').checked;
    const customEnabled = document.getElementById('customTextEnabled').checked;

    if (monthEnabled) {
        const month = document.getElementById('monthSelect').value;
        const fontSize = document.getElementById('monthFontSize').value;
        const saved = days[currentDay].textElements.month;
        const x = saved ? saved.x : 30;
        const y = saved ? saved.y : 30;
        createTextElement('month', month, x, y, fontSize);
    }

    if (yearEnabled) {
        const year = document.getElementById('yearSelect').value;
        const fontSize = document.getElementById('yearFontSize').value;
        const saved = days[currentDay].textElements.year;
        const x = saved ? saved.x : 30;
        const y = saved ? saved.y : 70;
        createTextElement('year', year, x, y, fontSize);
    }

    if (customEnabled) {
        const text = document.getElementById('customText').value;
        const fontSize = document.getElementById('customFontSize').value;
        if (text) {
            const saved = days[currentDay].textElements.custom;
            const x = saved ? saved.x : 30;
            const y = saved ? saved.y : 110;
            createTextElement('custom', text, x, y, fontSize);
        }
    }
}

function createTextElement(type, text, x, y, fontSize) {
    const previewArea = document.getElementById('previewArea');
    const textEl = document.createElement('div');
    textEl.className = 'text-element';
    textEl.textContent = text;
    textEl.style.left = x + 'px';
    textEl.style.top = y + 'px';
    textEl.style.fontSize = fontSize + 'px';
    textEl.dataset.type = type;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    textEl.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = previewArea.getBoundingClientRect();
        offsetX = e.clientX - rect.left - x;
        offsetY = e.clientY - rect.top - y;
        e.stopPropagation();
        e.preventDefault();
    });

    const handleMove = (e) => {
        if (isDragging) {
            const rect = previewArea.getBoundingClientRect();
            const newX = e.clientX - rect.left - offsetX;
            const newY = e.clientY - rect.top - offsetY;
            textEl.style.left = newX + 'px';
            textEl.style.top = newY + 'px';
            days[currentDay].textElements[type] = { x: newX, y: newY };
        }
    };

    const handleUp = () => {
        if (isDragging) {
            isDragging = false;
        }
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    previewArea.appendChild(textEl);
}

function updatePreviewSize() {
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    const previewArea = document.getElementById('previewArea');
    previewArea.style.width = width + 'px';
    previewArea.style.height = height + 'px';
    updateGrid();
    renderDay();
    createGridView();
}

function updateGrid() {
    const canvas = document.getElementById('gridCanvas');
    const previewArea = document.getElementById('previewArea');
    const width = previewArea.offsetWidth;
    const height = previewArea.offsetHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (!document.getElementById('gridEnabled').checked) return;

    const color = document.getElementById('gridColor').value;
    const columns = parseInt(document.getElementById('columns').value);
    const rows = parseInt(document.getElementById('rows').value);
    const type = document.getElementById('gridType').value;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    if (type === 'dotted') {
        ctx.setLineDash([2, 4]);
    } else {
        ctx.setLineDash([]);
    }

    for (let i = 0; i <= columns; i++) {
        const x = (width / columns) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (let i = 0; i <= rows; i++) {
        const y = (height / rows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function toggleDayNumber() {
    const dayNumber = document.getElementById('dayNumber');
    dayNumber.style.display = document.getElementById('numberEnabled').checked ? 'block' : 'none';
}

function changeDay(delta) {
    currentDay = Math.max(1, Math.min(31, currentDay + delta));
    document.getElementById('currentDay').textContent = currentDay;
    document.getElementById('dayNumber').textContent = currentDay;
    renderDay();
}

function toggleSection(sectionId) {
    const content = document.getElementById(sectionId);
    const header = content.previousElementSibling;
    const arrow = header.querySelector('.arrow');
    content.classList.toggle('expanded');
    arrow.classList.toggle('expanded');
}

function switchView(view) {
    currentView = view;
    const dayView = document.getElementById('dayView');
    const gridView = document.getElementById('gridView');
    const dayControls = document.getElementById('dayControls');
    const buttons = document.querySelectorAll('.view-btn');
    
    if (view === 'day') {
        dayView.style.display = 'flex';
        gridView.classList.remove('active');
        dayControls.style.display = 'flex';
        buttons[0].classList.add('active');
        buttons[1].classList.remove('active');
    } else {
        dayView.style.display = 'none';
        gridView.classList.add('active');
        dayControls.style.display = 'none';
        buttons[0].classList.remove('active');
        buttons[1].classList.add('active');
        renderGridView();
    }
}

function createGridView() {
    const gridView = document.getElementById('gridView');
    gridView.innerHTML = '';
    
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    const aspectRatio = height / width;
    
    for (let i = 1; i <= 31; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'grid-day-wrapper';
        wrapper.onclick = () => {
            currentDay = i;
            document.getElementById('currentDay').textContent = currentDay;
            document.getElementById('dayNumber').textContent = currentDay;
            switchView('day');
            renderDay();
        };
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'grid-day';
        dayDiv.style.aspectRatio = `1 / ${aspectRatio}`;
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        dayDiv.appendChild(canvas);
        wrapper.appendChild(dayDiv);
        gridView.appendChild(wrapper);
    }
}

function renderGridView() {
    const gridView = document.getElementById('gridView');
    const wrappers = gridView.querySelectorAll('.grid-day-wrapper');
    
    wrappers.forEach((wrapper, index) => {
        const day = index + 1;
        const canvas = wrapper.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.font = `${canvas.height * 0.6}px 'Roboto Mono', Courier New`;
        ctx.fillStyle = isDarkMode ? 'rgba(100, 100, 100, 0.3)' : 'rgba(200, 200, 200, 0.3)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(day, canvas.width / 2, canvas.height / 2);
        ctx.restore();
        
        const blendEnabled = document.getElementById('blendEnabled').checked;
        if (blendEnabled) {
            ctx.globalCompositeOperation = 'multiply';
        }
        
        days[day].shapes.forEach(shape => {
            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.scale(shape.width / 100, shape.height / 100);
            ctx.fillStyle = shape.color;
            
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(`<svg>${forms[shape.formIndex].svg}</svg>`, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('circle, rect, path, polygon');
            
            if (svgElement.tagName === 'circle') {
                const cx = parseFloat(svgElement.getAttribute('cx'));
                const cy = parseFloat(svgElement.getAttribute('cy'));
                const r = parseFloat(svgElement.getAttribute('r'));
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            } else if (svgElement.tagName === 'rect') {
                const x = parseFloat(svgElement.getAttribute('x'));
                const y = parseFloat(svgElement.getAttribute('y'));
                const w = parseFloat(svgElement.getAttribute('width'));
                const h = parseFloat(svgElement.getAttribute('height'));
                ctx.fillRect(x, y, w, h);
            }
            
            ctx.restore();
        });
    });
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    updateGrid();
    renderDay();
    if (currentView === 'grid') {
        renderGridView();
    }
}

function exportPDF() {
    alert('PDF Export functionality:\n\nThis will capture all 31 days and compile them into a single PDF document.');
}

window.addEventListener('load', init);