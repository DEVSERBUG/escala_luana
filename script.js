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
        document.body.classList.add('view-mode', 'view-mode-simple');
        console.log('Modo visualização ativado');
    } else {
        console.log('Modo administrador ativado');
    }
}

function initApp() {
    console.log('Inicializando aplicação...');
    
    // Inicializar Supabase
    if (typeof initSupabase === 'function') {
        initSupabase();
    }
    
    renderEmployees();
    renderSchedule();
    renderLegend();
    updateWeekDisplay();
    setupEventListeners();
    
    // Esconder aba de setores no modo visualização
    if (isViewMode) {
        document.querySelector('.tab-btn[data-tab="sector"]').style.display = 'none';
        document.querySelector('.tab-btn[data-tab="scale"]').click();
    }
    
    showNotification('Sistema carregado com sucesso!', 'success');
    
    // Desativar swipe problemático
    disableProblematicSwipe();
    
    console.log('Aplicação inicializada');
    
    // ⚠️ REMOVA QUALQUER location.reload() ou setInterval com location.reload()!
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

    // Dropdown menu
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
        showNotification('Escala salva!', 'success');
    });

    // Navegação entre semanas - Setores (mantido para compatibilidade)
    document.getElementById('prevWeekSector')?.addEventListener('click', () => {
        if (isViewMode) return;
        navigateWeek(-7);
    });
    
    document.getElementById('nextWeekSector')?.addEventListener('click', () => {
        if (isViewMode) return;
        navigateWeek(7);
    });
    
    document.getElementById('saveSectorSchedule')?.addEventListener('click', () => {
        showNotification('Escala salva!', 'success');
    });

    // Imprimir - NOVA FUNÇÃO
    document.getElementById('printSchedule').addEventListener('click', function() {
        if (isViewMode) return;
        printOptimizedSchedule();
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
                } else {
                    showNotification('Erro ao importar dados!', 'danger');
                }
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    });

    // Menu Gerenciar
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

    // Modal de escala unificada
    document.getElementById('saveShift').addEventListener('click', saveUnifiedSchedule);

    // Modal de setor (antigo, mantido para compatibilidade)
    document.getElementById('saveSector')?.addEventListener('click', saveSector);

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
        
        const initials = employee.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        employeeCard.innerHTML = `
            <div class="employee-avatar">${initials}</div>
            <div class="employee-info">
                <h4>${employee.name}</h4>
                <p>${employee.role}</p>
            </div>
        `;
        
        employeesList.appendChild(employeeCard);
    });
}

// FUNÇÃO RENDERIZAÇÃO UNIFICADA - Turno + Setor
function renderSchedule() {
    const employees = database.getEmployees();
    const schedule = database.getSchedule();
    const sectorSchedule = database.getSectorSchedule();
    const scheduleBody = document.getElementById('scheduleBody');
    const scheduleHeader = document.getElementById('scheduleHeader');
    
    scheduleBody.innerHTML = '';
    
    const weekDates = database.getWeekDates(currentWeekStart);
    const weekKey = database.getWeekKey(currentWeekStart);
    
    // Cabeçalho da tabela
    let headerHTML = '<th>Colaborador</th>';
    weekDates.forEach((date, index) => {
        const dayName = database.formatDayName(date);
        const dateStr = database.formatDate(date);
        headerHTML += `
            <th>
                ${dayName}<br>
                <span class="day-date">${dateStr}</span>
            </th>`;
    });
    scheduleHeader.innerHTML = headerHTML;
    
    // Garantir que exista a estrutura para esta semana
    if (!schedule[weekKey]) {
        schedule[weekKey] = {};
        database.saveSchedule(schedule);
    }
    
    if (!sectorSchedule[weekKey]) {
        sectorSchedule[weekKey] = {};
        database.saveSectorSchedule(sectorSchedule);
    }
    
    // Renderizar cada colaborador
    employees.forEach(employee => {
        const row = document.createElement('tr');
        
        // Célula do nome do colaborador
        const nameCell = document.createElement('td');
        nameCell.className = 'employee-name-cell';
        nameCell.innerHTML = `
            <strong>${employee.name}</strong><br>
            <small>${employee.role}</small>
        `;
        row.appendChild(nameCell);
        
        // Células para cada dia da semana
        weekDates.forEach((date, dayIndex) => {
            const dayCell = document.createElement('td');
            dayCell.className = 'shift-cell unified-cell';
            
            if (!isViewMode) {
                dayCell.style.cursor = 'pointer';
                dayCell.title = 'Clique para editar turno e setor';
            }
            
            // Obter dados do turno
            const employeeSchedule = schedule[weekKey][employee.id] || {};
            const shiftId = employeeSchedule[dayIndex];
            
            // Obter dados do setor
            const employeeSectorSchedule = sectorSchedule[weekKey][employee.id] || {};
            const sectorId = employeeSectorSchedule[dayIndex];
            
            if (shiftId) {
                const shift = database.getShifts().find(s => s.id === shiftId);
                const sector = sectorId ? database.getSectors().find(s => s.id === sectorId) : null;
                
                if (shift) {
                    const sectorColor = sector ? database.getSectorColor(sector.id) : '#cccccc';
                    const sectorIcon = sector ? `<i class="fas fa-store" style="color: ${sectorColor}; margin-right: 3px;"></i>` : '';
                    
                    dayCell.innerHTML = `
                        <div class="shift-label" style="color: ${shift.color}">${shift.name}</div>
                        <div class="shift-time">${shift.time}</div>
                        ${sector ? `
                            <div class="sector-info" style="color: ${sectorColor}; font-size: 0.8rem; margin-top: 3px;">
                                ${sectorIcon}${sector.name}
                            </div>
                        ` : '<div class="sector-info" style="color: #999; font-size: 0.75rem; margin-top: 3px;">Sem setor</div>'}
                    `;
                    dayCell.style.borderLeft = `4px solid ${shift.color}`;
                    dayCell.style.backgroundColor = `${shift.color}15`;
                }
            } else {
                dayCell.innerHTML = `
                    <div style="color: #aaa; font-style: italic; font-size: 0.8rem;">
                        ${isViewMode ? 'Não definido' : 'Clique para definir'}
                    </div>
                `;
                dayCell.style.backgroundColor = '#f9f9f9';
            }
            
            // Adicionar evento de clique apenas no modo administrador
            if (!isViewMode) {
                dayCell.addEventListener('click', () => openUnifiedModal(employee.id, dayIndex, employee.name, date));
            }
            
            row.appendChild(dayCell);
        });
        
        scheduleBody.appendChild(row);
    });
}

