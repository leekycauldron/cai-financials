import { VariableCostStructure, SubscriptionTier, FinancialProjection } from './financial_projections.js';

// Storage keys for localStorage
const STORAGE_KEY = 'financialProjectionsData';
const PROFILES_KEY = 'financialProjectionsProfiles';

// Chart instances
let charts = {};

// Current projection results for PDF export
let currentResults = null;

// Default values
const defaultValues = {
    // Basic tier
    'basic-quota': 30,
    'basic-price': 29,
    'basic-users': 100,
    'basic-churn': 5,
    'basic-growth': 10,
    'basic-usage': 80,
    'basic-churn-change': 0,
    'basic-growth-change': 0,
    'basic-churn-stabilized': 5,
    'basic-growth-stabilized': 10,
    
    // Pro tier
    'pro-quota': 100,
    'pro-price': 79,
    'pro-users': 50,
    'pro-churn': 3,
    'pro-growth': 15,
    'pro-usage': 85,
    'pro-churn-change': 0,
    'pro-growth-change': 0,
    'pro-churn-stabilized': 3,
    'pro-growth-stabilized': 15,
    
    // Enterprise tier
    'enterprise-quota': 500,
    'enterprise-price': 299,
    'enterprise-users': 10,
    'enterprise-churn': 2,
    'enterprise-growth': 20,
    'enterprise-usage': 90,
    'enterprise-churn-change': 0,
    'enterprise-growth-change': 0,
    'enterprise-churn-stabilized': 2,
    'enterprise-growth-stabilized': 20,
    
    // Fixed expenses
    'salaries': 25000,
    'rent': 5000,
    'software': 2000,
    'marketing': 8000,
    'other': 3000,
    
    // Variable costs
    'flat-fee': 1000,
    'included-minutes': 50000,
    'overage-cost': 0.02,
    
    // Business parameters
    'funding': 500000,
    'cac': 50,
    'startup-costs': 50000,
    'months': 24
};

// Predefined profiles
const predefinedProfiles = {
    'realistic': {
        name: 'Realistic Scenario',
        data: {
            // Basic tier - conservative
            'basic-quota': 30,
            'basic-price': 29,
            'basic-users': 50,
            'basic-churn': 8,
            'basic-growth': 5,
            'basic-usage': 70,
            
            // Pro tier - conservative
            'pro-quota': 100,
            'pro-price': 79,
            'pro-users': 25,
            'pro-churn': 5,
            'pro-growth': 8,
            'pro-usage': 75,
            
            // Enterprise tier - conservative
            'enterprise-quota': 500,
            'enterprise-price': 299,
            'enterprise-users': 5,
            'enterprise-churn': 3,
            'enterprise-growth': 10,
            'enterprise-usage': 80,
            
            // Fixed expenses - realistic
            'salaries': 30000,
            'rent': 6000,
            'software': 2500,
            'marketing': 5000,
            'other': 3500,
            
            // Variable costs - realistic
            'flat-fee': 1200,
            'included-minutes': 40000,
            'overage-cost': 0.025,
            
            // Business parameters - conservative
            'funding': 300000,
            'cac': 75,
            'startup-costs': 75000,
            'months': 24
        }
    },
    'optimistic': {
        name: 'Optimistic Scenario',
        data: {
            // Basic tier - optimistic
            'basic-quota': 30,
            'basic-price': 29,
            'basic-users': 200,
            'basic-churn': 3,
            'basic-growth': 15,
            'basic-usage': 90,
            
            // Pro tier - optimistic
            'pro-quota': 100,
            'pro-price': 79,
            'pro-users': 100,
            'pro-churn': 2,
            'pro-growth': 20,
            'pro-usage': 95,
            
            // Enterprise tier - optimistic
            'enterprise-quota': 500,
            'enterprise-price': 299,
            'enterprise-users': 20,
            'enterprise-churn': 1,
            'enterprise-growth': 25,
            'enterprise-usage': 95,
            
            // Fixed expenses - optimistic (lower due to efficiency)
            'salaries': 20000,
            'rent': 4000,
            'software': 1500,
            'marketing': 12000,
            'other': 2000,
            
            // Variable costs - optimistic
            'flat-fee': 800,
            'included-minutes': 60000,
            'overage-cost': 0.015,
            
            // Business parameters - optimistic
            'funding': 750000,
            'cac': 35,
            'startup-costs': 30000,
            'months': 24
        }
    }
};

