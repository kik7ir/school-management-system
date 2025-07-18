// Define current term
const currentTerm = 'Term 1'; // Default term

// Function to get current billing options from the form
function getBillingOptions() {
    return {
        transport: document.getElementById('transport')?.checked || false,
        transportLocation: document.getElementById('transportLocation')?.value || '',
        schoolFee: document.getElementById('schoolFee')?.checked || false,
        lunch: document.getElementById('lunch')?.checked || false,
        reamPaper: document.getElementById('reamPaper')?.checked || false,
        activity: document.getElementById('activity')?.checked || false,
        admissionFee: document.getElementById('admissionFee')?.checked || false,
        swimming: document.getElementById('swimming')?.checked || false,
        ujiTea: document.getElementById('ujiTea')?.checked || false,
        snacks: document.getElementById('snacks')?.checked || false,
        trip: document.getElementById('trip')?.checked || false
    };
}

// Function to generate admission number
async function generateAdmissionNumber() {
    try {
        const year = new Date().getFullYear();
        const students = await studentService.getAllStudents();
        const lastStudent = students.length > 0 ? students[students.length - 1] : null;
        const lastNumber = lastStudent ? parseInt(lastStudent.admission_number.split('/')[2]) : 0;
        const newNumber = lastNumber + 1;
        const admissionNumberElement = document.getElementById('admissionNumber');
        if (admissionNumberElement) {
            admissionNumberElement.value = `STD/${year}/${newNumber}`;
        }
    } catch (error) {
        console.error('Error generating admission number:', error);
        alert('Error generating admission number. Please try again.');
    }
}

import { studentService } from './student-service.js';

// Function to handle student registration
async function handleStudentRegistration(event) {
    event.preventDefault();
    
    try {
        // Get form data
        const form = event.target;
        const urlParams = new URLSearchParams(window.location.search);
        const isEdit = urlParams.get('edit') === 'true';
        const admissionNumber = isEdit ? urlParams.get('admissionNumber') : form.admissionNumber?.value?.trim() || '';
        
        // Validate required fields
        if (!admissionNumber) {
            alert('Admission number is required');
            return false;
        }
        
        // Get the current term
        const term = document.getElementById('term')?.value || 'Term 1';
        
        // Show confirmation dialog for the selected term
        const confirmationMessage = isEdit 
            ? `Are you sure you want to update this student for ${term}?\n\nPlease confirm the term is correct before proceeding.`
            : `Are you sure you want to register this student for ${term}?\n\nPlease confirm the term is correct before proceeding.`;
            
        if (!confirm(confirmationMessage)) {
            console.log('Operation cancelled by user');
            return false;
        }
        
        // Get billing options
        const billingOptions = getBillingOptions();
        
        // Get custom fees
        const customFees = {};
        const customFeeCheckboxes = document.querySelectorAll('input[name="customFees"]:checked');
        customFeeCheckboxes.forEach(checkbox => {
            customFees[checkbox.value] = true;
        });
        
        let studentData;
        
        if (isEdit) {
            // Update existing student
            const existingStudent = await studentService.getStudentByAdmissionNumber(admissionNumber);
            if (existingStudent) {
                studentData = {
                    id: existingStudent.id,
                    admission_number: admissionNumber,
                    full_name: form.fullName?.value?.trim() || '',
                    class: form.class?.value || '',
                    class_teacher: form.classTeacher?.value?.trim() || '',
                    parent_name: form.parentName?.value?.trim() || '',
                    parent_phone: form.parentPhone?.value?.trim() || '',
                    school_fee: billingOptions.schoolFee,
                    transport: billingOptions.transport,
                    transport_location: billingOptions.transportLocation,
                    lunch: billingOptions.lunch,
                    ream_paper: billingOptions.reamPaper,
                    activity: billingOptions.activity,
                    admission_fee: billingOptions.admissionFee,
                    swimming: billingOptions.swimming,
                    uji_tea: billingOptions.ujiTea,
                    snacks: billingOptions.snacks,
                    trip: billingOptions.trip,
                    term_billing: {
                        [term]: billingOptions
                    },
                    custom_fees: {
                        [term]: customFees
                    }
                };
                
                // Update student in Supabase
                await studentService.updateStudent(existingStudent.id, studentData);
                
                // Initialize fees for the new term if it's different
                if (existingStudent.term_billing?.[term]) {
                    await studentService.initializeStudentFees(existingStudent.id, term);
                }
                
                alert('Student updated successfully!');
            } else {
                alert('Student not found!');
                return false;
            }
        } else {
            // Create new student
            studentData = {
                admission_number: admissionNumber,
                full_name: form.fullName?.value?.trim() || '',
                class: form.class?.value || '',
                class_teacher: form.classTeacher?.value?.trim() || '',
                parent_name: form.parentName?.value?.trim() || '',
                parent_phone: form.parentPhone?.value?.trim() || '',
                school_fee: billingOptions.schoolFee,
                transport: billingOptions.transport,
                transport_location: billingOptions.transportLocation,
                lunch: billingOptions.lunch,
                ream_paper: billingOptions.reamPaper,
                activity: billingOptions.activity,
                admission_fee: billingOptions.admissionFee,
                swimming: billingOptions.swimming,
                uji_tea: billingOptions.ujiTea,
                snacks: billingOptions.snacks,
                trip: billingOptions.trip,
                term_billing: {
                    [term]: billingOptions
                },
                custom_fees: {
                    [term]: customFees
                }
            };
            
            // Create student in Supabase
            const createdStudent = await studentService.createStudent(studentData);
            
            // Initialize fees for the new student
            await studentService.initializeStudentFees(createdStudent.id, term);
            
            alert('Student registered successfully!');
        }
        
        // Redirect to student list
        window.location.href = 'student-list.html';
        return false;
    } catch (error) {
        console.error('Error registering student:', error);
        alert('Error registering student. Please try again.');
        return false;
    }
}

