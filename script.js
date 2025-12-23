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
// No início do initApp(), após checkAuth():
function initApp() {
    checkAuth();
    
    // Mostrar status de conexão
    showConnectionStatus();
    
    renderEmployees();
    renderSchedule();
    renderSectorSchedule();
    updateWeekDisplay();
    updateSectorWeekDisplay();
    renderLegend();
    setupEventListeners();
    
    showNotification('Sistema carregado com sucesso!', 'success');
    
    disableProblematicSwipe();
}

// Adicione esta função:
function showConnectionStatus() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'connectionStatus';
    statusDiv.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        z-index: 100;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    if (db.isOnline) {
        statusDiv.innerHTML = '<i class="fas fa-wifi" style="color: #27ae60;"></i> Online';
        statusDiv.style.backgroundColor = '#27ae60';
        statusDiv.style.color = 'white';
    } else {
        statusDiv.innerHTML = '<i class="fas fa-wifi-slash" style="color: #e74c3c;"></i> Offline (usando dados locais)';
        statusDiv.style.backgroundColor = '#e74c3c';
        statusDiv.style.color = 'white';
    }
    
    document.body.appendChild(statusDiv);
}

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
        console.log('Modo visualização ativado');
    } else {
        console.log('Modo administrador ativado');
    }
}

function initApp() {
    console.log('Inicializando aplicação...');
    
    renderEmployees();
    renderSchedule();
    renderSectorSchedule();
    updateWeekDisplay();
    updateSectorWeekDisplay();
    renderLegend();
    setupEventListeners();
    
    showNotification('Sistema carregado com sucesso!', 'success');
    
    // Desativar swipe problemático
    disableProblematicSwipe();
    
    console.log('Aplicação inicializada');
}

function disableProblematicSwipe() {
    // Desativar eventos de swipe problemáticos
    document.addEventListener('touchstart', function(e) {
        // Marcar início, mas não fazer nada
        this.touchStart = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        if (!this.touchStart) return;
        
        const touchEnd = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY,
            time: Date.now()
        };
        
        const deltaX = Math.abs(touchEnd.x - this.touchStart.x);
        const deltaY = Math.abs(touchEnd.y - this.touchStart.y);
        const deltaTime = touchEnd.time - this.touchStart.time;
        
        // Só considerar swipe se for muito rápido e horizontal
        if (deltaTime < 300 && deltaX > 50 && deltaY < 30) {
            // Bloquear navegação por swipe
            e.preventDefault();
            e.stopPropagation();
        }
        
        this.touchStart = null;
    }, { passive: false });
}

function setupEventListeners() {
    console.log('Configurando eventos...');
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function() {
        sessionStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // Dropdown menu - CORRIGIDO
    const dropdownToggle = document.getElementById('dropdownToggle');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', function(e) {
            if (isViewMode) return;
            
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        // Fechar ao clicar fora
        document.addEventListener('click', function(e) {
            if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
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
        showNotification('Escala salva localmente!', 'success');
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

    // Imprimir - MELHORADO
    document.getElementById('printSchedule').addEventListener('click', function() {
        if (isViewMode) return;
        printSchedule();
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
                } else {
                    showNotification('Erro ao importar dados!', 'danger');
                }
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    });

    // Menu Gerenciar - CORRIGIDO E FUNCIONAL
    document.getElementById('addEmployeeBtn').addEventListener('click', openEmployeeModal);
    document.getElementById('removeEmployeeBtn').addEventListener('click', openRemoveEmployeeModal);
    document.getElementById('manageShiftsBtn').addEventListener('click', openShiftsModal);
    document.getElementById('manageSectorsBtn').addEventListener('click', openSectorsModal);

    // Modais - Fechar com botão X
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Modal de colaborador - Submit
    document.getElementById('employeeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveEmployee();
    });

    // Modal de remover colaborador
    document.getElementById('confirmRemove').addEventListener('click', removeEmployee);

    // Modal de turnos
    document.getElementById('addShiftBtn').addEventListener('click', addShift);

    // Modal de setores
    document.getElementById('addSectorBtn').addEventListener('click', addSector);

    // Modal de escala
    document.getElementById('saveShift').addEventListener('click', saveShift);

    // Modal de setor
    document.getElementById('saveSector').addEventListener('click', saveSector);

    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });

    // Fechar modais com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
            if (dropdownMenu) dropdownMenu.classList.remove('show');
        }
    });

    console.log('Eventos configurados com sucesso');
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
function openEmployeeModal() {
    if (isViewMode) return;
    
    document.getElementById('dropdownMenu').classList.remove('show');
    document.getElementById('employeeModal').style.display = 'flex';
    document.getElementById('employeeName').focus();
}

