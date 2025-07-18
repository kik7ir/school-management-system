// Function to view student report
function viewStudentReport(admissionNumber) {
    try {
        console.log('View report button clicked for student:', admissionNumber);
        if (!admissionNumber) {
            console.error('No admission number provided');
            return;
        }
        // Redirect to the student report page with the student ID
        const url = `student-report.html?id=${encodeURIComponent(admissionNumber)}`;
        console.log('Redirecting to:', url);
        window.location.href = url;
    } catch (error) {
        console.error('Error in viewStudentReport:', error);
        alert('An error occurred while trying to view the report. Please check the console for details.');
    }
}

// Get stored students from localStorage
function getStudents() {
    const students = JSON.parse(localStorage.getItem('students') || '[]');
    console.log('Retrieved', students.length, 'students from localStorage');
    return students;
}

import { feeService } from './fee-service.js';

// Initialize fee service
async function initializeFeeService() {
    try {
        await feeService.initialize();
        console.log('Fee structure initialized from Supabase');
    } catch (error) {
        console.error('Error initializing fee service:', error);
        // Fallback to localStorage if Supabase fails
        loadFeeStructure();
    }
}

// Load fee structure from localStorage as fallback
function loadFeeStructure() {
    const savedSchoolFees = JSON.parse(localStorage.getItem('schoolFees')) || feeStructure.schoolFees;
    const savedLunchFees = JSON.parse(localStorage.getItem('lunchFees')) || feeStructure.lunchFees;
    const savedTransportFees = JSON.parse(localStorage.getItem('transportFees')) || feeStructure.transportFees;
    const savedOtherFees = JSON.parse(localStorage.getItem('otherFees')) || feeStructure.otherFees;
    feeStructure.schoolFees = savedSchoolFees;
    feeStructure.lunchFees = savedLunchFees;
    feeStructure.transportFees = savedTransportFees;
    feeStructure.otherFees = savedOtherFees;
}

// Calculate total fee for a student for a specific term
function calculateTotalFee(student, term = 'Term 1') {
    return feeService.calculateTotalFee(student, term).toLocaleString();
}

// Calculate total payments for a student in a specific term
function calculateTotalPayments(student, term) {
    if (!student.payments || !Array.isArray(student.payments)) return 0;
    
    // Filter payments for the specific term and exclude debt carry forwards
    const termPayments = student.payments.filter(p => 
        p.term === term && 
        !p.isDebtCarryForward && // Exclude debt carry forwards
        !(p.isCarryForward && p.amountPaid < 0) // Exclude negative carry forwards (which are actually debts)
    );
    
    // Sum up all payments, converting to number and handling potential string values
    const total = termPayments.reduce((total, payment) => {
        // Convert to number and ensure it's positive (in case of any negative values)
        const amount = Math.abs(parseFloat(payment.amountPaid) || 0);
        return total + amount;
    }, 0);
    
    // Round to 2 decimal places to avoid floating point precision issues
    return parseFloat(total.toFixed(2));
}

/**
 * Calculate fee balance for a student in a specific term with proper carry forward handling
 * @param {Object} student - Student object
 * @param {string} term - Current term ('Term 1', 'Term 2', or 'Term 3')
 * @returns {number} - Calculated balance for the term
 */
function calculateFeeBalance(student, term) {
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    const currentIndex = terms.indexOf(term);
    
    // Validate inputs
    if (currentIndex === -1) {
        console.error(`Invalid term: ${term}`);
        return 0;
    }
    
    // 1. Calculate base fee for the current term
    const totalFee = parseFloat(calculateTotalFee(student, term).replace(/,/g, '')) || 0;
    
    // 2. Get all payments for this term
    const termPayments = (student.payments || []).filter(p => p.term === term);
    
    // 3. Calculate total regular payments (excluding any carry forward entries)
    const regularPayments = termPayments
        .filter(p => !p.isCarryForward && !p.isDebtCarryForward)
        .reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    
    // 4. Get any overpayment credits from previous terms
    const overpaymentCredits = termPayments
        .filter(p => p.isCarryForward && !p.isDebtCarryForward)
        .reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    
    // 5. Calculate current term balance before any debt carry forwards
    let currentTermBalance = totalFee - regularPayments - overpaymentCredits;
    
    // 6. Handle debt carry forwards from previous terms (only for Term 2 and Term 3)
    if (currentIndex > 0) {
        const prevTerm = terms[currentIndex - 1];
        const prevTermBalance = calculateTermBalanceRaw(student, prevTerm);
        
        // If previous term has a positive balance (debt), carry it forward
        if (prevTermBalance > 0.01) {
            // Only carry forward the actual debt amount, not the full previous term balance
            const debtToCarryForward = parseFloat(prevTermBalance.toFixed(2));
            handleDebtCarryForward(student, prevTerm, debtToCarryForward);
            currentTermBalance += debtToCarryForward;
            console.log(`[${student.admissionNumber}] Carried forward debt of ${debtToCarryForward.toFixed(2)} KES from ${prevTerm} to ${term}`);
        }
    }
    
    // 7. Handle overpayment (negative balance) - carry forward to next term if not Term 3
    if (currentTermBalance < -0.01) {
        if (term !== 'Term 3') {
            const nextTerm = terms[currentIndex + 1];
            if (nextTerm) {
                const overpaymentAmount = parseFloat(Math.abs(currentTermBalance).toFixed(2));
                handleOverpayment(student, term, overpaymentAmount);
                console.log(`[${student.admissionNumber}] Carried forward overpayment of ${overpaymentAmount.toFixed(2)} KES from ${term} to ${nextTerm}`);
                currentTermBalance = 0; // Reset balance as overpayment is carried forward
            }
        } else {
            console.log(`[${student.admissionNumber}] Term 3 overpayment of ${Math.abs(currentTermBalance).toFixed(2)} KES - no carry forward`);
        }
    }
    
    // 8. Clean up any duplicate or conflicting carry forward entries
    cleanupCarryForwardEntries(student, term);
    
    // Return the final balance, rounded to 2 decimal places
    const finalBalance = parseFloat(currentTermBalance.toFixed(2));
    
    console.log(`[${student.admissionNumber}] ${term} Balance Calculation:`, {
        totalFee: totalFee.toFixed(2),
        regularPayments: regularPayments.toFixed(2),
        overpaymentCredits: overpaymentCredits.toFixed(2),
        finalBalance: finalBalance.toFixed(2)
    });
    
    return finalBalance;
}

/**
 * Calculate raw term balance without triggering any carry forward logic
 * @param {Object} student - Student object
 * @param {string} term - Term to calculate balance for
 * @returns {number} - Raw balance for the term
 */
function calculateTermBalanceRaw(student, term) {
    const totalFee = parseFloat(calculateTotalFee(student, term).replace(/,/g, '')) || 0;
    const termPayments = (student.payments || []).filter(p => p.term === term);
    
    // Calculate total regular payments (excluding any carry forward entries)
    const regularPayments = termPayments
        .filter(p => !p.isCarryForward && !p.isDebtCarryForward)
        .reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    
    // Get any debt carry forwards from previous terms (adds to the fee)
    const debtCarryForwards = termPayments
        .filter(p => p.isDebtCarryForward)
        .reduce((sum, p) => sum + Math.abs(parseFloat(p.amountPaid) || 0), 0);
    
    // Get any overpayment credits from previous terms (reduces the fee)
    const overpaymentCredits = termPayments
        .filter(p => p.isCarryForward && !p.isDebtCarryForward)
        .reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    
    // Calculate the balance: (total fee + debt carried forward) - (payments + overpayment credits)
    const balance = (totalFee + debtCarryForwards) - (regularPayments + overpaymentCredits);
    
    return parseFloat(balance.toFixed(2));
}

/**
 * Clean up duplicate or conflicting carry forward entries
 * @param {Object} student - Student object
 * @param {string} term - Current term
 */
function cleanupCarryForwardEntries(student, term) {
    if (!student.payments) return;
    
    // Group payments by type and term
    const paymentGroups = {};
    student.payments.forEach(payment => {
        const key = `${payment.term}-${payment.isCarryForward ? 'credit' : payment.isDebtCarryForward ? 'debt' : 'regular'}`;
        if (!paymentGroups[key]) paymentGroups[key] = [];
        paymentGroups[key].push(payment);
    });
    
    // Clean up duplicate carry forwards (keep only the most recent)
    Object.keys(paymentGroups).forEach(key => {
        if (key.includes('credit') || key.includes('debt')) {
            const payments = paymentGroups[key];
            if (payments.length > 1) {
                // Sort by date (newest first)
                payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
                // Keep only the most recent entry
                student.payments = student.payments.filter(p => 
                    p.paymentId !== payments[0].paymentId || p === payments[0]
                );
            }
        }
    });
}

// Helper function to save student data
function saveStudentData(student) {
    const students = getStudents();
    const studentIndex = students.findIndex(s => s.admissionNumber === student.admissionNumber);
    if (studentIndex !== -1) {
        students[studentIndex] = student;
        localStorage.setItem('students', JSON.stringify(students));
    }
}

// Calculate fee balance for a student in a specific term WITHOUT triggering carry forward logic (to avoid recursion)
function calculateFeeBalanceRaw(student, term) {
    // Calculate total fee for the term
    const totalFee = parseFloat(calculateTotalFee(student, term).replace(/,/g, '')) || 0;
    
    // Get all payments for this term
    const termPayments = (student.payments || []).filter(p => p.term === term);
    
    // Calculate total paid, excluding any carry forward payments
    const totalPaid = termPayments
        .filter(p => !p.isCarryForward && !p.isDebtCarryForward)
        .reduce((sum, p) => sum + Math.abs(parseFloat(p.amountPaid) || 0), 0);
    
    // Get any debt carry forwards from previous terms (positive amount)
    const debtCarryForwards = termPayments
        .filter(p => p.isDebtCarryForward)
        .reduce((sum, p) => sum + Math.abs(parseFloat(p.amountPaid) || 0), 0);
    
    // Get any credit carry forwards from previous terms (negative amount)
    const creditCarryForwards = termPayments
        .filter(p => p.isCarryForward)
        .reduce((sum, p) => sum - Math.abs(parseFloat(p.amountPaid) || 0), 0);
    
    // Calculate the balance: total fee + debt carried forward - payments + credit carry forwards
    const balance = (totalFee + debtCarryForwards + creditCarryForwards) - totalPaid;
    
    // Debug logging
    const debugInfo = {
        student: student.admissionNumber,
        term,
        totalFee: totalFee.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        debtCarryForwards: debtCarryForwards.toFixed(2),
        creditCarryForwards: creditCarryForwards.toFixed(2),
        calculatedBalance: balance.toFixed(2),
        paymentCount: termPayments.length,
        payments: termPayments.map(p => ({
            amount: p.amountPaid,
            type: p.isDebtCarryForward ? 'debt-carry-forward' : 
                  (p.isCarryForward ? 'credit-carry-forward' : 'payment'),
            date: p.datePaid || p.paymentDate,
            receipt: p.receiptNumber || 'N/A',
            description: p.description || 'No description'
        }))
    };
    
    console.log('Fee Balance Calculation:', debugInfo);
    
    return parseFloat(balance.toFixed(2));
}

