// Banco de dados híbrido (localStorage + backup online)
class Database {
    constructor() {
        this.apiUrl = 'https://jsonbin.io/v3/b'; // Exemplo de API gratuita
        this.apiKey = 'YOUR_API_KEY'; // Você precisa criar uma conta no JSONBin.io
        this.binId = null;
        this.isOnline = false;
        this.user = null;
        this.initializeDB();
    }

    async initializeDB() {
        // Verificar se está logado
        const userData = sessionStorage.getItem('user');
        if (userData) {
            this.user = JSON.parse(userData);
        }
        
        // Inicializar dados padrão se não existirem
        if (!localStorage.getItem('employees')) {
            const defaultEmployees = [
                { id: 1, name: "BEATRIZ XIMENES", role: "ASSISTENTE DE LOJA" },
                { id: 2, name: "FABRICIO", role: "ASSISTENTE DE LOJA" },
                { id: 3, name: "MARINA", role: "Caixa" },
                { id: 4, name: "GABRIEL", role: "Estoquista" },
                { id: 5, name: "KEVEN", role: "Gerente" }
            ];
            this.saveEmployees(defaultEmployees);
        }

        if (!localStorage.getItem('shifts')) {
            const defaultShifts = [
                { id: 1, name: "Abertura", time: "06:00 - 14:00", color: "#3498db" },
                { id: 2, name: "Intermediário", time: "14:00 - 22:00", color: "#f39c12" },
                { id: 3, name: "Fechamento", time: "22:00 - 06:00", color: "#e74c3c" },
                { id: 4, name: "Folga", time: "Dia Livre", color: "#95a5a6" }
            ];
            this.saveShifts(defaultShifts);
        }

        if (!localStorage.getItem('sectors')) {
            const defaultSectors = [
                { id: 1, name: "Masculino", color: this.generateColor(1) },
                { id: 2, name: "Feminino", color: this.generateColor(2) },
                { id: 3, name: "Infantil", color: this.generateColor(3) },
                { id: 4, name: "Calçados", color: this.generateColor(4) },
                { id: 5, name: "Caixa", color: this.generateColor(5) },
                { id: 6, name: "Estoque", color: this.generateColor(6) }
            ];
            this.saveSectors(defaultSectors);
        }

        if (!localStorage.getItem('schedule')) {
            this.saveSchedule({});
        }

        if (!localStorage.getItem('sectorSchedule')) {
            this.saveSectorSchedule({});
        }

        // Tentar carregar dados online (se API configurada)
        if (this.user && this.user.type === 'admin') {
            await this.trySyncOnline();
        }
    }

