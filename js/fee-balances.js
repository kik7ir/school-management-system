document.addEventListener('DOMContentLoaded', function() {
    // Initialize DataTable
    const feeBalancesTable = $('#feeBalancesTable').DataTable({
        responsive: true,
        order: [[1, 'asc']], // Sort by student name by default
        columnDefs: [
            { orderable: false, targets: [0, 9] }, // Disable sorting on # and Actions columns
            { className: 'text-center', targets: [0, 3, 4, 5, 6, 7, 8] } // Center align specific columns
        ]
    });

    // Load data when page loads
    loadFeeBalances();

    // Event Listeners
    document.getElementById('searchInput').addEventListener('keyup', function() {
        feeBalancesTable.search(this.value).draw();
    });

    document.getElementById('classFilter').addEventListener('change', function() {
        const selectedClass = this.value;
        feeBalancesTable.column(3).search(selectedClass).draw();
        updateSummaryCards();
    });

    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
    document.getElementById('refreshBtn').addEventListener('click', loadFeeBalances);
    document.getElementById('savePaymentBtn').addEventListener('click', savePayment);
    document.getElementById('printStatementBtn').addEventListener('click', printStatement);

    // Set default payment date to today
    document.getElementById('paymentDate').valueAsDate = new Date();
});

// Load fee balances for all students
function loadFeeBalances() {
    const students = JSON.parse(localStorage.getItem('students')) || [];
    const tbody = document.getElementById('feeBalancesBody');
    tbody.innerHTML = '';

    students.forEach((student, index) => {
        const term1Balance = calculateTermBalance(student, 'Term 1');
        const term2Balance = calculateTermBalance(student, 'Term 2');
        const term3Balance = calculateTermBalance(student, 'Term 3');
        const totalBalance = term1Balance + term2Balance + term3Balance;
        
        const status = getPaymentStatus(student, totalBalance);
        
        // Get billing options for the current term (default to Term 1 if not set)
        const currentTerm = 'Term 2'; // You can make this dynamic based on your needs
        const billingOptions = getBillingOptions(student, currentTerm);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="d-flex align-items-center">
                    <img src="${student.photoUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2RlZTJmNSIgZD0iTTEyIDEyYzIuNzYgMCA1LTIuMjQgNS01cy0yLjI0LTUtNS01LTUgMi4yNC01IDUgMi4yNCA1IDUgNXptMCAyYy0yLjY3IDAtOCAxLjMzLTggNHYyaDE2di0yYzAtMi42Ny01LjMzLTQtOC00eiIvPjwvc3ZnPg=='}" 
                         alt="${student.fullName}" class="student-avatar">
                    <div>
                        <div class="fw-medium">${student.fullName || 'N/A'}</div>
                        <small class="text-muted">${student.admissionNumber || 'N/A'}</small>
                    </div>
                </div>
            </td>
            <td>${student.class || 'N/A'}</td>
            <td>${student.classTeacher || 'N/A'}</td>
            <td>${billingOptions || 'No billing options selected'}</td>
            <td class="${getBalanceClass(term1Balance)}">${formatCurrency(term1Balance)}</td>
            <td class="${getBalanceClass(term2Balance)}">${formatCurrency(term2Balance)}</td>
            <td class="${getBalanceClass(term3Balance)}">${formatCurrency(term3Balance)}</td>
            <td class="fw-bold ${getBalanceClass(totalBalance)}">${formatCurrency(totalBalance)}</td>
            <td>${student.transport || 'None'}</td>
            <td>${student.transportLocation || 'N/A'}</td>
            <td>${student.parentName || 'N/A'}</td>
            <td>${student.parentPhone || 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary" onclick="editStudent('${student.admissionNumber}')" title="Edit">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${student.admissionNumber}')" title="Delete">
                        🗑️
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="showPayFeeModal('${student.admissionNumber}')" title="Pay Fee">
                        💳
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="viewStudentReport('${student.admissionNumber}')" title="View Report">
                        📊
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Update summary cards
    updateSummaryCards();
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Calculate balance for a specific term
function calculateTermBalance(student, term) {
    if (!student.feeStructure || !student.feeStructure[term]) return 0;
    
    const termFees = student.feeStructure[term];
    let totalFees = 0;
    let totalPayments = 0;

    // Sum up all fee items
    Object.values(termFees).forEach(feeItem => {
        if (typeof feeItem === 'number') {
            totalFees += feeItem;
        } else if (feeItem && typeof feeItem === 'object' && 'amount' in feeItem) {
            totalFees += feeItem.amount || 0;
        }
    });

    // Sum up all payments for this term
    if (student.payments && student.payments[term]) {
        student.payments[term].forEach(payment => {
            totalPayments += payment.amount || 0;
        });
    }

    return totalFees - totalPayments;
}

// Get payment status for a student
function getPaymentStatus(student, totalBalance) {
    // Check if student has any overdue payments
    const currentDate = new Date();
    let hasOverdue = false;
    
    if (student.payments) {
        Object.entries(student.payments).forEach(([term, payments]) => {
            payments.forEach(payment => {
                if (payment.dueDate && new Date(payment.dueDate) < currentDate && (payment.amount || 0) === 0) {
                    hasOverdue = true;
                }
            });
        });
    }

    if (hasOverdue) {
        return { class: 'status-overdue', text: 'Overdue' };
    } else if (totalBalance <= 0) {
        return { class: 'status-paid', text: 'Paid' };
    } else {
        return { class: 'status-pending', text: 'Pending' };
    }
}

// Update summary cards with current data
function updateSummaryCards() {
    const students = JSON.parse(localStorage.getItem('students')) || [];
    let totalPaid = 0;
    let totalBalance = 0;
    let overdueCount = 0;

    students.forEach(student => {
        const term1Balance = calculateTermBalance(student, 'Term 1');
        const term2Balance = calculateTermBalance(student, 'Term 2');
        const term3Balance = calculateTermBalance(student, 'Term 3');
        const studentTotalBalance = term1Balance + term2Balance + term3Balance;
        
        // Get total paid by student (sum of all payments)
        let studentPaid = 0;
        if (student.payments) {
            Object.values(student.payments).forEach(termPayments => {
                termPayments.forEach(payment => {
                    studentPaid += payment.amount || 0;
                });
            });
        }
        
        totalPaid += studentPaid;
        totalBalance += studentTotalBalance;
        
        // Check for overdue payments
        if (getPaymentStatus(student, studentTotalBalance).text === 'Overdue') {
            overdueCount++;
        }
    });

    // Update the DOM
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('totalPaid').textContent = `Ksh ${formatNumber(totalPaid)}`;
    document.getElementById('totalBalance').textContent = `Ksh ${formatNumber(totalBalance)}`;
    document.getElementById('overduePayments').textContent = overdueCount;
}

// View student details in modal
function viewStudentDetails(studentId) {
    const students = JSON.parse(localStorage.getItem('students')) || [];
    const student = students.find(s => s.id === studentId);
    
    if (!student) {
        alert('Student not found');
        return;
    }

    const modalBody = document.getElementById('studentDetailsBody');
    const term1Balance = calculateTermBalance(student, 'Term 1');
    const term2Balance = calculateTermBalance(student, 'Term 2');
    const term3Balance = calculateTermBalance(student, 'Term 3');
    const totalBalance = term1Balance + term2Balance + term3Balance;
    
    // Build the modal content
    let content = `
        <div class="row mb-4">
            <div class="col-md-3 text-center">
                <img src="${student.photoUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2RlZTJmNSIgZD0iTTEyIDEyYzIuNzYgMCA1LTIuMjQgNS01cy0yLjI0LTUtNS01LTUgMi4yNC01IDUgMi4yNCA1IDUgNXptMCAyYy0yLjY3IDAtOCAxLjMzLTggNHYyaDE2di0yYzAtMi42Ny01LjMzLTQtOC00eiIvPjwvc3ZnPg=='}" 
                     alt="${student.fullName}" class="img-fluid rounded-circle mb-3" style="width: 120px; height: 120px; object-fit: cover;">
                <h5 class="mb-1">${student.fullName || 'N/A'}</h5>
                <p class="text-muted mb-0">${student.admissionNumber || ''}</p>
                <p class="text-muted">${student.class || ''}</p>
                <div class="d-flex justify-content-center">
                    <span class="badge bg-${totalBalance <= 0 ? 'success' : 'danger'} fs-6">
                        ${totalBalance <= 0 ? 'PAID IN FULL' : `BALANCE: Ksh ${formatNumber(totalBalance)}`}
                    </span>
                </div>
            </div>
            <div class="col-md-9">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Parent/Guardian:</strong> ${student.parentName || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${student.parentPhone || 'N/A'}</p>
                        <p><strong>Email:</strong> ${student.parentEmail || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Admission Date:</strong> ${student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Date of Birth:</strong> ${student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Gender:</strong> ${student.gender || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <h5 class="mb-3">Fee Summary</h5>
        <div class="table-responsive">
            <table class="table table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>Term</th>
                        <th class="text-end">Total Fees</th>
                        <th class="text-end">Amount Paid</th>
                        <th class="text-end">Balance</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${['Term 1', 'Term 2', 'Term 3'].map(term => {
                        const balance = calculateTermBalance(student, term);
                        const paid = getTotalPaidForTerm(student, term);
                        const totalFees = getTotalFeesForTerm(student, term);
                        const status = getTermStatus(balance, term);
                        
                        return `
                            <tr>
                                <td>${term}</td>
                                <td class="text-end">Ksh ${formatNumber(totalFees)}</td>
                                <td class="text-end">Ksh ${formatNumber(paid)}</td>
                                <td class="text-end ${getBalanceClass(balance)}">${formatCurrency(balance)}</td>
                                <td><span class="status-badge ${status.class}">${status.text}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="table-active">
                        <th>Total</th>
                        <th class="text-end">Ksh ${formatNumber(getTotalFeesForTerm(student, 'Term 1') + getTotalFeesForTerm(student, 'Term 2') + getTotalFeesForTerm(student, 'Term 3'))}</th>
                        <th class="text-end">Ksh ${formatNumber(getTotalPaidForTerm(student, 'Term 1') + getTotalPaidForTerm(student, 'Term 2') + getTotalPaidForTerm(student, 'Term 3'))}</th>
                        <th class="text-end fw-bold ${getBalanceClass(totalBalance)}">${formatCurrency(totalBalance)}</th>
                        <th><span class="status-badge ${getPaymentStatus(student, totalBalance).class}">${getPaymentStatus(student, totalBalance).text}</span></th>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <h5 class="mt-4 mb-3">Payment History</h5>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Date</th>
                        <th>Term</th>
                        <th>Description</th>
                        <th class="text-end">Amount</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Received By</th>
                    </tr>
                </thead>
                <tbody>
                    ${getAllPayments(student).length > 0 ? 
                        getAllPayments(student).map(payment => `
                            <tr>
                                <td>${new Date(payment.date).toLocaleDateString()}</td>
                                <td>${payment.term || 'N/A'}</td>
                                <td>${payment.description || 'Fee Payment'}</td>
                                <td class="text-end">Ksh ${formatNumber(payment.amount || 0)}</td>
                                <td>${payment.method || 'N/A'}</td>
                                <td>${payment.reference || 'N/A'}</td>
                                <td>${payment.receivedBy || 'N/A'}</td>
                            </tr>
                        `).join('') : 
                        '<tr><td colspan="7" class="text-center text-muted">No payment history found</td></tr>'
                    }
                </tbody>
            </table>
        </div>
    `;
    
    modalBody.innerHTML = content;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('studentDetailsModal'));
    modal.show();
    
    // Store student ID in the print button for later use
    document.getElementById('printStatementBtn').dataset.studentId = studentId;
}

// Show add payment modal
function showAddPaymentModal(studentId) {
    const students = JSON.parse(localStorage.getItem('students')) || [];
    const student = students.find(s => s.id === studentId);
    
    if (!student) {
        alert('Student not found');
        return;
    }
    
    // Set student ID in the form
    document.getElementById('studentId').value = studentId;
    
    // Reset form
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentDate').valueAsDate = new Date();
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('addPaymentModal'));
    modal.show();
}

// Save payment
function savePayment() {
    const studentId = document.getElementById('studentId').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const term = document.getElementById('paymentTerm').value;
    const date = document.getElementById('paymentDate').value;
    const method = document.getElementById('paymentMethod').value;
    const reference = document.getElementById('paymentReference').value;
    const notes = document.getElementById('paymentNotes').value;
    
    if (!studentId || isNaN(amount) || amount <= 0 || !term || !date) {
        alert('Please fill in all required fields with valid values');
        return;
    }
    
    const students = JSON.parse(localStorage.getItem('students')) || [];
    const studentIndex = students.findIndex(s => s.id === studentId);
    
    if (studentIndex === -1) {
        alert('Student not found');
        return;
    }
    
    // Initialize payments object if it doesn't exist
    if (!students[studentIndex].payments) {
        students[studentIndex].payments = {};
    }
    
    // Initialize term payments array if it doesn't exist
    if (!students[studentIndex].payments[term]) {
        students[studentIndex].payments[term] = [];
    }
    
    // Add the new payment
    const payment = {
        id: Date.now().toString(),
        amount: amount,
        date: date,
        method: method,
        reference: reference,
        notes: notes,
        receivedBy: 'Admin', // In a real app, this would be the logged-in user
        createdAt: new Date().toISOString()
    };
    
    students[studentIndex].payments[term].push(payment);
    
    // Save back to localStorage
    localStorage.setItem('students', JSON.stringify(students));
    
    // Show success message
    alert('Payment recorded successfully!');
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addPaymentModal'));
    modal.hide();
    
    // Refresh the data
    loadFeeBalances();
}

// Export to Excel
function exportToExcel() {
    // This is a simplified version. In a real app, you might want to use a library like SheetJS
    const students = JSON.parse(localStorage.getItem('students')) || [];
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add headers
    csvContent += 'No.,Admission No.,Student Name,Class,Term 1,Term 2,Term 3,Total Balance,Status\r\n';
    
    // Add data rows
    students.forEach((student, index) => {
        const term1Balance = calculateTermBalance(student, 'Term 1');
        const term2Balance = calculateTermBalance(student, 'Term 2');
        const term3Balance = calculateTermBalance(student, 'Term 3');
        const totalBalance = term1Balance + term2Balance + term3Balance;
        const status = getPaymentStatus(student, totalBalance);
        
        csvContent += `${index + 1},`;
        csvContent += `"${student.admissionNumber || ''}",`;
        csvContent += `"${student.fullName || ''}",`;
        csvContent += `"${student.class || ''}",`;
        csvContent += `${formatNumber(term1Balance, false)},`;
        csvContent += `${formatNumber(term2Balance, false)},`;
        csvContent += `${formatNumber(term3Balance, false)},`;
        csvContent += `${formatNumber(totalBalance, false)},`;
        csvContent += `"${status.text}"\r\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fee_balances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Print statement
function printStatement() {
    const studentId = document.getElementById('printStatementBtn').dataset.studentId;
    if (!studentId) return;
    
    // In a real app, you would open a print-friendly version of the statement
    // For now, we'll just print the current modal content
    const printContents = document.getElementById('studentDetailsBody').innerHTML;
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = `
        <div class="container mt-4">
            <div class="text-center mb-4">
                <h3>AGAPE LIFE CENTRE ACADEMY</h3>
                <p>P.O. Box 12345, Nairobi</p>
                <h4 class="mt-4">FEE STATEMENT</h4>
                <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
            ${printContents}
            <div class="mt-5 text-center">
                <div class="d-flex justify-content-around">
                    <div class="text-center">
                        <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto 10px;"></div>
                        <p>Parent's Signature</p>
                    </div>
                    <div class="text-center">
                        <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto 10px;"></div>
                        <p>School Stamp & Signature</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    window.print();
    document.body.innerHTML = originalContents;
    
    // Re-attach event listeners
    loadFeeBalances();
}

// Helper function to get total paid for a term
function getTotalPaidForTerm(student, term) {
    if (!student.payments || !student.payments[term]) return 0;
    return student.payments[term].reduce((sum, payment) => sum + (payment.amount || 0), 0);
}

// Helper function to get total fees for a term
function getTotalFeesForTerm(student, term) {
    if (!student.feeStructure || !student.feeStructure[term]) return 0;
    
    let total = 0;
    const termFees = student.feeStructure[term];
    
    Object.values(termFees).forEach(feeItem => {
        if (typeof feeItem === 'number') {
            total += feeItem;
        } else if (feeItem && typeof feeItem === 'object' && 'amount' in feeItem) {
            total += feeItem.amount || 0;
        }
    });
    
    return total;
}

// Helper function to get all payments for a student
function getAllPayments(student) {
    if (!student.payments) return [];
    
    let allPayments = [];
    
    Object.entries(student.payments).forEach(([term, payments]) => {
        payments.forEach(payment => {
            allPayments.push({
                ...payment,
                term: term
            });
        });
    });
    
    // Sort by date, newest first
    return allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Helper function to get term status
function getTermStatus(balance, term) {
    const currentDate = new Date();
    const termEndDates = {
        'Term 1': new Date(currentDate.getFullYear(), 2, 31), // March 31
        'Term 2': new Date(currentDate.getFullYear(), 7, 31), // July 31
        'Term 3': new Date(currentDate.getFullYear(), 11, 31) // November 31
    };
    
    if (balance <= 0) {
        return { class: 'status-paid', text: 'Paid' };
    } else if (currentDate > termEndDates[term]) {
        return { class: 'status-overdue', text: 'Overdue' };
    } else {
        return { class: 'status-pending', text: 'Pending' };
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    if (amount === 0) return '0.00';
    if (!amount) return 'N/A';
    
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    
    return amount < 0 ? `-${formatted}` : formatted;
}

// Helper function to format number without currency symbol
function formatNumber(num, withCommas = true) {
    if (num === 0) return '0.00';
    if (!num && num !== 0) return '0.00';
    
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: withCommas
    });
}

// Helper function to get billing options for a student for a specific term
function getBillingOptions(student, term) {
    // First check if we have the formatBillingOptions function from student-list.js
    if (window.formatBillingOptions) {
        return window.formatBillingOptions(student, term);
    }
    
    const options = [];
    
    // Check for term-specific billing options first
    if (student.termBilling) {
        // Get billing options for the specific term or fall back to root billing options
        const termBilling = student.termBilling[term] || student.termBilling;
        
        if (termBilling) {
            // School Fee
            if (termBilling.schoolFee === true) {
                options.push('School Fee');
            }
            
            // Lunch
            if (termBilling.lunch === true) {
                options.push('Lunch');
            }
            
            // Transport
            if (termBilling.transport === true) {
                const location = termBilling.transportLocation || student.transportLocation || '';
                options.push(location ? `Transport (${location})` : 'Transport');
            }
            
            // Other custom fees from termBilling
            const excludedKeys = ['transport', 'lunch', 'schoolFee', 'transportLocation'];
            Object.entries(termBilling).forEach(([key, value]) => {
                if (value === true && !excludedKeys.includes(key)) {
                    // Format the key nicely (e.g., 'reamPaper' -> 'Ream Paper')
                    const formattedName = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())
                        .trim();
                    options.push(formattedName);
                }
            });
        }
    }
    
    // Fallback to checking the old billingOptions structure
    if (options.length === 0 && student.billingOptions) {
        const termBilling = student.billingOptions[term] || student.billingOptions;
        if (termBilling) {
            if (termBilling.schoolFee) options.push('School Fee');
            if (termBilling.lunch) options.push('Lunch');
            if (termBilling.transport) {
                const location = termBilling.transportLocation || student.transportLocation;
                options.push(location ? `Transport (${location})` : 'Transport');
            }
            
            // Add other custom fees
            Object.entries(termBilling).forEach(([key, value]) => {
                if (value === true && !['transport', 'lunch', 'schoolFee', 'transportLocation'].includes(key)) {
                    const formattedName = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())
                        .trim();
                    options.push(formattedName);
                }
            });
        }
    }
    
    // If we still don't have any options but the student has payments, show default options
    if (options.length === 0 && student.payments) {
        const paymentTerms = Object.keys(student.payments);
        if (paymentTerms.length > 0) {
            // Check if any payments exist for this term
            if (student.payments[term] && student.payments[term].length > 0) {
                return 'School Fee, Lunch, Transport'; // Default billing options
            }
            
            // Or if no specific term payments, but has any payments at all
            const hasAnyPayments = paymentTerms.some(t => student.payments[t] && student.payments[t].length > 0);
            if (hasAnyPayments) {
                return 'School Fee, Lunch, Transport'; // Default billing options
            }
        }
    }
    
    return options.length > 0 ? options.join(', ') : 'No billing options selected';
}

// Helper function to get CSS class based on balance
function getBalanceClass(balance) {
    if (balance > 0) return 'text-danger';
    if (balance < 0) return 'text-success';
    return 'text-muted';
}
