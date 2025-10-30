// Application State
const state = {
  originalImage: null,
  currentImage: null,
  adjustments: {
    whitening: 0,
    alignment: 0,
    gum: 0,
    tooth_shape: 0,
    brightness: 0
  },
  isShowingBefore: false,
  currentPreset: null
};

// Preset configurations
const presets = [
  {
    name: "Natural Smile",
    description: "Subtle, natural enhancements",
    values: { whitening: 30, alignment: 20, gum: 15, tooth_shape: 10, brightness: 25 }
  },
  {
    name: "Hollywood Smile",
    description: "Dramatic, bright transformation",
    values: { whitening: 100, alignment: 100, gum: 80, tooth_shape: 60, brightness: 90 }
  },
  {
    name: "Youthful Smile",
    description: "Playful, youthful appearance",
    values: { whitening: 60, alignment: 40, gum: 60, tooth_shape: 70, brightness: 60 }
  },
  {
    name: "Professional Smile",
    description: "Conservative, polished look",
    values: { whitening: 50, alignment: 60, gum: 30, tooth_shape: 40, brightness: 45 }
  }
];

// Adjustment configurations
const adjustments = [
  { id: "whitening", label: "Teeth Whitening", min: 0, max: 100, default: 0, unit: "%", icon: "✨" },
  { id: "alignment", label: "Alignment", min: 0, max: 100, default: 0, unit: "%", icon: "📐" },
  { id: "gum", label: "Gum Line", min: 0, max: 100, default: 0, unit: "%", icon: "🦷" },
  { id: "tooth_shape", label: "Tooth Shape", min: 0, max: 100, default: 0, unit: "%", icon: "✏️" },
  { id: "brightness", label: "Smile Brightness", min: 0, max: 100, default: 0, unit: "%", icon: "💫" }
];

// DOM Elements
let uploadZone, fileInput, welcomeSection, uploadSection, editorSection;
let mainCanvas, overlayCanvas, mainCtx, overlayCtx;
let toggleComparisonBtn, comparisonSlider, comparisonSliderContainer;
let downloadBtn, resetBtn, newPhotoBtn;
let presetsGrid, adjustmentsContainer;
let loadingOverlay, successMessage;

// Initialize application
function init() {
  // Get DOM elements
  uploadZone = document.getElementById('uploadZone');
  fileInput = document.getElementById('fileInput');
  welcomeSection = document.getElementById('welcome-section');
  uploadSection = document.getElementById('upload-section');
  editorSection = document.getElementById('editor-section');
  mainCanvas = document.getElementById('mainCanvas');
  overlayCanvas = document.getElementById('overlayCanvas');
  mainCtx = mainCanvas.getContext('2d');
  overlayCtx = overlayCanvas.getContext('2d');
  toggleComparisonBtn = document.getElementById('toggleComparison');
  comparisonSlider = document.getElementById('comparisonSlider');
  comparisonSliderContainer = document.getElementById('comparisonSliderContainer');
  downloadBtn = document.getElementById('downloadBtn');
  resetBtn = document.getElementById('resetBtn');
  newPhotoBtn = document.getElementById('newPhotoBtn');
  presetsGrid = document.getElementById('presetsGrid');
  adjustmentsContainer = document.getElementById('adjustmentsContainer');
  loadingOverlay = document.getElementById('loadingOverlay');
  successMessage = document.getElementById('successMessage');

  // Setup event listeners
  setupEventListeners();
  
  // Initialize UI
  initializePresets();
  initializeAdjustments();
}

// Setup event listeners
function setupEventListeners() {
  // File upload
  fileInput.addEventListener('change', handleFileSelect);
  uploadZone.addEventListener('click', () => fileInput.click());
  
  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
  
  // Comparison controls
  toggleComparisonBtn.addEventListener('click', toggleComparison);
  comparisonSlider.addEventListener('input', updateComparison);
  
  // Action buttons
  downloadBtn.addEventListener('click', downloadDesign);
  resetBtn.addEventListener('click', resetAdjustments);
  newPhotoBtn.addEventListener('click', loadNewPhoto);
}

// Initialize presets
function initializePresets() {
  presetsGrid.innerHTML = '';
  presets.forEach((preset, index) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.innerHTML = `
      <h4>${preset.name}</h4>
      <p>${preset.description}</p>
    `;
    btn.addEventListener('click', () => applyPreset(index));
    presetsGrid.appendChild(btn);
  });
}

// Initialize adjustments
function initializeAdjustments() {
  adjustmentsContainer.innerHTML = '';
  adjustments.forEach(adjustment => {
    const item = document.createElement('div');
    item.className = 'adjustment-item';
    item.innerHTML = `
      <div class="adjustment-header">
        <label class="adjustment-label">
          <span>${adjustment.icon}</span>
          ${adjustment.label}
        </label>
        <span class="adjustment-value" id="value-${adjustment.id}">0${adjustment.unit}</span>
      </div>
      <input type="range" 
        class="slider" 
        id="slider-${adjustment.id}" 
        min="${adjustment.min}" 
        max="${adjustment.max}" 
        value="${adjustment.default}">
    `;
    adjustmentsContainer.appendChild(item);
    
    // Add event listener
    const slider = item.querySelector('.slider');
    slider.addEventListener('input', (e) => {
      handleAdjustmentChange(adjustment.id, parseInt(e.target.value));
    });
  });
}

