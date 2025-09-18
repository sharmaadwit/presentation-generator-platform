// Global state
let currentTab = 'home';
let uploadedFiles = [];
let sources = [];
let presentations = [];
let isLoggedIn = false;
let currentUser = null;
let generatedPresentationId = null;

// Analytics state
let analyticsData = {};
let charts = {};

// API base URL - Dynamic configuration
const API_BASE = window.location.hostname === 'localhost' ? '/api' : `${window.location.protocol}//${window.location.hostname}:5000/api`;
const AI_SERVICE_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8000' : `${window.location.protocol}//${window.location.hostname}:8000`;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeTrainingSystem();
});

function initializeApp() {
    // Set up event listeners
    setupEventListeners();
    
    // Check for existing login state
    checkLoginState();
    
    // Handle URL routing
    handleURLRouting();
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', handleURLRouting);
    
    // Only load data if user is logged in
    if (isLoggedIn) {
        loadSources();
        loadPresentations();
    }
}

function handleURLRouting() {
    const path = window.location.pathname;
    
    // Handle specific routes
    if (path === '/upload') {
        if (!isLoggedIn) {
            showNotification('Please login to access admin features', 'warning');
            showTab('login');
        } else {
            showTab('upload');
        }
    } else if (path === '/dashboard') {
        if (!isLoggedIn) {
            showNotification('Please login to access admin features', 'warning');
            showTab('login');
        } else {
            showTab('dashboard');
        }
    } else if (path === '/admin') {
        if (!isLoggedIn) {
            showNotification('Please login to access admin features', 'warning');
            showTab('login');
        } else {
            showTab('adminDashboard');
        }
    } else if (path === '/generate') {
        showTab('generate');
    } else if (path === '/login') {
        showTab('login');
    } else if (path === '/logout') {
        handleLogout();
    } else {
        // Default to home
        showTab('home');
    }
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
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.getAttribute('data-tab');
            if (tab) {
                showTab(tab);
            }
        });
    });
    
    // Start generate button
    const startGenerateBtn = document.getElementById('startGenerateBtn');
    if (startGenerateBtn) {
        startGenerateBtn.addEventListener('click', () => showTab('generate'));
    }
    
    // Download buttons
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPresentation);
    }
    
    const downloadNowBtn = document.getElementById('downloadNowBtn');
    if (downloadNowBtn) {
        downloadNowBtn.addEventListener('click', downloadPresentation);
    }
    
    // Choose files button
    const chooseFilesBtn = document.getElementById('chooseFilesBtn');
    if (chooseFilesBtn) {
        chooseFilesBtn.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }
    
    // Mobile menu button
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Show register button
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', showRegister);
    }
    
    // Feature cards
    const generateCard = document.getElementById('generateCard');
    if (generateCard) {
        generateCard.addEventListener('click', () => showTab('generate'));
    }

    const adminLoginCard = document.getElementById('adminLoginCard');
    if (adminLoginCard) {
        adminLoginCard.addEventListener('click', () => showTab('login'));
    }

    const uploadCard = document.getElementById('uploadCard');
    if (uploadCard) {
        uploadCard.addEventListener('click', () => showTab('upload'));
    }

    const analyticsCard = document.getElementById('analyticsCard');
    if (analyticsCard) {
        analyticsCard.addEventListener('click', () => showTab('dashboard'));
    }

    // Logout button
    const logoutNav = document.getElementById('logoutNav');
    if (logoutNav) {
        logoutNav.addEventListener('click', handleLogout);
    }

    // File management buttons
    const refreshFilesBtn = document.getElementById('refreshFilesBtn');
    if (refreshFilesBtn) {
        refreshFilesBtn.addEventListener('click', loadFiles);
    }
    
    const refreshUploadFilesBtn = document.getElementById('refreshUploadFilesBtn');
    if (refreshUploadFilesBtn) {
        refreshUploadFilesBtn.addEventListener('click', loadFiles);
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
    
    // Check if user is trying to access dashboard without login
    if (tabName === 'dashboard' && !isLoggedIn) {
        showNotification('Please login to access dashboard', 'warning');
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
        
    // Load files when admin dashboard or upload tab is shown
    if ((tabName === 'adminDashboard' || tabName === 'upload') && isLoggedIn) {
        loadFiles();
    }
    
    // Load analytics when dashboard tab is shown
    if (tabName === 'dashboard' && isLoggedIn) {
        loadAnalytics();
    }
    
    // Load trained documents when trained documents tab is shown
    if (tabName === 'trainedDocuments' && isLoggedIn) {
        initializeTrainedDocuments();
    }
    }
    
    // Update URL based on tab
    updateURL(tabName);
    
    // Update navigation
    updateNavigation();
}

