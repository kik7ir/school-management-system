// DOM Elements
const feeBalancesBody = document.getElementById('feeBalancesBody');
const termFilter = document.getElementById('termFilter');
const transportFilter = document.getElementById('transportFilter');
const exportBtn = document.getElementById('exportBtn');
const totalOutstandingBalanceEl = document.getElementById('totalOutstandingBalance');
const studentsWithBalanceEl = document.getElementById('studentsWithBalance');

// Global variables
let allStudents = [];
let filteredStudents = [];

// Initialize Firebase
let firebaseInitialized = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Show loading state
        showLoading(true);
        
        // Initialize Firebase
        try {
            // Check if Firebase is already initialized
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                firebaseInitialized = true;
                console.log('Firebase already initialized');
            } else {
                // Your web app's Firebase configuration
                const firebaseConfig = {
                    apiKey: "YOUR_API_KEY",
                    authDomain: "YOUR_AUTH_DOMAIN",
                    databaseURL: "YOUR_DATABASE_URL",
                    projectId: "YOUR_PROJECT_ID",
                    storageBucket: "YOUR_STORAGE_BUCKET",
                    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
                    appId: "YOUR_APP_ID"
                };
                
                // Initialize Firebase
                firebase.initializeApp(firebaseConfig);
                firebaseInitialized = true;
                console.log('Firebase initialized successfully');
            }
            
            // Set up event listeners
            if (termFilter) {
                termFilter.addEventListener('change', filterAndDisplayStudents);
                console.log('Term filter event listener added');
            }
            
            if (transportFilter) {
                transportFilter.addEventListener('change', filterAndDisplayStudents);
                console.log('Transport filter event listener added');
            }
            
            if (exportBtn) {
                exportBtn.addEventListener('click', exportToExcel);
                console.log('Export button event listener added');
            }
            
            // Load students data
            loadStudents();
            
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            showMessage('Error initializing the application. Please refresh the page.', 'error');
            showLoading(false);
        }
        
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
        showMessage('An unexpected error occurred. Please try again.', 'error');
        showLoading(false);
    }
});

// Load all students from localStorage
function loadStudents() {
    try {
        // Get students from localStorage
        const studentsData = localStorage.getItem('students');
    }
}

// Fetch students from Firebase as fallback
function fetchStudentsFromFirebase() {
    try {
        const studentsRef = firebase.database().ref('students');
        studentsRef.once('value', (snapshot) => {
            allStudents = [];
            snapshot.forEach((childSnapshot) => {
                const student = childSnapshot.val();
                student.id = childSnapshot.key;
                allStudents.push(student);
            });
            
            console.log(`Fetched ${allStudents.length} students from Firebase`);
            
            // Save to localStorage for future use
            try {
                localStorage.setItem('students', JSON.stringify(allStudents));
                console.log('Saved students data to localStorage');
            } catch (storageError) {
                console.error('Error saving to localStorage:', storageError);
            }
            
            filterAndDisplayStudents();
        }).catch((error) => {
            console.error('Error fetching students from Firebase:', error);
            feeBalancesBody.innerHTML = `
                <tr>
                    <td colspan="9" class="error">
                        Failed to load student data. Please check your internet connection and refresh the page.
                        <button onclick="window.location.reload()" class="retry-btn">Retry</button>
                    </td>
                </tr>`;
        });
    } catch (error) {
        console.error('Error in fetchStudentsFromFirebase:', error);
        feeBalancesBody.innerHTML = `
            <tr>
                <td colspan="9" class="error">
                    Error: ${error.message}
                    <button onclick="window.location.reload()" class="retry-btn">Retry</button>
                </td>
            </tr>`;
    }
}

