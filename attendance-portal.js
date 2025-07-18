// Attendance Portal JavaScript

// Initialize attendance data in localStorage if it doesn't exist
function initAttendanceData() {
    if (!localStorage.getItem('attendance')) {
        localStorage.setItem('attendance', JSON.stringify({}));
    }
}

// Get all students from localStorage
function getStudents() {
    return JSON.parse(localStorage.getItem('students') || '[]');
}

// Get unique classes from students
function getClasses(students) {
    const classes = new Set();
    students.forEach(student => {
        if (student.class) {
            classes.add(student.class);
        }
    });
    return Array.from(classes).sort();
}

// Get attendance for a specific date
function getAttendance(date) {
    const attendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    return attendance[date] || {};
}

// Save attendance for a specific date
function saveAttendance(date, attendanceData) {
    const allAttendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    allAttendance[date] = attendanceData;
    localStorage.setItem('attendance', JSON.stringify(allAttendance));
    
    // Show success message
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 m-3';
    toast.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-success text-white">
                <strong class="me-auto">Success</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                <i class="fas fa-check-circle me-2"></i> Attendance saved successfully!
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Format date for display (e.g., "Mon, 25 Dec 2023")
function formatDateDisplay(dateString) {
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Render student list for attendance
function renderStudentList(students, selectedDate, selectedClass = 'all') {
    const container = document.getElementById('attendanceList');
    if (!container) return;

    // Filter students by class if specified
    const filteredStudents = selectedClass === 'all' 
        ? students 
        : students.filter(student => student.class === selectedClass);
    
    const attendanceData = getAttendance(selectedDate);
    const today = formatDate(new Date());
    const isFutureDate = selectedDate > today;
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Parent's Name</th>
                        <th>Parent's Phone</th>
                        <th class="text-center" style="width: 120px;">Status</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (filteredStudents.length === 0) {
        html += `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-user-graduate fa-2x mb-2 d-block"></i>
                        No students found for the selected class.
                    </div>
                </td>
            </tr>
        `;
    } else {
        filteredStudents.forEach((student, index) => {
            const isPresent = attendanceData[student.admissionNumber] !== false; // Default to true if not marked
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${student.photoUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2RlZTJmNSIgZD0iTTEyIDEyYzIuNzYgMCA1LTIuMjQgNS01cy0yLjI0LTUtNS01LTUgMi4yNC01IDUgMi4yNCA1IDUgNXptMCAyYy0yLjY3IDAtOCAxLjMzLTggNHYyaDE2di0yYzAtMi42Ny01LjMzLTQtOC00eiIvPjwvc3ZnPg=='}" 
                                 alt="${student.fullName || 'Student'}" 
                                 class="student-photo"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2RlZTJmNSIgZD0iTTEyIDEyYzIuNzYgMCA1LTIuMjQgNS01cy0yLjI0LTUtNS01LTUgMi4yNC01IDUgMi4yNCA1IDUgNXptMCAyYy0yLjY3IDAtOCAxLjMzLTggNHYyaDE2di0yYzAtMi42Ny01LjMzLTQtOC00eiIvPjwvc3ZnPg=='">
                            <div>
                                <div class="fw-medium">${student.fullName || 'N/A'}</div>
                                <small class="text-muted">${student.admissionNumber || ''}</small>
                            </div>
                        </div>
                    </td>
                    <td>${student.class || 'N/A'}</td>
                    <td>${student.parentName || 'N/A'}</td>
                    <td>${student.parentPhone || 'N/A'}</td>
                    <td class="text-center">
                        <div class="form-check form-switch d-inline-block">
                            <input class="form-check-input attendance-check" type="checkbox" 
                                   role="switch" 
                                   id="attendance-${student.admissionNumber}"
                                   data-admission="${student.admissionNumber}" 
                                   ${isPresent ? 'checked' : ''}
                                   ${isFutureDate ? 'disabled' : ''}>
                            <label class="form-check-label ms-2" for="attendance-${student.admissionNumber}">
                                ${isPresent ? 'Present' : 'Absent'}
                            </label>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                ${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} found
            </div>
            <div>
                <button id="markAllPresentBtn" class="btn btn-sm btn-outline-primary me-2">
                    <i class="fas fa-check-double me-1"></i> Mark All Present
                </button>
                <button id="markAllAbsentBtn" class="btn btn-sm btn-outline-danger">
                    <i class="fas fa-times me-1"></i> Mark All Absent
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.attendance-check').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.nextElementSibling;
            label.textContent = this.checked ? 'Present' : 'Absent';
        });
    });
    
    document.getElementById('markAllPresentBtn')?.addEventListener('click', () => {
        document.querySelectorAll('.attendance-check').forEach(checkbox => {
            checkbox.checked = true;
            const label = checkbox.nextElementSibling;
            label.textContent = 'Present';
        });
    });
    
    document.getElementById('markAllAbsentBtn')?.addEventListener('click', () => {
        document.querySelectorAll('.attendance-check').forEach(checkbox => {
            checkbox.checked = false;
            const label = checkbox.nextElementSibling;
            label.textContent = 'Absent';
        });
    });
    
    // Update save button state
    updateSaveButtonState(selectedDate);
}

// Update save button state based on date
function updateSaveButtonState(selectedDate) {
    const today = formatDate(new Date());
    const saveBtn = document.getElementById('saveAttendanceBtn');
    
    if (selectedDate > today) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-calendar-times me-1"></i> Cannot save future dates';
        saveBtn.className = 'btn btn-secondary w-100';
    } else {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Save Attendance';
        saveBtn.className = 'btn btn-primary w-100';
    }
}

// Save attendance handler
function saveAttendanceHandler(date) {
    const checkboxes = document.querySelectorAll('.attendance-check');
    const attendanceData = {};
    
    // Mark all as present by default, then unmark absent students
    const students = getStudents();
    students.forEach(student => {
        attendanceData[student.admissionNumber] = true;
    });
    
    // Mark absent students
    checkboxes.forEach(checkbox => {
        const admissionNumber = checkbox.dataset.admission;
        attendanceData[admissionNumber] = checkbox.checked;
    });
    
    saveAttendance(date, attendanceData);
}

// Show attendance statistics
function showAttendanceStats() {
    const students = getStudents();
    const allAttendance = JSON.parse(localStorage.getItem('attendance') || '{}');
    const selectedClass = document.getElementById('statClassFilter').value;
    const searchQuery = document.getElementById('statSearch').value.toLowerCase();
    
    // Filter students
    let filteredStudents = students;
    
    if (selectedClass !== 'all') {
        filteredStudents = filteredStudents.filter(student => student.class === selectedClass);
    }
    
    if (searchQuery) {
        filteredStudents = filteredStudents.filter(student => 
            (student.fullName && student.fullName.toLowerCase().includes(searchQuery)) ||
            (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchQuery))
        );
    }
    
    // Calculate statistics
    const stats = filteredStudents.map(student => {
        let presentDays = 0;
        let totalDays = 0;
        
        // Count present days
        Object.entries(allAttendance).forEach(([date, dailyAttendance]) => {
            // Skip future dates
            if (date > formatDate(new Date())) return;
            
            if (dailyAttendance[student.admissionNumber] !== false) {
                presentDays++;
            }
            totalDays++;
        });
        
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        return {
            admissionNumber: student.admissionNumber,
            name: student.fullName || 'N/A',
            class: student.class || 'N/A',
            presentDays,
            totalDays,
            attendanceRate
        };
    });
    
    // Sort by attendance rate (descending)
    stats.sort((a, b) => b.attendanceRate - a.attendanceRate);
    
    // Render statistics
    const container = document.getElementById('statisticsContent');
    if (!container) return;
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Present Days</th>
                        <th>Total Days</th>
                        <th>Attendance Rate</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    if (stats.length === 0) {
        html += `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-search fa-2x mb-2 d-block"></i>
                        No students match the selected filters.
                    </div>
                </td>
            </tr>
        `;
    } else {
        stats.forEach((stat, index) => {
            const progressClass = getAttendanceClass(stat.attendanceRate);
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${stat.name}</td>
                    <td>${stat.class}</td>
                    <td>${stat.presentDays}</td>
                    <td>${stat.totalDays}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1 me-2" style="height: 20px;">
                                <div class="progress-bar ${progressClass}" 
                                     role="progressbar" 
                                     style="width: ${stat.attendanceRate}%"
                                     aria-valuenow="${stat.attendanceRate}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                    ${stat.attendanceRate}%
                                </div>
                            </div>
                            <small class="text-muted">${stat.attendanceRate}%</small>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                Showing ${stats.length} student${stats.length !== 1 ? 's' : ''}
            </div>
            <button id="exportStatsBtn" class="btn btn-sm btn-outline-primary">
                <i class="fas fa-download me-1"></i> Export to Excel
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add export button handler
    document.getElementById('exportStatsBtn')?.addEventListener('click', exportStatsToExcel);
}

// Export statistics to Excel
function exportStatsToExcel() {
    // This is a simplified version - in a real app, you would use a library like SheetJS
    const statsTable = document.querySelector('#statisticsContent table');
    if (!statsTable) return;
    
    // Create a CSV string
    let csv = [];
    const rows = statsTable.querySelectorAll('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const row = [];
        const cols = rows[i].querySelectorAll('th, td');
        
        for (let j = 0; j < cols.length; j++) {
            // Skip the progress bar column
            if (j === 5) continue;
            
            // Get the text content, removing any extra whitespace
            let text = cols[j].textContent.trim();
            
            // Handle progress bar case
            if (j === 5) {
                const progressBar = cols[j].querySelector('.progress-bar');
                if (progressBar) {
                    text = progressBar.style.width;
                }
            }
            
            // Escape any commas and quotes
            text = text.replace(/"/g, '""');
            row.push('"' + text + '"');
        }
        
        csv.push(row.join(','));
    }
    
    // Create and trigger download
    const csvContent = 'data:text/csv;charset=utf-8,' + csv.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_stats_${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Get appropriate class for attendance rate
function getAttendanceClass(rate) {
    if (rate >= 90) return 'bg-success';
    if (rate >= 75) return 'bg-primary';
    if (rate >= 50) return 'bg-warning';
    return 'bg-danger';
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initAttendanceData();
    
    // Set default date to today
    const today = formatDate(new Date());
    const datePicker = document.getElementById('attendanceDate');
    
    if (datePicker) {
        datePicker.value = today;
        datePicker.max = today; // Prevent future dates
        
        // Load attendance when date changes
        datePicker.addEventListener('change', (e) => {
            loadAttendanceForDate(e.target.value);
        });
        
        // Load initial data
        loadAttendanceForDate(today);
    }
    
    // Get all students to populate class filters
    const students = getStudents();
    const classes = getClasses(students);
    
    // Populate class filters
    const classFilter = document.getElementById('classFilter');
    const statClassFilter = document.getElementById('statClassFilter');
    
    if (classFilter) {
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            statClassFilter?.appendChild(option.cloneNode(true));
            
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item';
            a.href = '#';
            a.textContent = className;
            a.dataset.class = className;
            li.appendChild(a);
            classFilter.querySelector('.dropdown-divider').before(li);
        });
        
        // Add class filter event listeners
        classFilter.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && e.target.dataset.class) {
                const selectedClass = e.target.dataset.class;
                document.querySelectorAll('#classFilter .dropdown-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.target.classList.add('active');
                document.querySelector('#classDropdown').innerHTML = 
                    `<i class="fas fa-users me-1"></i> ${selectedClass === 'all' ? 'All Classes' : selectedClass}`;
                
                loadAttendanceForDate(datePicker.value, selectedClass);
            }
        });
    }
    
    // Add event listeners for statistics filters
    if (statClassFilter) {
        statClassFilter.addEventListener('change', showAttendanceStats);
    }
    
    const statSearch = document.getElementById('statSearch');
    if (statSearch) {
        statSearch.addEventListener('input', showAttendanceStats);
    }
    
    // Add tab switching
    const markAttendanceTab = document.getElementById('markAttendanceTab');
    const viewStatsTab = document.getElementById('viewStatsTab');
    const attendanceSection = document.querySelector('.attendance-container');
    const statisticsSection = document.getElementById('statisticsSection');
    
    if (markAttendanceTab && viewStatsTab && attendanceSection && statisticsSection) {
        markAttendanceTab.addEventListener('click', (e) => {
            e.preventDefault();
            markAttendanceTab.classList.add('active');
            viewStatsTab.classList.remove('active');
            attendanceSection.style.display = 'block';
            statisticsSection.style.display = 'none';
        });
        
        viewStatsTab.addEventListener('click', (e) => {
            e.preventDefault();
            viewStatsTab.classList.add('active');
            markAttendanceTab.classList.remove('active');
            attendanceSection.style.display = 'none';
            statisticsSection.style.display = 'block';
            showAttendanceStats();
        });
    }
    
    // Add save button handler
    const saveBtn = document.getElementById('saveAttendanceBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (datePicker) {
                saveAttendanceHandler(datePicker.value);
            }
        });
    }
});

// Load attendance for a specific date and class
function loadAttendanceForDate(dateString, selectedClass = 'all') {
    const students = getStudents();
    renderStudentList(students, dateString, selectedClass);
}