function updateURL(tabName) {
    let newPath = '/';
    
    switch (tabName) {
        case 'upload':
            newPath = '/upload';
            break;
        case 'dashboard':
            newPath = '/dashboard';
            break;
        case 'adminDashboard':
            newPath = '/admin';
            break;
        case 'generate':
            newPath = '/generate';
            break;
        case 'trainedDocuments':
            newPath = '/trained';
            break;
        case 'login':
            newPath = '/login';
            break;
        case 'home':
        default:
            newPath = '/';
            break;
    }
    
    // Update URL without page reload
    if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
    }
}

// Remove this function as it's no longer needed

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
        
        // Call the actual presentation generation API
        const response = await fetch(`${API_BASE}/presentations/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || 'admin-token'}`
            },
            body: JSON.stringify({
                useCase: formData.topic,
                customer: 'General Customer',
                industry: 'General',
                targetAudience: 'General Audience',
                presentationLength: formData.slideCount <= 5 ? 'short' : formData.slideCount <= 10 ? 'medium' : 'long',
                style: formData.style,
                additionalRequirements: formData.requirements,
                requirements: formData.requirements
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to generate presentation');
        }
        
        const result = await response.json();
        
        // Store the generated presentation ID
        generatedPresentationId = result.presentationId;
        
        // Show success message and enable download
        showGeneratedInfo();
        enableDownloadButton();
        
        showNotification('Presentation generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating presentation:', error);
        
        // Provide specific guidance based on error type
        let errorMessage = error.message;
        if (errorMessage.includes('No trained data') || errorMessage.includes('no trained data')) {
            errorMessage = `No trained data available. Please:
            1. Upload and approve relevant PowerPoint presentations first
            2. Train the system using the "Train Now" button
            3. Provide more specific requirements (industry, use case, target audience)
            4. Ensure your uploaded files contain relevant content for your topic`;
        } else if (errorMessage.includes('No relevant content')) {
            errorMessage = `No relevant content found. Please:
            1. Upload presentations that match your topic and industry
            2. Provide more detailed requirements and context
            3. Try different keywords or industry specifications
            4. Check that your uploaded files are properly approved and trained`;
        }
        
        showNotification(errorMessage, 'error');
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
    
    if (!isLoggedIn) {
        showNotification('Please login to upload files', 'warning');
        return;
    }
    
    const formData = new FormData();
    files.forEach(file => {
        formData.append('files', file);
    });
    
    try {
        showUploadProgress();
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/sources/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
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
    if (!isLoggedIn) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/sources/approved`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
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
    if (!isLoggedIn) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/presentations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
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
        
        // Call the actual download API
        const response = await fetch(`${API_BASE}/presentations/${generatedPresentationId}/download`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || 'admin-token'}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to download presentation');
        }
        
        // Get the filename from the response headers
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
            ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
            : `presentation-${generatedPresentationId}.pptx`;
        
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('Download started!', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        showNotification(`Download failed: ${error.message}`, 'error');
    }
}

// Login functionality
async function handleLogin(event) {
    event.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    
    if (!userId || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showLoading('Logging in...');
        
        // Simulate login delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check admin credentials
        if (userId === 'admin' && password === 'letmein123') {
            isLoggedIn = true;
            currentUser = {
                id: '00000000-0000-0000-0000-000000000001',
                userId: 'admin',
                name: 'Admin User',
                role: 'admin',
                subscriptionTier: 'admin',
                presentationsGenerated: 0,
                monthlyLimit: 999
            };
            localStorage.setItem('token', 'admin-token-' + Date.now());
            localStorage.setItem('user', JSON.stringify(currentUser));

            // Update UI
            updateLoginState();
            showNotification('Admin login successful!', 'success');
            showTab('adminDashboard');
        } else {
            showNotification('Invalid admin credentials. User ID: admin, Password: letmein123', 'error');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function updateLoginState() {
    const loginNav = document.getElementById('loginNav');
    const adminNav = document.getElementById('adminNav');
    const uploadNav = document.getElementById('uploadNav');
    const dashboardNav = document.getElementById('dashboardNav');
    const logoutNav = document.getElementById('logoutNav');
    const uploadCard = document.getElementById('uploadCard');
    
    if (isLoggedIn) {
        if (loginNav) loginNav.style.display = 'none';
        if (adminNav) adminNav.style.display = 'block';
        if (uploadNav) uploadNav.style.display = 'block';
        if (dashboardNav) dashboardNav.style.display = 'block';
        if (logoutNav) logoutNav.style.display = 'block';
        
        // Update upload card for logged-in state
        if (uploadCard) {
            const clickText = uploadCard.querySelector('.mt-4');
            if (clickText) {
                clickText.innerHTML = '<i class="fas fa-arrow-right mr-2"></i>Click to upload files';
                clickText.className = 'mt-4 text-blue-600 font-medium';
            }
        }
    } else {
        if (loginNav) loginNav.style.display = 'block';
        if (adminNav) adminNav.style.display = 'none';
        if (uploadNav) uploadNav.style.display = 'none';
        if (dashboardNav) dashboardNav.style.display = 'none';
        if (logoutNav) logoutNav.style.display = 'none';
        
        // Update upload card for logged-out state
        if (uploadCard) {
            const clickText = uploadCard.querySelector('.mt-4');
            if (clickText) {
                clickText.innerHTML = '<i class="fas fa-lock mr-2"></i>Login required to access';
                clickText.className = 'mt-4 text-orange-600 font-medium';
            }
        }
    }
}

function showRegister() {
    showNotification('Registration functionality coming soon!', 'info');
}

// Logout functionality
async function handleLogout() {
    try {
        // Call logout API
        const token = localStorage.getItem('token');
        if (token) {
            try {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (apiError) {
                console.warn('Logout API call failed:', apiError);
                // Continue with client-side logout even if API fails
            }
        }
        
        // Clear user session
        isLoggedIn = false;
        currentUser = null;
        
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Update UI
        updateLoginState();
        
        // Show notification
        showNotification('Logged out successfully', 'success');
        
        // Redirect to home page
        showTab('home');
        
        // Update URL to home
        window.history.pushState({}, '', '/');
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed. Please try again.', 'error');
    }
}

// File management functions
async function loadFiles() {
    // Determine which tab is active and get the appropriate elements
    const isUploadTab = currentTab === 'upload';
    const filesLoading = document.getElementById(isUploadTab ? 'uploadFilesLoading' : 'filesLoading');
    const filesList = document.getElementById(isUploadTab ? 'uploadFilesList' : 'filesList');
    const noFilesMessage = document.getElementById(isUploadTab ? 'uploadNoFilesMessage' : 'noFilesMessage');
    
    try {
        // Show loading state
        if (filesLoading) filesLoading.style.display = 'block';
        if (filesList) filesList.innerHTML = '';
        if (noFilesMessage) noFilesMessage.style.display = 'none';
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/upload/files`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load files');
        }
        
        const data = await response.json();
        const files = data.files || [];
        
        // Hide loading state
        if (filesLoading) filesLoading.style.display = 'none';
        
        if (files.length === 0) {
            if (noFilesMessage) noFilesMessage.style.display = 'block';
        } else {
            if (filesList) {
                filesList.innerHTML = files.map(file => createFileCard(file)).join('');
                // Add event delegation for buttons
                addFileButtonEventListeners();
            }
        }
        
    } catch (error) {
        console.error('Error loading files:', error);
        if (filesLoading) filesLoading.style.display = 'none';
        showNotification('Failed to load files', 'error');
    }
}