// Filter students based on selected filters
function filterAndDisplayStudents() {
    try {
        const selectedTerm = termFilter ? termFilter.value : 'Term 1';
        const selectedTransport = transportFilter ? transportFilter.value.toLowerCase() : '';
        
        console.log(`Filtering ${allStudents.length} students for term: ${selectedTerm}, transport: ${selectedTransport || 'Any'}`);
        
        // Filter students with balance > 0 and matching transport mode
        filteredStudents = allStudents.filter(student => {
            try {
                if (!student || !student.admissionNumber) return false;
                
                const balance = calculateFeeBalanceRaw(student, selectedTerm);
                const transportMatch = !selectedTransport || 
                                     (student.transportMode && 
                                      student.transportMode.toLowerCase() === selectedTransport);
                
                return balance > 0 && transportMatch;
            } catch (err) {
                console.error('Error processing student:', student, err);
                return false;
            }
        });
        
        console.log(`Found ${filteredStudents.length} students with balance`);
        
        // Sort by balance (highest first)
        filteredStudents.sort((a, b) => {
            const balanceA = calculateFeeBalanceRaw(a, selectedTerm);
            const balanceB = calculateFeeBalanceRaw(b, selectedTerm);
            return balanceB - balanceA;
        });
        
        displayFeeBalances();
        updateStatistics();
    } catch (error) {
        console.error('Error filtering students:', error);
        feeBalancesBody.innerHTML = `
            <tr>
                <td colspan="9" class="error">
                    Error: ${error.message}
                    <button onclick="filterAndDisplayStudents()" class="retry-btn">Retry</button>
                </td>
            </tr>`;
    }
}

// Calculate fee balance for a student
function calculateFeeBalanceRaw(student, term) {
    if (!student) return 0;
    
    // Calculate total paid
    let totalPaid = 0;
    if (student.feePayments && student.feePayments[term]) {
        const payments = student.feePayments[term];
        if (Array.isArray(payments)) {
            totalPaid = payments.reduce((sum, payment) => {
                return sum + (parseFloat(payment.amount) || 0);
            }, 0);
        } else if (typeof payments === 'object') {
            totalPaid = Object.values(payments).reduce((sum, payment) => {
                if (typeof payment === 'object') {
                    return sum + (parseFloat(payment.amount) || 0);
                }
                return sum + (parseFloat(payment) || 0);
            }, 0);
        }
    }
    
    // Calculate total fee
    const totalFee = parseFloat(calculateTotalFeeWithTerm(student, term).replace(/,/g, '')) || 0;
    
    return Math.max(0, totalFee - totalPaid);
}

// Calculate total fee with term
function calculateTotalFeeWithTerm(student, term) {
    if (!student) return '0';
    
    // First try to get from student's fee structure
    if (student.feeStructure && student.feeStructure[term]) {
        let total = 0;
        const feeStructure = student.feeStructure[term];
        
        // Process the fee structure if it was found in student's record
        if (Array.isArray(feeStructure)) {
            // If it's an array of fee items
            feeStructure.forEach(item => {
                if (item && typeof item.amount !== 'undefined') {
                    total += parseFloat(item.amount) || 0;
                }
            });
        } else if (typeof feeStructure === 'object') {
            // If it's an object with fee items
            Object.values(feeStructure).forEach(item => {
                if (item && typeof item.amount !== 'undefined') {
                    total += parseFloat(item.amount) || 0;
                } else if (typeof item === 'number') {
                    total += item;
                } else if (typeof item === 'string' && !isNaN(parseFloat(item))) {
                    total += parseFloat(item);
                }
            });
        }
        
        return total > 0 ? total.toString() : '0';
    } 
    // If not found in student's fee structure, use default fee structure
    else if (window.feeStructure && window.feeStructure.schoolFees && window.feeStructure.schoolFees[term]) {
        const grade = student.grade || student.classLevel || 'Grade 1'; // Default to Grade 1 if not specified
        const schoolFee = window.feeStructure.schoolFees[term][grade] || 0;
        const lunchFee = window.feeStructure.lunchFees && window.feeStructure.lunchFees[term] ? window.feeStructure.lunchFees[term] : 0;
        
        // Add transport fee if applicable
        let transportFee = 0;
        if (student.transportMode && window.feeStructure.transportFees && window.feeStructure.transportFees[term]) {
            transportFee = window.feeStructure.transportFees[term][student.transportMode] || 0;
        }
        
        // Add other fees
        let otherFeesTotal = 0;
        if (window.feeStructure.otherFees && window.feeStructure.otherFees[term]) {
            otherFeesTotal = Object.values(window.feeStructure.otherFees[term])
                .reduce((sum, fee) => sum + (parseFloat(fee) || 0), 0);
        }
        
        const total = schoolFee + lunchFee + transportFee + otherFeesTotal;
        return total > 0 ? total.toString() : '0';
    }
    
    return '0';
}
}