function saveEmployee() {
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
    document.getElementById('employeeModal').style.display = 'none';
    document.getElementById('employeeForm').reset();
    
    showNotification(`Colaborador ${name} adicionado!`, 'success');
}

function openRemoveEmployeeModal() {
    if (isViewMode) return;
    
    document.getElementById('dropdownMenu').classList.remove('show');
    
    const select = document.getElementById('employeeToRemove');
    const employees = database.getEmployees();
    
    select.innerHTML = '';
    employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = `${employee.name} - ${employee.role}`;
        select.appendChild(option);
    });
    
    document.getElementById('removeEmployeeModal').style.display = 'flex';
}

function removeEmployee() {
    const select = document.getElementById('employeeToRemove');
    const employeeId = parseInt(select.value);
    
    if (!employeeId) {
        showNotification('Selecione um colaborador!', 'warning');
        return;
    }
    
    const employee = database.getEmployees().find(e => e.id === employeeId);
    
    if (confirm(`Tem certeza que deseja remover ${employee.name}?`)) {
        database.removeEmployee(employeeId);
        
        renderEmployees();
        renderSchedule();
        renderSectorSchedule();
        document.getElementById('removeEmployeeModal').style.display = 'none';
        
        showNotification('Colaborador removido!', 'success');
    }
}

function openShiftsModal() {
    if (isViewMode) return;
    
    document.getElementById('dropdownMenu').classList.remove('show');
    renderExistingShifts();
    document.getElementById('shiftsModal').style.display = 'flex';
}

function renderExistingShifts() {
    const container = document.getElementById('existingShifts');
    const shifts = database.getShifts();
    
    container.innerHTML = '';
    
    if (shifts.length === 0) {
        container.innerHTML = '<p style="color: #999; font-style: italic; text-align: center; padding: 10px;">Nenhum turno cadastrado.</p>';
        return;
    }
    
    shifts.forEach(shift => {
        const item = document.createElement('div');
        item.className = 'existing-item';
        item.innerHTML = `
            <div>
                <strong>${shift.name}</strong><br>
                <small>${shift.time}</small>
            </div>
            ${shift.name !== 'Folga' ? `<button class="remove-item" data-id="${shift.id}"><i class="fas fa-trash"></i></button>` : ''}
        `;
        
        if (shift.name !== 'Folga') {
            const removeBtn = item.querySelector('.remove-item');
            removeBtn.addEventListener('click', () => {
                if (confirm(`Remover o turno "${shift.name}"?`)) {
                    database.removeShift(shift.id);
                    renderExistingShifts();
                    renderLegend();
                    renderSchedule();
                    showNotification('Turno removido!', 'success');
                }
            });
        }
        
        container.appendChild(item);
    });
}

function addShift() {
    const name = document.getElementById('newShiftName').value.trim();
    const time = document.getElementById('newShiftTime').value.trim();
    const color = document.getElementById('newShiftColor').value;
    
    if (!name || !time) {
        showNotification('Preencha nome e horário!', 'warning');
        return;
    }
    
    const newShift = { name, time, color };
    database.addShift(newShift);
    
    document.getElementById('newShiftName').value = '';
    document.getElementById('newShiftTime').value = '';
    
    renderExistingShifts();
    renderLegend();
    renderSchedule();
    
    showNotification(`Turno ${name} adicionado!`, 'success');
}

function openSectorsModal() {
    if (isViewMode) return;
    
    document.getElementById('dropdownMenu').classList.remove('show');
    renderExistingSectors();
    document.getElementById('sectorsModal').style.display = 'flex';
}