function addFileButtonEventListeners() {
    // Add event delegation for download buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.download-btn')) {
            const button = e.target.closest('.download-btn');
            const fileId = button.getAttribute('data-file-id');
            downloadFile(fileId);
        }
        
        if (e.target.closest('.delete-btn')) {
            const button = e.target.closest('.delete-btn');
            const fileId = button.getAttribute('data-file-id');
            const fileName = button.getAttribute('data-file-name');
            deleteFile(fileId, fileName);
        }
        
        if (e.target.closest('.approve-btn')) {
            const button = e.target.closest('.approve-btn');
            const fileId = button.getAttribute('data-file-id');
            const fileName = button.getAttribute('data-file-name');
            approveFile(fileId, fileName);
        }
        
        if (e.target.closest('.reject-btn')) {
            const button = e.target.closest('.reject-btn');
            const fileId = button.getAttribute('data-file-id');
            const fileName = button.getAttribute('data-file-name');
            rejectFile(fileId, fileName);
        }
    });
}

function createFileCard(file) {
    const fileSize = formatFileSize(file.size);
    const uploadDate = new Date(file.createdAt).toLocaleDateString();
    const statusColor = getStatusColor(file.status);
    
    // Show approval buttons for pending files
    const approvalButtons = file.status === 'pending' ? `
        <div class="flex space-x-2 mt-2">
            <button class="approve-btn bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors" 
                    data-file-id="${file.id}" data-file-name="${file.originalName}" title="Approve File">
                <i class="fas fa-check mr-1"></i> Approve
            </button>
            <button class="reject-btn bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors" 
                    data-file-id="${file.id}" data-file-name="${file.originalName}" title="Reject File">
                <i class="fas fa-times mr-1"></i> Reject
            </button>
        </div>
    ` : '';
    
    return `
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center mb-2">
                        <i class="fas fa-file-powerpoint text-blue-600 text-xl mr-3"></i>
                        <div>
                            <h4 class="font-medium text-gray-900">${file.originalName}</h4>
                            <p class="text-sm text-gray-500">${fileSize} • ${uploadDate}</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2 mb-3">
                        <span class="px-2 py-1 bg-${statusColor}-100 text-${statusColor}-800 text-xs rounded-full">
                            ${file.status || 'Unknown'}
                        </span>
                        ${file.industry ? `<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">${file.industry}</span>` : ''}
                        ${file.type ? `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">${file.type}</span>` : ''}
                    </div>
                    
                    ${file.userName ? `<p class="text-sm text-gray-600">Uploaded by: ${file.userName}</p>` : ''}
                    
                    ${approvalButtons}
                </div>
                
                <div class="flex items-center space-x-2 ml-4">
                    <button class="download-btn text-blue-600 hover:text-blue-800 p-2" data-file-id="${file.id}" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="delete-btn text-red-600 hover:text-red-800 p-2" data-file-id="${file.id}" data-file-name="${file.originalName}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusColor(status) {
    switch (status) {
        case 'completed': return 'green';
        case 'processing': return 'yellow';
        case 'failed': return 'red';
        default: return 'gray';
    }
}

