/**
 * Default Fee Structure for School Management System
 * This file contains the default fee structure that will be used if no custom structure is defined in localStorage
 */

// Default fee structure for all classes
const defaultFeeStructure = {
    // Primary School (Class 1-8)
    '1': {
        tuition: 15000,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 18500
    },
    '2': {
        tuition: 15500,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 19000
    },
    '3': {
        tuition: 16000,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 19500
    },
    '4': {
        tuition: 16500,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 20000
    },
    '5': {
        tuition: 17000,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 20500
    },
    '6': {
        tuition: 17500,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 21000
    },
    '7': {
        tuition: 18000,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 21500
    },
    '8': {
        tuition: 18500,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 22000
    },
    
    // Secondary School (Form 1-4)
    'Form 1': {
        tuition: 20000,
        activity: 3000,
        exam: 1500,
        library: 1000,
        medical: 1500,
        lab: 2000,
        total: 29000
    },
    'Form 2': {
        tuition: 21000,
        activity: 3000,
        exam: 1500,
        library: 1000,
        medical: 1500,
        lab: 2000,
        total: 30000
    },
    'Form 3': {
        tuition: 22000,
        activity: 3000,
        exam: 1500,
        library: 1000,
        medical: 1500,
        lab: 2000,
        total: 31000
    },
    'Form 4': {
        tuition: 23000,
        activity: 3000,
        exam: 1500,
        library: 1000,
        medical: 1500,
        lab: 2000,
        total: 32000
    }
};

// Transport fee structure (per term)
const transportFeeStructure = {
    'Nairobi CBD': 8000,
    'Westlands': 7500,
    'Eastleigh': 7000,
    'South B': 6500,
    'South C': 6000,
    'Rongai': 7500,
    'Kikuyu': 7000,
    'Kiambu': 6500,
    'Thika': 8000,
    'Juja': 7500,
    'Ruiru': 7000,
    'Other': 5000
};

// Function to get the default fee structure for a class
function getDefaultFeeStructure(classLevel) {
    return defaultFeeStructure[classLevel] || {
        tuition: 15000,
        activity: 2000,
        exam: 1000,
        library: 500,
        medical: 1000,
        total: 18500
    };
}

// Function to get transport fee for a location
function getTransportFeeForLocation(location) {
    return transportFeeStructure[location] || 5000; // Default to 5000 if location not found
}

// Initialize fee structure in localStorage if it doesn't exist
if (!localStorage.getItem('feeStructure')) {
    localStorage.setItem('feeStructure', JSON.stringify(defaultFeeStructure));
}

// Initialize transport fee structure in localStorage if it doesn't exist
if (!localStorage.getItem('transportFeeStructure')) {
    localStorage.setItem('transportFeeStructure', JSON.stringify(transportFeeStructure));
}

// Export the functions and default structures
window.feeStructure = {
    defaultFeeStructure,
    transportFeeStructure,
    getDefaultFeeStructure,
    getTransportFeeForLocation
};

console.log('Fee structure initialized');
