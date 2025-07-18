console.log('pay-fee.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const admissionNumber = urlParams.get('admissionNumber');
        const studentName = urlParams.get('studentName');
        
        if (!admissionNumber || !studentName) {
            throw new Error('Student information is missing. Please go back and select a student.');
        }
        
        // Set hidden fields
        document.getElementById('admissionNumber').value = admissionNumber;
        document.getElementById('studentName').value = studentName;
        
        // Set default date to today
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        
        // Load and display payment history
        displayPaymentHistory(admissionNumber);
        
        // Form submission handler
        const form = document.getElementById('paymentForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Disable submit button to prevent multiple submissions
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            
            try {
                // Get form data
                const formData = new FormData(form);
                const amount = parseFloat(formData.get('amount'));
                
                if (isNaN(amount) || amount <= 0) {
                    throw new Error('Please enter a valid amount greater than 0');
                }
                
                if (!formData.get('paymentMethod')) {
                    throw new Error('Please select a payment method');
                }
                
                if (!formData.get('date')) {
                    throw new Error('Please select a payment date');
                }
                
                const paymentData = {
                    admissionNumber: admissionNumber,
                    studentName: studentName,
                    amount: amount,
                    paymentMethod: formData.get('paymentMethod'),
                    transactionCode: formData.get('transactionCode') || 'N/A',
                    date: formData.get('date'),
                    notes: formData.get('notes') || '',
                    timestamp: new Date().toISOString()
                };
                
                // Get current students
                const students = JSON.parse(localStorage.getItem('students') || '[]');
                
                // Find the student
                const studentIndex = students.findIndex(s => s.admissionNumber === admissionNumber);
                if (studentIndex === -1) {
                    throw new Error('Student not found in records');
                }
                
                // Update student's payment information
                const student = students[studentIndex];
                
                // Initialize payment history and paid amount if they don't exist
                if (!student.paymentHistory) {
                    student.paymentHistory = [];
                }
                if (student.paidAmount === undefined) {
                    student.paidAmount = 0;
                }
                
                // Add new payment to history
                student.paymentHistory.unshift(paymentData); // Add to beginning of array to show newest first
                
                // Update paid amount and calculate balance
                const currentPaidAmount = parseFloat(student.paidAmount) || 0;
                student.paidAmount = currentPaidAmount + amount;
                
                // Calculate total fees based on selected fee items
                const feeItems = [
                    'schoolFee', 'lunch', 'transport', 'reamPaper', 
                    'activity', 'admissionFee', 'swimming', 'ujiTea'
                ];
                
                let totalFees = 0;
                feeItems.forEach(item => {
                    if (student[item] === true) {
                        // Using a default value of 1000 for each fee item
                        totalFees += 1000;
                    }
                });
                
                // Update balance
                student.feeBalance = totalFees - student.paidAmount;
                student.lastPaymentDate = new Date().toISOString();
                
                // Update students array
                students[studentIndex] = student;
                
                // Save back to localStorage
                localStorage.setItem('students', JSON.stringify(students));
                
                // Show success message with more details
                const successMessage = `
                    Payment Successful!\n\n
                    Student: ${studentName}\n
                    Amount: KSh ${amount.toFixed(2)}\n
                    Method: ${paymentData.paymentMethod}\n
                    Date: ${new Date(paymentData.date).toLocaleDateString()}
                `;
                
                // Create a more user-friendly success message
                const successDiv = document.createElement('div');
                successDiv.className = 'success-message';
                successDiv.innerHTML = `
                    <div class="success-icon">✓</div>
                    <h3>Payment Recorded Successfully!</h3>
                    <div class="payment-details">
                        <p><strong>Student:</strong> ${studentName}</p>
                        <p><strong>Amount:</strong> KSh ${amount.toFixed(2)}</p>
                        <p><strong>Method:</strong> ${paymentData.paymentMethod.charAt(0).toUpperCase() + paymentData.paymentMethod.slice(1)}</p>
                        <p><strong>Date:</strong> ${new Date(paymentData.date).toLocaleDateString()}</p>
                    </div>
                `;
                
                // Clear any previous messages
                const existingMessage = document.querySelector('.success-message, .error-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                // Insert success message before the form
                form.parentNode.insertBefore(successDiv, form);
                
                // Reset form except for student info and date
                form.reset();
                document.getElementById('admissionNumber').value = admissionNumber;
                document.getElementById('studentName').value = studentName;
                document.getElementById('date').value = new Date().toISOString().split('T')[0];
                
                // Scroll to top to show success message
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                // Refresh payment history
                displayPaymentHistory(admissionNumber);
                
                // Re-enable submit button after a short delay
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }, 1000);
                
                // Send notification (if implemented)
                try {
                    const formData = new URLSearchParams();
                    formData.append('type', 'note');
                    formData.append('title', 'New Payment Received');
                    const notificationBody = `Student: ${studentName}\nAmount: KSh ${amount.toFixed(2)}\nMethod: ${paymentData.paymentMethod}`;
                    formData.append('body', notificationBody);
                    
                    console.log('Sending Pushbullet notification with body:', notificationBody);
                    
                    // Log the exact request we're about to make
                    console.log('Pushbullet API Request:', {
                        url: 'https://api.pushbullet.com/v2/pushes',
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer o.Mv8iw71b2JN3HLBqKvLiw829GbcKtkTm',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData.toString()
                    });
                    
                    const response = await fetch('https://api.pushbullet.com/v2/pushes', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer o.Mv8iw71b2JN3HLBqKvLiw829GbcKtkTm',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: formData.toString(),
                        credentials: 'same-origin' // Ensure cookies are sent with the request
                    });
                    
                    console.log('Received response from Pushbullet API');
                    console.log('Response status:', response.status, response.statusText);
                    
                    const responseData = await response.json().catch(e => {
                        console.warn('Could not parse JSON response:', e);
                        return { error: 'Invalid JSON response' };
                    });
                    
                    console.log('Pushbullet API Response:', responseData);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(responseData)}`);
                    }
                    
                    console.log('Notification sent successfully to Pushbullet');
                } catch (error) {
                    console.error('Failed to send notification:', error);
                    if (error.response) {
                        console.error('Response status:', error.response.status);
                        try {
                            const errorBody = await error.response.text();
                            console.error('Error response body:', errorBody);
                        } catch (e) {
                            console.error('Could not read error response body:', e);
                        }
                    }
                }
                
                // Reset form and refresh payment history
                form.reset();
                document.getElementById('date').value = new Date().toISOString().split('T')[0];
                displayPaymentHistory(admissionNumber);
                
            } catch (error) {
                console.error('Payment Error:', error);
                
                // Create error message element
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.innerHTML = `
                    <div class="error-icon">!</div>
                    <h3>Payment Error</h3>
                    <p>${error.message}</p>
                `;
                
                // Clear any previous messages
                const existingMessage = document.querySelector('.success-message, .error-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                // Insert error message before the form
                form.parentNode.insertBefore(errorDiv, form);
                
                // Scroll to top to show error message
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    } catch (error) {
        console.error('Initialization Error:', error);
        alert(error.message);
        window.location.href = 'student-list.html';
    }
});

// Function to display payment history
function displayPaymentHistory(admissionNumber) {
    try {
        const historyContainer = document.getElementById('paymentHistory');
        if (!historyContainer) return;
        
        const students = JSON.parse(localStorage.getItem('students') || '[]');
        const student = students.find(s => s.admissionNumber === admissionNumber);
        
        if (!student) {
            historyContainer.innerHTML = '<p>No student record found.</p>';
            return;
        }
        
        if (!student.paymentHistory || student.paymentHistory.length === 0) {
            historyContainer.innerHTML = '<p>No payment history found.</p>';
            return;
        }
        
        // Sort payments by date (newest first)
        const sortedPayments = [...student.paymentHistory].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        // Calculate total paid
        const totalPaid = sortedPayments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
        
        // Display payment history
        let html = `
            <div class="payment-summary">
                <h3>Payment Summary</h3>
                <p>Total Paid: <strong>KSh ${totalPaid.toFixed(2)}</strong></p>
                <p>Fee Balance: <strong>KSh ${(student.feeBalance || 0).toFixed(2)}</strong></p>
                <p>Last Payment: <strong>${new Date(sortedPayments[0].date).toLocaleDateString()}</strong></p>
            </div>
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount (KSh)</th>
                            <th>Method</th>
                            <th>Reference</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        sortedPayments.forEach(payment => {
            html += `
                <tr>
                    <td>${new Date(payment.date).toLocaleDateString()}</td>
                    <td>${parseFloat(payment.amount).toFixed(2)}</td>
                    <td>${payment.paymentMethod}</td>
                    <td>${payment.transactionCode || 'N/A'}</td>
                    <td>${payment.notes || ''}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        historyContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error displaying payment history:', error);
        historyContainer.innerHTML = '<p>Error loading payment history. Please try again.</p>';
    }
}