async function downloadFile(fileId) {
    try {
        // Use the new download functionality
        const response = await fetch(`/api/upload/download/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        // Get the filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let downloadFileName = 'document.pptx';
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                downloadFileName = filenameMatch[1];
            }
        }

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showNotification('Document downloaded successfully!', 'success');

    } catch (error) {
        console.error('Error downloading file:', error);
        showNotification('Failed to download file', 'error');
    }
}

async function deleteFile(fileId, fileName) {
    console.log('Delete function called with:', { fileId, fileName });
    
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
        console.log('Delete cancelled by user');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        console.log('Token found:', !!token);
        console.log('Making DELETE request to:', `${API_BASE}/upload/files/${fileId}`);
        
        const response = await fetch(`${API_BASE}/upload/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete failed with response:', errorText);
            throw new Error(`Failed to delete file: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Delete successful:', result);
        showNotification('File deleted successfully', 'success');
        loadFiles(); // Refresh the file list
        
    } catch (error) {
        console.error('Error deleting file:', error);
        showNotification(`Failed to delete file: ${error.message}`, 'error');
    }
}

async function approveFile(fileId, fileName) {
    if (!confirm(`Are you sure you want to approve "${fileName}"?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/sources/${fileId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notes: 'Approved via admin interface'
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to approve file');
        }
        
        showNotification('File approved successfully', 'success');
        loadFiles(); // Reload the files list
        
    } catch (error) {
        console.error('Error approving file:', error);
        showNotification('Failed to approve file', 'error');
    }
}

async function rejectFile(fileId, fileName) {
    const reason = prompt(`Please provide a reason for rejecting "${fileName}":`);
    if (!reason) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/sources/${fileId}/reject`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notes: reason
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to reject file');
        }
        
        showNotification('File rejected successfully', 'success');
        loadFiles(); // Reload the files list
        
    } catch (error) {
        console.error('Error rejecting file:', error);
        showNotification('Failed to reject file', 'error');
    }
}

// Action functions
function viewSource(id) {
    showNotification('View source functionality coming soon!', 'info');
}

// ==================== TRAINING SYSTEM ====================

function initializeTrainingSystem() {
    // Add event listener for Train Now button
    const trainNowBtn = document.getElementById('trainNowBtn');
    if (trainNowBtn) {
        trainNowBtn.addEventListener('click', handleTrainNow);
    }
    
    // Load training status on page load
    loadTrainingStatus();
}

async function loadTrainingStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_BASE}/training/status`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateTrainingUI(data);
        }
    } catch (error) {
        console.error('Error loading training status:', error);
    }
}

function updateTrainingUI(data) {
    // Update training status
    const statusElement = document.getElementById('trainingStatus');
    if (statusElement) {
        statusElement.textContent = data.status || 'Not Trained';
        statusElement.className = `px-3 py-1 rounded-full text-sm ${
            data.status === 'Trained' ? 'bg-green-100 text-green-700' : 
            data.status === 'Training' ? 'bg-yellow-100 text-yellow-700' : 
            'bg-gray-100 text-gray-700'
        }`;
    }
    
    // Update statistics
    const totalFiles = document.getElementById('totalFiles');
    const trainedFiles = document.getElementById('trainedFiles');
    const embeddingsCount = document.getElementById('embeddingsCount');
    
    if (totalFiles) totalFiles.textContent = data.totalFiles || 0;
    if (trainedFiles) trainedFiles.textContent = data.trainedFiles || 0;
    if (embeddingsCount) embeddingsCount.textContent = data.embeddingsCount || 0;
    
    // Update train button state
    const trainBtn = document.getElementById('trainNowBtn');
    if (trainBtn) {
        trainBtn.disabled = data.status === 'Training';
        trainBtn.innerHTML = data.status === 'Training' ? 
            '<i class="fas fa-spinner fa-spin mr-2"></i>Training...' : 
            '<i class="fas fa-brain mr-2"></i>Train Now';
    }
}

