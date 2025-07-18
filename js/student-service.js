// Student Service for handling student-related operations
import { db } from './netlify-db.js';

class StudentService {
    constructor() {
        this.table = 'students';
    }

    async getStudentById(id) {
        try {
            const result = await db.get(this.table, id);
            return result[0];
        } catch (error) {
            console.error('Error getting student:', error);
            throw error;
        }
    }

    async getStudentByAdmissionNumber(admissionNumber) {
        try {
            const students = await db.list(this.table);
            return students.find(s => s.admission_number === admissionNumber);
        } catch (error) {
            console.error('Error getting student by admission number:', error);
            throw error;
        }
    }

    async getAllStudents() {
        try {
            return await db.list(this.table);
        } catch (error) {
            console.error('Error getting all students:', error);
            throw error;
        }
    }

    async createStudent(studentData) {
        try {
            // Generate admission number if not provided
            if (!studentData.admission_number) {
                const year = new Date().getFullYear();
                const students = await this.getAllStudents();
                const lastStudent = students.length > 0 ? students[students.length - 1] : null;
                const lastNumber = lastStudent ? parseInt(lastStudent.admission_number.split('/')[2]) : 0;
                studentData.admission_number = `STD/${year}/${lastNumber + 1}`;
            }

            // Format the data for Supabase
            const formattedData = {
                ...studentData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const result = await db.insert(this.table, formattedData);
            return result[0];
        } catch (error) {
            console.error('Error creating student:', error);
            throw error;
        }
    }

    async updateStudent(id, studentData) {
        try {
            studentData.updated_at = new Date().toISOString();
            return await db.update(this.table, id, studentData);
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    }

    async deleteStudent(id) {
        try {
            return await db.delete(this.table, id);
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    }

    async initializeStudentFees(studentId, term) {
        try {
            // Get fee structure for the student's class
            const fees = await db.list('fee_structure');
            const student = await this.getStudentById(studentId);
            
            // Filter fees for this student's class and term
            const relevantFees = fees.filter(fee => 
                fee.class === student.class && 
                fee.term === term
            );

            // Create student_fees records
            const studentFees = relevantFees.map(fee => ({
                student_id: studentId,
                fee_type_id: fee.id,
                term: fee.term,
                amount: fee.amount,
                balance: fee.amount,
                status: 'unpaid',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            return await db.insert('student_fees', studentFees);
        } catch (error) {
            console.error('Error initializing student fees:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const studentService = new StudentService();