/**
 * Handle carrying forward a debt (positive balance) to the next term
 * @param {Object} student - Student object
 * @param {string} currentTerm - Current term
 * @param {number} debtAmount - Amount to carry forward
 */
function handleDebtCarryForward(student, currentTerm, debtAmount) {
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    const currentIndex = terms.indexOf(currentTerm);
    
    // Validate inputs
    if (currentIndex < 0 || !student || debtAmount <= 0) {
        console.error('Invalid parameters for handleDebtCarryForward:', { 
            currentTerm, 
            debtAmount, 
            student: student?.admissionNumber 
        });
        return;
    }
    
    // Don't carry forward from Term 3 or if there's no next term
    if (currentTerm === 'Term 3' || currentIndex >= terms.length - 1) {
        console.log(`Not carrying forward from ${currentTerm} for student ${student.admissionNumber}`);
        return;
    }
    
    const nextTerm = terms[currentIndex + 1];
    if (!nextTerm) return;
    
    // Initialize payments array if it doesn't exist
    if (!Array.isArray(student.payments)) {
        student.payments = [];
    }
    
    // Calculate the exact debt amount from the current term's balance
    const currentTermBalance = calculateTermBalanceRaw(student, currentTerm);
    const actualDebt = Math.max(0, parseFloat(currentTermBalance.toFixed(2)));
    
    if (actualDebt <= 0.01) {
        console.log(`No debt to carry forward from ${currentTerm} for student ${student.admissionNumber}`);
        return;
    }
    
    // Remove any existing debt carry forward for the next term
    student.payments = student.payments.filter(p => 
        !(p.term === nextTerm && p.isDebtCarryForward)
    );
    
    // Create new debt carry forward entry
    const paymentId = `debt-cf-${Date.now()}`;
    const debtEntry = {
        paymentId: paymentId,
        term: nextTerm,
        amountPaid: actualDebt.toFixed(2),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Carry Forward',
        isDebtCarryForward: true,
        description: `Debt of ${actualDebt.toFixed(2)} KES carried forward from ${currentTerm}`,
        receiptNumber: `CF-DEBT-${student.admissionNumber}-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString()
    };
    
    student.payments.push(debtEntry);
    
    console.log(`Created debt carry forward for ${student.admissionNumber} (${nextTerm}):`, {
        originalDebt: debtAmount,
        actualCarriedForward: actualDebt,
        paymentId: paymentId
    });
    
    // Save the updated student data
    saveStudentData(student);
}

/**
 * Handle carrying forward an overpayment (negative balance) to the next term
 * @param {Object} student - Student object
 * @param {string} currentTerm - Current term
 * @param {number} overpaymentAmount - Overpayment amount to carry forward
 */
function handleOverpayment(student, currentTerm, overpaymentAmount) {
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    const currentIndex = terms.indexOf(currentTerm);
    
    // Validate inputs
    if (currentIndex < 0 || !student || overpaymentAmount <= 0) {
        console.error('Invalid parameters for handleOverpayment:', { 
            currentTerm, 
            overpaymentAmount, 
            student: student?.admissionNumber 
        });
        return;
    }
    
    // Don't carry forward from Term 3 or if there's no next term
    if (currentTerm === 'Term 3' || currentIndex >= terms.length - 1) {
        console.log(`Term 3 overpayment of ${overpaymentAmount.toFixed(2)} KES for student ${student.admissionNumber} - no carry forward`);
        return;
    }
    
    const nextTerm = terms[currentIndex + 1];
    if (!nextTerm) return; // No term after Term 3
    
    // Initialize payments array if it doesn't exist
    if (!Array.isArray(student.payments)) {
        student.payments = [];
    }
    
    // Remove any existing overpayment carry forward for the next term
    student.payments = student.payments.filter(p => 
        !(p.term === nextTerm && p.isCarryForward && !p.isDebtCarryForward)
    );
    
    // Create a new overpayment carry forward entry
    const paymentId = `overpayment-cf-${Date.now()}`;
    const overpaymentEntry = {
        paymentId: paymentId,
        term: nextTerm,
        amountPaid: overpaymentAmount.toFixed(2),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Overpayment Credit',
        isCarryForward: true,
        description: `Credit from overpayment in ${currentTerm}`,
        receiptNumber: `CF-CREDIT-${student.admissionNumber}-${Date.now().toString().slice(-6)}`,
        createdAt: new Date().toISOString()
    };
    
    student.payments.push(overpaymentEntry);
    
    console.log(`Created overpayment credit for ${student.admissionNumber} (${nextTerm}):`, {
        amount: overpaymentAmount,
        paymentId: paymentId
    });
    
    // Save the updated student data
    saveStudentData(student);
}

// Data cleanup: Remove both carry forward types if both exist for the same term, and recalculate
function cleanupCarryForwardConflicts() {
    const students = getStudents();
    let cleaned = false;
    students.forEach(student => {
        if (!student.payments) return;
        const terms = ['Term 1', 'Term 2', 'Term 3'];
        terms.forEach(term => {
            const hasToken = student.payments.some(p => p.term === term && p.isCarryForward);
            const hasDebt = student.payments.some(p => p.term === term && p.isDebtCarryForward);
            if (hasToken && hasDebt) {
                // Remove both and let logic recalculate
                student.payments = student.payments.filter(p => !(p.term === term && (p.isCarryForward || p.isDebtCarryForward)));
                cleaned = true;
            }
        });
    });
    if (cleaned) {
        localStorage.setItem('students', JSON.stringify(students));
        // Optionally, refresh the page or recalculate balances
        console.log('%cCarry forward conflicts cleaned. Reload the page to see updated balances.', 'color: orange; font-weight: bold;');
    } else {
        console.log('%cNo carry forward conflicts found during cleanup.', 'color: green; font-weight: bold;');
    }
}

// Calculate total fee for a student for the given term with term-specific fee items
function calculateTotalFeeWithTerm(student, term) {
    const classLevel = student.classLevel || '1';
    
    // Get the base fees from feeStructure
    const baseFees = {
        '1': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500 // Use the correct lunch fee from feeStructure
        },
        '2': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '3': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '4': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '5': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '6': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '7': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '8': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        }
    };
    
    // Get the base fees for the student's class
    const classFees = baseFees[classLevel] || baseFees['1'];
    
    // Check for term-specific fee overrides
    const termFees = student.termFees?.[term] || {};
    
    // Calculate total fee by summing up enabled fee items
    let total = 0;
    
    // Check each fee type (tuition, transport, lunch)
    for (const [feeType, baseAmount] of Object.entries(classFees)) {
        // If the fee is explicitly disabled for this term, skip it
        if (termFees[feeType] === false) continue;
        
        // Use the term-specific amount if provided, otherwise use the base amount
        const amount = termFees[feeType] !== undefined ? termFees[feeType] : baseAmount;
        total += parseFloat(amount) || 0;
    }
    
    return total;
}

// Get detailed fee breakdown for a student for the given term
function getFeeBreakdown(student, term) {
    const classLevel = student.classLevel || '1';
    const baseFees = {
        '1': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '2': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '3': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '4': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '5': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '6': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '7': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        },
        '8': { 
            tuition: 10000, 
            transport: 5000, 
            lunch: feeStructure.lunchFees[term] || 1500
        }
    };
    
    const classFees = baseFees[classLevel] || baseFees['1'];
    const termFees = student.termFees?.[term] || {};
    
    const breakdown = [];
    
    // Check each fee type
    for (const [feeType, baseAmount] of Object.entries(classFees)) {
        // Skip if this fee is disabled for the term
        if (termFees[feeType] === false) continue;
        
        // Use the term-specific amount if provided, otherwise use the base amount
        const amount = termFees[feeType] !== undefined ? termFees[feeType] : baseAmount;
        
        breakdown.push({
            type: feeType.charAt(0).toUpperCase() + feeType.slice(1), // Capitalize first letter
            amount: parseFloat(amount) || 0,
            isCustom: termFees[feeType] !== undefined
        });
    }
    
    return breakdown;
}

// Format billing options for a specific term
function formatBillingOptions(student, term = null) {
    console.log('Formatting billing options for student:', student.fullName, 'Term:', term);
    
    const opts = [];
    const defaultFees = [
        { key: 'schoolFee', format: (loc) => `School Fee (${student.class})` },
        { key: 'lunch', format: () => 'Lunch' },
        { key: 'transport', format: (loc) => loc ? `Transport (${loc})` : 'Transport' },
        { key: 'reamPaper', format: () => 'REAM Paper' },
        { key: 'activity', format: () => 'Activity' },
        { key: 'admissionFee', format: () => 'Admission Fee' },
        { key: 'swimming', format: () => 'Swimming' },
        { key: 'ujiTea', format: () => 'Uji/Tea' },
        { key: 'trip', format: () => 'Trip' },
        { key: 'snacks', format: () => 'Snacks' }
    ];
    
    // If no billing options are set at all, return a message
    const hasAnyBillingOption = Object.keys(student).some(key => 
        defaultFees.some(fee => fee.key === key && student[key] === true)
    ) || (student.termBilling && Object.keys(student.termBilling).length > 0);
    
    if (!hasAnyBillingOption) {
        return 'No billing options selected';
    }
    
    // Get the current term if not provided
    const currentTerm = term || document.getElementById('termSelect')?.value || 'Term 1';
    const otherFees = window.feeStructure?.otherFees?.[currentTerm] || {};
    
    // Get term-specific billing if available
    const termBilling = student.termBilling?.[currentTerm] || {};
    
    // Process default fees with amounts if available
    defaultFees.forEach(({ key, format }) => {
        // Check if fee is enabled (first check term-specific, then fallback to root level)
        const isEnabled = termBilling[key] !== undefined ? termBilling[key] : student[key];
        
        if (isEnabled) {
            // Get location for transport (term-specific or root level)
            const location = key === 'transport' ? 
                (termBilling.transportLocation || student.transportLocation) : 
                null;
                
            let optionText = format(location);
            
            // Add amount for fees that are in otherFees
            if (['reamPaper', 'activity', 'admissionFee', 'swimming', 'ujiTea', 'trip', 'snacks'].includes(key)) {
                const feeName = format().split(' (')[0]; // Get just the fee name without any parenthetical
                const amount = otherFees[feeName];
                if (amount) {
                    optionText += ` (${amount} KES)`;
                }
            }
            opts.push(optionText);
        }
    });
    
    // Process custom fees from termBilling first
    if (termBilling) {
        Object.entries(termBilling).forEach(([key, value]) => {
            // Skip if it's a default fee or standard property
            const isDefaultFee = defaultFees.some(f => f.key === key);
            const standardProps = ['transportLocation', 'schoolFeeClass'];
            
            if (typeof value === 'boolean' && value === true && !isDefaultFee && !standardProps.includes(key)) {
                // Format the key: convert camelCase to Title Case
                const formattedName = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .trim();
                
                // Find the fee in otherFees (case insensitive match)
                const feeEntry = Object.entries(otherFees).find(([name]) => 
                    name.toLowerCase() === formattedName.toLowerCase()
                );
                
                // If we found the fee with its amount, include it
                if (feeEntry) {
                    const [feeName, amount] = feeEntry;
                    opts.push(`${feeName} (${amount} KES)`);
                } else {
                    // Fallback to just the fee name if amount not found
                    opts.push(formattedName);
                }
            }
        });
    }
    
    return opts.join(', ');
}

// Show all payments for a student across all terms in a modal
function showAllPayments(admissionNumber) {
    const student = getStudents().find(s => s.admissionNumber === admissionNumber);
    if (!student) return;
    
    // Group payments by term
    const paymentsByTerm = {};
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    
    // Initialize terms
    terms.forEach(term => {
        paymentsByTerm[term] = [];
    });
    
    // Sort all payments by date (newest first)
    const allPayments = [...(student.payments || [])].sort((a, b) => 
        new Date(b.datePaid || 0) - new Date(a.datePaid || 0)
    );
    
    // Group payments by term
    allPayments.forEach(payment => {
        if (payment.term && paymentsByTerm.hasOwnProperty(payment.term)) {
            paymentsByTerm[payment.term].push(payment);
        } else if (paymentsByTerm['Term 1']) {
            // Default to Term 1 if no term specified (for backward compatibility)
            paymentsByTerm['Term 1'].push(payment);
        }
    });
    
    // Build the modal content
    let modalContent = `
        <div class="modal-header">
            <h3>All Payments - ${student.fullName} (${student.admissionNumber})</h3>
            <span class="close-modal" onclick="closeModal()">&times;</span>
        </div>
        <div class="modal-body all-payments">
    `;
    
    // Add payments for each term
    terms.forEach(term => {
        const termPayments = paymentsByTerm[term];
        if (termPayments.length > 0) {
            modalContent += `
                <div class="payment-term-section">
                    <h4>${term}</h4>
                    <div class="payment-term-content">
                        ${renderPaymentHistoryForTerm(termPayments, term, student)}
                    </div>
                </div>
            `;
        }
    });
    
    modalContent += `
        </div>
        <div class="modal-footer">
            <button onclick="closeModal()" class="btn">Close</button>
        </div>
    `;
    
    // Show the modal
    showModal('All Payments', modalContent);
}

// Helper function to render payment history for a specific term
function renderPaymentHistoryForTerm(payments, term, student) {
    if (!payments || payments.length === 0) {
        return '<div class="no-payments">No payments for this term</div>';
    }
    
    // Group payments by type for better organization
    const regularPayments = [];
    const carryForwards = [];
    const debtCarryForwards = [];
    
    payments.forEach(p => {
        if (p.isCarryForward) {
            carryForwards.push(p);
        } else if (p.isDebtCarryForward) {
            debtCarryForwards.push(p);
        } else {
            regularPayments.push(p);
        }
    });
    
    // Helper function to format a single payment
    const formatPayment = (p, isCarryOver = false) => {
        const amount = parseFloat(p.amountPaid) || 0;
        const isCredit = amount >= 0;
        const amountClass = isCredit ? 'payment-amount credit' : 'payment-amount debit';
        const notes = p.notes ? `<div class="payment-notes">${p.notes}</div>` : '';
        
        // Format the date properly
        let formattedDate = 'No date';
        if (p.datePaid) {
            try {
                const date = new Date(p.datePaid);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }
        }
        
        // Determine the payment type
        let paymentType = '';
        if (p.isCarryForward) {
            paymentType = '<span class="payment-type credit">CREDIT CARRY FORWARD</span>';
        } else if (p.isDebtCarryForward) {
            paymentType = '<span class="payment-type debit">DEBT CARRY FORWARD</span>';
        } else {
            paymentType = `<span class="payment-method">${p.paymentMethod || 'Payment'}</span>`;
        }
        
        // Build the description
        let description = '';
        if (p.description) {
            description = `<div class="description">${p.description}</div>`;
        } else if (p.isCarryForward) {
            description = `<div class="description">Credit from previous term</div>`;
        } else if (p.isDebtCarryForward) {
            description = `<div class="description">Balance from previous term</div>`;
        }
        
        return `
            <div class='payment-item ${isCarryOver ? 'carry-over' : ''}'>
                <div class='payment-header'>
                    <span class='${amountClass}'>${Math.abs(amount).toLocaleString('en-US')} KES</span>
                    <span class='payment-date'>${formattedDate}</span>
                </div>
                <div class='payment-details'>
                    ${paymentType}
                    ${p.receiptNumber ? `<div class='receipt'>Receipt: ${p.receiptNumber}</div>` : ''}
                    ${p.transactionCode ? `<div class='transaction'>Txn: ${p.transactionCode}</div>` : ''}
                    ${description}
                    ${notes}
                </div>
            </div>
        `;
    };
    
    // Build the payment history HTML
    let paymentHistory = `
        <div class="payment-history-container">
            <div class="payment-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="showAllPayments('${student.admissionNumber}')">
                    <i class="fas fa-list"></i> View All Payments
                </button>
            </div>
            <div class="payment-history">
    `;
    
    // Add regular payments first
    if (regularPayments.length > 0) {
        paymentHistory += '<div class="payment-section">';
        paymentHistory += '<div class="section-title">Payments</div>';
        regularPayments.forEach(p => {
            paymentHistory += formatPayment(p);
        });
        paymentHistory += '</div>';
    } else {
        paymentHistory += '<div class="no-payments">No regular payments for this term</div>';
    }
    
    // Add carry forwards if any
    if (carryForwards.length > 0) {
        paymentHistory += '<div class="payment-section">';
        paymentHistory += '<div class="section-title">Credit Carry Forwards</div>';
        carryForwards.forEach(p => {
            paymentHistory += formatPayment(p, true);
        });
        paymentHistory += '</div>';
    }
    
    // Add debt carry forwards if any
    if (debtCarryForwards.length > 0) {
        paymentHistory += '<div class="payment-section">';
        paymentHistory += '<div class="section-title">Debt Carry Forwards</div>';
        debtCarryForwards.forEach(p => {
            paymentHistory += formatPayment(p, true);
        });
        paymentHistory += '</div>';
    }
    
    // Add summary of balances
    const totalFee = parseFloat(calculateTotalFee(student, term).replace(/,/g, '')) || 0;
    const totalPaid = regularPayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    const totalCarryForward = carryForwards.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    const totalDebtCarryForward = debtCarryForwards.reduce((sum, p) => sum + Math.abs(parseFloat(p.amountPaid) || 0), 0);
    
    const totalPayments = totalPaid + totalCarryForward;
    const balance = totalFee + totalDebtCarryForward - totalPayments;
    
    paymentHistory += `
        </div>
        <div class="payment-summary">
            <div class="summary-row">
                <span>Total Fees:</span>
                <span>${totalFee.toLocaleString('en-US')} KES</span>
            </div>
            <div class="summary-row">
                <span>Total Payments:</span>
                <span>${totalPaid.toLocaleString('en-US')} KES</span>
            </div>`;
    
    if (totalCarryForward > 0) {
        paymentHistory += `
            <div class="summary-row">
                <span>Credit from Previous Term:</span>
                <span class="text-success">+${totalCarryForward.toLocaleString('en-US')} KES</span>
            </div>`;
    }
    
    if (totalDebtCarryForward > 0) {
        paymentHistory += `
            <div class="summary-row">
                <span>Balance from Previous Term:</span>
                <span class="text-danger">+${totalDebtCarryForward.toLocaleString('en-US')} KES</span>
            </div>`;
    }
    
    paymentHistory += `
            <div class="summary-row total-balance">
                <span>Current Balance:</span>
                <span class="${balance >= 0 ? 'text-danger' : 'text-success'}">
                    ${Math.abs(balance).toLocaleString('en-US')} KES ${balance >= 0 ? 'Due' : 'Credit'}
                </span>
            </div>
        </div>
    `;
    
    // Add the renderPaymentHistory function
    paymentHistory += `
        <script>
            function renderPaymentHistory(admissionNumber, term) {
                const student = getStudents().find(s => s.admissionNumber === admissionNumber);
                if (!student) return '';
                
                // Filter payments for the specified term
                const termPayments = (student.payments || []).filter(p => p.term === term);
                
                // Group payments by type
                const regularPayments = [];
                const carryForwards = [];
                const debtCarryForwards = [];
                
                termPayments.forEach(p => {
                    if (p.isCarryForward) {
                        carryForwards.push(p);
                    } else if (p.isDebtCarryForward) {
                        debtCarryForwards.push(p);
                    } else {
                        regularPayments.push(p);
                    }
                });
                
                // Build the payment history HTML
                let html = '';
                
                // Add regular payments
                if (regularPayments.length > 0) {
                    html += '<div class="payment-section">';
                    regularPayments.forEach(p => {
                        html += formatPayment(p);
                    });
                    html += '</div>';
                }
                
                // Add carry forwards
                if (carryForwards.length > 0) {
                    html += '<div class="payment-section">';
                    html += '<div class="section-title">Credit Carry Forwards</div>';
                    carryForwards.forEach(p => {
                        html += formatPayment(p, true);
                    });
                    html += '</div>';
                }
                
                // Add debt carry forwards
                if (debtCarryForwards.length > 0) {
                    html += '<div class="payment-section">';
                    html += '<div class="section-title">Debt Carry Forwards</div>';
                    debtCarryForwards.forEach(p => {
                        html += formatPayment(p, true);
                    });
                    html += '</div>';
                }
                
                return html;
            }
        </script>
        <style>
            .payment-history {
                max-height: 400px;
                overflow-y: auto;
                padding: 10px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                margin-bottom: 15px;
            }
            .payment-item {
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
                margin-bottom: 8px;
            }
            .payment-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }
            .payment-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            .payment-amount {
                font-weight: bold;
            }
            .credit {
                color: #28a745;
            }
            .debit {
                color: #dc3545;
            }
            .payment-date {
                color: #6c757d;
                font-size: 0.9em;
            }
            .payment-details {
                font-size: 0.9em;
                color: #495057;
            }
            .payment-type {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.8em;
                font-weight: bold;
                margin-right: 5px;
            }
            .payment-method {
                font-weight: bold;
            }
            .payment-notes {
                margin-top: 5px;
                padding: 5px;
                background-color: #f8f9fa;
                border-radius: 3px;
                font-size: 0.85em;
            }
            .payment-section {
                margin-bottom: 20px;
            }
            .section-title {
                font-weight: bold;
                margin: 10px 0;
                padding-bottom: 5px;
                border-bottom: 1px solid #dee2e6;
            }
            .payment-summary {
                margin-top: 20px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 4px;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
            }
            .total-balance {
                margin-top: 12px;
                padding-top: 8px;
                border-top: 1px solid #dee2e6;
                font-weight: bold;
            }
            .text-success {
                color: #28a745;
            }
            .text-danger {
                color: #dc3545;
            }
            .payment-actions {
                margin-bottom: 10px;
                text-align: right;
            }
            .no-payments {
                padding: 15px;
                text-align: center;
                color: #6c757d;
                font-style: italic;
            }
        </style>
    `;
    
    return paymentHistory;
}

// Render payment history for a student for the given term
function renderPaymentHistory(student, term) {
    if (!student.payments || !Array.isArray(student.payments)) {
        return `
            <div class="payment-history-container">
                <div class="no-payments">No payment history available</div>
            </div>`;
    }
    
    // Get all payments for this term and sort them by date (newest first)
    const termPayments = student.payments
        .filter(p => p.term === term)
        .sort((a, b) => new Date(b.datePaid || 0) - new Date(a.datePaid || 0));
    
    if (termPayments.length === 0) {
        return `
            <div class="payment-history-container">
                <div class="no-payments">No payments for this term</div>
            </div>`;
    }
    
    // Group payments by type for better organization
    const regularPayments = [];
    const carryForwards = [];
    const debtCarryForwards = [];
    
    termPayments.forEach(p => {
        // Check for carry forward in description if flags are not set
        if (p.description && (p.description.includes('carried forward') || p.description.includes('carry forward'))) {
            if (p.amountPaid < 0) {
                p.isDebtCarryForward = true;
                debtCarryForwards.push(p);
            } else {
                p.isCarryForward = true;
                carryForwards.push(p);
            }
        } else if (p.isCarryForward) {
            carryForwards.push(p);
        } else if (p.isDebtCarryForward) {
            debtCarryForwards.push(p);
        } else {
            regularPayments.push(p);
        }
    });
    
    // Helper function to format a single payment
    const formatPayment = (p, isCarryOver = false) => {
        const amount = parseFloat(p.amountPaid) || 0;
        const isCredit = amount >= 0;
        const amountClass = isCredit ? 'payment-amount credit' : 'payment-amount debit';
        const notes = p.notes ? `<div class="payment-notes">${p.notes}</div>` : '';
        
        // Format the date properly
        let formattedDate = 'No date';
        if (p.datePaid) {
            try {
                const date = new Date(p.datePaid);
                if (!isNaN(date.getTime())) {
                    formattedDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }
        }
        
        // Determine the payment type
        let paymentType = '';
        if (p.isCarryForward) {
            paymentType = '<span class="payment-type credit">CREDIT CARRY FORWARD</span>';
        } else if (p.isDebtCarryForward) {
            paymentType = '<span class="payment-type debit">DEBT CARRY FORWARD</span>';
        } else {
            paymentType = `<span class="payment-method">${p.paymentMethod || 'Payment'}</span>`;
        }
        
        // Build the description
        let description = '';
        if (p.description) {
            description = `<div class="description">${p.description}</div>`;
        } else if (p.isCarryForward) {
            description = `<div class="description">Credit from previous term</div>`;
        } else if (p.isDebtCarryForward) {
            description = `<div class="description">Balance from previous term</div>`;
        }
        
        return `
            <div class='payment-item ${isCarryOver ? 'carry-over' : ''}'>
                <div class='payment-header'>
                    <span class='${amountClass}'>${Math.abs(amount).toLocaleString('en-US')} KES</span>
                    <span class='payment-date'>${formattedDate}</span>
                </div>
                <div class='payment-details'>
                    ${paymentType}
                    ${p.receiptNumber ? `<div class='receipt'>Receipt: ${p.receiptNumber}</div>` : ''}
                    ${p.transactionCode ? `<div class='transaction'>Txn: ${p.transactionCode}</div>` : ''}
                    ${description}
                    ${notes}
                </div>
            </div>
        `;
    };
    
    // Build the payment history HTML
    let paymentHistory = `
        <div class="payment-history-container">
            <div class="payment-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="showAllPayments('${student.admissionNumber}')">
                    <i class="fas fa-list"></i> View All Payments
                </button>
            </div>
            <div class="payment-history">
    `;
    
    // Add regular payments first
    if (regularPayments.length > 0) {
        paymentHistory += '<div class="payment-section">';
        paymentHistory += '<div class="section-title">Payments</div>';
        regularPayments.forEach(p => {
            paymentHistory += formatPayment(p);
        });
        paymentHistory += '</div>';
    } else {
        paymentHistory += '<div class="no-payments">No regular payments for this term</div>';
    }
    
    // Add carry forwards if any
    if (carryForwards.length > 0) {
        paymentHistory += '<div class="payment-section">';
        paymentHistory += '<div class="section-title">Credit Carry Forwards</div>';
        carryForwards.forEach(p => {
            paymentHistory += formatPayment(p, true);
        });
        paymentHistory += '</div>';
    }
    
    // Add debt carry forwards if any
    if (debtCarryForwards.length > 0) {
        paymentHistory += '<div class="payment-section">';
        paymentHistory += '<div class="section-title">Debt Carry Forwards</div>';
        debtCarryForwards.forEach(p => {
            paymentHistory += formatPayment(p, true);
        });
        paymentHistory += '</div>';
    }
    
    // Add summary of balances
    const totalFee = parseFloat(calculateTotalFee(student, term).replace(/,/g, '')) || 0;
    const totalPaid = regularPayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    const totalCarryForward = carryForwards.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
    const totalDebtCarryForward = debtCarryForwards.reduce((sum, p) => sum + Math.abs(parseFloat(p.amountPaid) || 0), 0);
    
    const totalPayments = totalPaid + totalCarryForward;
    const balance = totalFee + totalDebtCarryForward - totalPayments;
    
    paymentHistory += `
        </div>
        <div class="payment-summary">
            <div class="summary-row">
                <span>Total Fees:</span>
                <span>${totalFee.toLocaleString('en-US')} KES</span>
            </div>
            <div class="summary-row">
                <span>Total Payments:</span>
                <span>${totalPaid.toLocaleString('en-US')} KES</span>
            </div>`;
    
    if (totalCarryForward > 0) {
        paymentHistory += `
            <div class="summary-row">
                <span>Credit from Previous Term:</span>
                <span class="text-success">+${totalCarryForward.toLocaleString('en-US')} KES</span>
            </div>`;
    }
    
    if (totalDebtCarryForward > 0) {
        paymentHistory += `
            <div class="summary-row">
                <span>Balance from Previous Term:</span>
                <span class="text-danger">+${totalDebtCarryForward.toLocaleString('en-US')} KES</span>
            </div>`;
    }
    
    paymentHistory += `
            <div class="summary-row total-balance">
                <span>Current Balance:</span>
                <span class="${balance >= 0 ? 'text-danger' : 'text-success'}">
                    ${Math.abs(balance).toLocaleString('en-US')} KES ${balance >= 0 ? 'Due' : 'Credit'}
                </span>
            </div>
        </div>
    </div>`;
    
    // Add the style section
    const style = `
        <style>
            .payment-history {
                font-size: 13px;
                max-height: 300px;
                overflow-y: auto;
                padding: 5px;
            }
            .payment-section {
                margin-bottom: 15px;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            .payment-section:last-child {
                border-bottom: none;
            }
            .section-title {
                font-weight: bold;
                color: #666;
                margin-bottom: 5px;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .payment-item {
                background: #f9f9f9;
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 8px;
                border-left: 3px solid #ddd;
            }
            .payment-item.carry-over {
                border-left-color: #4caf50;
                background: #f0f8f1;
            }
            .payment-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            .payment-amount {
                font-weight: bold;
            }
            .payment-amount.credit {
                color: #2e7d32;
            }
            .payment-amount.debit {
                color: #c62828;
            }
            .payment-date {
                color: #666;
                font-size: 11px;
            }
            .payment-type, .payment-method {
                display: inline-block;
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 3px;
                margin-right: 5px;
                margin-bottom: 3px;
            }
            .payment-type.credit {
                background-color: #e8f5e9;
                color: #2e7d32;
            }
            .payment-type.debit {
                background-color: #ffebee;
                color: #c62828;
            }
            .payment-details > div {
                margin-top: 3px;
                color: #555;
            }
            .receipt, .transaction {
                font-family: monospace;
                font-size: 12px;
            }
            .description {
                font-style: italic;
                color: #666 !important;
            }
        </style>
    `;
    
    return paymentHistory + style;
}

// Open the Pay Fee modal for a student
function openPayFeeModal(admissionNumber) {
    document.getElementById('payFeeModal').style.display = 'flex';
    document.getElementById('payFeeAdmissionNumber').value = admissionNumber;
    document.getElementById('payFeeForm').reset();
    document.getElementById('receiptDateDiv').style.display = 'none';
}

// Close modal logic
function closePayFeeModal() {
    document.getElementById('payFeeModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    // Modal close button
    document.getElementById('closePayFeeModal').onclick = closePayFeeModal;
    // Receipt number logic
    document.getElementById('receiptNumber').addEventListener('input', function() {
        document.getElementById('receiptDateDiv').style.display = this.value ? 'block' : 'none';
    });
    // Payment form submission
    document.getElementById('payFeeForm').onsubmit = function(e) {
        e.preventDefault();
        const admissionNumber = document.getElementById('payFeeAdmissionNumber').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const transactionCode = document.getElementById('transactionCode').value;
        const receiptNumber = document.getElementById('receiptNumber').value;
        const receiptDate = document.getElementById('receiptDate').value;
        const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
        const paymentTerm = document.getElementById('paymentTerm').value;
        const paymentNotes = document.getElementById('paymentNotes').value;
        const datePaid = new Date().toLocaleDateString();
        
        let students = getStudents();
        let student = students.find(s => s.admissionNumber === admissionNumber);
        if (!student) return alert('Student not found!');
        
        // Calculate the current balance before this payment
        // First, clean up any existing carry forward entries for this term
        if (student.payments) {
            student.payments = student.payments.filter(p => 
                !(p.term === paymentTerm && (p.isCarryForward || p.isDebtCarryForward))
            );
        }
        
        // Recalculate the raw balance without any carry forwards
        const currentBalance = calculateFeeBalanceRaw(student, paymentTerm);
        const totalFee = parseFloat(calculateTotalFee(student, paymentTerm).replace(/,/g, '')) || 0;
        
        // Add the payment
        if (!student.payments) student.payments = [];
        student.payments.push({
            paymentMethod,
            transactionCode,
            receiptNumber,
            receiptDate: receiptNumber ? receiptDate : '',
            amountPaid: amountPaid.toFixed(2),
            term: paymentTerm,
            datePaid,
            notes: paymentNotes || ''
        });
        
        // Recalculate the balance after payment
        let newBalance = calculateFeeBalanceRaw(student, paymentTerm);
        let message = `Payment of ${amountPaid.toFixed(2)} KES recorded successfully.`;
        
        // If there's a balance after this payment, handle carry forward
        const terms = ['Term 1', 'Term 2', 'Term 3'];
        const currentTermIndex = terms.indexOf(paymentTerm);
        
        // Check for underpayment or overpayment
        if (newBalance > 0.01) {
            // Handle underpayment (debt)
            if (currentTermIndex < terms.length - 1) {
                const nextTerm = terms[currentTermIndex + 1];
                message += `\n\nUnderpayment: ${newBalance.toFixed(2)} KES remaining. `;
                message += `This amount will be carried forward to ${nextTerm}.`;
                
                // Add a carry forward entry for the next term
                if (!student.payments) student.payments = [];
                student.payments.push({
                    amountPaid: (-newBalance).toFixed(2),
                    term: nextTerm,
                    paymentMethod: 'Carry Forward',
                    datePaid: new Date().toLocaleDateString(),
                    description: `Debt of ${newBalance.toFixed(2)} KES carried forward from ${paymentTerm}`,
                    isDebtCarryForward: true
                });
                
                // Recalculate the balance after adding the carry forward
                newBalance = calculateFeeBalanceRaw(student, paymentTerm);
            } else {
                message += `\n\nUnderpayment: ${newBalance.toFixed(2)} KES remaining.`;
            }
        } else if (newBalance < -0.01) {
            // Handle overpayment (credit)
            const overpayment = Math.abs(newBalance);
            
            if (currentTermIndex < terms.length - 1) {
                const nextTerm = terms[currentTermIndex + 1];
                message += `\n\nOverpayment: ${overpayment.toFixed(2)} KES will be carried forward to ${nextTerm}.`;
                
                // Add a credit carry forward entry for the next term
                if (!student.payments) student.payments = [];
                student.payments.push({
                    amountPaid: overpayment.toFixed(2),
                    term: nextTerm,
                    paymentMethod: 'Carry Forward',
                    datePaid: new Date().toLocaleDateString(),
                    description: `Credit of ${overpayment.toFixed(2)} KES from ${paymentTerm} overpayment`,
                    isCarryForward: true
                });
                
                // Recalculate the balance after adding the carry forward
                newBalance = calculateFeeBalanceRaw(student, paymentTerm);
            } else {
                message += `\n\nOverpayment: ${overpayment.toFixed(2)} KES (no future terms for carry forward).`;
            }
        } else {
            message += '\n\nPayment fully settles the fees for this term.';
        }
        
        // Update localStorage
        localStorage.setItem('students', JSON.stringify(students));
        
        // Show message to user
        alert(message);
        
        // Send Pushbullet notification
        try {
            // Calculate current balance after payment
            const currentBalance = calculateFeeBalanceRaw(student, paymentTerm);
            
            // Prepare notification message with all required details
            const notificationBody = [
                `Student: ${student.fullName}`,
                `Class: ${student.class || 'N/A'}`,
                `Adm: ${admissionNumber}`,
                `Amount: KSh ${amountPaid.toFixed(2)}`,
                `Balance: KSh ${Math.max(0, currentBalance).toFixed(2)}`,
                `Method: ${paymentMethod}`,
                `Term: ${paymentTerm}`,
                receiptNumber ? `Receipt: ${receiptNumber}` : ''
            ].filter(Boolean).join('\n');
            
            const formData = new URLSearchParams();
            formData.append('type', 'note');
            formData.append('title', 'New Payment Received');
            formData.append('body', notificationBody);
            
            console.log('Sending Pushbullet notification...');
            
            fetch('https://api.pushbullet.com/v2/pushes', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer o.Mv8iw71b2JN3HLBqKvLiw829GbcKtkTm',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            })
            .then(response => {
                console.log('Pushbullet API Response Status:', response.status);
                return response.json();
            })
            .then(data => console.log('Pushbullet API Response:', data))
            .catch(error => console.error('Error sending notification:', error));
        } catch (error) {
            console.error('Error in Pushbullet notification:', error);
        }
        
        // Close modal and refresh display
        closePayFeeModal();
        displayStudents(paymentTerm);
    };
});

// Display students for a term
function updateStatistics(students, term = 'Term 1') {
    // Calculate statistics
    const totalStudents = students.length;
    
    let totalFeeBalance = 0;
    let totalFeesPaid = 0;
    
    students.forEach(student => {
        const balance = calculateFeeBalanceRaw(student, term);
        const totalFee = calculateTotalFeeWithTerm(student, term);
        
        totalFeeBalance += Math.max(0, balance); // Only positive balances
        totalFeesPaid += Math.max(0, totalFee - balance); // Total paid is total fee minus balance
    });
    
    // Update DOM
    document.getElementById('totalStudents').textContent = totalStudents.toLocaleString();
    document.getElementById('totalFeeBalance').textContent = `${totalFeeBalance.toLocaleString()} KES`;
    document.getElementById('totalFeesPaid').textContent = `${totalFeesPaid.toLocaleString()} KES`;
    
    // Calculate progress bar widths based on relative values
    const maxValue = Math.max(totalFeeBalance, totalFeesPaid, totalStudents) * 1.2; // Add 20% padding
    
    document.querySelector('.total-students .progress-bar').style.width = 
        `${(totalStudents / Math.max(1, totalStudents)) * 100}%`;
    document.querySelector('.total-fees .progress-bar').style.width = 
        `${(totalFeeBalance / Math.max(1, maxValue)) * 100}%`;
    document.querySelector('.fees-paid .progress-bar').style.width = 
        `${(totalFeesPaid / Math.max(1, maxValue)) * 100}%`;
}

function displayStudents(term = 'Term 1') {
    const students = getStudents();
    const tableBody = document.querySelector('#studentsTable tbody');
    tableBody.innerHTML = '';
    
    // Update statistics
    updateStatistics(students, term);
    
    if (students.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="13" class="no-data">No students registered yet</td>';
        tableBody.appendChild(row);
        return;
    }
    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.admissionNumber}</td>
            <td>${student.fullName}</td>
            <td>${student.class}</td>
            <td>${student.classTeacher || 'N/A'}</td>
            <td class="billing-options" data-student-id="${student.admissionNumber}">
                ${formatBillingOptions(student)}
                <div style="display:none;" class="debug-info">
                    <pre>${JSON.stringify({
                        term: term,
                        termBilling: student.termBilling,
                        studentBilling: {
                            schoolFee: student.schoolFee,
                            lunch: student.lunch,
                            transport: student.transport,
                            transportLocation: student.transportLocation,
                            reamPaper: student.reamPaper,
                            activity: student.activity,
                            admissionFee: student.admissionFee,
                            swimming: student.swimming,
                            ujiTea: student.ujiTea,
                            trip: student.trip,
                            snacks: student.snacks
                        }
                    }, null, 2)}</pre>
                </div>
            </td>
            <td class="total-fee">${calculateTotalFee(student, term)} KES</td>
            <td class="fee-balance ${getBalanceClass(calculateFeeBalance(student, term))}">${calculateFeeBalance(student, term).toLocaleString()} KES</td>
            <td>${student.transport ? 'Transport' : 'None'}</td>
            <td>${student.transport ? student.transportLocation : 'N/A'}</td>
            <td>${student.parentName}</td>
            <td>${student.parentPhone}</td>
            <td class="actions-cell">
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editStudent('${student.admissionNumber}')">
                        <i>✏️</i> Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteStudent('${student.admissionNumber}')">
                        <i>🗑️</i> Delete
                    </button>
                    <button class="action-btn pay-btn" onclick="openPayFeeModal('${student.admissionNumber}')">
                        <i>💳</i> Pay Fee
                    </button>
                    <button class="action-btn view-report-btn" data-admission-number="${student.admissionNumber}">
                        <i>📊</i> View Report
                    </button>
                </div>
            </td>
            <td class="payment-history-cell">
                ${renderPaymentHistory(student, term) || 'No payment history'}
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners to all view report buttons
    document.querySelectorAll('.view-report-btn').forEach(button => {
        button.addEventListener('click', function() {
            const admissionNumber = this.getAttribute('data-admission-number');
            console.log('View report button clicked (event listener):', admissionNumber);
            viewStudentReport(admissionNumber);
        });
    });
}

// Robust filterByTerm: always defaults to 'Term 1' if invalid, logs term, updates dropdown
function filterByTerm(term) {
    const validTerms = ['Term 1', 'Term 2', 'Term 3'];
    if (!term || !validTerms.includes(term)) {
        term = 'Term 1';
    }
    console.log('Switching to term:', term);
    displayStudents(term);
    const select = document.getElementById('termSelect');
    if (select && select.value !== term) select.value = term;
}

function getBalanceClass(balance) {
    if (balance > 0) return 'positive';
    if (balance < 0) return 'negative';
    return 'zero';
}
// Transport fee calculation helper
function getTransportFee(student, term) {
    if (student.transport && student.transportLocation) {
        let locKey = student.transportLocation;
        if (!feeStructure.transportFees[term]?.[locKey] && locKey.includes('Kipkaren')) {
            locKey = Object.keys(feeStructure.transportFees[term] || {}).find(k => k.includes('Kipkaren')) || locKey;
        }
        const transportFee = feeStructure.transportFees[term]?.[locKey] || 0;
        if (transportFee) {
            totalFee += transportFee;
            console.log('Added transport fee:', transportFee);
        }
    }
    // Lunch fee
    if (student.lunch && feeStructure.lunchFees[term]) {
        totalFee += feeStructure.lunchFees[term];
        console.log('Added lunch fee:', feeStructure.lunchFees[term]);
    }
    // Other fees
    const otherFees = feeStructure.otherFees[term] || {};
    console.log('Other fees:', otherFees);
    
    // Default fees
    const defaultFees = [
        { key: 'reamPaper', name: 'REAM Paper' },
        { key: 'activity', name: 'Activity' },
        { key: 'admissionFee', name: 'Admission Fee' },
        { key: 'swimming', name: 'Swimming' },
        { key: 'ujiTea', name: 'Uji/Tea' },
        { key: 'trip', name: 'Trip' }
    ];
    
    // Process default fees
    defaultFees.forEach(({ key, name }) => {
        if (student[key] && otherFees[name]) {
            totalFee += otherFees[name];
            console.log(`Added ${name} fee:`, otherFees[name]);
        }
    });
    
    // Process custom fees (any fee in otherFees that's not a default fee)
    const defaultFeeNames = defaultFees.map(f => f.name);
    Object.entries(otherFees).forEach(([feeName, amount]) => {
        // Check if it's a custom fee (not in default fees) and if the student has this fee
        if (!defaultFeeNames.includes(feeName) && student[feeName]) {
            totalFee += amount;
            console.log(`Added custom fee ${feeName}:`, amount);
        }
    });
    
    console.log('Total fee calculated:', totalFee);
    return totalFee;
}


// Make editStudent globally accessible
window.editStudent = function(admissionNumber) {
    try {
        // Get students from localStorage
        const students = JSON.parse(localStorage.getItem('students') || '[]');
        const student = students.find(s => s.admissionNumber === admissionNumber);
        
        if (student) {
            // Store in sessionStorage for the edit page
            sessionStorage.setItem('editStudent', JSON.stringify(student));
            
            // Redirect to edit page
            window.location.href = `student-registration.html?edit=true&admissionNumber=${admissionNumber}`;
            return;
        }
        
        // If we get here, student was not found
        alert('Student not found. Please refresh the page and try again.');
        console.error('Student not found with admission number:', admissionNumber);
        
    } catch (error) {
        console.error('Error in editStudent:', error);
        alert('An error occurred while trying to edit the student. Please try again.');
    }
};

function deleteStudent(admissionNumber) {
    const confirmDelete = confirm('Are you sure you want to delete this student? This action cannot be undone.');
    if (confirmDelete) {
        try {
            // Get current students from localStorage
            const students = getStudents();
            
            // Filter out the student to be deleted
            const updatedStudents = students.filter(s => s.admissionNumber !== admissionNumber);
            
            // Save back to localStorage
            localStorage.setItem('students', JSON.stringify(updatedStudents));
            
            // Refresh the display
            const currentTerm = localStorage.getItem('selectedTerm') || 'Term 1';
            displayStudents(currentTerm);
            
            // Show success message
            alert('Student deleted successfully.');
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('An error occurred while deleting the student. Please try again.');
        }
    }
}

function filterByTerm(term) {
    displayStudents(term);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize fee service first
        await initializeFeeService();
        
        // Always show all students for the default term
        const termSelect = document.getElementById('termSelect');
    let currentTerm = localStorage.getItem('selectedTerm') || 'Term 1';
    
    // Set the initial selected value
    if (termSelect) {
        termSelect.value = currentTerm;
        
        termSelect.addEventListener('change', (e) => {
            const selectedTerm = e.target.value;
            // Get the current term before changing it
            const previousTerm = localStorage.getItem('selectedTerm') || 'Term 1';
            
            // Check if we're moving to Term 1 from Term 3 (end of year)
            if (previousTerm === 'Term 3' && selectedTerm === 'Term 1') {
                // Show the year end reset modal
                showYearEndResetModal();
                // Revert the select back to Term 3 for now
                e.target.value = 'Term 3';
            } else {
                // Update the current term in localStorage and sessionStorage
                localStorage.setItem('selectedTerm', selectedTerm);
                sessionStorage.setItem('selectedTerm', selectedTerm);
                // Update the display
                filterByTerm(selectedTerm);
            }
        });
    }

    // Year End Reset Modal Functions
    function showYearEndResetModal() {
        const modal = document.getElementById('yearEndModal');
        if (modal) modal.style.display = 'block';
    }

    function closeYearEndModal() {
        const modal = document.getElementById('yearEndModal');
        if (modal) modal.style.display = 'none';
        // Reset to Term 3 if user cancels
        const termSelect = document.getElementById('termSelect');
        if (termSelect) termSelect.value = 'Term 3';
    }

    // Event Listeners for Year End Modal
    document.addEventListener('DOMContentLoaded', () => {
        // Close modal buttons
        const closeBtn = document.getElementById('closeYearEndModal');
        const cancelBtn = document.getElementById('cancelReset');
        const backBtn = document.getElementById('backToReset');
        const exportBtn = document.getElementById('exportBeforeReset');
        const confirmBtn = document.getElementById('confirmReset');
        const exportExcelBtn = document.getElementById('exportExcel');
        const proceedAfterExportBtn = document.getElementById('proceedAfterExport');

        if (closeBtn) closeBtn.addEventListener('click', closeYearEndModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeYearEndModal);
        if (backBtn) backBtn.addEventListener('click', () => {
            document.getElementById('exportSection').style.display = 'none';
            document.getElementById('yearEndContent').style.display = 'block';
        });

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                document.getElementById('yearEndContent').style.display = 'none';
                document.getElementById('exportSection').style.display = 'block';
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', resetSystem);
        }

        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', exportStudentData);
        }

        if (proceedAfterExportBtn) {
            proceedAfterExportBtn.addEventListener('click', resetSystem);
        }
    });

    // Export student data to Excel with complete information
    function exportStudentData() {
        try {
            const students = getStudents();
            
            if (students.length === 0) {
                alert('No student data found to export.');
                return;
            }

            // Create a workbook with multiple sheets
            const wb = XLSX.utils.book_new();
            
            // 1. Student Data Sheet
            const studentData = students.map(student => {
                // Create a copy of the student object to avoid modifying the original
                const studentCopy = JSON.parse(JSON.stringify(student));
                
                // Stringify complex objects for better Excel display
                if (studentCopy.payments) {
                    studentCopy.payments = JSON.stringify(studentCopy.payments);
                }
                if (studentCopy.termBilling) {
                    studentCopy.termBilling = JSON.stringify(studentCopy.termBilling);
                }
                
                return studentCopy;
            });
            
            const ws1 = XLSX.utils.json_to_sheet(studentData);
            XLSX.utils.book_append_sheet(wb, ws1, 'Students');
            
            // 2. Summary Sheet
            const summaryData = students.map(student => ({
                'Admission Number': student.admissionNumber,
                'Full Name': student.fullName,
                'Class': student.class,
                'Class Teacher': student.classTeacher || '',
                'Parent Name': student.parentName || '',
                'Parent Phone': student.parentPhone || '',
                'Total Fee (Term 1)': calculateTotalFeeWithTerm(student, 'Term 1'),
                'Total Fee (Term 2)': calculateTotalFeeWithTerm(student, 'Term 2'),
                'Total Fee (Term 3)': calculateTotalFeeWithTerm(student, 'Term 3'),
                'Balance (Term 1)': calculateFeeBalanceRaw(student, 'Term 1'),
                'Balance (Term 2)': calculateFeeBalanceRaw(student, 'Term 2'),
                'Balance (Term 3)': calculateFeeBalanceRaw(student, 'Term 3')
            }));
            
            const ws2 = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
            
            // 3. Payment History Sheet (flattened for better Excel use)
            const paymentData = [];
            students.forEach(student => {
                if (student.payments && student.payments.length > 0) {
                    student.payments.forEach(payment => {
                        paymentData.push({
                            'Admission Number': student.admissionNumber,
                            'Student Name': student.fullName,
                            'Class': student.class,
                            'Term': payment.term,
                            'Date': payment.date || '',
                            'Amount': payment.amountPaid || 0,
                            'Payment Method': payment.paymentMethod || '',
                            'Receipt Number': payment.receiptNumber || '',
                            'Description': payment.description || '',
                            'Is Carry Forward': payment.isCarryForward ? 'Yes' : 'No',
                            'Is Debt Carry Forward': payment.isDebtCarryForward ? 'Yes' : 'No',
                            'Original Term': payment.originalTerm || ''
                        });
                    });
                }
            });
            
            if (paymentData.length > 0) {
                const ws3 = XLSX.utils.json_to_sheet(paymentData);
                XLSX.utils.book_append_sheet(wb, ws3, 'Payments');
            }

            // Generate file name with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `student_data_export_${timestamp}.xlsx`;

            // Trigger download
            XLSX.writeFile(wb, fileName);

            alert(`Student data exported successfully to ${fileName}`);

        } catch (error) {
            console.error('Error exporting student data:', error);
            alert('Error exporting student data. Please check console for details.');
        }
    }

    // Import student data from Excel file
    function importStudentData(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        // Check if the required sheets exist
                        if (!workbook.SheetNames.includes('Students')) {
                            throw new Error('The uploaded file does not contain the required "Students" sheet. Please use a file exported from this system.');
                        }
                        
                        // Process the Students sheet
                        const studentsSheet = workbook.Sheets['Students'];
                        let studentsData = XLSX.utils.sheet_to_json(studentsSheet);
                        
                        // If there's a Summary sheet, use it for additional validation
                        let summaryData = [];
                        if (workbook.SheetNames.includes('Summary')) {
                            const summarySheet = workbook.Sheets['Summary'];
                            summaryData = XLSX.utils.sheet_to_json(summarySheet);
                        }
                        
                        // Parse stringified fields back to objects
                        const parsedStudents = studentsData.map(student => {
                            const parsedStudent = { ...student };
                            
                            // Parse payments if it exists and is a string
                            if (parsedStudent.payments && typeof parsedStudent.payments === 'string') {
                                try {
                                    parsedStudent.payments = JSON.parse(parsedStudent.payments);
                                } catch (e) {
                                    console.warn('Failed to parse payments for student:', student.admissionNumber, e);
                                    parsedStudent.payments = [];
                                }
                            } else if (!parsedStudent.payments) {
                                parsedStudent.payments = [];
                            }
                            
                            // Parse termBilling if it exists and is a string
                            if (parsedStudent.termBilling && typeof parsedStudent.termBilling === 'string') {
                                try {
                                    parsedStudent.termBilling = JSON.parse(parsedStudent.termBilling);
                                } catch (e) {
                                    console.warn('Failed to parse termBilling for student:', student.admissionNumber, e);
                                    parsedStudent.termBilling = {};
                                }
                            } else if (!parsedStudent.termBilling) {
                                parsedStudent.termBilling = {};
                            }
                            
                            // Ensure all required fields exist
                            if (!parsedStudent.admissionNumber) {
                                throw new Error('One or more students are missing an admission number. All students must have a unique admission number.');
                            }
                            
                            if (!parsedStudent.fullName) {
                                parsedStudent.fullName = 'Unknown Student';
                            }
                            
                            if (!parsedStudent.class) {
                                parsedStudent.class = 'Grade 1'; // Default class
                            }
                            
                            return parsedStudent;
                        });
                        
                        // Process Payments sheet if it exists
                        if (workbook.SheetNames.includes('Payments')) {
                            const paymentsSheet = workbook.Sheets['Payments'];
                            const paymentsData = XLSX.utils.sheet_to_json(paymentsSheet);
                            
                            // Group payments by admission number
                            const paymentsByStudent = {};
                            paymentsData.forEach(payment => {
                                const admNo = payment['Admission Number'];
                                if (!paymentsByStudent[admNo]) {
                                    paymentsByStudent[admNo] = [];
                                }
                                
                                // Create payment object
                                const paymentObj = {
                                    term: payment.Term || 'Term 1', // Default to Term 1 if not specified
                                    date: payment.Date || new Date().toISOString().split('T')[0],
                                    amountPaid: parseFloat(payment.Amount) || 0,
                                    paymentMethod: payment['Payment Method'] || 'Cash',
                                    receiptNumber: payment['Receipt Number'] || '',
                                    description: payment.Description || 'Imported payment',
                                    isCarryForward: payment['Is Carry Forward'] === 'Yes',
                                    isDebtCarryForward: payment['Is Debt Carry Forward'] === 'Yes',
                                    originalTerm: payment['Original Term'] || ''
                                };
                                
                                paymentsByStudent[admNo].push(paymentObj);
                            });
                            
                            // Merge payments with student data
                            parsedStudents.forEach(student => {
                                if (paymentsByStudent[student.admissionNumber]) {
                                    // Only add payments that don't already exist (based on receipt number)
                                    const existingReceipts = new Set(
                                        (student.payments || []).map(p => p.receiptNumber).filter(Boolean)
                                    );
                                    
                                    const newPayments = paymentsByStudent[student.admissionNumber].filter(
                                        p => !existingReceipts.has(p.receiptNumber)
                                    );
                                    
                                    student.payments = [...(student.payments || []), ...newPayments];
                                }
                            });
                        }
                        
                        // Get existing students to merge with
                        const existingStudents = getStudents();
                        const existingAdmissionNumbers = new Set(existingStudents.map(s => s.admissionNumber));
                        
                        // Merge students (update existing, add new)
                        const updatedStudents = [...existingStudents];
                        let added = 0;
                        let updated = 0;
                        
                        parsedStudents.forEach(student => {
                            const existingIndex = updatedStudents.findIndex(s => s.admissionNumber === student.admissionNumber);
                            
                            if (existingIndex >= 0) {
                                // Update existing student, preserving any existing data not in the import
                                updatedStudents[existingIndex] = { 
                                    ...updatedStudents[existingIndex], 
                                    ...student,
                                    // Preserve original payments if they exist
                                    payments: student.payments && student.payments.length > 0 
                                        ? student.payments 
                                        : updatedStudents[existingIndex].payments || []
                                };
                                updated++;
                            } else {
                                // Add new student
                                updatedStudents.push(student);
                                added++;
                            }
                        });
                        
                        // Save the updated students
                        localStorage.setItem('students', JSON.stringify(updatedStudents));
                        
                        resolve({
                            total: parsedStudents.length,
                            added: added,
                            updated: updated,
                            skipped: parsedStudents.length - added - updated
                        });
                        
                    } catch (error) {
                        console.error('Error processing file:', error);
                        reject(new Error(`Error processing file: ${error.message}`));
                    }
                };
                
                reader.onerror = function() {
                    reject(new Error('Error reading file. Please try again.'));
                };
                
                reader.readAsArrayBuffer(file);
                
            } catch (error) {
                console.error('Error in importStudentData:', error);
                reject(new Error(`Error importing data: ${error.message}`));
            }
        });
    }
    
    // Add event listener for file input
    document.addEventListener('DOMContentLoaded', function() {
        const importInput = document.getElementById('importFile');
        if (importInput) {
            importInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                    alert('Please upload a valid Excel file (.xlsx or .xls)');
                    return;
                }
                
                const confirmImport = confirm('WARNING: This will merge the imported data with your existing data.\n\n' +
                    '• Existing students will be updated\n' +
                    '• New students will be added\n' +
                    '\nAre you sure you want to proceed?');
                
                if (!confirmImport) {
                    // Reset the file input
                    importInput.value = '';
                    return;
                }
                
                const loadingIndicator = document.createElement('div');
                loadingIndicator.style.position = 'fixed';
                loadingIndicator.style.top = '50%';
                loadingIndicator.style.left = '50%';
                loadingIndicator.style.transform = 'translate(-50%, -50%)';
                loadingIndicator.style.padding = '20px';
                loadingIndicator.style.background = 'rgba(0, 0, 0, 0.8)';
                loadingIndicator.style.color = 'white';
                loadingIndicator.style.borderRadius = '8px';
                loadingIndicator.style.zIndex = '1000';
                loadingIndicator.textContent = 'Importing data, please wait...';
                document.body.appendChild(loadingIndicator);
                
                importStudentData(file)
                    .then(result => {
                        // Refresh the display
                        filterByTerm(document.getElementById('termSelect').value || 'Term 1');
                        
                        // Show success message
                        alert(`Import completed successfully!\n\n` +
                              `• Total records processed: ${result.total}\n` +
                              `• Students added: ${result.added}\n` +
                              `• Students updated: ${result.updated}`);
                    })
                    .catch(error => {
                        console.error('Import error:', error);
                        alert(`Error during import: ${error.message}`);
                    })
                    .finally(() => {
                        // Clean up
                        document.body.removeChild(loadingIndicator);
                        importInput.value = ''; // Reset the file input
                    });
            });
        }
    });
    
    // Reset the system for new academic year
    function resetSystem() {
        const students = getStudents();

        // Function to get students from localStorage
        function fetchStudents() {
            return getStudents();
        }

        // Update each student's data
        const updatedStudents = students.map(student => {
            // Clear payment history
            student.payments = [];

            // Reset any other necessary fields
            student.term = 'Term 1';

            return student;
        });

        // Save updated students
        localStorage.setItem('students', JSON.stringify(updatedStudents));

        // Reset selected term
        localStorage.setItem('selectedTerm', 'Term 1');

        // Close the modal
        closeYearEndModal();

        // Refresh the display
        filterByTerm('Term 1');

        alert('System has been reset for the new academic year. All payment histories have been cleared.');
    }
    displayStudents(currentTerm);
    } catch (error) {
        console.error('Error initializing:', error);
        // Fallback to localStorage
        loadFeeStructure();
        displayStudents(currentTerm);
    }
});

// formatBillingOptions function is defined earlier in the file with complete implementation

// Function to add a new student
function addStudent(student) {
    try {
        const students = getStudents();
        
        // Check if student with same admission number already exists
        if (students.some(s => s.admissionNumber === student.admissionNumber)) {
            throw new Error('A student with this admission number already exists');
        }
        
        // Add the new student
        students.push(student);
        
        // Save to localStorage
        localStorage.setItem('students', JSON.stringify(students));
        
        // Return the updated students list
        return Promise.resolve(students);
    } catch (error) {
        console.error('Error adding student:', error);
        return Promise.reject(error);
    }
}

// Function to edit student
function editStudent(admissionNumber) {
    try {
        // Get students from localStorage
        const students = getStudents();
        const student = students.find(s => s.admissionNumber === admissionNumber);
        
        if (student) {
            // Store the student data in sessionStorage for the edit form
            sessionStorage.setItem('editStudent', JSON.stringify(student));
            
            // Redirect to the registration page in edit mode with the admission number
            window.location.href = `student-registration.html?edit=true&admissionNumber=${admissionNumber}`;
        } else {
            console.error('Student not found with admission number:', admissionNumber);
            alert('Student not found. Please refresh the page and try again.');
        }
    } catch (error) {
        console.error('Error in editStudent:', error);
        alert('An error occurred while trying to edit the student. Please try again.');
    }
}

// Function to delete student
function deleteStudent(admissionNumber) {
    if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        try {
            // Get current students from localStorage
            const students = getStudents();
            
            // Filter out the student to be deleted
            const updatedStudents = students.filter(s => s.admissionNumber !== admissionNumber);
            
            // Save back to localStorage
            localStorage.setItem('students', JSON.stringify(updatedStudents));
            
            // Refresh the display
            const currentTerm = localStorage.getItem('selectedTerm') || 'Term 1';
            displayStudents(currentTerm);
            
            // Show success message
            alert('Student deleted successfully.');
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('An error occurred while deleting the student. Please try again.');
        }
    }
}

function filterByTerm(term) {
    currentTerm = term;
    localStorage.setItem('selectedTerm', term);
    displayStudents(term);
}

// Diagnostic function to check for both overpayment and underpayment carry forwards in the same term
function scanCarryForwardIntegrity() {
    const students = getStudents();
    const terms = ['Term 1', 'Term 2', 'Term 3'];
    let issues = [];
    students.forEach(student => {
        terms.forEach(term => {
            let hasToken = false;
            let hasDebt = false;
            if (student.payments && Array.isArray(student.payments)) {
                hasToken = student.payments.some(p => p.term === term && p.isCarryForward);
                hasDebt = student.payments.some(p => p.term === term && p.isDebtCarryForward);
            }
            if (hasToken && hasDebt) {
                issues.push({
                    admissionNumber: student.admissionNumber,
                    fullName: student.fullName,
                    term,
                    message: 'Both overpayment and underpayment carry forward present!'
                });
            }
        });
    });
    if (issues.length === 0) {
        console.log('%c[Carry Forward Integrity] All students and terms are correct. No student has both overpayment and underpayment carry forward in the same term.', 'color: green; font-weight: bold;');
    } else {
        console.warn('[Carry Forward Integrity] Issues found:', issues);
    }
}

// Show all payments for a student in a modal
function showAllPayments(admissionNumber) {
    const students = getStudents();
    const student = students.find(s => s.admissionNumber === admissionNumber);
    if (!student) return;

    // Create modal HTML
    const modalHTML = `
        <div id="allPaymentsModal" class="modal" style="display: flex;">
            <div class="modal-overlay" onclick="document.getElementById('allPaymentsModal').style.display='none'"></div>
            <div class="modal-container" style="max-width: 800px; max-height: 80vh;">
                <div class="modal-header">
                    <h2>All Payments - ${student.fullName} (${student.admissionNumber})</h2>
                    <button class="close-modal" onclick="document.getElementById('allPaymentsModal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div class="payment-tabs">
                        <button class="tab-btn active" data-term="all">All Terms</button>
                        <button class="tab-btn" data-term="Term 1">Term 1</button>
                        <button class="tab-btn" data-term="Term 2">Term 2</button>
                        <button class="tab-btn" data-term="Term 3">Term 3</button>
                    </div>
                    <div id="paymentsContent" style="margin-top: 15px; max-height: 60vh; overflow-y: auto;">
                        ${renderAllPayments(student, 'all')}
                    </div>
                </div>
            </div>
        </div>
        <style>
            .payment-tabs { display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .tab-btn { 
                padding: 8px 15px; 
                border: 1px solid #ddd; 
                background: #f5f5f5; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 0.9em;
            }
            .tab-btn.active { 
                background: #4CAF50; 
                color: white; 
                border-color: #45a049;
            }
            .payment-notes {
                margin-top: 5px;
                padding: 5px;
                background: #f9f9f9;
                border-left: 3px solid #4CAF50;
                font-size: 0.9em;
                color: #555;
            }
        </style>
    `;

    // Add modal to page
    const modal = document.createElement('div');
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);

    // Add tab click handlers
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active tab
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            document.getElementById('paymentsContent').innerHTML = 
                renderAllPayments(student, btn.dataset.term);
        });
    });
}

// Helper function to render all payments for a student
function renderAllPayments(student, term = 'all') {
    if (!student.payments || !student.payments.length) {
        return '<div class="no-payments">No payments found</div>';
    }

    // Filter by term if needed
    const payments = term === 'all' 
        ? [...student.payments] 
        : student.payments.filter(p => p.term === term);
    
    if (payments.length === 0) {
        return `<div class="no-payments">No payments found for ${term}</div>`;
    }

    // Sort by date (newest first)
    payments.sort((a, b) => new Date(b.datePaid || 0) - new Date(a.datePaid || 0));

    // Group by term
    const paymentsByTerm = {};
    payments.forEach(payment => {
        if (!paymentsByTerm[payment.term]) {
            paymentsByTerm[payment.term] = [];
        }
        paymentsByTerm[payment.term].push(payment);
    });

    // Generate HTML
    let html = '';
    Object.entries(paymentsByTerm).forEach(([term, termPayments]) => {
        html += `<h3 style="margin: 15px 0 10px 0; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    ${term} - ${termPayments.length} payment${termPayments.length !== 1 ? 's' : ''}
                </h3>`;
        
        termPayments.forEach(payment => {
            const amount = parseFloat(payment.amountPaid) || 0;
            const isCredit = amount >= 0;
            const amountClass = isCredit ? 'payment-amount credit' : 'payment-amount debit';
            const notes = payment.notes ? `<div class="payment-notes"><strong>Notes:</strong> ${payment.notes}</div>` : '';
            
            html += `
                <div class="payment-item" style="background: #fff; border: 1px solid #eee; border-radius: 4px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span class="${amountClass}" style="font-weight: bold; font-size: 1.1em;">
                            ${Math.abs(amount).toLocaleString()} KES
                        </span>
                        <span style="color: #666; font-size: 0.9em;">
                            ${payment.datePaid || 'No date'}
                        </span>
                    </div>
                    <div style="color: #555; font-size: 0.9em;">
                        ${payment.paymentMethod || 'Payment'}
                        ${payment.receiptNumber ? `• Receipt: ${payment.receiptNumber}` : ''}
                        ${payment.transactionCode ? `• Txn: ${payment.transactionCode}` : ''}
                    </div>
                    ${payment.description ? `<div style="color: #666; font-size: 0.9em; margin-top: 5px;">${payment.description}</div>` : ''}
                    ${notes}
                </div>
            `;
        });
    });

    return html;
}

// Function to render a payment item with proper carryover message display
function renderPaymentItem(p, isCarryOver = false) {
    // Ensure amount is a number
    const amount = parseFloat(p.amountPaid) || 0;
    const isCredit = amount >= 0;
    
    // Format the payment date
    let formattedDate = 'No date';
    if (p.datePaid) {
        try {
            const date = new Date(p.datePaid);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            console.error('Error formatting date:', e);
        }
    }
    
    // Determine the payment type and styling
    let paymentType = '';
    let amountClass = 'payment-amount';
    let paymentBadge = '';
    
    if (p.isCarryForward) {
        paymentType = 'CREDIT CARRY FORWARD';
        amountClass += ' text-success';
        paymentBadge = '<span class="badge bg-success"><i class="fas fa-arrow-circle-right"></i> Credit</span>';
    } else if (p.isDebtCarryForward) {
        paymentType = 'DEBT CARRY FORWARD';
        amountClass += ' text-danger';
        paymentBadge = '<span class="badge bg-danger"><i class="fas fa-arrow-circle-right"></i> Debt</span>';
    } else {
        paymentType = p.paymentMethod || 'PAYMENT';
        amountClass += isCredit ? ' text-success' : ' text-danger';
        paymentBadge = isCredit 
            ? '<span class="badge bg-success"><i class="fas fa-arrow-down"></i> Payment</span>'
            : '<span class="badge bg-warning text-dark"><i class="fas fa-arrow-up"></i> Debit</span>';
    }
    
    // Build the description with special handling for carry forwards
    let description = '';
    if (p.isCarryForward || p.isDebtCarryForward) {
        const noticeClass = p.isDebtCarryForward ? 'debit' : 'credit';
        const defaultText = p.isCarryForward 
            ? `Credit carried forward from previous term` 
            : `Balance of ${Math.abs(amount).toLocaleString('en-US')} KES from previous term`;
            
        description = `
            <div class="carry-forward-notice ${noticeClass}">
                <i class="fas fa-exchange-alt"></i>
                <span>${p.description || defaultText}</span>
            </div>`;
    } else if (p.description) {
        description = `<div class="description">${p.description}</div>`;
    }
    
    // Build additional details
    let details = [];
    if (p.receiptNumber) details.push(`<span class="receipt"><i class="fas fa-receipt"></i> ${p.receiptNumber}</span>`);
    if (p.transactionCode) details.push(`<span class="transaction"><i class="fas fa-hashtag"></i> ${p.transactionCode}</span>`);
    
    // Build notes if any
    let notes = '';
    if (p.notes) {
        notes = `
            <div class="payment-notes alert alert-info">
                <i class="fas fa-info-circle"></i> ${p.notes}
            </div>`;
    }
    
    return `
        <div class='payment-item ${isCarryOver ? 'carry-over' : ''} ${p.isCarryForward ? 'credit-carry' : ''} ${p.isDebtCarryForward ? 'debt-carry' : ''}'>
            <div class='payment-header'>
                <div class='payment-type-badge'>
                    ${paymentBadge}
                </div>
                <span class='${amountClass}'>
                    ${isCredit ? '+' : ''}${amount.toLocaleString('en-US')} KES
                </span>
                <span class='payment-date' title='${new Date(p.datePaid).toLocaleString()}'>
                    <i class='far fa-calendar-alt'></i> ${formattedDate}
                </span>
            </div>
            <div class='payment-details'>
                <div class='payment-type'>${paymentType}</div>
                ${details.length > 0 ? `<div class='payment-meta'>${details.join('')}</div>` : ''}
                ${description}
                ${notes}
            </div>
        </div>
    `;
}



// Function to render the student list
function renderStudentList() {
    const students = getStudents();
    const studentListContainer = document.getElementById('studentList');
    
    if (!studentListContainer) {
        console.error('Student list container not found');
        return;
    }
    
    // Clear the container
    studentListContainer.innerHTML = '';
    
    if (students.length === 0) {
        studentListContainer.innerHTML = `
            <div class="no-students">
                <p>No students found. Add a new student to get started.</p>
            </div>
        `;
        return;
    }
    
    // Get the current active term from localStorage or default to 'Term 1'
    const currentTerm = localStorage.getItem('selectedTerm') || 'Term 1';
    
    // Group students by class level
    const studentsByClass = {};
    students.forEach(student => {
        if (!studentsByClass[student.classLevel]) {
            studentsByClass[student.classLevel] = [];
        }
        studentsByClass[student.classLevel].push(student);
    });
    
    // Sort class levels numerically
    const sortedClassLevels = Object.keys(studentsByClass).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Generate HTML for each class level
    sortedClassLevels.forEach(classLevel => {
        const classStudents = studentsByClass[classLevel];
        
        // Create class header
        const classHeader = document.createElement('div');
        classHeader.className = 'class-header';
        classHeader.innerHTML = `
            <h3>Class ${classLevel}</h3>
            <span class="student-count">${classStudents.length} student${classStudents.length !== 1 ? 's' : ''}</span>
        `;
        studentListContainer.appendChild(classHeader);
        
        // Create student cards for this class
        const studentCards = document.createElement('div');
        studentCards.className = 'student-cards';
        
        classStudents.forEach(student => {
            const feeBalance = calculateFeeBalance(student, currentTerm);
            const totalFee = parseFloat(calculateTotalFee(student, currentTerm).replace(/,/g, '')) || 0;
            const paidAmount = totalFee - feeBalance;
            const progress = totalFee > 0 ? Math.min(100, (paidAmount / totalFee) * 100) : 0;
            
            const studentCard = document.createElement('div');
            studentCard.className = `student-card ${student.status === 'inactive' ? 'inactive' : ''}`;
            studentCard.innerHTML = `
                <div class="student-info">
                    <h4>${student.fullName}</h4>
                    <div class="student-details">
                        <span>Adm: ${student.admissionNumber}</span>
                        <span>${student.stream || 'No Stream'}</span>
                    </div>
                </div>
                <div class="fee-info">
                    <div class="fee-progress">
                        <div class="progress-bar" style="width: ${progress}%;"></div>
                    </div>
                    <div class="fee-amounts">
                        <span class="fee-paid">${paidAmount.toLocaleString('en-US')} KES</span>
                        <span class="fee-total">/ ${totalFee.toLocaleString('en-US')} KES</span>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="btn btn-view" onclick="viewStudent('${student.admissionNumber}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-edit" onclick="editStudent('${student.admissionNumber}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            `;
            
            studentCards.appendChild(studentCard);
        });
        
        studentListContainer.appendChild(studentCards);
    });
}