async function handleTrainNow() {
    const trainBtn = document.getElementById('trainNowBtn');
    const progressDiv = document.getElementById('trainingProgress');
    const progressBar = document.getElementById('trainingProgressBar');
    const progressPercentage = document.getElementById('trainingPercentage');
    const progressMessage = document.getElementById('trainingMessage');
    
    try {
        // Show progress UI
        if (progressDiv) progressDiv.classList.remove('hidden');
        if (trainBtn) trainBtn.disabled = true;
        
        // Start training
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/training/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to start training');
        }
        
        const data = await response.json();
        showNotification('Training started successfully!', 'success');
        
        // Poll for progress
        pollTrainingProgress();
        
    } catch (error) {
        console.error('Error starting training:', error);
        showNotification('Failed to start training: ' + error.message, 'error');
        
        // Reset UI
        if (trainBtn) trainBtn.disabled = false;
        if (progressDiv) progressDiv.classList.add('hidden');
    }
}

async function pollTrainingProgress() {
    const progressBar = document.getElementById('trainingProgressBar');
    const progressPercentage = document.getElementById('trainingPercentage');
    const progressMessage = document.getElementById('trainingMessage');
    const trainBtn = document.getElementById('trainNowBtn');
    
    const pollInterval = setInterval(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/training/progress`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update progress bar
                if (progressBar && progressPercentage) {
                    const percentage = data.progress || 0;
                    progressBar.style.width = `${percentage}%`;
                    progressPercentage.textContent = `${percentage}%`;
                }
                
                // Update message
                if (progressMessage) {
                    progressMessage.textContent = data.message || 'Training in progress...';
                }
                
                // Check if training is complete
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollInterval);
                    
                    if (data.status === 'completed') {
                        showNotification('Training completed successfully!', 'success');
                        if (trainBtn) {
                            trainBtn.disabled = false;
                            trainBtn.innerHTML = '<i class="fas fa-brain mr-2"></i>Train Now';
                        }
                    } else {
                        showNotification('Training failed: ' + (data.error || 'Unknown error'), 'error');
                        if (trainBtn) {
                            trainBtn.disabled = false;
                            trainBtn.innerHTML = '<i class="fas fa-brain mr-2"></i>Train Now';
                        }
                    }
                    
                    // Reload training status
                    loadTrainingStatus();
                }
            }
        } catch (error) {
            console.error('Error polling training progress:', error);
            clearInterval(pollInterval);
            showNotification('Error checking training progress', 'error');
        }
    }, 10000); // Poll every 5 seconds
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

// ==================== ANALYTICS SYSTEM ====================

function initializeAnalytics() {
    // Add event listeners for analytics
    const timeRangeSelect = document.getElementById('timeRangeSelect');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', loadAnalytics);
    }
    
    const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
    if (refreshAnalyticsBtn) {
        refreshAnalyticsBtn.addEventListener('click', loadAnalytics);
    }
    
    // Analytics tab navigation
    document.querySelectorAll('.analytics-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            switchAnalyticsTab(tabName);
        });
    });
    
    // Industry select change
    const industrySelect = document.getElementById('industrySelect');
    if (industrySelect) {
        industrySelect.addEventListener('change', loadIndustryAnalytics);
    }
    
    // Event type select change
    const eventTypeSelect = document.getElementById('eventTypeSelect');
    if (eventTypeSelect) {
        eventTypeSelect.addEventListener('change', loadFileAnalytics);
    }
}

async function loadAnalytics() {
    if (!isLoggedIn) return;
    
    try {
        const timeRange = document.getElementById('timeRangeSelect')?.value || '30d';
        const token = localStorage.getItem('token');
        
        // Load dashboard metrics
        const response = await fetch(`${API_BASE}/analytics/dashboard?timeRange=${timeRange}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            analyticsData.dashboard = data;
            updateDashboardOverview(data);
            updateCharts(data);
            updateOverviewTab(data);
        }
        
        // Load other analytics tabs
        loadSourceAnalytics();
        loadUserAnalytics();
        loadFileAnalytics();
        loadSourceManagementAnalytics();
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Failed to load analytics data', 'error');
    }
}

function updateDashboardOverview(data) {
    const overview = data.overview;
    
    // Update metric cards
    document.getElementById('totalPresentations').textContent = overview.presentations?.total_presentations || 0;
    document.getElementById('recentPresentations').textContent = overview.presentations?.recent_presentations || 0;
    document.getElementById('totalSources').textContent = overview.sources?.total_sources || 0;
    document.getElementById('approvedSources').textContent = overview.sources?.approved_sources || 0;
    document.getElementById('activeUsers').textContent = overview.users?.active_users || 0;
    document.getElementById('recentActivity').textContent = overview.users?.recent_activity || 0;
    
    // Calculate success rate
    const total = overview.presentations?.total_presentations || 0;
    const completed = overview.presentations?.completed_presentations || 0;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('successRate').textContent = `${successRate}%`;
}

function updateCharts(data) {
    // Industry breakdown chart
    updateIndustryChart(data.industryBreakdown || []);
    
    // Use case breakdown chart
    updateUseCaseChart(data.useCaseBreakdown || []);
}