// Display fee balances in the table
function displayFeeBalances() {
    if (!feeBalancesBody) return;
    
    if (filteredStudents.length === 0) {
        feeBalancesBody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
                    No students found with outstanding balances for the selected criteria.
                    ${allStudents.length === 0 ? '<br><button onclick="loadStudents()" class="retry-btn">Reload Students</button>' : ''}
                </td>
            </tr>`;
        return;
    }
    
    const selectedTerm = termFilter ? termFilter.value : 'Term 1';
    
    feeBalancesBody.innerHTML = filteredStudents.map((student, index) => {
        try {
            if (!student) return '';
            
            const balance = calculateFeeBalanceRaw(student, selectedTerm);
            const lastPaymentDate = getLastPaymentDate(student, selectedTerm) || 'No payments';
            const rowClass = index % 2 === 0 ? 'even' : 'odd';
            
            // Format balance with color coding
            let balanceDisplay = `Ksh ${balance.toLocaleString()}`;
            if (balance > 50000) {
                balanceDisplay = `<span class="high-balance">${balanceDisplay} ⚠️</span>`;
            } else if (balance > 20000) {
                balanceDisplay = `<span class="medium-balance">${balanceDisplay}</span>`;
            }
            
            // Format phone number
            const phoneNumber = formatPhoneNumber(student.parentPhone || '');
            
            return `
                <tr class="${rowClass}" data-admission="${escapeHtml(student.admissionNumber || '')}">
                    <td>${escapeHtml(student.admissionNumber || 'N/A')}</td>
                    <td>${escapeHtml(student.fullName || 'N/A')}</td>
                    <td>${escapeHtml(student.class || 'N/A')}</td>
                    <td>${escapeHtml(student.classTeacher || 'N/A')}</td>
                    <td>${phoneNumber || 'N/A'}</td>
                    <td>${escapeHtml(student.location || 'N/A')}</td>
                    <td>${escapeHtml(student.transportMode || 'None')}</td>
                    <td class="balance-amount">${balanceDisplay}</td>
                    <td>${lastPaymentDate}</td>
                </tr>
            `;
        } catch (err) {
            console.error('Error rendering student row:', student, err);
            return ''; // Skip this row if there's an error
        }
    }).filter(row => row !== '').join(''); // Filter out any empty rows
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper function to format phone numbers
function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const cleaned = ('' + phone).replace(/\D/g, '');
    
    // Check if the number starts with 0 or 254
    if (cleaned.startsWith('254')) {
        return `+${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
    } else if (cleaned.startsWith('0')) {
        return `+254 ${cleaned.substring(1, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
    } else if (cleaned.length === 9) {
        return `+254 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
    }
    
    // Return as is if we can't format it
    return phone;
}

// Get last payment date for a student
function getLastPaymentDate(student, term) {
    if (!student.feePayments || !student.feePayments[term]) return null;
    
    const payments = Object.values(student.feePayments[term]);
    if (payments.length === 0) return null;
    
    // Sort payments by date (newest first)
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    return payments[0].date;
}

// Update statistics
function updateStatistics() {
    if (!totalOutstandingBalanceEl || !studentsWithBalanceEl) return;
    
    const selectedTerm = termFilter ? termFilter.value : 'Term 1';
    
    try {
        const { totalOutstanding, highestBalance } = filteredStudents.reduce((acc, student) => {
            try {
                const balance = calculateFeeBalanceRaw(student, selectedTerm) || 0;
                acc.totalOutstanding += balance;
                
                if (balance > acc.highestBalance.amount) {
                    acc.highestBalance = {
                        amount: balance,
                        student: student.fullName || 'Unknown',
                        admission: student.admissionNumber || ''
                    };
                }
                
                return acc;
            } catch (err) {
                console.error('Error calculating balance for student:', student, err);
                return acc; // Skip this student in the total
            }
        }, { 
            totalOutstanding: 0, 
            highestBalance: { amount: 0, student: '', admission: '' } 
        });
        
        // Update total outstanding balance
        totalOutstandingBalanceEl.textContent = `Ksh ${totalOutstanding.toLocaleString()}`;
        
        // Update students with balance count
        studentsWithBalanceEl.textContent = filteredStudents.length;
        
        // Update highest balance information if available
        const highestBalanceEl = document.getElementById('highestBalanceInfo');
        if (highestBalanceEl) {
            if (highestBalance.amount > 0) {
                highestBalanceEl.innerHTML = `
                    Highest balance: <strong>Ksh ${highestBalance.amount.toLocaleString()}</strong>
                    (${escapeHtml(highestBalance.student)} - ${highestBalance.admission})
                `;
                highestBalanceEl.style.display = 'block';
            } else {
                highestBalanceEl.style.display = 'none';
            }
        }
        
        // Update export button state
        if (exportBtn) {
            exportBtn.disabled = filteredStudents.length === 0;
            if (filteredStudents.length > 0) {
                exportBtn.title = `Export ${filteredStudents.length} students to Excel`;
            } else {
                exportBtn.title = 'No data to export';
            }
        }
    } catch (error) {
        console.error('Error updating statistics:', error);
        totalOutstandingBalanceEl.textContent = 'Error';
        studentsWithBalanceEl.textContent = '0';
        
        const highestBalanceEl = document.getElementById('highestBalanceInfo');
        if (highestBalanceEl) {
            highestBalanceEl.textContent = 'Error calculating highest balance';
            highestBalanceEl.style.display = 'block';
        }
    }
}

// Show or hide loading indicator
function showLoading(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    
    // Disable/enable interactive elements during loading
    const interactiveElements = [termFilter, transportFilter, exportBtn];
    interactiveElements.forEach(element => {
        if (element) {
            element.disabled = show;
        }
    });
}

// Show a message to the user
function showMessage(message, type = 'info') {
    // Remove any existing messages
    const existingMessage = document.getElementById('statusMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.id = 'statusMessage';
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-message';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => messageDiv.remove();
    messageDiv.appendChild(closeButton);
    
    // Insert after the header
    const header = document.querySelector('header');
    if (header && header.parentNode) {
        header.parentNode.insertBefore(messageDiv, header.nextSibling);
    }
    
    // Auto-hide after 5 seconds
    if (type !== 'error') {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                setTimeout(() => messageDiv.remove(), 300);
            }
        }, 5000);
    }
}