// Handle file selection
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

// Handle file
function handleFile(file) {
  // Validate file type
  if (!file.type.match('image/(jpeg|png)')) {
    alert('Please upload a JPG or PNG image.');
    return;
  }
  
  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB.');
    return;
  }
  
  showLoading(true);
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.originalImage = img;
      setupCanvas(img);
      showEditor();
      applyEffects();
      showLoading(false);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Setup canvas
function setupCanvas(img) {
  const maxWidth = 800;
  const maxHeight = 600;
  let width = img.width;
  let height = img.height;
  
  // Scale to fit
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  mainCanvas.width = width;
  mainCanvas.height = height;
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  
  // Position overlay canvas
  overlayCanvas.style.width = mainCanvas.offsetWidth + 'px';
  overlayCanvas.style.height = mainCanvas.offsetHeight + 'px';
}

// Show editor
function showEditor() {
  welcomeSection.style.display = 'none';
  uploadSection.style.display = 'none';
  editorSection.style.display = 'block';
}

// Apply effects
function applyEffects() {
  if (!state.originalImage) return;
  
  const img = state.originalImage;
  const width = mainCanvas.width;
  const height = mainCanvas.height;
  
  // Clear canvas
  mainCtx.clearRect(0, 0, width, height);
  
  // Draw original image
  mainCtx.drawImage(img, 0, 0, width, height);
  
  // Get image data
  const imageData = mainCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Apply whitening effect
  if (state.adjustments.whitening > 0) {
    applyWhitening(data, state.adjustments.whitening / 100);
  }
  
  // Apply brightness
  if (state.adjustments.brightness > 0) {
    applyBrightness(data, state.adjustments.brightness / 100);
  }
  
  // Apply alignment effect (subtle horizontal stretch in center)
  if (state.adjustments.alignment > 0) {
    // This is visual only - real alignment would require tooth detection
  }
  
  // Put modified image data back
  mainCtx.putImageData(imageData, 0, 0);
  
  // Draw overlay effects
  drawOverlay();
}

// Apply whitening effect
function applyWhitening(data, intensity) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Detect tooth-like colors (bright, slightly yellow/cream)
    const isToothColor = (
      r > 120 && g > 100 && b > 80 && // Bright enough
      r >= g && g >= b - 20 && // Yellowish/cream tint
      Math.abs(r - g) < 50 // Not too colored
    );
    
    if (isToothColor) {
      // Increase brightness and reduce yellow
      const whitenFactor = intensity * 0.3;
      data[i] = Math.min(255, r + (255 - r) * whitenFactor); // Red
      data[i + 1] = Math.min(255, g + (255 - g) * whitenFactor); // Green
      data[i + 2] = Math.min(255, b + (255 - b) * whitenFactor * 1.2); // Blue (more to reduce yellow)
    }
  }
}

// Apply brightness effect
function applyBrightness(data, intensity) {
  const brightnessFactor = intensity * 30;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Only brighten lighter areas (smile area)
    if (r > 80 || g > 80 || b > 80) {
      data[i] = Math.min(255, r + brightnessFactor);
      data[i + 1] = Math.min(255, g + brightnessFactor);
      data[i + 2] = Math.min(255, b + brightnessFactor);
    }
  }
}

// Draw overlay
function drawOverlay() {
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  
  // Draw tooth detection visualization if adjustments are active
  if (state.adjustments.whitening > 20 || state.adjustments.alignment > 20) {
    const imageData = mainCtx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    const data = imageData.data;
    
    overlayCtx.fillStyle = 'rgba(30, 136, 229, 0.1)';
    overlayCtx.strokeStyle = 'rgba(30, 136, 229, 0.4)';
    overlayCtx.lineWidth = 2;
    
    // Simple tooth area detection (center of image, bright areas)
    const centerX = mainCanvas.width / 2;
    const centerY = mainCanvas.height / 2;
    const width = mainCanvas.width * 0.4;
    const height = mainCanvas.height * 0.2;
    
    // Draw detection zone
    overlayCtx.strokeRect(
      centerX - width / 2,
      centerY - height / 4,
      width,
      height
    );
  }
}

// Handle adjustment change
function handleAdjustmentChange(id, value) {
  state.adjustments[id] = value;
  state.currentPreset = null; // Clear preset selection
  
  // Update value display
  const valueDisplay = document.getElementById(`value-${id}`);
  const adjustment = adjustments.find(a => a.id === id);
  valueDisplay.textContent = value + adjustment.unit;
  
  // Update preset buttons
  updatePresetButtons();
  
  // Apply effects
  applyEffects();
}

