// Sistema principal do dashboard
const database = db;
let currentWeekStart = database.getWeekStartDate(new Date());
let currentTab = 'scale';
let currentEditing = { employeeId: null, dayIndex: null, type: null };
let isViewMode = false;

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initApp();
});

function checkAuth() {
    const userData = sessionStorage.getItem('user');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    
    const user = JSON.parse(userData);
    isViewMode = user.type === 'view';
    
    // Atualizar interface com informações do usuário
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userType').textContent = 
        user.type === 'admin' ? 'Administrador' : 'Visualização';
    
    // Aplicar modo de visualização se necessário
    if (isViewMode) {
        document.body.classList.add('view-mode');
    }
}

function initApp() {
    renderEmployees();
    renderSchedule();
    renderSectorSchedule();
    updateWeekDisplay();
    updateSectorWeekDisplay();
    renderLegend();
    setupEventListeners();
    createModals();
    
    showNotification('Sistema carregado!', 'success');
    
    // Desativar swipe no container da tabela
    disableSwipeNavigation();
}

function disableSwipeNavigation() {
    const scrollContainer = document.getElementById('scrollContainer');
    if (scrollContainer) {
        scrollContainer.addEventListener('touchmove', function(e) {
            // Permitir apenas scroll vertical/horizontal, não swipe para mudar semana
            e.stopPropagation();
        }, { passive: false });
        
        // Desativar gestos de swipe na tabela
        scrollContainer.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                // Marcar início do toque, mas não fazer nada
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });
        
        scrollContainer.addEventListener('touchend', function(e) {
            if (this.touchStartX && this.touchStartY && e.changedTouches.length === 1) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                
                const deltaX = Math.abs(touchEndX - this.touchStartX);
                const deltaY = Math.abs(touchEndY - this.touchStartY);
                
                // Só considerar como swipe se for horizontal e longo o suficiente
                // E o movimento vertical for pequeno (não é scroll)
                if (deltaX > 100 && deltaY < 50) {
                    // Ignorar swipe na tabela
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            
            this.touchStartX = null;
            this.touchStartY = null;
        }, { passive: false });
    }
}

function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        sessionStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            if (isViewMode) return;
            
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            currentTab = this.dataset.tab;
            document.getElementById(`${currentTab}-tab`).classList.add('active');
        });
    });

    // Navegação entre semanas - Escala
    document.getElementById('prevWeek').addEventListener('click', () => {
        if (isViewMode) return;
        navigateWeek(-7);
    });
    
    document.getElementById('nextWeek').addEventListener('click', () => {
        if (isViewMode) return;
        navigateWeek(7);
    });
    
    document.getElementById('todayBtn').addEventListener('click', goToToday);
    document.getElementById('copyPrevWeek').addEventListener('click', copyPreviousWeek);
    document.getElementById('saveSchedule').addEventListener('click', () => {
        showNotification('Escala salva!', 'success');
    });

    // Navegação entre semanas - Setores
    document.getElementById('prevWeekSector').addEventListener('click', () => {
        if (isViewMode) return;
        navigateSectorWeek(-7);
    });
    
    document.getElementById('nextWeekSector').addEventListener('click', () => {
        if (isViewMode) return;
        navigateSectorWeek(7);
    });
    
    document.getElementById('saveSectorSchedule').addEventListener('click', () => {
        showNotification('Escala de setores salva!', 'success');
    });

    // Imprimir
    document.getElementById('printSchedule').addEventListener('click', () => {
        window.print();
    });

    // Exportar/Importar
    document.getElementById('exportBtn').addEventListener('click', () => {
        if (isViewMode) return;
        database.exportData();
        showNotification('Dados exportados!', 'success');
    });

    document.getElementById('importBtn').addEventListener('click', () => {
        if (isViewMode) return;
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', function(e) {
        if (isViewMode) return;
        
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            if (confirm('Importar dados? Os dados atuais serão substituídos.')) {
                const success = database.importData(event.target.result);
                if (success) {
                    location.reload();
                    showNotification('Dados importados com sucesso!', 'success');
                } else {
                    showNotification('Erro ao importar dados!', 'danger');
                }
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    });

    // Menu dropdown para mobile - corrigido
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', function(e) {
            if (isViewMode) return;
            
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();
                const isVisible = dropdownMenu.style.display === 'block';
                dropdownMenu.style.display = isVisible ? 'none' : 'block';
                
                // Reposicionar se estiver saindo da tela
                setTimeout(() => {
                    const rect = dropdownMenu.getBoundingClientRect();
                    if (rect.right > window.innerWidth) {
                        dropdownMenu.style.left = 'auto';
                        dropdownMenu.style.right = '0';
                    }
                }, 10);
            }
        });
        
        // Fechar ao clicar fora
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && !dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.style.display = 'none';
            }
        });
        
        // Fechar ao rolar (mobile)
        window.addEventListener('scroll', function() {
            if (window.innerWidth <= 768) {
                dropdownMenu.style.display = 'none';
            }
        }, true);
    }
}