function updateIndustryChart(data) {
    const ctx = document.getElementById('industryChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (charts.industry) {
        charts.industry.destroy();
    }
    
    const labels = data.map(item => item.industry);
    const values = data.map(item => item.count);
    
    charts.industry = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateUseCaseChart(data) {
    const ctx = document.getElementById('useCaseChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (charts.useCase) {
        charts.useCase.destroy();
    }
    
    const labels = data.map(item => item.use_case);
    const values = data.map(item => item.count);
    
    charts.useCase = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Use Cases',
                data: values,
                backgroundColor: '#3B82F6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateOverviewTab(data) {
    // Update top sources
    const topSourcesList = document.getElementById('topSourcesList');
    if (topSourcesList && data.topSources) {
        topSourcesList.innerHTML = data.topSources.map(source => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <h5 class="font-medium">${source.title}</h5>
                    <p class="text-sm text-gray-500">${source.industry}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">${source.usage_count}</p>
                    <p class="text-sm text-gray-500">uses</p>
                </div>
            </div>
        `).join('');
    }
    
    // Update recent activity (placeholder)
    const recentActivityList = document.getElementById('recentActivityList');
    if (recentActivityList) {
        recentActivityList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-chart-line text-4xl mb-2"></i>
                <p>Recent activity data coming soon</p>
            </div>
        `;
    }
}

async function loadSourceAnalytics() {
    try {
        const timeRange = document.getElementById('timeRangeSelect')?.value || '30d';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/analytics/sources?timeRange=${timeRange}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateSourceAnalytics(data);
        }
    } catch (error) {
        console.error('Error loading source analytics:', error);
    }
}

function updateSourceAnalytics(data) {
    // Update source performance
    const sourcePerformanceList = document.getElementById('sourcePerformanceList');
    if (sourcePerformanceList && data.sourceUsage) {
        sourcePerformanceList.innerHTML = data.sourceUsage.slice(0, 5).map(source => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <h5 class="font-medium">${source.title}</h5>
                    <p class="text-sm text-gray-500">${source.industry}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">${source.total_usage}</p>
                    <p class="text-sm text-gray-500">uses</p>
                </div>
            </div>
        `).join('');
    }
    
    // Update industry performance
    const industryPerformanceList = document.getElementById('industryPerformanceList');
    if (industryPerformanceList && data.industryPerformance) {
        industryPerformanceList.innerHTML = data.industryPerformance.map(industry => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <h5 class="font-medium">${industry.industry}</h5>
                    <p class="text-sm text-gray-500">${industry.total_sources} sources</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">${industry.total_usage}</p>
                    <p class="text-sm text-gray-500">uses</p>
                </div>
            </div>
        `).join('');
    }
}

async function loadUserAnalytics() {
    try {
        const timeRange = document.getElementById('timeRangeSelect')?.value || '30d';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/analytics/users?timeRange=${timeRange}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateUserAnalytics(data);
        }
    } catch (error) {
        console.error('Error loading user analytics:', error);
    }
}

function updateUserAnalytics(data) {
    // Update user activity
    const userActivityList = document.getElementById('userActivityList');
    if (userActivityList && data.userActivity) {
        userActivityList.innerHTML = data.userActivity.slice(0, 5).map(user => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <h5 class="font-medium">${user.name || 'Unknown User'}</h5>
                    <p class="text-sm text-gray-500">${user.total_presentations} presentations</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">${user.industries_used}</p>
                    <p class="text-sm text-gray-500">industries</p>
                </div>
            </div>
        `).join('');
    }
    
    // Update activity trends chart
    updateActivityTrendsChart(data.activityTrends || []);
}

function updateActivityTrendsChart(data) {
    const ctx = document.getElementById('activityTrendsChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (charts.activityTrends) {
        charts.activityTrends.destroy();
    }
    
    const labels = data.map(item => new Date(item.date).toLocaleDateString());
    const activityCounts = data.map(item => item.activity_count);
    
    charts.activityTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Activity Count',
                data: activityCounts,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function loadFileAnalytics() {
    try {
        const timeRange = document.getElementById('timeRangeSelect')?.value || '30d';
        const eventType = document.getElementById('eventTypeSelect')?.value || 'all';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/analytics/files?timeRange=${timeRange}&eventType=${eventType}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateFileAnalytics(data);
        }
    } catch (error) {
        console.error('Error loading file analytics:', error);
    }
}

function updateFileAnalytics(data) {
    // Update file logs
    const fileLogsList = document.getElementById('fileLogsList');
    if (fileLogsList && data.fileLogs) {
        fileLogsList.innerHTML = data.fileLogs.slice(0, 10).map(log => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <h5 class="font-medium">${log.event_type}</h5>
                    <p class="text-sm text-gray-500">${new Date(log.created_at).toLocaleString()}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">${log.user_name || 'System'}</p>
                    <p class="text-sm text-gray-500">${log.user_email || ''}</p>
                </div>
            </div>
        `).join('');
    }
    
    // Update file summary
    const fileSummaryList = document.getElementById('fileSummaryList');
    if (fileSummaryList && data.fileSummary) {
        fileSummaryList.innerHTML = data.fileSummary.map(summary => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <h5 class="font-medium">${summary.event_type}</h5>
                    <p class="text-sm text-gray-500">${summary.recent_count} recent</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">${summary.count}</p>
                    <p class="text-sm text-gray-500">total</p>
                </div>
            </div>
        `).join('');
    }
}

async function loadSourceManagementAnalytics() {
    try {
        const timeRange = document.getElementById('timeRangeSelect')?.value || '30d';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/analytics/source-management?timeRange=${timeRange}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateSourceManagementAnalytics(data);
        }
    } catch (error) {
        console.error('Error loading source management analytics:', error);
    }
}

function updateSourceManagementAnalytics(data) {
    // Update source status
    const sourceStatusList = document.getElementById('sourceStatusList');
    if (sourceStatusList && data.sourceStatus) {
        sourceStatusList.innerHTML = data.sourceStatus.map(status => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <h5 class="font-medium">${status.status}</h5>
                    <p class="text-sm text-gray-500">${status.recent_count} recent</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">${status.count}</p>
                    <p class="text-sm text-gray-500">total</p>
                </div>
            </div>
        `).join('');
    }
    
    // Update upload trends chart
    updateUploadTrendsChart(data.sourceUploadTrends || []);
}

