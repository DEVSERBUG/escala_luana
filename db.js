// Banco de dados com Firebase + Sistema de Logs
class Database {
    constructor() {
        this.isFirebaseInitialized = false;
        this.isOnline = false;
        this.user = null;
        this.firebaseConfig = null;
        this.db = null;
        this.logs = [];
        this.lastSync = null;
        this.syncStatus = 'offline';
        this.dataCounts = {
            employees: 0,
            shifts: 0,
            sectors: 0,
            schedule: 0,
            sectorSchedule: 0
        };
        
        this.log('Sistema de banco de dados iniciado');
        this.initializeDB();
    }

    // ========== SISTEMA DE LOGS ==========
    log(message, type = 'info') {
        const logEntry = {
            time: new Date().toLocaleTimeString('pt-BR'),
            message: message,
            type: type,
            timestamp: Date.now()
        };
        
        this.logs.unshift(logEntry); // Adiciona no início
        if (this.logs.length > 50) this.logs.pop(); // Mantém apenas 50 logs
        
        // Atualizar UI se existir
        this.updateLogsUI();
        
        console.log(`[${type.toUpperCase()}] ${message}`);
        return logEntry;
    }

    updateLogsUI() {
        const logsContainer = document.getElementById('logsContainer');
        if (logsContainer) {
            logsContainer.innerHTML = '';
            this.logs.slice(0, 10).forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry log-${log.type}`;
                logEntry.innerHTML = `
                    <span class="log-time">${log.time}</span>
                    <span class="log-message">${log.message}</span>
                `;
                logsContainer.appendChild(logEntry);
            });
        }
    }

    updateStatusUI() {
        // Atualizar status de conexão
        const connectionEl = document.getElementById('statusConnection');
        if (connectionEl) {
            connectionEl.textContent = this.isOnline ? 'Online ✅' : 'Offline ❌';
            connectionEl.className = `status-value ${this.isOnline ? 'online' : 'offline'}`;
        }
        
        // Atualizar última sincronização
        const lastSyncEl = document.getElementById('statusLastSync');
        if (lastSyncEl && this.lastSync) {
            lastSyncEl.textContent = new Date(this.lastSync).toLocaleString('pt-BR');
        }
        
        // Atualizar contagem de dados
        const dataCountEl = document.getElementById('statusDataCount');
        if (dataCountEl) {
            const total = Object.values(this.dataCounts).reduce((a, b) => a + b, 0);
            dataCountEl.textContent = `${total} itens`;
        }
    }

    showFirebaseToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `firebase-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // ========== INICIALIZAÇÃO ==========
    async initializeDB() {
        this.log('Inicializando banco de dados...');
        
        // Verificar usuário logado
        const userData = sessionStorage.getItem('user');
        this.user = userData ? JSON.parse(userData) : null;
        
        // Configuração do Firebase (USE SUAS CREDENCIAIS REAIS)
        this.firebaseConfig = {
        apiKey: "AIzaSyAkVD8Mxq4yV6HSRrbKG7DAFrnEFaxdb1k",
        authDomain: "sistema-escalas.firebaseapp.com",
        projectId: "sistema-escalas",  // ⬅️ AGORA ESTÁ CORRETO!
        storageBucket: "sistema-escalas.firebasestorage.app",
        messagingSenderId: "338644982746",
        appId: "1:338644982746:web:c61a4030f74a2fdc603ee3",
        measurementId: "G-JC64EF3VZ8"
    };
        
        this.log(`Tentando conectar ao Firebase: ${this.firebaseConfig.projectId}`);
        
        try {
            // Inicializar Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
                this.log('Firebase app inicializado', 'success');
            }
            
            this.db = firebase.firestore();
            
            // Configurar persistência offline
            await this.db.enablePersistence({ synchronizeTabs: true })
                .then(() => {
                    this.log('Persistência offline habilitada', 'success');
                })
                .catch(err => {
                    if (err.code == 'failed-precondition') {
                        this.log('Múltiplas abertas, persistência não habilitada', 'warning');
                    } else if (err.code == 'unimplemented') {
                        this.log('Navegador não suporta persistência', 'warning');
                    }
                });
            
            // Testar conexão com um documento público
            const testDoc = await this.db.collection('test').doc('connection').get();
            
            this.isFirebaseInitialized = true;
            this.isOnline = true;
            this.syncStatus = 'online';
            
            this.log('✅ Conexão com Firebase estabelecida com sucesso!', 'success');
            this.showFirebaseToast('Conectado ao banco de dados online', 'success');
            
            // Configurar listener em tempo real
            this.setupRealtimeListener();
            
            // Carregar dados do Firestore
            await this.loadFromFirestore();
            
        } catch (error) {
            this.isOnline = false;
            this.syncStatus = 'offline';
            this.log(`❌ Erro ao conectar com Firebase: ${error.message}`, 'error');
            this.showFirebaseToast('Modo offline - usando dados locais', 'warning');
            
            this.initializeLocalData();
        }
        
        this.updateStatusUI();
    }

    setupRealtimeListener() {
        // Listener para detectar desconexões
        this.db.enableNetwork()
            .then(() => {
                this.log('Rede do Firestore habilitada', 'info');
            })
            .catch(error => {
                this.log(`Erro na rede: ${error.message}`, 'error');
            });

        // Monitorar estado da conexão
        this.db.onSnapshotsInSync(() => {
            this.isOnline = true;
            this.syncStatus = 'synced';
            this.log('Firestore sincronizado', 'success');
            this.updateStatusUI();
        });
    }

    // ========== CARREGAR DO FIRESTORE ==========
    async loadFromFirestore() {
        try {
            this.log('🔄 Carregando dados do Firestore...');
            
            // Carregar colaboradores
            const employeesSnapshot = await this.db.collection('employees').get();
            this.dataCounts.employees = employeesSnapshot.size;
            if (!employeesSnapshot.empty) {
                const employees = employeesSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                }));
                this.saveEmployeesLocal(employees);
                this.log(`✅ Colaboradores carregados: ${employees.length}`, 'success');
            }
            