// Profile management functions
function loadProfiles() {
    try {
        const savedProfiles = localStorage.getItem(PROFILES_KEY);
        const profiles = savedProfiles ? JSON.parse(savedProfiles) : {};
        
        // Merge with predefined profiles
        return { ...predefinedProfiles, ...profiles };
    } catch (error) {
        console.warn('Error loading profiles:', error);
        return predefinedProfiles;
    }
}

function saveProfiles(profiles) {
    try {
        // Only save user-created profiles (exclude predefined ones)
        const userProfiles = {};
        Object.keys(profiles).forEach(key => {
            if (!predefinedProfiles[key]) {
                userProfiles[key] = profiles[key];
            }
        });
        localStorage.setItem(PROFILES_KEY, JSON.stringify(userProfiles));
    } catch (error) {
        console.warn('Error saving profiles:', error);
    }
}

function updateProfileSelector() {
    const select = document.getElementById('profile-select');
    const profiles = loadProfiles();
    
    // Clear existing options except "Current Values"
    select.innerHTML = '<option value="current">Current Values</option>';
    
    // Add profile options
    Object.keys(profiles).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = profiles[key].name;
        select.appendChild(option);
    });
}

function saveAsProfile() {
    document.getElementById('saveProfileModal').style.display = 'block';
    document.getElementById('profileName').focus();
}

function closeSaveProfileModal() {
    document.getElementById('saveProfileModal').style.display = 'none';
    document.getElementById('profileName').value = '';
}

function confirmSaveProfile() {
    const profileName = document.getElementById('profileName').value.trim();
    
    if (!profileName) {
        alert('Please enter a profile name');
        return;
    }
    
    // Create profile key (lowercase, replace spaces with hyphens)
    const profileKey = profileName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    if (predefinedProfiles[profileKey]) {
        alert('Cannot overwrite predefined profiles. Please choose a different name.');
        return;
    }
    
    // Get current form values
    const currentData = {};
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        currentData[input.id] = parseFloat(input.value) || 0;
    });
    
    // Load existing profiles and add new one
    const profiles = loadProfiles();
    profiles[profileKey] = {
        name: profileName,
        data: currentData
    };
    
    // Save profiles
    saveProfiles(profiles);
    
    // Update selector and select the new profile
    updateProfileSelector();
    document.getElementById('profile-select').value = profileKey;
    
    closeSaveProfileModal();
    
    alert(`Profile "${profileName}" saved successfully!`);
}

function loadProfile() {
    const selectedProfile = document.getElementById('profile-select').value;
    
    if (selectedProfile === 'current') {
        return;
    }
    
    const profiles = loadProfiles();
    const profile = profiles[selectedProfile];
    
    if (!profile) {
        alert('Profile not found');
        return;
    }
    
    // Populate form with profile data
    populateForm({ ...defaultValues, ...profile.data });
    
    // Update projections
    updateProjections();
    
    alert(`Profile "${profile.name}" loaded successfully!`);
}