function updateUploadTrendsChart(data) {
    const ctx = document.getElementById('uploadTrendsChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (charts.uploadTrends) {
        charts.uploadTrends.destroy();
    }
    
    const labels = data.map(item => new Date(item.date).toLocaleDateString());
    const uploads = data.map(item => item.uploads);
    const approved = data.map(item => item.approved);
    
    charts.uploadTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Uploads',
                    data: uploads,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: false
                },
                {
                    label: 'Approved',
                    data: approved,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function loadIndustryAnalytics() {
    const industry = document.getElementById('industrySelect')?.value;
    if (!industry) return;
    
    try {
        const timeRange = document.getElementById('timeRangeSelect')?.value || '30d';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/analytics/industry/${industry}?timeRange=${timeRange}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateIndustryAnalytics(data);
        }
    } catch (error) {
        console.error('Error loading industry analytics:', error);
    }
}

function updateIndustryAnalytics(data) {
    const content = document.getElementById('industryAnalyticsContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-gray-50 rounded-lg p-6">
                <h4 class="text-lg font-semibold mb-4">Industry Metrics</h4>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span>Total Presentations:</span>
                        <span class="font-semibold">${data.metrics?.total_presentations || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Recent Presentations:</span>
                        <span class="font-semibold">${data.metrics?.recent_presentations || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Unique Users:</span>
                        <span class="font-semibold">${data.metrics?.unique_users || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Avg Slides:</span>
                        <span class="font-semibold">${Math.round(data.metrics?.avg_slides_per_presentation || 0)}</span>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 rounded-lg p-6">
                <h4 class="text-lg font-semibold mb-4">Use Cases</h4>
                <div class="space-y-2">
                    ${data.useCases?.map(useCase => `
                        <div class="flex justify-between">
                            <span>${useCase.use_case}:</span>
                            <span class="font-semibold">${useCase.count}</span>
                        </div>
                    `).join('') || '<p class="text-gray-500">No use cases found</p>'}
                </div>
            </div>
        </div>
    `;
}

function switchAnalyticsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.analytics-tab').forEach(tab => {
        tab.classList.remove('border-blue-500', 'text-blue-600');
        tab.classList.add('border-transparent', 'text-gray-500');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.remove('border-transparent', 'text-gray-500');
        activeTab.classList.add('border-blue-500', 'text-blue-600');
    }
    
    // Update tab content
    document.querySelectorAll('.analytics-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
    
    // Load specific tab data if needed
    if (tabName === 'industry') {
        loadIndustryList();
    }
}

async function loadIndustryList() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/analytics/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const industrySelect = document.getElementById('industrySelect');
            if (industrySelect && data.industryBreakdown) {
                industrySelect.innerHTML = '<option value="">Select an industry...</option>' +
                    data.industryBreakdown.map(industry => 
                        `<option value="${industry.industry}">${industry.industry} (${industry.count})</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading industry list:', error);
    }
}

// Initialize analytics when app loads
document.addEventListener('DOMContentLoaded', function() {
    initializeAnalytics();
});

// Trained Documents functionality
let currentPage = 1;
let currentIndustry = '';
let currentSearch = '';

// Load trained documents
async function loadTrainedDocuments(page = 1, industry = '', search = '') {
    const loadingEl = document.getElementById('documentsLoading');
    const listEl = document.getElementById('documentsList');
    const noDocsEl = document.getElementById('noDocumentsMessage');
    const paginationEl = document.getElementById('documentsPagination');

    try {
        loadingEl.style.display = 'block';
        listEl.innerHTML = '';
        noDocsEl.style.display = 'none';
        paginationEl.style.display = 'none';

        const params = new URLSearchParams({
            page: page,
            limit: 10,
            status: 'trained'
        });

        if (industry) params.append('industry', industry);
        if (search) params.append('search', search);

        const response = await fetch(`/api/upload/trained?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load documents');
        }

        const data = await response.json();
        const { documents, pagination } = data;

        if (documents.length === 0) {
            noDocsEl.style.display = 'block';
        } else {
            renderDocumentsList(documents);
            
            if (pagination.totalPages > 1) {
                renderPagination(pagination);
                paginationEl.style.display = 'flex';
            }
        }

    } catch (error) {
        console.error('Error loading documents:', error);
        listEl.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Error loading documents. Please try again.</p>
            </div>
        `;
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Render documents list
function renderDocumentsList(documents) {
    const listEl = document.getElementById('documentsList');
    
    listEl.innerHTML = documents.map(doc => `
        <div class="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">${doc.title}</h3>
                    <p class="text-gray-600 text-sm mb-2">${doc.description || 'No description available'}</p>
                    <div class="flex flex-wrap gap-2 mb-3">
                        ${doc.industry ? `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${doc.industry}</span>` : ''}
                        ${doc.tags && doc.tags.length > 0 ? doc.tags.map(tag => 
                            `<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">${tag}</span>`
                        ).join('') : ''}
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-brain mr-1"></i>
                        <span class="mr-4">${doc.embeddingCount} embeddings</span>
                        <i class="fas fa-user mr-1"></i>
                        <span class="mr-4">${doc.uploadedBy.name}</span>
                        <i class="fas fa-calendar mr-1"></i>
                        <span>${new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2 ml-4">
                    ${doc.isDownloadable ? `
                        <button onclick="downloadDocument('${doc.id}', '${doc.title}')" 
                                class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                            <i class="fas fa-download mr-2"></i>Download
                        </button>
                    ` : `
                        <button disabled class="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed text-sm">
                            <i class="fas fa-exclamation-triangle mr-2"></i>Not Available
                        </button>
                    `}
                    <span class="text-xs text-gray-500 text-center">${doc.status}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Render pagination
function renderPagination(pagination) {
    const pageInfoEl = document.getElementById('pageInfo');
    const prevBtnEl = document.getElementById('prevPageBtn');
    const nextBtnEl = document.getElementById('nextPageBtn');

    pageInfoEl.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
    prevBtnEl.disabled = !pagination.hasPrev;
    nextBtnEl.disabled = !pagination.hasNext;

    prevBtnEl.onclick = () => {
        if (pagination.hasPrev) {
            currentPage = pagination.page - 1;
            loadTrainedDocuments(currentPage, currentIndustry, currentSearch);
        }
    };

    nextBtnEl.onclick = () => {
        if (pagination.hasNext) {
            currentPage = pagination.page + 1;
            loadTrainedDocuments(currentPage, currentIndustry, currentSearch);
        }
    };
}

// Download document
async function downloadDocument(fileId, fileName) {
    try {
        const response = await fetch(`/api/upload/download/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        // Get the filename from Content-Disposition header or use the provided name
        const contentDisposition = response.headers.get('Content-Disposition');
        let downloadFileName = fileName;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                downloadFileName = filenameMatch[1];
            }
        }

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Show success message
        showNotification('Document downloaded successfully!', 'success');

    } catch (error) {
        console.error('Download error:', error);
        showNotification('Failed to download document', 'error');
    }
}

// Search documents
function searchDocuments() {
    const searchInput = document.getElementById('searchDocuments');
    currentSearch = searchInput.value.trim();
    currentPage = 1;
    loadTrainedDocuments(currentPage, currentIndustry, currentSearch);
}

// Filter by industry
function filterByIndustry() {
    const industrySelect = document.getElementById('industryFilter');
    currentIndustry = industrySelect.value;
    currentPage = 1;
    loadTrainedDocuments(currentPage, currentIndustry, currentSearch);
}

// Initialize trained documents tab
function initializeTrainedDocuments() {
    // Load documents when tab is shown
    loadTrainedDocuments();
    
    // Set up event listeners
    document.getElementById('refreshDocumentsBtn').onclick = () => {
        currentPage = 1;
        currentIndustry = '';
        currentSearch = '';
        document.getElementById('industryFilter').value = '';
        document.getElementById('searchDocuments').value = '';
        loadTrainedDocuments();
    };

    document.getElementById('searchDocuments').addEventListener('input', debounce(searchDocuments, 500));
    document.getElementById('industryFilter').addEventListener('change', filterByIndustry);
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for global access
window.showTab = showTab;
window.toggleMobileMenu = toggleMobileMenu;
window.downloadDocument = downloadDocument;
