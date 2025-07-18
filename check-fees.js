// This script will help check the fee structure in the browser's console

function checkFeeStructure() {
    // Get the fee structure from localStorage
    const feeStructure = JSON.parse(localStorage.getItem('feeStructure')) || {};
    
    console.log('Current Fee Structure:', feeStructure);
    
    // Check Term 3 fees specifically
    if (feeStructure.schoolFees && feeStructure.schoolFees['Term 3']) {
        console.log('Term 3 School Fees:', feeStructure.schoolFees['Term 3']);
    } else {
        console.warn('No Term 3 school fees found in the fee structure');
    }
    
    // Check if there are any students
    const students = JSON.parse(localStorage.getItem('students')) || [];
    console.log(`Found ${students.length} students`);
    
    // Check a specific student if needed
    if (students.length > 0) {
        const student = students[0]; // Check first student
        console.log('Sample student data:', {
            name: student.fullName,
            class: student.class,
            termBilling: student.termBilling
        });
    }
}

// Run the check
checkFeeStructure();
