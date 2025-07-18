// Initial fee structure data
window.feeStructure = window.feeStructure || {
    schoolFees: {
        'Term 1': {
            'PG': 3450,
            'PP1': 3750,
            'PP2': 4200,
            'Grade 1': 6750,
            'Grade 2': 6750,
            'Grade 3': 6750,
            'Grade 4': 7050,
            'Grade 5': 7050,
            'Grade 6': 7800,
            'Junior Secondary': 7500
        },
        'Term 2': {
            'PG': 2070,
            'PP1': 2250,
            'PP2': 2520,
            'Grade 1': 4050,
            'Grade 2': 4050,
            'Grade 3': 4050,
            'Grade 4': 4230,
            'Grade 5': 4230,
            'Grade 6': 4680,
            'Junior Secondary': 7500
        },
        'Term 3': {
            'PG': 1380,
            'PP1': 1500,
            'PP2': 1680,
            'Grade 1': 2700,
            'Grade 2': 2700,
            'Grade 3': 2700,
            'Grade 4': 2820,
            'Grade 5': 2820,
            'Grade 6': 3120,
            'Junior Secondary': 7500
        }
    },
    lunchFees: {
        'Term 1': 1500,
        'Term 2': 1500,
        'Term 3': 1500
    },
    transportFees: {
        'Term 1': {
            'Kipkaren Estate': 2250,
            'Segero, Kipkenyo, Simat, Flyoner': 4500
        },
        'Term 2': {
            'Kipkaren': 1350,
            'Segero, Kipkenyo, Simat, Flyoner': 2700
        },
        'Term 3': {
            'Kipkaren': 900,
            'Segero, Kipkenyo, Simat, Flyoner': 1800
        }
    },
    otherFees: {
        'Term 1': {
            'REAM Paper': 200,
            'Activity': 200,
            'Admission Fee': 600,
            'Swimming': 600,
            'Uji/Tea': 600,
            'Trip': 1500
        },
        'Term 2': {
            'REAM Paper': 200,
            'Activity': 200,
            'Admission Fee': 600,
            'Swimming': 600,
            'Uji/Tea': 600,
            'Trip': 1500
        },
        'Term 3': {
            'REAM Paper': 200,
            'Activity': 200,
            'Admission Fee': 600,
            'Swimming': 600,
            'Uji/Tea': 600,
            'Trip': 1500
        }
    }
};

// Function to populate fees
function populateFees() {
    // School Fees
    populateSection('school-fees', feeStructure.schoolFees);
    // Lunch Fees
    populateSection('lunch-fees', feeStructure.lunchFees);
    // Transport Fees
    populateSection('transport-fees', feeStructure.transportFees);
    // Other Fees
    populateSection('other-fees', feeStructure.otherFees);
}

function populateSection(containerId, fees) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    for (const [term, values] of Object.entries(fees)) {
        const termDiv = document.createElement('div');
        termDiv.className = 'fee-item';
        termDiv.innerHTML = `<strong>${term}:</strong>`;
        container.appendChild(termDiv);

        if (typeof values === 'object') {
            for (const [category, amount] of Object.entries(values)) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'fee-item';
                itemDiv.innerHTML = `
                    <span>${category}:</span>
                    <input type="number" value="${amount}" data-term="${term}" data-category="${category}">
                `;
                container.appendChild(itemDiv);
            }
        } else {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'fee-item';
            itemDiv.innerHTML = `
                <span>${term}:</span>
                <input type="number" value="${values}" data-term="${term}">
            `;
            container.appendChild(itemDiv);
        }
    }
}