function renderLegend() {
    const shifts = database.getShifts();
    const sectors = database.getSectors();
    const legendContent = document.getElementById('legendContent');
    
    let legendHTML = '<h4 style="margin-bottom: 10px; color: #666;">Turnos:</h4>';
    
    shifts.forEach(shift => {
        legendHTML += `
            <div class="legend-item">
                <div class="legend-color" style="border-left-color: ${shift.color}; background-color: ${shift.color}20"></div>
                <div>
                    <strong>${shift.name}</strong><br>
                    <small>${shift.time}</small>
                </div>
            </div>
        `;
    });
    
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
    
    // Atualizar também o display da aba de setores (se existir)
    const sectorDisplay = document.getElementById('weekDisplaySector');
    if (sectorDisplay) {
        sectorDisplay.textContent = `Semana: ${weekStartStr} a ${weekEndStr}`;
    }
}

function navigateWeek(days) {
    currentWeekStart.setDate(currentWeekStart.getDate() + days);
    updateWeekDisplay();
    renderSchedule();
}

function goToToday() {
    currentWeekStart = database.getWeekStartDate(new Date());
    updateWeekDisplay();
    renderSchedule();
}

function copyPreviousWeek() {
    if (isViewMode) return;
    
    const currentWeekKey = database.getWeekKey(currentWeekStart);
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    const prevWeekKey = database.getWeekKey(prevWeek);
    
    const schedule = database.getSchedule();
    const sectorSchedule = database.getSectorSchedule();
    
    if (schedule[prevWeekKey]) {
        schedule[currentWeekKey] = JSON.parse(JSON.stringify(schedule[prevWeekKey]));
        database.saveSchedule(schedule);
        
        if (sectorSchedule[prevWeekKey]) {
            sectorSchedule[currentWeekKey] = JSON.parse(JSON.stringify(sectorSchedule[prevWeekKey]));
            database.saveSectorSchedule(sectorSchedule);
        }
        
        renderSchedule();
        showNotification('Escala copiada da semana anterior!', 'success');
    } else {
        showNotification('Não há escala na semana anterior.', 'warning');
    }
}