function createModals() {
    // Criar todos os modais dinamicamente
    createEmployeeModal();
    createRemoveEmployeeModal();
    createShiftsModal();
    createSectorsModal();
    createScheduleModal();
    createSectorModal();
    
    // Vincular eventos dos modais
    bindModalEvents();
}

function bindModalEvents() {
    if (isViewMode) return;
    
    // Modal de colaborador
    document.getElementById('addEmployeeBtn').addEventListener('click', openEmployeeModal);
    
    // Modal de remover colaborador
    document.getElementById('removeEmployeeBtn').addEventListener('click', openRemoveEmployeeModal);
    
    // Modal de turnos
    document.getElementById('manageShiftsBtn').addEventListener('click', openShiftsModal);
    
    // Modal de setores
    document.getElementById('manageSectorsBtn').addEventListener('click', openSectorsModal);
}

// ========== FUNÇÕES DE RENDERIZAÇÃO ==========
function renderEmployees() {
    const employees = database.getEmployees();
    const employeesList = document.getElementById('employeesList');
    
    if (employees.length === 0) {
        employeesList.innerHTML = '<p style="color: #999; font-style: italic; text-align: center; padding: 20px;">Nenhum colaborador cadastrado.</p>';
        return;
    }
    
    employeesList.innerHTML = '';
    
    employees.forEach(employee => {
        const employeeCard = document.createElement('div');
        employeeCard.className = 'employee-card';
        
        const initials = employee.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        employeeCard.innerHTML = `
            <div class="employee-avatar">${initials.substring(0, 2)}</div>
            <div class="employee-info">
                <h4>${employee.name}</h4>
                <p>${employee.role}</p>
            </div>
        `;
        
        employeesList.appendChild(employeeCard);
    });
}

function renderSchedule() {
    const employees = database.getEmployees();
    const schedule = database.getSchedule();
    const scheduleBody = document.getElementById('scheduleBody');
    const scheduleHeader = document.getElementById('scheduleHeader');
    
    scheduleBody.innerHTML = '';
    
    const weekDates = database.getWeekDates(currentWeekStart);
    const weekKey = database.getWeekKey(currentWeekStart);
    
    let headerHTML = '<th>Colaborador</th>';
    weekDates.forEach((date, index) => {
        const dayName = database.formatDayName(date);
        const dateStr = database.formatDate(date);
        headerHTML += `<th>${dayName}<br><span class="day-date">${dateStr}</span></th>`;
    });
    scheduleHeader.innerHTML = headerHTML;
    
    if (!schedule[weekKey]) {
        schedule[weekKey] = {};
        database.saveSchedule(schedule);
    }
    
    employees.forEach(employee => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = employee.name;
        row.appendChild(nameCell);
        
        weekDates.forEach((date, dayIndex) => {
            const dayCell = document.createElement('td');
            dayCell.className = 'shift-cell';
            
            if (!isViewMode) {
                dayCell.style.cursor = 'pointer';
            }
            
            const employeeSchedule = schedule[weekKey][employee.id] || {};
            const shiftId = employeeSchedule[dayIndex];
            
            if (shiftId) {
                const shift = database.getShifts().find(s => s.id === shiftId);
                if (shift) {
                    dayCell.innerHTML = `
                        <div class="shift-label">${shift.name}</div>
                        <div class="shift-time">${shift.time}</div>
                    `;
                    dayCell.style.borderLeft = `4px solid ${shift.color}`;
                    dayCell.style.backgroundColor = `${shift.color}20`;
                }
            } else {
                dayCell.innerHTML = '<div style="color: #aaa; font-style: italic; font-size: 0.8rem;">' + 
                    (isViewMode ? 'Não definido' : 'Clique para definir') + '</div>';
            }
            
            if (!isViewMode) {
                dayCell.addEventListener('click', () => openScheduleModal(employee.id, dayIndex, employee.name, date));
            }
            
            row.appendChild(dayCell);
        });
        
        scheduleBody.appendChild(row);
    });
}