    // Gerar cor consistente baseada no ID
    generateColor(id) {
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
            '#27ae60', '#2980b9', '#f1c40f', '#e67e22', '#34495e'
        ];
        return colors[id % colors.length];
    }

    // ========== FUNCIONÁRIOS ==========
    getEmployees() {
        return JSON.parse(localStorage.getItem('employees')) || [];
    }

    saveEmployees(employees) {
        localStorage.setItem('employees', JSON.stringify(employees));
        this.scheduleBackup();
    }

    addEmployee(employee) {
        const employees = this.getEmployees();
        const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
        employee.id = newId;
        employees.push(employee);
        this.saveEmployees(employees);
        return employee;
    }

    removeEmployee(id) {
        let employees = this.getEmployees();
        employees = employees.filter(emp => emp.id !== id);
        this.saveEmployees(employees);
        
        // Remover das escalas
        const schedule = this.getSchedule();
        const sectorSchedule = this.getSectorSchedule();
        
        for (const weekKey in schedule) {
            if (schedule[weekKey][id]) {
                delete schedule[weekKey][id];
            }
        }
        
        for (const weekKey in sectorSchedule) {
            if (sectorSchedule[weekKey][id]) {
                delete sectorSchedule[weekKey][id];
            }
        }
        
        this.saveSchedule(schedule);
        this.saveSectorSchedule(sectorSchedule);
        
        return true;
    }

    // ========== TURNOS ==========
    getShifts() {
        return JSON.parse(localStorage.getItem('shifts')) || [];
    }

    saveShifts(shifts) {
        localStorage.setItem('shifts', JSON.stringify(shifts));
        this.scheduleBackup();
    }

    addShift(shift) {
        const shifts = this.getShifts();
        const newId = shifts.length > 0 ? Math.max(...shifts.map(s => s.id)) + 1 : 1;
        shift.id = newId;
        shifts.push(shift);
        this.saveShifts(shifts);
        return shift;
    }

    removeShift(id) {
        let shifts = this.getShifts();
        shifts = shifts.filter(shift => shift.id !== id);
        this.saveShifts(shifts);
        
        // Atualizar escalas que usavam este turno
        const schedule = this.getSchedule();
        for (const weekKey in schedule) {
            for (const empId in schedule[weekKey]) {
                for (const dayIndex in schedule[weekKey][empId]) {
                    if (schedule[weekKey][empId][dayIndex] === id) {
                        delete schedule[weekKey][empId][dayIndex];
                    }
                }
            }
        }
        this.saveSchedule(schedule);
        
        return true;
    }

    // ========== SETORES ==========
    getSectors() {
        const sectors = JSON.parse(localStorage.getItem('sectors')) || [];
        // Garantir que todos os setores tenham cor
        return sectors.map(sector => ({
            ...sector,
            color: sector.color || this.generateColor(sector.id)
        }));
    }

    saveSectors(sectors) {
        localStorage.setItem('sectors', JSON.stringify(sectors));
        this.scheduleBackup();
    }

    addSector(sector) {
        const sectors = this.getSectors();
        const newId = sectors.length > 0 ? Math.max(...sectors.map(s => s.id)) + 1 : 1;
        sector.id = newId;
        sector.color = this.generateColor(newId);
        sectors.push(sector);
        this.saveSectors(sectors);
        return sector;
    }

    removeSector(id) {
        let sectors = this.getSectors();
        sectors = sectors.filter(sector => sector.id !== id);
        this.saveSectors(sectors);
        
        // Atualizar escalas de setores
        const sectorSchedule = this.getSectorSchedule();
        for (const weekKey in sectorSchedule) {
            for (const empId in sectorSchedule[weekKey]) {
                for (const dayIndex in sectorSchedule[weekKey][empId]) {
                    if (sectorSchedule[weekKey][empId][dayIndex] === id) {
                        delete sectorSchedule[weekKey][empId][dayIndex];
                    }
                }
            }
        }
        this.saveSectorSchedule(sectorSchedule);
        
        return true;
    }

    // ========== ESCALAS ==========
    getSchedule() {
        return JSON.parse(localStorage.getItem('schedule')) || {};
    }

    saveSchedule(schedule) {
        localStorage.setItem('schedule', JSON.stringify(schedule));
        this.scheduleBackup();
    }

    getSectorSchedule() {
        return JSON.parse(localStorage.getItem('sectorSchedule')) || {};
    }

    saveSectorSchedule(schedule) {
        localStorage.setItem('sectorSchedule', JSON.stringify(schedule));
        this.scheduleBackup();
    }

    // ========== BACKUP ONLINE ==========
    async scheduleBackup() {
        if (this.user && this.user.type === 'admin') {
            // Usar setTimeout para evitar muitas chamadas seguidas
            if (this.backupTimeout) clearTimeout(this.backupTimeout);
            this.backupTimeout = setTimeout(() => this.backupToCloud(), 5000);
        }
    }

    async backupToCloud() {
        try {
            const data = this.getAllData();
            
            // Se tiver um binId salvo, atualizar
            if (this.binId) {
                await this.updateOnlineData(data);
            } else {
                // Criar novo bin
                await this.createOnlineData(data);
            }
            
            console.log('Backup online realizado com sucesso');
        } catch (error) {
            console.error('Erro no backup online:', error);
        }
    }

    async trySyncOnline() {
        try {
            // Tentar carregar dados do último backup
            const savedBinId = localStorage.getItem('onlineBinId');
            if (savedBinId) {
                const onlineData = await this.getOnlineData(savedBinId);
                if (onlineData) {
                    // Mesclar dados online com locais
                    this.mergeData(onlineData);
                    console.log('Dados online carregados');
                    this.isOnline = true;
                }
            }
        } catch (error) {
            console.log('Usando dados locais');
        }
    }

    getAllData() {
        return {
            employees: this.getEmployees(),
            shifts: this.getShifts(),
            sectors: this.getSectors(),
            schedule: this.getSchedule(),
            sectorSchedule: this.getSectorSchedule(),
            lastSync: new Date().toISOString()
        };
    }

    mergeData(onlineData) {
        // Lógica para mesclar dados online com locais
        // (pode ser personalizada conforme necessidade)
        if (onlineData.employees) {
            const localEmployees = this.getEmployees();
            const merged = [...onlineData.employees];
            
            // Adicionar locais que não existem online
            localEmployees.forEach(local => {
                if (!merged.find(online => online.id === local.id)) {
                    merged.push(local);
                }
            });
            
            this.saveEmployees(merged);
        }
        
        // Similar para outros dados...
    }

    // Métodos para API (exemplo com JSONBin.io)
    async createOnlineData(data) {
        // Implementação da API
        // Você precisa se cadastrar em jsonbin.io para obter uma API key
        return null;
    }

    async updateOnlineData(data) {
        // Implementação da API
        return null;
    }

    async getOnlineData(binId) {
        // Implementação da API
        return null;
    }

    // ========== EXPORT/IMPORT ==========
    exportData() {
        const data = this.getAllData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `escala-backup-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.employees) this.saveEmployees(data.employees);
            if (data.shifts) this.saveShifts(data.shifts);
            if (data.sectors) this.saveSectors(data.sectors);
            if (data.schedule) this.saveSchedule(data.schedule);
            if (data.sectorSchedule) this.saveSectorSchedule(data.sectorSchedule);
            
            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }

    // ========== UTILIDADES ==========
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

    getSectorColor(sectorId) {
        const sector = this.getSectors().find(s => s.id === sectorId);
        return sector ? sector.color : '#95a5a6';
    }
}

// Exportar instância única do banco de dados
const db = new Database();