// ========== MODAL UNIFICADO ==========
function openUnifiedModal(employeeId, dayIndex, employeeName, date) {
    if (isViewMode) return;
    
    currentEditing = { employeeId, dayIndex };
    
    const dayName = database.formatDayName(date);
    const dateStr = database.formatDate(date);
    
    // Configurar modal
    const modal = document.getElementById('scheduleModal');
    document.getElementById('scheduleModalTitle').textContent = `Definir Escala`;
    document.getElementById('scheduleInfo').innerHTML = `
        <strong>${employeeName}</strong><br>
        ${dayName} (${dateStr})
    `;
    
    const shiftOptions = document.getElementById('shiftOptions');
    shiftOptions.innerHTML = '';
    
    // Adicionar opção "Sem turno"
    const emptyOption = document.createElement('div');
    emptyOption.className = 'shift-option';
    emptyOption.dataset.shift = '0';
    emptyOption.innerHTML = `
        <div class="shift-label" style="color: #999;">Sem turno</div>
        <div class="shift-time" style="color: #999;">---</div>
    `;
    emptyOption.style.borderLeft = '4px solid #ddd';
    emptyOption.style.backgroundColor = '#f9f9f9';
    emptyOption.addEventListener('click', function() {
        document.querySelectorAll('.shift-option').forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('sectorSelect').disabled = true;
        document.getElementById('sectorSelect').value = '';
    });
    shiftOptions.appendChild(emptyOption);
    
    // Opções de turnos
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
            document.getElementById('sectorSelect').disabled = false;
        });
        shiftOptions.appendChild(option);
    });
    
    // Seletor de setores (criar dinamicamente)
    let sectorContainer = document.querySelector('#sectorSelectContainer');
    if (!sectorContainer) {
        sectorContainer = document.createElement('div');
        sectorContainer.id = 'sectorSelectContainer';
        sectorContainer.className = 'form-group';
        sectorContainer.style.marginTop = '20px';
        sectorContainer.innerHTML = `
            <label for="sectorSelect">Setor:</label>
            <select id="sectorSelect" class="form-control">
                <option value="">-- Selecione um setor --</option>
                <option value="0">Sem setor</option>
            </select>
        `;
        shiftOptions.parentNode.insertBefore(sectorContainer, shiftOptions.nextSibling);
    }
    
    // Preencher setores
    const sectorSelect = document.getElementById('sectorSelect');
    sectorSelect.innerHTML = '<option value="">-- Selecione um setor --</option><option value="0">Sem setor</option>';
    
    const sectors = database.getSectors();
    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.id;
        option.textContent = sector.name;
        sectorSelect.appendChild(option);
    });
    
    // Verificar valores atuais
    const weekKey = database.getWeekKey(currentWeekStart);
    const schedule = database.getSchedule();
    const sectorSchedule = database.getSectorSchedule();
    
    const currentShiftId = schedule[weekKey] && schedule[weekKey][employeeId] && schedule[weekKey][employeeId][dayIndex];
    const currentSectorId = sectorSchedule[weekKey] && sectorSchedule[weekKey][employeeId] && sectorSchedule[weekKey][employeeId][dayIndex];
    
    // Selecionar turno atual
    if (currentShiftId) {
        const currentOption = document.querySelector(`.shift-option[data-shift="${currentShiftId}"]`);
        if (currentOption) {
            currentOption.classList.add('selected');
            sectorSelect.disabled = false;
            
            // Selecionar setor atual
            if (currentSectorId) {
                sectorSelect.value = currentSectorId;
            } else {
                sectorSelect.value = "0"; // Sem setor
            }
        }
    } else {
        const emptyOption = document.querySelector(`.shift-option[data-shift="0"]`);
        emptyOption.classList.add('selected');
        sectorSelect.disabled = true;
        sectorSelect.value = "";
    }
    
    modal.style.display = 'flex';
}

// ========== SALVAR ESCALA UNIFICADA ==========
async function saveUnifiedSchedule() {
    const selectedOption = document.querySelector('.shift-option.selected');
    if (!selectedOption) {
        showNotification('Selecione um turno!', 'warning');
        return;
    }
    
    const shiftId = parseInt(selectedOption.dataset.shift);
    const { employeeId, dayIndex } = currentEditing;
    const weekKey = database.getWeekKey(currentWeekStart);
    
    // Obter setor selecionado
    const sectorSelect = document.getElementById('sectorSelect');
    let sectorId = sectorSelect ? parseInt(sectorSelect.value) : 0;
    
    // Validar: se tem turno mas não tem setor, usar "Sem setor" (0)
    if (shiftId !== 0 && (!sectorId || sectorId === 0)) {
        sectorId = 0; // Sem setor
    }
    
    // Salvar turno
    let schedule = database.getSchedule();
    if (!schedule[weekKey]) schedule[weekKey] = {};
    if (!schedule[weekKey][employeeId]) schedule[weekKey][employeeId] = {};
    
    if (shiftId === 0) {
        delete schedule[weekKey][employeeId][dayIndex];
    } else {
        schedule[weekKey][employeeId][dayIndex] = shiftId;
    }
    await database.saveSchedule(schedule);
    
    // Salvar setor
    let sectorSchedule = database.getSectorSchedule();
    if (!sectorSchedule[weekKey]) sectorSchedule[weekKey] = {};
    if (!sectorSchedule[weekKey][employeeId]) sectorSchedule[weekKey][employeeId] = {};
    
    if (shiftId === 0 || sectorId === 0) {
        delete sectorSchedule[weekKey][employeeId][dayIndex];
    } else {
        sectorSchedule[weekKey][employeeId][dayIndex] = sectorId;
    }
    await database.saveSectorSchedule(sectorSchedule);
    
    renderSchedule();
    document.getElementById('scheduleModal').style.display = 'none';
    
    showNotification('Escala definida com sucesso!', 'success');
}