function deleteProfile() {
    const selectedProfile = document.getElementById('profile-select').value;
    
    if (selectedProfile === 'current') {
        alert('Cannot delete "Current Values"');
        return;
    }
    
    if (predefinedProfiles[selectedProfile]) {
        alert('Cannot delete predefined profiles');
        return;
    }
    
    const profiles = loadProfiles();
    const profile = profiles[selectedProfile];
    
    if (!profile) {
        alert('Profile not found');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the profile "${profile.name}"?`)) {
        delete profiles[selectedProfile];
        saveProfiles(profiles);
        updateProfileSelector();
        document.getElementById('profile-select').value = 'current';
        alert(`Profile "${profile.name}" deleted successfully!`);
    }
}

// PDF Export functionality
async function exportToPDF() {
    const exportBtn = document.getElementById('export-btn');
    const originalText = exportBtn.innerHTML;
    
    try {
        // Disable button and show loading state
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<span>⏳</span> Generating PDF...';
        
        // Get current profile info
        const selectedProfile = document.getElementById('profile-select').value;
        const profiles = loadProfiles();
        const profileName = selectedProfile === 'current' ? 'Current Values' : profiles[selectedProfile]?.name || 'Unknown Profile';
        
        // Create PDF document
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yPosition = 20;
        
        // Add header
        pdf.setFontSize(24);
        pdf.setTextColor(44, 62, 80);
        pdf.text('Financial Projections Report', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 10;
        pdf.setFontSize(14);
        pdf.setTextColor(127, 140, 141);
        pdf.text(`Profile: ${profileName}`, pageWidth / 2, yPosition, { align: 'center' });
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition + 6, { align: 'center' });
        
        yPosition += 20;
        
        // Add metrics summary
        if (currentResults) {
            pdf.setFontSize(18);
            pdf.setTextColor(44, 62, 80);
            pdf.text('Key Metrics Summary', 20, yPosition);
            yPosition += 10;
            
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            
            // Break-even month
            const breakEvenText = currentResults.BreakEvenMonth ? 
                `Break-even Month: Month ${currentResults.BreakEvenMonth}` : 
                'Break-even Month: Not achieved';
            pdf.text(breakEvenText, 20, yPosition);
            yPosition += 6;
            
            // Funding runway
            const fundingText = currentResults.FundingExhausted ? 
                `Funding Runway: ${currentResults.FundingExhaustedMonth} months` : 
                `Funding Runway: ${currentResults.Date.length}+ months`;
            pdf.text(fundingText, 20, yPosition);
            yPosition += 6;
            
            // Peak revenue
            const peakRevenue = Math.max(...currentResults.TotalRevenue);
            pdf.text(`Peak Monthly Revenue: $${peakRevenue.toLocaleString()}`, 20, yPosition);
            yPosition += 6;
            
            // Total users
            const lastMonth = currentResults.Date.length - 1;
            const totalUsers = (currentResults.BasicUsers[lastMonth] || 0) + 
                              (currentResults.ProUsers[lastMonth] || 0) + 
                              (currentResults.EnterpriseUsers[lastMonth] || 0);
            pdf.text(`Total Users (End): ${totalUsers.toLocaleString()}`, 20, yPosition);
            yPosition += 15;
        }
        
        // Add form data summary
        pdf.setFontSize(18);
        pdf.setTextColor(44, 62, 80);
        pdf.text('Configuration Summary', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        // Get current form values for summary
        const formValues = getFormValues();
        
        // Subscription tiers
        pdf.setFontSize(12);
        pdf.setTextColor(52, 152, 219);
        pdf.text('Subscription Tiers:', 20, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Basic: ${formValues.basicUsers} users, $${formValues.basicPrice}/month, ${formValues.basicQuota} daily minutes`, 25, yPosition);
        yPosition += 4;
        pdf.text(`Pro: ${formValues.proUsers} users, $${formValues.proPrice}/month, ${formValues.proQuota} daily minutes`, 25, yPosition);
        yPosition += 4;
        pdf.text(`Enterprise: ${formValues.enterpriseUsers} users, $${formValues.enterprisePrice}/month, ${formValues.enterpriseQuota} daily minutes`, 25, yPosition);
        yPosition += 8;
        
        // Business parameters
        pdf.setFontSize(12);
        pdf.setTextColor(52, 152, 219);
        pdf.text('Business Parameters:', 20, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Available Funding: $${formValues.funding.toLocaleString()}`, 25, yPosition);
        yPosition += 4;
        pdf.text(`Customer Acquisition Cost: $${formValues.cac}`, 25, yPosition);
        yPosition += 4;
        pdf.text(`Startup Costs: $${formValues.startupCosts.toLocaleString()}`, 25, yPosition);
        yPosition += 4;
        pdf.text(`Projection Period: ${formValues.months} months`, 25, yPosition);
        yPosition += 15;
        
        // Capture and add charts
        const chartContainers = document.querySelectorAll('.chart-container');
        let chartIndex = 0;
        
        for (const container of chartContainers) {
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
                pdf.addPage();
                yPosition = 20;
            }
            
            try {
                // Get chart title
                const title = container.querySelector('h3').textContent.replace('?', '').trim();
                
                // Capture chart as image
                const canvas = await html2canvas(container, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false
                });
                
                const imgData = canvas.toDataURL('image/png');
                
                // Add chart title
                pdf.setFontSize(14);
                pdf.setTextColor(44, 62, 80);
                pdf.text(title, 20, yPosition);
                yPosition += 10;
                
                // Calculate image dimensions to fit page
                const imgWidth = pageWidth - 40;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                // Add image to PDF
                pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 15;
                
                chartIndex++;
                
                // Add page break after every 2 charts or if near bottom
                if (chartIndex % 2 === 0 || yPosition > pageHeight - 50) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
            } catch (error) {
                console.warn('Error capturing chart:', error);
                // Continue with next chart
            }
        }
        
        // Save the PDF
        const fileName = `financial-projections-${profileName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);
        
        alert('PDF report generated successfully!');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF report. Please try again.');
    } finally {
        // Restore button state
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalText;
    }
}

