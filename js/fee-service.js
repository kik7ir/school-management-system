// Fee Service for handling fee-related operations
import { db } from './netlify-db.js';

class FeeService {
    constructor() {
        this.feeStructure = {};
        this.term = 'Term 1';
    }

    async initialize() {
        try {
            // Fetch fee structure from Supabase
            const fees = await db.list('fee_structure');
            this.feeStructure = this.processFeeStructure(fees);
            return this.feeStructure;
        } catch (error) {
            console.error('Error initializing fee structure:', error);
            throw error;
        }
    }

    processFeeStructure(fees) {
        const structure = {
            schoolFees: {},
            lunchFees: {},
            transportFees: {},
            otherFees: {}
        };

        fees.forEach(fee => {
            if (!structure[fee.fee_type]) {
                structure[fee.fee_type] = {};
            }
            
            if (!structure[fee.fee_type][fee.term]) {
                structure[fee.fee_type][fee.term] = {};
            }
            
            // Handle transport fees with location in fee_type
            if (fee.fee_type.includes('Transport')) {
                const [_, location] = fee.fee_type.split(' - ');
                structure[fee.fee_type][fee.term][location] = fee.amount;
            } else {
                structure[fee.fee_type][fee.term][fee.class] = fee.amount;
            }
        });

        return structure;
    }

    getFeeAmount(term, className, feeType, location = null) {
        if (!this.feeStructure[feeType]) return 0;
        if (!this.feeStructure[feeType][term]) return 0;

        if (feeType.includes('Transport')) {
            return this.feeStructure[feeType][term][location] || 0;
        } else {
            return this.feeStructure[feeType][term][className] || 0;
        }
    }

    calculateTotalFee(student, term = 'Term 1') {
        let totalFee = 0;
        
        // School fee
        if (student.schoolFee && this.feeStructure.schoolFees?.[term]?.[student.className]) {
            totalFee += this.getFeeAmount(term, student.className, 'schoolFees');
        }
        
        // Transport fee
        if (student.transport && student.transportLocation) {
            totalFee += this.getFeeAmount(term, student.className, 'transportFees', student.transportLocation);
        }
        
        // Lunch fee
        if (student.lunch && this.feeStructure.lunchFees?.[term]) {
            totalFee += this.getFeeAmount(term, student.className, 'lunchFees');
        }
        
        // Other fees
        const optionalFees = {
            reamPaper: 'REAM Paper',
            activity: 'Activity',
            admissionFee: 'Admission Fee',
            swimming: 'Swimming',
            ujiTea: 'Uji/Tea',
            snacks: 'Snacks',
            trip: 'Trip'
        };
        
        for (const [key, feeName] of Object.entries(optionalFees)) {
            if (student[key] && this.feeStructure.otherFees?.[term]?.[feeName]) {
                totalFee += this.getFeeAmount(term, student.className, 'otherFees', feeName);
            }
        }
        
        return totalFee;
    }
}

// Export singleton instance
export const feeService = new FeeService();