function renderExistingSectors() {
    const container = document.getElementById('existingSectors');
    const sectors = database.getSectors();
    
    container.innerHTML = '';
    
    if (sectors.length === 0) {
        container.innerHTML = '<p style="color: #999; font-style: italic; text-align: center; padding: 10px;">Nenhum setor cadastrado.</p>';
        return;
    }
    
    sectors.forEach(sector => {
        const item = document.createElement('div');
        item.className = 'existing-item';
        item.innerHTML = `
            <div><strong>${sector.name}</strong></div>
            <button class="remove-item" data-id="${sector.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        const removeBtn = item.querySelector('.remove-item');
        removeBtn.addEventListener('click', () => {
            if (confirm(`Remover o setor "${sector.name}"?`)) {
                database.removeSector(sector.id);
                renderExistingSectors();
                renderSectorSchedule();
                renderLegend();
                showNotification('Setor removido!', 'success');
            }
        });
        
        container.appendChild(item);
    });
}

function addSector() {
    const name = document.getElementById('newSectorName').value.trim();
    
    if (!name) {
        showNotification('Digite o nome do setor!', 'warning');
        return;
    }
    
    const newSector = { name };
    database.addSector(newSector);
    
    document.getElementById('newSectorName').value = '';
    
    renderExistingSectors();
    renderSectorSchedule();
    renderLegend();
    
    showNotification(`Setor ${name} adicionado!`, 'success');
}

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

function saveShift() {
    const selectedOption = document.querySelector('.shift-option.selected');
    if (!selectedOption) {
        showNotification('Selecione um turno!', 'warning');
        return;
    }
    
    const shiftId = parseInt(selectedOption.dataset.shift);
    const { employeeId, dayIndex } = currentEditing;
    const weekKey = database.getWeekKey(currentWeekStart);
    let schedule = database.getSchedule();
    
    if (!schedule[weekKey]) schedule[weekKey] = {};
    if (!schedule[weekKey][employeeId]) schedule[weekKey][employeeId] = {};
    
    schedule[weekKey][employeeId][dayIndex] = shiftId;
    database.saveSchedule(schedule);
    
    renderSchedule();
    document.getElementById('scheduleModal').style.display = 'none';
    
    showNotification('Escala definida!', 'success');
}

function openSectorModal(employeeId, dayIndex, employeeName, date) {
    if (isViewMode) return;
    
    currentEditing = { employeeId, dayIndex, type: 'sector' };
    
    const dayName = database.formatDayName(date);
    const dateStr = database.formatDate(date);
    
    document.getElementById('sectorInfo').textContent = 
        `Definir setor para ${employeeName} em ${dayName} (${dateStr})`;
    
    const sectorSelect = document.getElementById('sectorSelect');
    sectorSelect.innerHTML = '<option value="">-- Selecione um setor --</option>';
    
    const sectors = database.getSectors();
    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.id;
        option.textContent = sector.name;
        sectorSelect.appendChild(option);
    });
    
    const weekKey = database.getWeekKey(currentWeekStart);
    const schedule = database.getSectorSchedule();
    const currentSectorId = schedule[weekKey] && schedule[weekKey][employeeId] && schedule[weekKey][employeeId][dayIndex];
    
    if (currentSectorId) {
        sectorSelect.value = currentSectorId;
    }
    
    document.getElementById('sectorModal').style.display = 'flex';
}

function saveSector() {
    const sectorId = document.getElementById('sectorSelect').value;
    const { employeeId, dayIndex } = currentEditing;
    const weekKey = database.getWeekKey(currentWeekStart);
    let schedule = database.getSectorSchedule();
    
    if (!sectorId) {
        showNotification('Selecione um setor!', 'warning');
        return;
    }
    
    if (!schedule[weekKey]) schedule[weekKey] = {};
    if (!schedule[weekKey][employeeId]) schedule[weekKey][employeeId] = {};
    
    schedule[weekKey][employeeId][dayIndex] = parseInt(sectorId);
    database.saveSectorSchedule(schedule);
    
    renderSectorSchedule();
    document.getElementById('sectorModal').style.display = 'none';
    
    showNotification('Setor definido!', 'success');
}

// ========== IMPRESSÃO MELHORADA ==========
function printSchedule() {
    // Salvar estado atual
    const currentActiveTab = currentTab;
    
    // Criar janela de impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Escala de Trabalho</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; text-align: center; margin-bottom: 20px; }
                h2 { color: #3498db; margin-top: 30px; }
                .week-info { 
                    text-align: center; 
                    font-size: 1.2em; 
                    margin-bottom: 20px;
                    padding: 10px;
                    background-color: #f5f5f5;
                    border-radius: 5px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 30px;
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 10px; 
                    text-align: center;
                }
                th { 
                    background-color: #2c3e50; 
                    color: white;
                    font-weight: bold;
                }
                td:first-child { 
                    font-weight: bold; 
                    background-color: #f9f9f9;
                }
                .shift-label { font-weight: bold; }
                .shift-time { font-size: 0.9em; color: #555; }
                .page-break { page-break-after: always; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
    `);
    
    // Adicionar data/hora
    const now = new Date();
    printWindow.document.write(`
        <div class="no-print" style="text-align: right; margin-bottom: 20px; font-size: 0.9em; color: #666;">
            Gerado em: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}
        </div>
    `);
    
    // ESCALA DE TURNOS
    printWindow.document.write('<h1>ESCALA DE TURNOS</h1>');
    printWindow.document.write(`<div class="week-info">${document.getElementById('weekDisplay').textContent}</div>`);
    
    const scheduleTable = document.getElementById('scheduleTable').cloneNode(true);
    // Remover eventos e limpar células vazias
    scheduleTable.querySelectorAll('td').forEach(td => {
        if (td.innerHTML.includes('Clique para definir') || td.innerHTML.includes('Não definido')) {
            td.innerHTML = '';
        }
    });
    printWindow.document.write(scheduleTable.outerHTML);
    
    // Adicionar quebra de página
    printWindow.document.write('<div class="page-break"></div>');
    
    // ESCALA DE SETORES
    printWindow.document.write('<h1>ESCALA DE SETORES</h1>');
    printWindow.document.write(`<div class="week-info">${document.getElementById('weekDisplaySector').textContent}</div>`);
    
    const sectorTable = document.getElementById('sectorTable').cloneNode(true);
    // Remover eventos e limpar células vazias
    sectorTable.querySelectorAll('td').forEach(td => {
        if (td.innerHTML.includes('Clique para definir') || td.innerHTML.includes('Não definido')) {
            td.innerHTML = '';
        }
    });
    printWindow.document.write(sectorTable.outerHTML);
    
    // Legenda
    printWindow.document.write('<h2>Legenda</h2>');
    
    const shifts = database.getShifts();
    printWindow.document.write('<h3>Turnos:</h3><ul>');
    shifts.forEach(shift => {
        printWindow.document.write(`<li><strong>${shift.name}:</strong> ${shift.time}</li>`);
    });
    printWindow.document.write('</ul>');
    
    const sectors = database.getSectors();
    printWindow.document.write('<h3>Setores:</h3><ul>');
    sectors.forEach(sector => {
        printWindow.document.write(`<li>${sector.name}</li>`);
    });
    printWindow.document.write('</ul>');
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // Imprimir após carregar
    printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
    };
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
// ========== SISTEMA DE MONITORAMENTO FIREBASE ==========
function setupFirebaseMonitoring() {
    // Botão flutuante para abrir painel de status
    const floatingBtn = document.getElementById('floatingStatusBtn');
    const statusPanel = document.getElementById('statusPanel');
    const closeBtn = document.querySelector('.btn-close-status');
    
    if (floatingBtn && statusPanel) {
        floatingBtn.addEventListener('click', () => {
            statusPanel.classList.toggle('show');
            db.updateLogsUI();
            db.updateStatusUI();
        });
        
        closeBtn.addEventListener('click', () => {
            statusPanel.classList.remove('show');
        });
        
        // Botões do painel
        document.getElementById('refreshStatus')?.addEventListener('click', () => {
            db.updateStatusUI();
            db.log('Status atualizado manualmente', 'info');
        });
        
        document.getElementById('clearLogs')?.addEventListener('click', () => {
            db.logs = [];
            db.updateLogsUI();
            db.log('Logs limpos', 'info');
        });
        
        document.getElementById('forceSync')?.addEventListener('click', () => {
            db.forceSyncAll();
        });
        
        // Teste de conexão automático a cada 30 segundos
        setInterval(() => {
            if (db.isOnline) {
                floatingBtn.classList.add('pulse');
                setTimeout(() => floatingBtn.classList.remove('pulse'), 1000);
            }
        }, 30000);
    }
}

// ========== TESTE RÁPIDO DE FIREBASE ==========
async function testFirebaseConnection() {
    const result = await db.testConnection();
    
    if (result) {
        // Mostrar informações detalhadas no console
        console.group('🔥 FIREBASE CONFIGURAÇÃO');
        console.log('✅ Conexão estabelecida com sucesso!');
        console.log('📊 Projeto:', db.firebaseConfig.projectId);
        console.log('🌐 Domínio:', db.firebaseConfig.authDomain);
        console.log('🔄 Status:', db.isOnline ? 'Online' : 'Offline');
        console.log('📁 Coleções disponíveis:');
        
        // Listar coleções (opcional)
        try {
            const collections = await db.db.listCollections();
            console.log('   - employees');
            console.log('   - shifts'); 
            console.log('   - sectors');
            console.log('   - schedule');
            console.log('   - sectorSchedule');
            console.log(`   Total: ${collections.length} coleções`);
        } catch (e) {
            console.log('   Não foi possível listar coleções');
        }
        
        console.groupEnd();
        
        // Mostrar toast de sucesso
        showNotification('✅ Firebase conectado com sucesso!', 'success');
        
    } else {
        console.error('❌ Falha na conexão com Firebase');
        showNotification('❌ Erro na conexão com Firebase', 'danger');
    }
}

// No initApp(), adicione:
function initApp() {
    checkAuth();
    
    renderEmployees();
    renderSchedule();
    renderSectorSchedule();
    updateWeekDisplay();
    updateSectorWeekDisplay();
    renderLegend();
    setupEventListeners();
    
    // Inicializar monitoramento Firebase
    setupFirebaseMonitoring();
    
    // Testar conexão após 2 segundos
    setTimeout(() => {
        if (!db.isViewMode) {
            testFirebaseConnection();
        }
    }, 2000);
    
    showNotification('Sistema carregado!', 'success');
    disableProblematicSwipe();
}

console.log('Script carregado com sucesso!');