function renderSectorSchedule() {
    const employees = database.getEmployees();
    const schedule = database.getSectorSchedule();
    const sectorBody = document.getElementById('sectorBody');
    const sectorHeader = document.getElementById('sectorHeader');
    
    sectorBody.innerHTML = '';
    
    const weekDates = database.getWeekDates(currentWeekStart);
    const weekKey = database.getWeekKey(currentWeekStart);
    
    let headerHTML = '<th>Colaborador</th>';
    weekDates.forEach((date, index) => {
        const dayName = database.formatDayName(date);
        const dateStr = database.formatDate(date);
        headerHTML += `<th>${dayName}<br><span class="day-date">${dateStr}</span></th>`;
    });
    sectorHeader.innerHTML = headerHTML;
    
    if (!schedule[weekKey]) {
        schedule[weekKey] = {};
        database.saveSectorSchedule(schedule);
    }
    
    employees.forEach(employee => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = employee.name;
        row.appendChild(nameCell);
        
        weekDates.forEach((date, dayIndex) => {
            const dayCell = document.createElement('td');
            dayCell.className = 'sector-cell';
            
            if (!isViewMode) {
                dayCell.style.cursor = 'pointer';
            }
            
            const employeeSchedule = schedule[weekKey][employee.id] || {};
            const sectorId = employeeSchedule[dayIndex];
            
            if (sectorId) {
                const sector = database.getSectors().find(s => s.id === sectorId);
                if (sector) {
                    const sectorColor = database.getSectorColor(sectorId);
                    dayCell.innerHTML = `<div class="shift-label">${sector.name}</div>`;
                    dayCell.style.backgroundColor = `${sectorColor}20`;
                    dayCell.style.borderLeft = `4px solid ${sectorColor}`;
                }
            } else {
                dayCell.innerHTML = '<div style="color: #aaa; font-style: italic; font-size: 0.8rem;">' + 
                    (isViewMode ? 'Não definido' : 'Clique para definir') + '</div>';
            }
            
            if (!isViewMode) {
                dayCell.addEventListener('click', () => openSectorModal(employee.id, dayIndex, employee.name, date));
            }
            
            row.appendChild(dayCell);
        });
        
        sectorBody.appendChild(row);
    });
}