// Save fees to localStorage
function saveFees() {
    const schoolFees = {};
    const lunchFees = {};
    const transportFees = {};
    const otherFees = {};

    // Get school fees
    const schoolInputs = document.querySelectorAll('#school-fees input');
    schoolInputs.forEach(input => {
        const term = input.dataset.term;
        const category = input.dataset.category;
        const amount = parseInt(input.value);
        
        if (!schoolFees[term]) schoolFees[term] = {};
        schoolFees[term][category] = amount;
    });

    // Get lunch fees
    const lunchInputs = document.querySelectorAll('#lunch-fees input');
    lunchInputs.forEach(input => {
        const term = input.dataset.term;
        const amount = parseInt(input.value);
        lunchFees[term] = amount;
    });

    // Get transport fees
    const transportInputs = document.querySelectorAll('#transport-fees input');
    transportInputs.forEach(input => {
        const term = input.dataset.term;
        const category = input.dataset.category;
        const amount = parseInt(input.value);
        
        if (!transportFees[term]) transportFees[term] = {};
        transportFees[term][category] = amount;
    });

    // Get other fees
    const otherInputs = document.querySelectorAll('#other-fees input');
    otherInputs.forEach(input => {
        const term = input.dataset.term;
        const category = input.dataset.category;
        const amount = parseInt(input.value);
        
        if (!otherFees[term]) otherFees[term] = {};
        otherFees[term][category] = amount;
    });

    // Save to localStorage
    localStorage.setItem('schoolFees', JSON.stringify(schoolFees));
    localStorage.setItem('lunchFees', JSON.stringify(lunchFees));
    localStorage.setItem('transportFees', JSON.stringify(transportFees));
    localStorage.setItem('otherFees', JSON.stringify(otherFees));

    alert('Fees saved successfully!');
}

// Function to add a custom fee
function addCustomFee() {
    const nameInput = document.getElementById('custom-fee-name');
    const amountInput = document.getElementById('custom-fee-amount');
    
    const name = nameInput.value.trim();
    const amount = parseInt(amountInput.value);
    
    if (!name || isNaN(amount) || amount < 0) {
        alert('Please enter a valid fee name and amount');
        return;
    }
    
    // Add to otherFees for all terms
    ['Term 1', 'Term 2', 'Term 3'].forEach(term => {
        if (!feeStructure.otherFees[term]) {
            feeStructure.otherFees[term] = {};
        }
        feeStructure.otherFees[term][name] = amount;
    });
    
    // Update the UI
    populateSection('other-fees', feeStructure.otherFees);
    renderCustomFeesList();
    
    // Clear inputs
    nameInput.value = '';
    amountInput.value = '';
}

// Function to delete a custom fee
function deleteCustomFee(feeName) {
    if (confirm(`Are you sure you want to delete the "${feeName}" fee? This will remove it from all terms.`)) {
        // Remove from otherFees for all terms
        Object.keys(feeStructure.otherFees).forEach(term => {
            if (feeStructure.otherFees[term][feeName]) {
                delete feeStructure.otherFees[term][feeName];
            }
        });
        
        // Update the UI
        populateSection('other-fees', feeStructure.otherFees);
        renderCustomFeesList();
    }
}

// Function to render the custom fees list
function renderCustomFeesList() {
    const container = document.getElementById('custom-fees-container');
    if (!container) return;
    
    // Get all unique fee names from otherFees
    const feeNames = new Set();
    Object.values(feeStructure.otherFees).forEach(termFees => {
        Object.keys(termFees).forEach(feeName => {
            feeNames.add(feeName);
        });
    });
    
    // Skip default fees
    const defaultFees = ['REAM Paper', 'Activity', 'Admission Fee', 'Swimming', 'Uji/Tea', 'Trip'];
    const customFees = Array.from(feeNames).filter(fee => !defaultFees.includes(fee));
    
    if (customFees.length === 0) {
        container.innerHTML = '<p>No custom fees added yet.</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="custom-fees-table">
            <thead>
                <tr>
                    <th>Fee Name</th>
                    <th>Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${customFees.map(feeName => {
                    const amount = feeStructure.otherFees['Term 1'][feeName] || 0;
                    return `
                        <tr>
                            <td>${feeName}</td>
                            <td>${amount} KES</td>
                            <td>
                                <button onclick="deleteCustomFee('${feeName}')" class="btn btn-danger">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Load saved fees from localStorage if available
document.addEventListener('DOMContentLoaded', () => {
    // Ensure feeStructure is only set once
    if (!window.feeStructure) return;
    
    const savedSchoolFees = JSON.parse(localStorage.getItem('schoolFees'));
    const savedLunchFees = JSON.parse(localStorage.getItem('lunchFees'));
    const savedTransportFees = JSON.parse(localStorage.getItem('transportFees'));
    const savedOtherFees = JSON.parse(localStorage.getItem('otherFees'));

    if (savedSchoolFees) feeStructure.schoolFees = savedSchoolFees;
    if (savedLunchFees) feeStructure.lunchFees = savedLunchFees;
    if (savedTransportFees) feeStructure.transportFees = savedTransportFees;
    if (savedOtherFees) feeStructure.otherFees = savedOtherFees;

    populateFees();
});
