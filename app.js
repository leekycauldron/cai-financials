import { VariableCostStructure, SubscriptionTier, FinancialProjection } from './financial_projections.js';

// Storage key for localStorage
const STORAGE_KEY = 'financialProjectionsData';

// Chart instances
let charts = {};

// Default values
const defaultValues = {
    // Basic tier
    'basic-quota': 30,
    'basic-price': 29,
    'basic-users': 100,
    'basic-churn': 5,
    'basic-growth': 10,
    'basic-usage': 80,
    
    // Pro tier
    'pro-quota': 100,
    'pro-price': 79,
    'pro-users': 50,
    'pro-churn': 3,
    'pro-growth': 15,
    'pro-usage': 85,
    
    // Enterprise tier
    'enterprise-quota': 500,
    'enterprise-price': 299,
    'enterprise-users': 10,
    'enterprise-churn': 2,
    'enterprise-growth': 20,
    'enterprise-usage': 90,
    
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
    const dataToUse = savedData || defaultValues;
    
    populateForm(dataToUse);
    
    // Add event listeners to save data on change
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', saveFormData);
        input.addEventListener('change', saveFormData);
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
        
        // Pro tier
        proQuota: getValue('pro-quota'),
        proPrice: getValue('pro-price'),
        proUsers: getValue('pro-users'),
        proChurn: getValue('pro-churn') / 100,
        proGrowth: getValue('pro-growth') / 100,
        proUsage: getValue('pro-usage') / 100,
        
        // Enterprise tier
        enterpriseQuota: getValue('enterprise-quota'),
        enterprisePrice: getValue('enterprise-price'),
        enterpriseUsers: getValue('enterprise-users'),
        enterpriseChurn: getValue('enterprise-churn') / 100,
        enterpriseGrowth: getValue('enterprise-growth') / 100,
        enterpriseUsage: getValue('enterprise-usage') / 100,
        
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
        new SubscriptionTier('Basic', values.basicQuota, values.basicPrice, values.basicUsers, values.basicChurn, values.basicGrowth, values.basicUsage),
        new SubscriptionTier('Pro', values.proQuota, values.proPrice, values.proUsers, values.proChurn, values.proGrowth, values.proUsage),
        new SubscriptionTier('Enterprise', values.enterpriseQuota, values.enterprisePrice, values.enterpriseUsers, values.enterpriseChurn, values.enterpriseGrowth, values.enterpriseUsage)
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