function renderLegend() {
    const shifts = database.getShifts();
    const sectors = database.getSectors();
    const legendContent = document.getElementById('legendContent');
    
    let legendHTML = '<h4 style="margin-bottom: 10px; color: #666;">Turnos:</h4>';
    
    shifts.forEach(shift => {
        if (shift.name !== 'Folga') {
            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="border-left-color: ${shift.color}; background-color: ${shift.color}20"></div>
                    <div>
                        <strong>${shift.name}</strong><br>
                        <small>${shift.time}</small>
                    </div>
                </div>
            `;
        }
    });
    
    const folga = shifts.find(s => s.name === 'Folga');
    if (folga) {
        legendHTML += `
            <div class="legend-item">
                <div class="legend-color" style="border-left-color: ${folga.color}; background-color: ${folga.color}20"></div>
                <div>
                    <strong>${folga.name}</strong><br>
                    <small>${folga.time}</small>
                </div>
            </div>
        `;
    }
    
    legendHTML += '<h4 style="margin: 15px 0 10px 0; color: #666;">Setores:</h4>';
    
    sectors.forEach(sector => {
        const sectorColor = database.getSectorColor(sector.id);
        legendHTML += `
            <div class="legend-item">
                <div class="legend-color" style="border-left-color: ${sectorColor}; background-color: ${sectorColor}20"></div>
                <div>
                    <strong>${sector.name}</strong>
                </div>
            </div>
        `;
    });
    
    legendContent.innerHTML = legendHTML;
}

// ========== FUNÇÕES DE NAVEGAÇÃO ==========
function updateWeekDisplay() {
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekStartStr = database.formatDate(weekStart);
    const weekEndStr = database.formatDate(weekEnd);
    
    document.getElementById('weekDisplay').textContent = 
        `Semana: ${weekStartStr} a ${weekEndStr}`;
}

function updateSectorWeekDisplay() {
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekStartStr = database.formatDate(weekStart);
    const weekEndStr = database.formatDate(weekEnd);
    
    document.getElementById('weekDisplaySector').textContent = 
        `Semana: ${weekStartStr} a ${weekEndStr}`;
}

function navigateWeek(days) {
    currentWeekStart.setDate(currentWeekStart.getDate() + days);
    updateWeekDisplay();
    renderSchedule();
}

function navigateSectorWeek(days) {
    currentWeekStart.setDate(currentWeekStart.getDate() + days);
    updateSectorWeekDisplay();
    renderSectorSchedule();
}

function goToToday() {
    currentWeekStart = database.getWeekStartDate(new Date());
    updateWeekDisplay();
    updateSectorWeekDisplay();
    renderSchedule();
    renderSectorSchedule();
}

function copyPreviousWeek() {
    if (isViewMode) return;
    
    const currentWeekKey = database.getWeekKey(currentWeekStart);
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    const prevWeekKey = database.getWeekKey(prevWeek);
    
    const schedule = database.getSchedule();
    
    if (schedule[prevWeekKey]) {
        schedule[currentWeekKey] = JSON.parse(JSON.stringify(schedule[prevWeekKey]));
        database.saveSchedule(schedule);
        renderSchedule();
        showNotification('Escala copiada!', 'success');
    } else {
        showNotification('Não há escala na semana anterior.', 'warning');
    }
}

// ========== FUNÇÕES DOS MODAIS ==========
// (As funções dos modais são similares às anteriores, mas com verificações de view-mode)

function createEmployeeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'employeeModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Adicionar Colaborador</h3>
                <button class="close-modal">&times;</button>
            </div>
            <form id="employeeForm">
                <div class="form-group">
                    <label for="employeeName">Nome do Colaborador *</label>
                    <input type="text" id="employeeName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="employeeRole">Cargo/Função *</label>
                    <input type="text" id="employeeRole" class="form-control" required>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        <i class="fas fa-save"></i> Salvar Colaborador
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.querySelector('#employeeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('employeeName').value.trim();
        const role = document.getElementById('employeeRole').value.trim();
        
        if (!name || !role) {
            showNotification('Preencha todos os campos!', 'warning');
            return;
        }
        
        const newEmployee = { name, role };
        database.addEmployee(newEmployee);
        
        renderEmployees();
        renderSchedule();
        renderSectorSchedule();
        modal.style.display = 'none';
        this.reset();
        
        showNotification(`Colaborador ${name} adicionado!`, 'success');
    });
}

function openEmployeeModal() {
    if (isViewMode) return;
    document.getElementById('employeeModal').style.display = 'flex';
    document.getElementById('employeeName').focus();
}

// ... (outras funções de modal similares, com verificação de isViewMode)

function openScheduleModal(employeeId, dayIndex, employeeName, date) {
    if (isViewMode) return;
    
    currentEditing = { employeeId, dayIndex, type: 'shift' };
    
    const dayName = database.formatDayName(date);
    const dateStr = database.formatDate(date);
    
    document.getElementById('scheduleInfo').textContent = 
        `Definir turno para ${employeeName} em ${dayName} (${dateStr})`;
    
    const shiftOptions = document.getElementById('shiftOptions');
    shiftOptions.innerHTML = '';
    
    const shifts = database.getShifts();
    shifts.forEach(shift => {
        const option = document.createElement('div');
        option.className = 'shift-option';
        option.dataset.shift = shift.id;
        option.innerHTML = `
            <div class="shift-label">${shift.name}</div>
            <div class="shift-time">${shift.time}</div>
        `;
        option.style.borderLeft = `4px solid ${shift.color}`;
        option.style.backgroundColor = `${shift.color}20`;
        option.addEventListener('click', function() {
            document.querySelectorAll('.shift-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
        shiftOptions.appendChild(option);
    });
    
    const weekKey = database.getWeekKey(currentWeekStart);
    const schedule = database.getSchedule();
    const currentShiftId = schedule[weekKey] && schedule[weekKey][employeeId] && schedule[weekKey][employeeId][dayIndex];
    
    if (currentShiftId) {
        const currentOption = document.querySelector(`.shift-option[data-shift="${currentShiftId}"]`);
        if (currentOption) currentOption.classList.add('selected');
    }
    
    document.getElementById('scheduleModal').style.display = 'flex';
}

// ========== NOTIFICAÇÕES ==========
function showNotification(message, type) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    if (type === 'success') {
        notification.style.backgroundColor = 'var(--success-color)';
    } else if (type === 'warning') {
        notification.style.backgroundColor = 'var(--warning-color)';
    } else if (type === 'danger') {
        notification.style.backgroundColor = 'var(--danger-color)';
    } else {
        notification.style.backgroundColor = 'var(--primary-color)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Fechar modais ao tocar fora
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Fechar modais com ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

console.log('Dashboard inicializado com sucesso!');