// Export to Excel
function exportToExcel() {
    try {
        if (filteredStudents.length === 0) {
            showMessage('No data to export', 'warning');
            return;
        }
        
        const selectedTerm = termFilter ? termFilter.value : 'Term 1';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `fee_balances_${selectedTerm.replace(/\s+/g, '_')}_${timestamp}.csv`;
        
        // Prepare CSV content with BOM for Excel
        let csvContent = '\uFEFF'; // BOM for Excel
        csvContent += 'Admission Number,Full Name,Class,Class Teacher,Parent Phone,Location,Transport Mode,Fee Balance,Last Payment\n';
        
        filteredStudents.forEach(student => {
            try {
                const balance = calculateFeeBalanceRaw(student, selectedTerm);
                const lastPaymentDate = getLastPaymentDate(student, selectedTerm) || 'No payments';
                
                // Helper function to escape CSV fields
                const escapeCsv = (field) => {
                    if (field === null || field === undefined) return '';
                    const str = String(field);
                    // If the field contains commas, quotes, or newlines, wrap it in quotes and escape existing quotes
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return '"' + str.replace(/"/g, '""') + '"';
                    }
                    return str;
                };
                
                csvContent += [
                    escapeCsv(student.admissionNumber || ''),
                    escapeCsv(student.fullName || ''),
                    escapeCsv(student.class || ''),
                    escapeCsv(student.classTeacher || ''),
                    escapeCsv(student.parentPhone || ''),
                    escapeCsv(student.location || ''),
                    escapeCsv(student.transportMode || 'None'),
                    balance.toFixed(2),
                    escapeCsv(lastPaymentDate)
                ].join(',') + '\n';
            } catch (err) {
                console.error('Error processing student for export:', student, err);
                // Continue with next student
            }
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        // Add to page, trigger download, then remove
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        showMessage(`Exported ${filteredStudents.length} records to ${filename}`, 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showMessage(`Error exporting data: ${error.message}`, 'error');
    }
}