// Initialize the page
// Add styles for fee balance and carry forward notices
if (!document.getElementById('fee-balance-style')) {
    const style = document.createElement('style');
    style.id = 'fee-balance-style';
    style.textContent = `
        .fee-balance.positive { color: #dc3545; font-weight: bold; }
        .fee-balance.negative { color: #28a745; font-weight: bold; }
        .fee-balance.zero { color: #6c757d; }
        
        /* Carry forward notice styles */
        .carry-forward-notice {
            background-color: #f8f9fa;
            border-left: 3px solid #17a2b8;
            padding: 8px 12px;
            margin: 8px 0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .carry-forward-notice i {
            color: #17a2b8;
        }
        
        .carry-forward-notice.debit {
            border-left-color: #dc3545;
        }
        
        .carry-forward-notice.debit i {
            color: #dc3545;
        }
        
        .payment-type {
            font-weight: bold;
            margin-bottom: 4px;
            display: block;
        }
        
        .payment-type.credit { color: #28a745; }
        .payment-type.debit { color: #dc3545; }
    `;
    document.head.appendChild(style);
}


document.addEventListener('DOMContentLoaded', () => {
    // Get the saved term from localStorage or default to 'Term 1'
    const savedTerm = localStorage.getItem('selectedTerm') || 'Term 1';
    
    // Set the dropdown to show the saved term
    const termSelect = document.getElementById('termSelect');
    if (termSelect) {
        termSelect.value = savedTerm;
    }
    
    // Display students for the saved term
    displayStudents(savedTerm);
});