// Apply preset
function applyPreset(index) {
  const preset = presets[index];
  state.currentPreset = index;
  
  // Update adjustments
  Object.keys(preset.values).forEach(key => {
    state.adjustments[key] = preset.values[key];
    
    // Update slider
    const slider = document.getElementById(`slider-${key}`);
    if (slider) {
      slider.value = preset.values[key];
    }
    
    // Update value display
    const valueDisplay = document.getElementById(`value-${key}`);
    const adjustment = adjustments.find(a => a.id === key);
    if (valueDisplay && adjustment) {
      valueDisplay.textContent = preset.values[key] + adjustment.unit;
    }
  });
  
  // Update preset buttons
  updatePresetButtons();
  
  // Apply effects
  applyEffects();
}

// Update preset buttons
function updatePresetButtons() {
  const buttons = presetsGrid.querySelectorAll('.preset-btn');
  buttons.forEach((btn, index) => {
    if (index === state.currentPreset) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Toggle comparison
function toggleComparison() {
  state.isShowingBefore = !state.isShowingBefore;
  
  if (state.isShowingBefore) {
    // Show original
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    mainCtx.drawImage(state.originalImage, 0, 0, mainCanvas.width, mainCanvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    document.getElementById('comparisonLabel').textContent = 'Show After';
    comparisonSliderContainer.style.display = 'none';
  } else {
    // Show edited
    applyEffects();
    document.getElementById('comparisonLabel').textContent = 'Show Before';
    comparisonSliderContainer.style.display = 'block';
  }
}

// Update comparison
function updateComparison() {
  const value = comparisonSlider.value / 100;
  const width = mainCanvas.width;
  const height = mainCanvas.height;
  const splitX = width * value;
  
  mainCtx.clearRect(0, 0, width, height);
  
  // Draw original on left
  mainCtx.save();
  mainCtx.beginPath();
  mainCtx.rect(0, 0, splitX, height);
  mainCtx.clip();
  mainCtx.drawImage(state.originalImage, 0, 0, width, height);
  mainCtx.restore();
  
  // Draw edited on right
  mainCtx.save();
  mainCtx.beginPath();
  mainCtx.rect(splitX, 0, width - splitX, height);
  mainCtx.clip();
  
  // Re-apply effects for right side
  mainCtx.drawImage(state.originalImage, 0, 0, width, height);
  const imageData = mainCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  if (state.adjustments.whitening > 0) {
    applyWhitening(data, state.adjustments.whitening / 100);
  }
  if (state.adjustments.brightness > 0) {
    applyBrightness(data, state.adjustments.brightness / 100);
  }
  
  mainCtx.putImageData(imageData, 0, 0);
  mainCtx.restore();
  
  // Draw split line
  overlayCtx.clearRect(0, 0, width, height);
  overlayCtx.strokeStyle = '#fff';
  overlayCtx.lineWidth = 3;
  overlayCtx.beginPath();
  overlayCtx.moveTo(splitX, 0);
  overlayCtx.lineTo(splitX, height);
  overlayCtx.stroke();
  
  // Draw labels
  overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  overlayCtx.fillRect(10, 10, 80, 30);
  overlayCtx.fillRect(width - 90, 10, 80, 30);
  
  overlayCtx.fillStyle = '#fff';
  overlayCtx.font = '14px sans-serif';
  overlayCtx.fillText('Before', 20, 30);
  overlayCtx.fillText('After', width - 70, 30);
}

// Download design
function downloadDesign() {
  showLoading(true);
  
  setTimeout(() => {
    const link = document.createElement('a');
    link.download = 'smile-design.png';
    link.href = mainCanvas.toDataURL('image/png');
    link.click();
    
    showLoading(false);
    showSuccess();
  }, 500);
}

// Reset adjustments
function resetAdjustments() {
  // Reset state
  Object.keys(state.adjustments).forEach(key => {
    state.adjustments[key] = 0;
  });
  state.currentPreset = null;
  
  // Reset sliders
  adjustments.forEach(adjustment => {
    const slider = document.getElementById(`slider-${adjustment.id}`);
    if (slider) {
      slider.value = 0;
    }
    
    const valueDisplay = document.getElementById(`value-${adjustment.id}`);
    if (valueDisplay) {
      valueDisplay.textContent = '0' + adjustment.unit;
    }
  });
  
  // Update UI
  updatePresetButtons();
  applyEffects();
}

// Load new photo
function loadNewPhoto() {
  state.originalImage = null;
  state.currentImage = null;
  state.currentPreset = null;
  resetAdjustments();
  
  editorSection.style.display = 'none';
  welcomeSection.style.display = 'block';
  uploadSection.style.display = 'block';
  
  fileInput.value = '';
}

// Show/hide loading
function showLoading(show) {
  loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Show success message
function showSuccess() {
  successMessage.style.display = 'flex';
  setTimeout(() => {
    successMessage.style.display = 'none';
  }, 3000);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}