// Make functions available globally
window.saveAsProfile = saveAsProfile;
window.closeSaveProfileModal = closeSaveProfileModal;
window.confirmSaveProfile = confirmSaveProfile;
window.loadProfile = loadProfile;
window.deleteProfile = deleteProfile;
window.exportToPDF = exportToPDF;

// Load saved data from localStorage
function loadSavedData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            return JSON.parse(savedData);
        }
    } catch (error) {
        console.warn('Error loading saved data:', error);
    }
    return null;
}

// Save current form data to localStorage
function saveFormData() {
    try {
        const formData = {};
        
        // Get all input elements
        const inputs = document.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            formData[input.id] = parseFloat(input.value) || 0;
        });
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
        console.warn('Error saving form data:', error);
    }
}

// Populate form fields with data
function populateForm(data) {
    Object.keys(data).forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.value = data[fieldId];
        }
    });
}

// Initialize form with saved data or defaults
function initializeForm() {
    const savedData = loadSavedData();
    const dataToUse = { ...defaultValues, ...(savedData || {}) };
    
    populateForm(dataToUse);
    
    // Initialize profile selector
    updateProfileSelector();
    
    // Add event listeners to save data on change
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', saveFormData);
        input.addEventListener('change', saveFormData);
    });
    
    // Add event listener for profile selector
    document.getElementById('profile-select').addEventListener('change', function() {
        if (this.value !== 'current') {
            loadProfile();
        }
    });
    
    // Add event listener for Enter key in profile name input
    document.getElementById('profileName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmSaveProfile();
        }
    });
    
    // Close modal when clicking outside
    document.getElementById('saveProfileModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeSaveProfileModal();
        }
    });
    
    // Initial projection calculation
    updateProjections();
}