// ========== FUNÇÕES DOS MODAIS (mantidas) ==========
function openEmployeeModal() {
    if (isViewMode) return;
    
    document.getElementById('dropdownMenu').classList.remove('show');
    document.getElementById('employeeModal').style.display = 'flex';
    document.getElementById('employeeName').focus();
}

async function saveEmployee() {
    const name = document.getElementById('employeeName').value.trim();
    const role = document.getElementById('employeeRole').value.trim();
    
    if (!name || !role) {
        showNotification('Preencha todos os campos!', 'warning');
        return;
    }
    
    const newEmployee = { name, role };
    await database.addEmployee(newEmployee);
    
    renderEmployees();
    renderSchedule();
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

async function removeEmployee() {
    const select = document.getElementById('employeeToRemove');
    const employeeId = parseInt(select.value);
    
    if (!employeeId) {
        showNotification('Selecione um colaborador!', 'warning');
        return;
    }
    
    const employee = database.getEmployees().find(e => e.id === employeeId);
    
    if (confirm(`Tem certeza que deseja remover ${employee.name}?`)) {
        await database.removeEmployee(employeeId);
        
        renderEmployees();
        renderSchedule();
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
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 15px; height: 15px; background-color: ${shift.color}; border-radius: 3px;"></div>
                <div>
                    <strong>${shift.name}</strong><br>
                    <small>${shift.time}</small>
                </div>
            </div>
            ${shift.name !== 'Folga' ? `<button class="remove-item" data-id="${shift.id}"><i class="fas fa-trash"></i></button>` : ''}
        `;
        
        if (shift.name !== 'Folga') {
            const removeBtn = item.querySelector('.remove-item');
            removeBtn.addEventListener('click', async () => {
                if (confirm(`Remover o turno "${shift.name}"?`)) {
                    await database.removeShift(shift.id);
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

async function addShift() {
    const name = document.getElementById('newShiftName').value.trim();
    const time = document.getElementById('newShiftTime').value.trim();
    const color = document.getElementById('newShiftColor').value;
    
    if (!name || !time) {
        showNotification('Preencha nome e horário!', 'warning');
        return;
    }
    
    const newShift = { name, time, color };
    await database.addShift(newShift);
    
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
        const sectorColor = database.getSectorColor(sector.id);
        const item = document.createElement('div');
        item.className = 'existing-item';
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 15px; height: 15px; background-color: ${sectorColor}; border-radius: 3px;"></div>
                <div><strong>${sector.name}</strong></div>
            </div>
            <button class="remove-item" data-id="${sector.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        const removeBtn = item.querySelector('.remove-item');
        removeBtn.addEventListener('click', async () => {
            if (confirm(`Remover o setor "${sector.name}"?`)) {
                await database.removeSector(sector.id);
                renderExistingSectors();
                renderSectorSchedule();
                renderLegend();
                renderSchedule();
                showNotification('Setor removido!', 'success');
            }
        });
        
        container.appendChild(item);
    });
}

async function addSector() {
    const name = document.getElementById('newSectorName').value.trim();
    
    if (!name) {
        showNotification('Digite o nome do setor!', 'warning');
        return;
    }
    
    const newSector = { name };
    await database.addSector(newSector);
    
    document.getElementById('newSectorName').value = '';
    
    renderExistingSectors();
    renderLegend();
    renderSchedule();
    
    showNotification(`Setor ${name} adicionado!`, 'success');
}

// ========== IMPRESSÃO OTIMIZADA ==========
function printOptimizedSchedule() {
    if (isViewMode) return;
    
    // Salvar estado atual
    const originalTitle = document.title;
    const originalBodyClass = document.body.className;
    
    // Criar conteúdo otimizado para impressão
    const printWindow = window.open('', '_blank');
    
    const now = new Date();
    const weekStart = database.formatDate(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = database.formatDate(weekEnd);
    
    const employees = database.getEmployees();
    const schedule = database.getSchedule();
    const sectorSchedule = database.getSectorSchedule();
    const shifts = database.getShifts();
    const sectors = database.getSectors();
    const weekKey = database.getWeekKey(currentWeekStart);
    const weekDates = database.getWeekDates(currentWeekStart);
    
    // Construir tabela HTML
    let tableHTML = `
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">
            <thead>
                <tr>
                    <th style="background-color: #f0f0f0; font-weight: bold;">Colaborador</th>
    `;
    
    // Cabeçalhos dos dias
    weekDates.forEach(date => {
        const dayName = database.formatDayName(date);
        const dateStr = database.formatDate(date);
        tableHTML += `<th style="background-color: #f0f0f0; font-weight: bold;">${dayName}<br><small>${dateStr}</small></th>`;
    });
    
    tableHTML += `</tr></thead><tbody>`;
    
    // Linhas dos colaboradores
    employees.forEach(employee => {
        tableHTML += `<tr><td style="font-weight: bold;">${employee.name}<br><small>${employee.role}</small></td>`;
        
        weekDates.forEach((date, dayIndex) => {
            const employeeSchedule = schedule[weekKey] && schedule[weekKey][employee.id] || {};
            const shiftId = employeeSchedule[dayIndex];
            
            const employeeSectorSchedule = sectorSchedule[weekKey] && sectorSchedule[weekKey][employee.id] || {};
            const sectorId = employeeSectorSchedule[dayIndex];
            
            let cellContent = '';
            
            if (shiftId) {
                const shift = shifts.find(s => s.id === shiftId);
                const sector = sectorId ? sectors.find(s => s.id === sectorId) : null;
                
                if (shift) {
                    cellContent = `
                        <div style="font-weight: bold; color: ${shift.color}">${shift.name}</div>
                        <div style="font-size: 10px;">${shift.time}</div>
                        ${sector ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">${sector.name}</div>` : ''}
                    `;
                }
            }
            
            tableHTML += `<td style="text-align: center; vertical-align: middle;">${cellContent || '-'}</td>`;
        });
        
        tableHTML += `</tr>`;
    });
    
    tableHTML += `</tbody></table>`;
    
    // Construir página completa
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Escala de Trabalho - ${weekStart} a ${weekEndStr}</title>
            <style>
                @media print {
                    @page { margin: 1cm; }
                    body { margin: 0; font-family: Arial, sans-serif; }
                    .no-print { display: none !important; }
                }
                
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    color: #333; 
                }
                
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 2px solid #000;
                    padding-bottom: 15px;
                }
                
                .header h1 { 
                    margin: 0; 
                    font-size: 24px; 
                    color: #2c3e50;
                }
                
                .info { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-top: 10px;
                    font-size: 14px;
                }
                
                .legend { 
                    margin-top: 30px; 
                    padding-top: 15px; 
                    border-top: 1px solid #ccc;
                    font-size: 12px;
                }
                
                .legend h3 { 
                    margin-bottom: 10px; 
                    color: #2c3e50;
                }
                
                .legend-item { 
                    display: inline-block; 
                    margin-right: 15px; 
                    margin-bottom: 5px;
                }
                
                .color-box { 
                    display: inline-block; 
                    width: 12px; 
                    height: 12px; 
                    margin-right: 5px;
                    border: 1px solid #ccc;
                }
                
                .footer { 
                    margin-top: 30px; 
                    text-align: center; 
                    font-size: 11px; 
                    color: #666;
                    border-top: 1px solid #eee;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ESCALA DE TRABALHO</h1>
                <div class="info">
                    <div><strong>Período:</strong> ${weekStart} a ${weekEndStr}</div>
                    <div><strong>Gerado em:</strong> ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}</div>
                </div>
            </div>
            
            ${tableHTML}
            
            <div class="legend">
                <h3>Legenda</h3>
                <div>
                    <strong>Turnos:</strong><br>
                    ${shifts.map(shift => `
                        <div class="legend-item">
                            <span class="color-box" style="background-color: ${shift.color}"></span>
                            ${shift.name}: ${shift.time}
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 10px;">
                    <strong>Setores:</strong><br>
                    ${sectors.map(sector => `
                        <div class="legend-item">
                            <span class="color-box" style="background-color: ${database.getSectorColor(sector.id)}"></span>
                            ${sector.name}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="footer">
                Sistema de Controle de Escalas | Gerado automaticamente
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 500);
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
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

console.log('✅ Script principal carregado com sucesso!');