            // Carregar turnos
            const shiftsSnapshot = await this.db.collection('shifts').get();
            this.dataCounts.shifts = shiftsSnapshot.size;
            if (!shiftsSnapshot.empty) {
                const shifts = shiftsSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                }));
                this.saveShiftsLocal(shifts);
                this.log(`✅ Turnos carregados: ${shifts.length}`, 'success');
            }
            
            // Carregar setores
            const sectorsSnapshot = await this.db.collection('sectors').get();
            this.dataCounts.sectors = sectorsSnapshot.size;
            if (!sectorsSnapshot.empty) {
                const sectors = sectorsSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                }));
                this.saveSectorsLocal(sectors);
                this.log(`✅ Setores carregados: ${sectors.length}`, 'success');
            }
            
            // Carregar escalas
            const scheduleSnapshot = await this.db.collection('schedule').get();
            this.dataCounts.schedule = scheduleSnapshot.size;
            if (!scheduleSnapshot.empty) {
                const schedule = {};
                scheduleSnapshot.docs.forEach(doc => {
                    schedule[doc.id] = doc.data();
                });
                this.saveScheduleLocal(schedule);
                this.log(`✅ Escala carregada: ${scheduleSnapshot.size} semanas`, 'success');
            }
            
            // Carregar escala de setores
            const sectorScheduleSnapshot = await this.db.collection('sectorSchedule').get();
            this.dataCounts.sectorSchedule = sectorScheduleSnapshot.size;
            if (!sectorScheduleSnapshot.empty) {
                const sectorSchedule = {};
                sectorScheduleSnapshot.docs.forEach(doc => {
                    sectorSchedule[doc.id] = doc.data();
                });
                this.saveSectorScheduleLocal(sectorSchedule);
                this.log(`✅ Escala de setores carregada: ${sectorScheduleSnapshot.size} semanas`, 'success');
            }
            
            this.lastSync = new Date().toISOString();
            this.updateStatusUI();
            this.showFirebaseToast('Dados carregados do servidor', 'success');
            
        } catch (error) {
            this.log(`❌ Erro ao carregar do Firestore: ${error.message}`, 'error');
            this.showFirebaseToast('Erro ao carregar dados online', 'error');
            this.initializeLocalData();
        }
    }

    // ========== SALVAR DADOS (COM LOGS DETALHADOS) ==========
    async saveEmployees(employees) {
        const startTime = Date.now();
        this.log(`💾 Salvando ${employees.length} colaboradores...`);
        
        this.saveEmployeesLocal(employees);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                employees.forEach(employee => {
                    const empRef = this.db.collection('employees').doc(employee.id);
                    batch.set(empRef, {
                        name: employee.name,
                        role: employee.role,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
                
                const duration = Date.now() - startTime;
                this.log(`✅ Colaboradores salvos no Firebase em ${duration}ms`, 'success');
                this.showFirebaseToast(`${employees.length} colaboradores sincronizados`, 'success');
                
            } catch (error) {
                this.log(`❌ Erro ao salvar colaboradores: ${error.message}`, 'error');
                this.showFirebaseToast('Erro ao sincronizar colaboradores', 'error');
            }
        }
        
        this.dataCounts.employees = employees.length;
        this.updateStatusUI();
    }

    async saveShifts(shifts) {
        const startTime = Date.now();
        this.log(`💾 Salvando ${shifts.length} turnos...`);
        
        this.saveShiftsLocal(shifts);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                shifts.forEach(shift => {
                    const shiftRef = this.db.collection('shifts').doc(shift.id);
                    batch.set(shiftRef, {
                        name: shift.name,
                        time: shift.time,
                        color: shift.color,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
                
                const duration = Date.now() - startTime;
                this.log(`✅ Turnos salvos no Firebase em ${duration}ms`, 'success');
                this.showFirebaseToast(`${shifts.length} turnos sincronizados`, 'success');
                
            } catch (error) {
                this.log(`❌ Erro ao salvar turnos: ${error.message}`, 'error');
                this.showFirebaseToast('Erro ao sincronizar turnos', 'error');
            }
        }
        
        this.dataCounts.shifts = shifts.length;
        this.updateStatusUI();
    }

    async saveSectors(sectors) {
        const startTime = Date.now();
        this.log(`💾 Salvando ${sectors.length} setores...`);
        
        this.saveSectorsLocal(sectors);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                sectors.forEach(sector => {
                    const sectorRef = this.db.collection('sectors').doc(sector.id);
                    batch.set(sectorRef, {
                        name: sector.name,
                        color: sector.color,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
                
                const duration = Date.now() - startTime;
                this.log(`✅ Setores salvos no Firebase em ${duration}ms`, 'success');
                this.showFirebaseToast(`${sectors.length} setores sincronizados`, 'success');
                
            } catch (error) {
                this.log(`❌ Erro ao salvar setores: ${error.message}`, 'error');
                this.showFirebaseToast('Erro ao sincronizar setores', 'error');
            }
        }
        
        this.dataCounts.sectors = sectors.length;
        this.updateStatusUI();
    }

    async saveSchedule(schedule) {
        const scheduleCount = Object.keys(schedule).length;
        const startTime = Date.now();
        this.log(`💾 Salvando escala (${scheduleCount} semanas)...`);
        
        this.saveScheduleLocal(schedule);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                Object.keys(schedule).forEach(weekKey => {
                    const scheduleRef = this.db.collection('schedule').doc(weekKey);
                    batch.set(scheduleRef, {
                        ...schedule[weekKey],
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
                
                const duration = Date.now() - startTime;
                this.log(`✅ Escala salva no Firebase em ${duration}ms`, 'success');
                this.showFirebaseToast('Escala sincronizada', 'success');
                
            } catch (error) {
                this.log(`❌ Erro ao salvar escala: ${error.message}`, 'error');
                this.showFirebaseToast('Erro ao sincronizar escala', 'error');
            }
        }
        
        this.dataCounts.schedule = scheduleCount;
        this.lastSync = new Date().toISOString();
        this.updateStatusUI();
    }

    async saveSectorSchedule(schedule) {
        const scheduleCount = Object.keys(schedule).length;
        const startTime = Date.now();
        this.log(`💾 Salvando escala de setores (${scheduleCount} semanas)...`);
        
        this.saveSectorScheduleLocal(schedule);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                Object.keys(schedule).forEach(weekKey => {
                    const scheduleRef = this.db.collection('sectorSchedule').doc(weekKey);
                    batch.set(scheduleRef, {
                        ...schedule[weekKey],
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
                
                const duration = Date.now() - startTime;
                this.log(`✅ Escala de setores salva no Firebase em ${duration}ms`, 'success');
                this.showFirebaseToast('Escala de setores sincronizada', 'success');
                
            } catch (error) {
                this.log(`❌ Erro ao salvar escala de setores: ${error.message}`, 'error');
                this.showFirebaseToast('Erro ao sincronizar escala de setores', 'error');
            }
        }
        
        this.dataCounts.sectorSchedule = scheduleCount;
        this.lastSync = new Date().toISOString();
        this.updateStatusUI();
    }

    // ========== FUNÇÕES LOCAIS ==========
    saveEmployeesLocal(employees) {
        localStorage.setItem('escala_employees', JSON.stringify(employees));
    }

    saveShiftsLocal(shifts) {
        localStorage.setItem('escala_shifts', JSON.stringify(shifts));
    }

    saveSectorsLocal(sectors) {
        localStorage.setItem('escala_sectors', JSON.stringify(sectors));
    }

    saveScheduleLocal(schedule) {
        localStorage.setItem('escala_schedule', JSON.stringify(schedule));
    }

    saveSectorScheduleLocal(schedule) {
        localStorage.setItem('escala_sector_schedule', JSON.stringify(schedule));
    }

    // ========== FUNÇÕES DE LEITURA ==========
    getEmployees() {
        const data = localStorage.getItem('escala_employees');
        return data ? JSON.parse(data) : [];
    }

    getShifts() {
        const data = localStorage.getItem('escala_shifts');
        return data ? JSON.parse(data) : [];
    }

    getSectors() {
        const data = localStorage.getItem('escala_sectors');
        const sectors = data ? JSON.parse(data) : [];
        return sectors.map(sector => ({
            ...sector,
            color: sector.color || this.generateColor(sector.id)
        }));
    }

    getSchedule() {
        const data = localStorage.getItem('escala_schedule');
        return data ? JSON.parse(data) : {};
    }

    getSectorSchedule() {
        const data = localStorage.getItem('escala_sector_schedule');
        return data ? JSON.parse(data) : {};
    }

    // ========== UTILIDADES ==========
    generateColor(id) {
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
            '#27ae60', '#2980b9', '#f1c40f', '#e67e22', '#34495e'
        ];
        return colors[parseInt(id) % colors.length];
    }

    getSectorColor(sectorId) {
        const sector = this.getSectors().find(s => s.id === sectorId.toString());
        return sector ? sector.color : '#95a5a6';
    }

    getWeekStartDate(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }

    getWeekKey(date) {
        const year = date.getFullYear();
        const weekNumber = this.getWeekNumber(date);
        return `${year}-W${weekNumber}`;
    }

    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }

    getWeekDates(startDate) {
        const dates = [];
        const current = new Date(startDate);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(current);
            date.setDate(current.getDate() + i);
            dates.push(date);
        }
        
        return dates;
    }

    formatDate(date) {
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }

    formatDayName(date) {
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return days[date.getDay()];
    }

    // ========== TESTE DE CONEXÃO ==========
    async testConnection() {
        this.log('Testando conexão com Firebase...', 'info');
        
        try {
            const testDoc = await this.db.collection('testConnection').doc('test').get();
            
            if (!testDoc.exists) {
                await this.db.collection('testConnection').doc('test').set({
                    test: true,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            this.log('✅ Teste de conexão bem-sucedido!', 'success');
            this.showFirebaseToast('Conexão com Firebase OK!', 'success');
            return true;
            
        } catch (error) {
            this.log(`❌ Teste de conexão falhou: ${error.message}`, 'error');
            this.showFirebaseToast('Falha na conexão com Firebase', 'error');
            return false;
        }
    }

    // ========== SINCRONIZAÇÃO FORÇADA ==========
    async forceSyncAll() {
        this.log('🔄 Forçando sincronização completa...', 'warning');
        this.showFirebaseToast('Iniciando sincronização completa...', 'info');
        
        try {
            // Sincronizar todos os dados
            await this.saveEmployees(this.getEmployees());
            await this.saveShifts(this.getShifts());
            await this.saveSectors(this.getSectors());
            await this.saveSchedule(this.getSchedule());
            await this.saveSectorSchedule(this.getSectorSchedule());
            
            this.log('✅ Sincronização completa concluída!', 'success');
            this.showFirebaseToast('Sincronização completa concluída!', 'success');
            
        } catch (error) {
            this.log(`❌ Erro na sincronização: ${error.message}`, 'error');
            this.showFirebaseToast('Erro na sincronização', 'error');
        }
    }

    // ========== EXPORT/IMPORT ==========
    exportData() {
        const data = {
            employees: this.getEmployees(),
            shifts: this.getShifts(),
            sectors: this.getSectors(),
            schedule: this.getSchedule(),
            sectorSchedule: this.getSectorSchedule(),
            exportDate: new Date().toISOString(),
            firebaseProject: this.firebaseConfig.projectId
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `escala-backup-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.log('📤 Dados exportados para arquivo JSON', 'success');
        return data;
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.employees) this.saveEmployees(data.employees);
            if (data.shifts) this.saveShifts(data.shifts);
            if (data.sectors) this.saveSectors(data.sectors);
            if (data.schedule) this.saveSchedule(data.schedule);
            if (data.sectorSchedule) this.saveSectorSchedule(data.sectorSchedule);
            
            this.log('📥 Dados importados com sucesso', 'success');
            return true;
            
        } catch (error) {
            this.log(`❌ Erro ao importar dados: ${error.message}`, 'error');
            return false;
        }
    }

    // ========== INICIALIZAÇÃO LOCAL ==========
    initializeLocalData() {
        this.log('Inicializando dados locais...');
        
        if (!localStorage.getItem('escala_employees')) {
            const defaultEmployees = [
                { id: "1", name: "BEATRIZ XIMENES", role: "ASSISTENTE DE LOJA" },
                { id: "2", name: "FABRICIO", role: "ASSISTENTE DE LOJA" },
                { id: "3", name: "MARINA", role: "Caixa" },
                { id: "4", name: "GABRIEL", role: "Estoquista" },
                { id: "5", name: "KEVEN", role: "Gerente" }
            ];
            this.saveEmployeesLocal(defaultEmployees);
            this.dataCounts.employees = defaultEmployees.length;
            this.log(`Dados padrão criados: ${defaultEmployees.length} colaboradores`);
        }

        if (!localStorage.getItem('escala_shifts')) {
            const defaultShifts = [
                { id: "1", name: "Abertura", time: "06:00 - 14:00", color: "#3498db" },
                { id: "2", name: "Intermediário", time: "14:00 - 22:00", color: "#f39c12" },
                { id: "3", name: "Fechamento", time: "22:00 - 06:00", color: "#e74c3c" },
                { id: "4", name: "Folga", time: "Dia Livre", color: "#95a5a6" }
            ];
            this.saveShiftsLocal(defaultShifts);
            this.dataCounts.shifts = defaultShifts.length;
            this.log(`Dados padrão criados: ${defaultShifts.length} turnos`);
        }

        if (!localStorage.getItem('escala_sectors')) {
            const defaultSectors = [
                { id: "1", name: "Masculino", color: this.generateColor(1) },
                { id: "2", name: "Feminino", color: this.generateColor(2) },
                { id: "3", name: "Infantil", color: this.generateColor(3) },
                { id: "4", name: "Calçados", color: this.generateColor(4) },
                { id: "5", name: "Caixa", color: this.generateColor(5) },
                { id: "6", name: "Estoque", color: this.generateColor(6) }
            ];
            this.saveSectorsLocal(defaultSectors);
            this.dataCounts.sectors = defaultSectors.length;
            this.log(`Dados padrão criados: ${defaultSectors.length} setores`);
        }

        if (!localStorage.getItem('escala_schedule')) {
            this.saveScheduleLocal({});
        }

        if (!localStorage.getItem('escala_sector_schedule')) {
            this.saveSectorScheduleLocal({});
        }
        
        this.updateStatusUI();
    }
}

// Criar instância global
const db = new Database();