// Get current form values
function getFormValues() {
    const getValue = (id) => parseFloat(document.getElementById(id).value) || 0;
    
    return {
        // Basic tier
        basicQuota: getValue('basic-quota'),
        basicPrice: getValue('basic-price'),
        basicUsers: getValue('basic-users'),
        basicChurn: getValue('basic-churn') / 100,
        basicGrowth: getValue('basic-growth') / 100,
        basicUsage: getValue('basic-usage') / 100,
        basicChurnChange: getValue('basic-churn-change') / 100,
        basicGrowthChange: getValue('basic-growth-change') / 100,
        basicChurnStabilized: getValue('basic-churn-stabilized') / 100,
        basicGrowthStabilized: getValue('basic-growth-stabilized') / 100,
        
        // Pro tier
        proQuota: getValue('pro-quota'),
        proPrice: getValue('pro-price'),
        proUsers: getValue('pro-users'),
        proChurn: getValue('pro-churn') / 100,
        proGrowth: getValue('pro-growth') / 100,
        proUsage: getValue('pro-usage') / 100,
        proChurnChange: getValue('pro-churn-change') / 100,
        proGrowthChange: getValue('pro-growth-change') / 100,
        proChurnStabilized: getValue('pro-churn-stabilized') / 100,
        proGrowthStabilized: getValue('pro-growth-stabilized') / 100,
        
        // Enterprise tier
        enterpriseQuota: getValue('enterprise-quota'),
        enterprisePrice: getValue('enterprise-price'),
        enterpriseUsers: getValue('enterprise-users'),
        enterpriseChurn: getValue('enterprise-churn') / 100,
        enterpriseGrowth: getValue('enterprise-growth') / 100,
        enterpriseUsage: getValue('enterprise-usage') / 100,
        enterpriseChurnChange: getValue('enterprise-churn-change') / 100,
        enterpriseGrowthChange: getValue('enterprise-growth-change') / 100,
        enterpriseChurnStabilized: getValue('enterprise-churn-stabilized') / 100,
        enterpriseGrowthStabilized: getValue('enterprise-growth-stabilized') / 100,
        
        // Fixed expenses
        salaries: getValue('salaries'),
        rent: getValue('rent'),
        software: getValue('software'),
        marketing: getValue('marketing'),
        other: getValue('other'),
        
        // Variable costs
        flatFee: getValue('flat-fee'),
        includedMinutes: getValue('included-minutes'),
        overageCost: getValue('overage-cost'),
        
        // Business parameters
        funding: getValue('funding'),
        cac: getValue('cac'),
        startupCosts: getValue('startup-costs'),
        months: getValue('months')
    };
}

// Update projections and charts
function updateProjections() {
    const values = getFormValues();
    
    // Create subscription tiers
    const subscriptionTiers = [
        new SubscriptionTier('Basic', values.basicQuota, values.basicPrice, values.basicUsers, values.basicChurn, values.basicGrowth, values.basicUsage, values.basicChurnChange, values.basicGrowthChange, values.basicChurnStabilized, values.basicGrowthStabilized),
        new SubscriptionTier('Pro', values.proQuota, values.proPrice, values.proUsers, values.proChurn, values.proGrowth, values.proUsage, values.proChurnChange, values.proGrowthChange, values.proChurnStabilized, values.proGrowthStabilized),
        new SubscriptionTier('Enterprise', values.enterpriseQuota, values.enterprisePrice, values.enterpriseUsers, values.enterpriseChurn, values.enterpriseGrowth, values.enterpriseUsage, values.enterpriseChurnChange, values.enterpriseGrowthChange, values.enterpriseChurnStabilized, values.enterpriseGrowthStabilized)
    ];
    
    // Create fixed expenses object
    const monthlyFixedExpenses = {
        salaries: values.salaries,
        rent: values.rent,
        software: values.software,
        marketing: values.marketing,
        other: values.other
    };
    
    // Create variable cost structure
    const variableCostStructure = new VariableCostStructure(
        values.flatFee,
        values.includedMinutes,
        values.overageCost
    );
    
    // Create financial projection
    const projection = new FinancialProjection(
        subscriptionTiers,
        monthlyFixedExpenses,
        variableCostStructure,
        '2024-01-01',
        values.months,
        values.funding,
        values.cac,
        values.startupCosts
    );
    
    // Calculate projections
    const results = projection.calculateProjections();
    currentResults = results; // Store for PDF export
    
    // Update metrics summary
    updateMetricsSummary(results);
    
    // Update charts
    updateCharts(results);
    
    // Save form data after successful calculation
    saveFormData();
}