// Function to load and render custom fees in the registration form
function loadCustomFees() {
    const container = document.getElementById('custom-fees-container');
    if (!container) return;
    
    // Get other fees from fee structure
    const otherFees = feeStructure.otherFees['Term 1'] || {}; // Use Term 1 as reference
    const defaultFees = ['REAM Paper', 'Activity', 'Admission Fee', 'Swimming', 'Uji/Tea', 'Trip'];
    
    // Filter out default fees to get only custom fees
    const customFees = Object.entries(otherFees)
        .filter(([feeName]) => !defaultFees.includes(feeName));
    
    if (customFees.length === 0) return;
    
    // Create billing options for each custom fee
    customFees.forEach(([feeName, amount]) => {
        const feeId = feeName.toLowerCase().replace(/\s+/g, '-');
        const feeHtml = `
            <div class="billing-option">
                <input type="checkbox" id="${feeId}" name="customFees" value="${feeName}">
                <label for="${feeId}">${feeName} (${amount} KES)</label>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', feeHtml);
    });
}

// Function to calculate total fee
function calculateTotalFee(student, term) {
    const classLevel = student.classLevel || '1';
    const baseFees = BASE_FEE_STRUCTURE[classLevel] || BASE_FEE_STRUCTURE['1'];
    
    // Get term-specific fee items if they exist, otherwise use an empty object
    const termFees = student.termFees?.[term] || {};
    
    // Get the student's billing options for the term
    const billingOptions = student.billingOptions?.[term] || {};
    
    // If no billing options are set for the term, use the student's root level billing options
    const effectiveBillingOptions = Object.keys(billingOptions).length > 0 
        ? billingOptions 
        : student.billingOptions || {};
    
    // If no billing options are set at all, default to showing all fees
    const showAllFees = Object.keys(effectiveBillingOptions).length === 0;
    
    // Calculate total fee by summing up enabled fee items
    let total = 0;
    for (const [item, amount] of Object.entries(baseFees)) {
        // Skip if the fee item is not enabled in billing options (unless no billing options are set)
        if (!showAllFees && effectiveBillingOptions[item] !== true) continue;
        
        // If the item is explicitly set to false in termFees, skip it
        if (termFees[item] === false) continue;
        
        // If the item has a custom amount in termFees, use that, otherwise use base amount
        total += parseFloat(termFees[item] !== undefined ? termFees[item] : amount) || 0;
    }
    
    return total;
}

// Function to get fee breakdown
function getFeeBreakdown(student, term) {
    const classLevel = student.classLevel || '1';
    const baseFees = BASE_FEE_STRUCTURE[classLevel] || BASE_FEE_STRUCTURE['1'];
    const termFees = student.termFees?.[term] || {};
    
    const breakdown = [];
    for (const [item, amount] of Object.entries(baseFees)) {
        // Skip items that are explicitly disabled for this term
        if (termFees[item] === false) continue;
        
        // Use custom amount if specified, otherwise use base amount
        const itemAmount = termFees[item] !== undefined ? termFees[item] : amount;
        if (itemAmount !== false) {  // Only include if not explicitly disabled
            breakdown.push({
                name: item.charAt(0).toUpperCase() + item.slice(1),
                amount: parseFloat(itemAmount) || 0,
                isCustom: termFees[item] !== undefined
            });
        }
    }
    
    return breakdown;
}

// Load saved fees from localStorage if available
// Function to update class teacher based on selected class
function updateClassTeacher(selectedClass) {
    const classTeacherMap = {
        'PG': 'TR CECILIA/TR SHARON',
        'PP1': 'TR BABRA',
        'PP2': 'TR APHLINE',
        'Grade 1': 'TR EDITH',
        'Grade 2': 'TR ROSE',
        'Grade 3': 'TR CHEBET',
        'Grade 4': 'TR DIANA',
        'Grade 5': 'TR JARED',
        'Grade 6': 'TR NEPHAN',
        'Junior Secondary': 'TR PETER'
    };
    
    const classTeacherField = document.getElementById('classTeacher');
}
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Generate admission number first
        await generateAdmissionNumber();

        // Add event listener for class selection change
        const classSelect = document.getElementById('class');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                updateFeeInputs(e.target.value);
            });
        }

        await loadCustomFees();
        updateClassTeacher('');

        // Ensure feeStructure is only set once
        if (!window.feeStructure) {
            window.feeStructure = {
                schoolFees: {},
                lunchFees: {},
                transportFees: {},
                otherFees: {}
            };
        }
        
        // Load saved fee structure from localStorage
        const savedSchoolFees = JSON.parse(localStorage.getItem('schoolFees') || '{}');
        const savedLunchFees = JSON.parse(localStorage.getItem('lunchFees') || '{}');
        const savedTransportFees = JSON.parse(localStorage.getItem('transportFees') || '{}');
        const savedOtherFees = JSON.parse(localStorage.getItem('otherFees') || '{}');

        if (savedSchoolFees) feeStructure.schoolFees = savedSchoolFees;
        if (savedLunchFees) feeStructure.lunchFees = savedLunchFees;
        if (savedTransportFees) feeStructure.transportFees = savedTransportFees;
        if (savedOtherFees) feeStructure.otherFees = savedOtherFees;
        
        console.log('Loaded fee structure:', feeStructure);

        // ... (rest of the code remains the same)
        // Load custom fees after the DOM is fully loaded
        setTimeout(loadCustomFees, 300); // Small delay to ensure DOM is ready
    } catch (error) {
        console.error('Error loading fee structure:', error);
    }

    try {
        // Update submit button text for edit mode
        const urlParams = new URLSearchParams(window.location.search);
        const isEdit = urlParams.get('edit') === 'true';
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            const btnText = submitButton.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isEdit ? 'Update Student' : 'Register Student';
            }
        }



        // Check if we're editing an existing student
        if (isEdit) {
            // Get admission number from URL if available
            const admissionNumber = urlParams.get('admissionNumber');
            if (admissionNumber) {
                try {
                    // Fetch the student data from localStorage
                    const students = JSON.parse(localStorage.getItem('students') || '[]');
                    const student = students.find(s => s.admissionNumber === admissionNumber);
                    
                    if (student) {
                        // Get current term
                        const term = document.getElementById('term').value;
                        
                        // Populate form fields with student data
                        document.getElementById('admissionNumber').value = student.admissionNumber || '';
                        document.getElementById('fullName').value = student.fullName || '';
                        document.getElementById('class').value = student.class || '';
                        document.getElementById('classTeacher').value = student.classTeacher || '';
                        document.getElementById('parentName').value = student.parentName || '';
                        document.getElementById('parentPhone').value = student.parentPhone || '';
                        
                        // Set transport location if available
                        const transportLocation = student.transportLocation || 
                                              (student.termBilling && student.termBilling[term]?.transportLocation) || '';
                        document.getElementById('transportLocation').value = transportLocation;
                        
                        // Set billing options for the current term
                        const termBilling = student.termBilling && student.termBilling[term] || {};
                        
                        // Set checkboxes based on term billing or student's default billing
                        const billingOptions = [
                            'schoolFee', 'lunch', 'transport', 'reamPaper', 
                            'activity', 'admissionFee', 'swimming', 'ujiTea', 'snacks', 'trip'
                        ];
                        
                        billingOptions.forEach(option => {
                            const element = document.getElementById(option);
                            if (element) {
                                element.checked = termBilling[option] || false;
                            }
                        });
                        
                        // Update submit button text
                        const submitButton = document.getElementById('submitButton');
                        if (submitButton) {
                            const btnText = submitButton.querySelector('.btn-text');
                            if (btnText) {
                                btnText.textContent = 'Update Student';
                            }
                        }
                        
                        // Load and apply custom fees
                        loadCustomFees();
                        
                        // Find and check any custom fees for this student
                        const defaultFees = new Set([
                            'schoolFee', 'lunch', 'transport', 'reamPaper', 
                            'activity', 'admissionFee', 'swimming', 'ujiTea', 'trip'
                        ]);
                        
                        // Check for custom fees in student data
                        if (student.termBilling && student.termBilling[term]) {
                            Object.entries(student.termBilling[term]).forEach(([key, value]) => {
                                if (typeof value === 'boolean' && value === true && !defaultFees.has(key)) {
                                    const feeId = key.toLowerCase().replace(/\s+/g, '-');
                                    const checkbox = document.getElementById(feeId);
                                    if (checkbox) {
                                        checkbox.checked = true;
                                    }
                                }
                            });
                        }
                    } else {
                        console.error('Student not found with admission number:', admissionNumber);
                        alert('Error: Student not found. Redirecting to student list.');
                        window.location.href = 'student-list.html';
                    }
                } catch (error) {
                    console.error('Error loading student data:', error);
                    alert('Error loading student data. Please try again.');
                }
            }
        }
    } catch (error) {
        console.error('Error initializing form:', error);
        alert('Error loading form. Please try again.');
    }
});

