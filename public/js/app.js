// Global state
let currentTab = 'home';
let uploadedFiles = [];
let sources = [];
let presentations = [];
let isLoggedIn = false;
let currentUser = null;
let generatedPresentationId = null;

// API base URL
const API_BASE = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up event listeners
    setupEventListeners();
    
    // Check for existing login state
    checkLoginState();
    
    // Load initial data
    loadSources();
    loadPresentations();
}

function checkLoginState() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        isLoggedIn = true;
        currentUser = JSON.parse(user);
        updateLoginState();
    }
}

function setupEventListeners() {
    // Generate form submission
    const generateForm = document.getElementById('generateForm');
    if (generateForm) {
        generateForm.addEventListener('submit', handleGeneratePresentation);
    }
    
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // File upload
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Drag and drop
    const uploadArea = document.querySelector('.border-dashed');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
    }
}

// Tab navigation functions
function showTab(tabName) {
    // Check if user is trying to access upload without login
    if (tabName === 'upload' && !isLoggedIn) {
        showNotification('Please login to access upload features', 'warning');
        showTab('login');
        return;
    }
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        currentTab = tabName;
    }
    
    // Update navigation
    updateNavigation();
}

function showManageTab(tabName) {
    // Hide all manage tabs
    document.querySelectorAll('.manage-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + '-section');
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
        currentManageTab = tabName;
    }
    
    // Add active class to button
    const activeButton = document.querySelector(`[onclick="showManageTab('${tabName}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

function updateNavigation() {
    // Update active nav link
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('text-blue-200');
    });
    
    const activeLink = document.querySelector(`nav a[href="#${currentTab}"]`);
    if (activeLink) {
        activeLink.classList.add('text-blue-200');
    }
}

// Generate presentation functionality
async function handleGeneratePresentation(event) {
    event.preventDefault();
    
    const formData = {
        topic: document.getElementById('topic').value,
        slideCount: parseInt(document.getElementById('slideCount').value),
        style: document.getElementById('style').value,
        requirements: document.getElementById('requirements').value
    };
    
    if (!formData.topic.trim()) {
        showNotification('Please enter a presentation topic', 'error');
        return;
    }
    
    try {
        showGenerationStatus();
        
        const response = await fetch(`${API_BASE}/presentations/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate presentation');
        }
        
        const result = await response.json();
        
        // Store the generated presentation ID
        generatedPresentationId = result.id || Date.now();
        
        // Show success message and enable download
        showGeneratedInfo();
        enableDownloadButton();
        
        showNotification('Presentation generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating presentation:', error);
        showNotification('Failed to generate presentation. Please try again.', 'error');
        hideGenerationStatus();
    }
}

// File upload functionality
function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    uploadFiles(files);
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    
    const files = Array.from(event.dataTransfer.files);
    uploadFiles(files);
}

async function uploadFiles(files) {
    if (files.length === 0) return;
    
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    
    try {
        showUploadProgress();
        
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const result = await response.json();
        
        showNotification(`${files.length} file(s) uploaded successfully!`, 'success');
        
        // Add to uploaded files
        uploadedFiles.push(...files.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
        })));
        
        // Refresh sources list
        loadSources();
        
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed. Please try again.', 'error');
    } finally {
        hideUploadProgress();
    }
}

function showUploadProgress() {
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('uploadStatus');
    
    if (progressDiv) {
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '0%';
        statusText.textContent = 'Uploading...';
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 90) progress = 90;
            progressBar.style.width = progress + '%';
        }, 200);
        
        // Store interval for cleanup
        progressDiv.dataset.interval = interval;
    }
}

function hideUploadProgress() {
    const progressDiv = document.getElementById('uploadProgress');
    if (progressDiv) {
        const interval = progressDiv.dataset.interval;
        if (interval) {
            clearInterval(interval);
        }
        
        const progressBar = document.getElementById('progressBar');
        const statusText = document.getElementById('uploadStatus');
        
        progressBar.style.width = '100%';
        statusText.textContent = 'Upload complete!';
        
        setTimeout(() => {
            progressDiv.classList.add('hidden');
        }, 1000);
    }
}

// Data loading functions
async function loadSources() {
    try {
        const response = await fetch(`${API_BASE}/sources`);
        if (response.ok) {
            const data = await response.json();
            sources = data.sources || [];
            renderSources();
        }
    } catch (error) {
        console.error('Error loading sources:', error);
    }
}

async function loadPresentations() {
    try {
        const response = await fetch(`${API_BASE}/presentations`);
        if (response.ok) {
            const data = await response.json();
            presentations = data.presentations || [];
            renderPresentations();
        }
    } catch (error) {
        console.error('Error loading presentations:', error);
    }
}

// Rendering functions
function renderSources() {
    const sourcesList = document.getElementById('sourcesList');
    if (!sourcesList) return;
    
    if (sources.length === 0) {
        sourcesList.innerHTML = '<p class="text-gray-500 text-center py-8">No approved sources yet. Upload presentations to get started.</p>';
        return;
    }
    
    sourcesList.innerHTML = sources.map(source => `
        <div class="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <i class="fas fa-file-powerpoint text-blue-600 text-xl"></i>
                <div>
                    <h4 class="font-medium">${source.name || 'Untitled'}</h4>
                    <p class="text-sm text-gray-500">${source.type || 'Presentation'}</p>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="viewSource('${source.id}')" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="deleteSource('${source.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderPresentations() {
    const presentationsList = document.getElementById('presentationsList');
    if (!presentationsList) return;
    
    if (presentations.length === 0) {
        presentationsList.innerHTML = '<p class="text-gray-500 text-center py-8">No presentations generated yet. Create your first presentation!</p>';
        return;
    }
    
    presentationsList.innerHTML = presentations.map(presentation => `
        <div class="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <i class="fas fa-presentation text-green-600 text-xl"></i>
                <div>
                    <h4 class="font-medium">${presentation.title}</h4>
                    <p class="text-sm text-gray-500">${presentation.slides} slides • ${presentation.style} style</p>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="viewPresentation('${presentation.id}')" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="downloadPresentation('${presentation.id}')" class="text-green-600 hover:text-green-800">
                    <i class="fas fa-download"></i>
                </button>
                <button onclick="deletePresentation('${presentation.id}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Generation status functions
function showGenerationStatus() {
    const statusDiv = document.getElementById('generationStatus');
    const progressBar = document.getElementById('generationProgress');
    
    if (statusDiv) {
        statusDiv.classList.remove('hidden');
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            progressBar.style.width = progress + '%';
        }, 500);
        
        // Store interval for cleanup
        statusDiv.dataset.interval = interval;
    }
}

function hideGenerationStatus() {
    const statusDiv = document.getElementById('generationStatus');
    if (statusDiv) {
        const interval = statusDiv.dataset.interval;
        if (interval) {
            clearInterval(interval);
        }
        statusDiv.classList.add('hidden');
    }
}

function showGeneratedInfo() {
    const infoDiv = document.getElementById('generatedInfo');
    if (infoDiv) {
        infoDiv.classList.remove('hidden');
    }
    hideGenerationStatus();
}

function enableDownloadButton() {
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Download presentation function
async function downloadPresentation() {
    if (!generatedPresentationId) {
        showNotification('No presentation generated yet', 'error');
        return;
    }
    
    try {
        showNotification('Preparing download...', 'info');
        
        const response = await fetch(`${API_BASE}/presentations/${generatedPresentationId}/download`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presentation-${generatedPresentationId}.pptx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('Download started!', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Download failed. Please try again.', 'error');
    }
}

// Login functionality
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showLoading('Logging in...');
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            throw new Error('Login failed');
        }
        
        const result = await response.json();
        
        // Store user data and token
        isLoggedIn = true;
        currentUser = result.user;
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Update UI
        updateLoginState();
        showNotification('Login successful!', 'success');
        showTab('home');
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please check your credentials.', 'error');
    } finally {
        hideLoading();
    }
}

function updateLoginState() {
    const loginNav = document.getElementById('loginNav');
    const uploadNav = document.getElementById('uploadNav');
    
    if (isLoggedIn) {
        if (loginNav) loginNav.style.display = 'none';
        if (uploadNav) uploadNav.style.display = 'block';
    } else {
        if (loginNav) loginNav.style.display = 'block';
        if (uploadNav) uploadNav.style.display = 'none';
    }
}

function showRegister() {
    showNotification('Registration functionality coming soon!', 'info');
}

// Action functions
function viewSource(id) {
    showNotification('View source functionality coming soon!', 'info');
}

function deleteSource(id) {
    if (confirm('Are you sure you want to delete this source?')) {
        // TODO: Implement delete API call
        showNotification('Source deleted successfully!', 'success');
        loadSources();
    }
}

function viewPresentation(id) {
    showNotification('View presentation functionality coming soon!', 'info');
}

function deletePresentation(id) {
    if (confirm('Are you sure you want to delete this presentation?')) {
        // TODO: Implement delete API call
        presentations = presentations.filter(p => p.id !== id);
        renderPresentations();
        showNotification('Presentation deleted successfully!', 'success');
    }
}

// Utility functions
function showLoading(message = 'Loading...') {
    // Create loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.innerHTML = `
        <div class="bg-white rounded-lg p-6 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas ${
                type === 'success' ? 'fa-check' :
                type === 'error' ? 'fa-times' :
                type === 'warning' ? 'fa-exclamation' :
                'fa-info'
            }"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function toggleMobileMenu() {
    // TODO: Implement mobile menu toggle
    showNotification('Mobile menu coming soon!', 'info');
}

// Export functions for global access
window.showTab = showTab;
window.showManageTab = showManageTab;
window.toggleMobileMenu = toggleMobileMenu;