// Update metrics summary
function updateMetricsSummary(results) {
    const summaryDiv = document.getElementById('metrics-summary');
    summaryDiv.style.display = 'block';
    
    // Break-even month
    const breakEvenElement = document.getElementById('breakeven-month');
    if (results.BreakEvenMonth) {
        breakEvenElement.textContent = `Month ${results.BreakEvenMonth}`;
        breakEvenElement.innerHTML += '<span class="status-indicator status-success">Achieved</span>';
    } else {
        breakEvenElement.textContent = 'Not achieved';
        breakEvenElement.innerHTML += '<span class="status-indicator status-warning">Pending</span>';
    }
    
    // Funding runway
    const fundingElement = document.getElementById('funding-runway');
    if (results.FundingExhausted) {
        fundingElement.textContent = `${results.FundingExhaustedMonth} months`;
        fundingElement.innerHTML += '<span class="status-indicator status-warning">Limited</span>';
    } else {
        fundingElement.textContent = `${results.Date.length}+ months`;
        fundingElement.innerHTML += '<span class="status-indicator status-success">Sufficient</span>';
    }
    
    // Peak monthly revenue
    const peakRevenue = Math.max(...results.TotalRevenue);
    document.getElementById('peak-revenue').textContent = `$${peakRevenue.toLocaleString()}`;
    
    // Total users at end
    const lastMonth = results.Date.length - 1;
    const totalUsers = (results.BasicUsers[lastMonth] || 0) + 
                      (results.ProUsers[lastMonth] || 0) + 
                      (results.EnterpriseUsers[lastMonth] || 0);
    document.getElementById('total-users').textContent = totalUsers.toLocaleString();
}

// Update all charts
function updateCharts(results) {
    updateRevenueChart(results);
    updateCashFlowChart(results);
    updateUsersChart(results);
    updateUsageChart(results);
    updateFundingChart(results);
    updateRevenueBreakdownChart(results);
}

// Revenue & Expenses Chart
function updateRevenueChart(results) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    if (charts.revenue) {
        charts.revenue.destroy();
    }
    
    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.Date,
            datasets: [
                {
                    label: 'Total Revenue',
                    data: results.TotalRevenue,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Total Expenses',
                    data: results.TotalExpenses,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.4
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
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Cash Flow Chart
function updateCashFlowChart(results) {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    
    if (charts.cashFlow) {
        charts.cashFlow.destroy();
    }
    
    charts.cashFlow = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: results.Date,
            datasets: [
                {
                    label: 'Monthly Cash Flow',
                    data: results.MonthlyCashFlow,
                    backgroundColor: results.MonthlyCashFlow.map(value => 
                        value >= 0 ? 'rgba(39, 174, 96, 0.8)' : 'rgba(231, 76, 60, 0.8)'
                    ),
                    borderColor: results.MonthlyCashFlow.map(value => 
                        value >= 0 ? '#27ae60' : '#e74c3c'
                    ),
                    borderWidth: 1
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
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Users Chart
function updateUsersChart(results) {
    const ctx = document.getElementById('usersChart').getContext('2d');
    
    if (charts.users) {
        charts.users.destroy();
    }
    
    charts.users = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.Date,
            datasets: [
                {
                    label: 'Basic Users',
                    data: results.BasicUsers,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Pro Users',
                    data: results.ProUsers,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Enterprise Users',
                    data: results.EnterpriseUsers,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4
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
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Usage Chart
function updateUsageChart(results) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    
    if (charts.usage) {
        charts.usage.destroy();
    }
    
    charts.usage = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.Date,
            datasets: [
                {
                    label: 'Total Minutes Used',
                    data: results.TotalMinutesUsed,
                    borderColor: '#2c3e50',
                    backgroundColor: 'rgba(44, 62, 80, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Overage Costs',
                    data: results.OverageCosts,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
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
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' min';
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Funding Chart
function updateFundingChart(results) {
    const ctx = document.getElementById('fundingChart').getContext('2d');
    
    if (charts.funding) {
        charts.funding.destroy();
    }
    
    charts.funding = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.Date,
            datasets: [
                {
                    label: 'Remaining Funding',
                    data: results.RemainingFunding,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Cash Position',
                    data: results.CashPosition,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    fill: true,
                    tension: 0.4
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
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Revenue Breakdown Chart
function updateRevenueBreakdownChart(results) {
    const ctx = document.getElementById('revenueBreakdownChart').getContext('2d');
    
    if (charts.revenueBreakdown) {
        charts.revenueBreakdown.destroy();
    }
    
    charts.revenueBreakdown = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.Date,
            datasets: [
                {
                    label: 'Basic Revenue',
                    data: results.BasicRevenue,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Pro Revenue',
                    data: results.ProRevenue,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Enterprise Revenue',
                    data: results.EnterpriseRevenue,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4
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
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Make updateProjections available globally
window.updateProjections = updateProjections;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeForm);