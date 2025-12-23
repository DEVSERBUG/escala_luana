// Banco de dados com Firebase (online) + fallback local
class Database {
    constructor() {
        this.isFirebaseInitialized = false;
        this.isOnline = false;
        this.user = null;
        this.firebaseConfig = null;
        this.db = null;
        
        this.initializeDB();
    }

    async initializeDB() {
        console.log('Inicializando banco de dados...');
        
        // Verificar usuário logado
        const userData = sessionStorage.getItem('user');
        this.user = userData ? JSON.parse(userData) : null;
        
        // Configuração do Firebase (VOCÊ VAI SUBSTITUIR COM SUAS CREDENCIAIS)
        this.firebaseConfig = {
            apiKey: "AIzaSyAkVD8Mxq4yV6HSRrbKG7DAFrnEFaxdb1k",
            authDomain: "sistema-escalas.firebaseapp.com",
            projectId: "sistema-escalas",
            storageBucket: "sistema-escalas.firebasestorage.app",
            messagingSenderId: "1:338644982746:web:c61a4030f74a2fdc603ee3",
            appId: "SEU_APP_ID"
        };
        
        try {
            // Inicializar Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
            }
            this.db = firebase.firestore();
            this.isFirebaseInitialized = true;
            this.isOnline = true;
            console.log('Firebase inicializado com sucesso');
            
            // Tentar carregar dados do Firestore
            await this.loadFromFirestore();
            
        } catch (error) {
            console.log('Firebase não disponível, usando localStorage:', error);
            this.isOnline = false;
            this.initializeLocalData();
        }
    }

    // ========== CARREGAR DO FIRESTORE ==========
    async loadFromFirestore() {
        try {
            console.log('Carregando dados do Firestore...');
            
            // Carregar colaboradores
            const employeesSnapshot = await this.db.collection('employees').get();
            if (!employeesSnapshot.empty) {
                const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.saveEmployeesLocal(employees);
                console.log('Colaboradores carregados do Firestore:', employees.length);
            }
            
            // Carregar turnos
            const shiftsSnapshot = await this.db.collection('shifts').get();
            if (!shiftsSnapshot.empty) {
                const shifts = shiftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.saveShiftsLocal(shifts);
                console.log('Turnos carregados do Firestore:', shifts.length);
            }
            
            // Carregar setores
            const sectorsSnapshot = await this.db.collection('sectors').get();
            if (!sectorsSnapshot.empty) {
                const sectors = sectorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.saveSectorsLocal(sectors);
                console.log('Setores carregados do Firestore:', sectors.length);
            }
            
            // Carregar escalas
            const scheduleSnapshot = await this.db.collection('schedule').get();
            if (!scheduleSnapshot.empty) {
                const schedule = {};
                scheduleSnapshot.docs.forEach(doc => {
                    schedule[doc.id] = doc.data();
                });
                this.saveScheduleLocal(schedule);
                console.log('Escala carregada do Firestore');
            }
            
            // Carregar escala de setores
            const sectorScheduleSnapshot = await this.db.collection('sectorSchedule').get();
            if (!sectorScheduleSnapshot.empty) {
                const sectorSchedule = {};
                sectorScheduleSnapshot.docs.forEach(doc => {
                    sectorSchedule[doc.id] = doc.data();
                });
                this.saveSectorScheduleLocal(sectorSchedule);
                console.log('Escala de setores carregada do Firestore');
            }
            
        } catch (error) {
            console.error('Erro ao carregar do Firestore:', error);
            this.initializeLocalData();
        }
    }

    // ========== INICIALIZAR DADOS LOCAIS (fallback) ==========
    initializeLocalData() {
        console.log('Inicializando dados locais...');
        
        if (!localStorage.getItem('escala_employees')) {
            const defaultEmployees = [
                { id: "1", name: "BEATRIZ XIMENES", role: "ASSISTENTE DE LOJA" },
                { id: "2", name: "FABRICIO", role: "ASSISTENTE DE LOJA" },
                { id: "3", name: "MARINA", role: "Caixa" },
                { id: "4", name: "GABRIEL", role: "Estoquista" },
                { id: "5", name: "KEVEN", role: "Gerente" }
            ];
            this.saveEmployeesLocal(defaultEmployees);
        }

        if (!localStorage.getItem('escala_shifts')) {
            const defaultShifts = [
                { id: "1", name: "Abertura", time: "06:00 - 14:00", color: "#3498db" },
                { id: "2", name: "Intermediário", time: "14:00 - 22:00", color: "#f39c12" },
                { id: "3", name: "Fechamento", time: "22:00 - 06:00", color: "#e74c3c" },
                { id: "4", name: "Folga", time: "Dia Livre", color: "#95a5a6" }
            ];
            this.saveShiftsLocal(defaultShifts);
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
        }

        if (!localStorage.getItem('escala_schedule')) {
            this.saveScheduleLocal({});
        }

        if (!localStorage.getItem('escala_sector_schedule')) {
            this.saveSectorScheduleLocal({});
        }
    }

    // ========== FUNÇÕES DE SALVAR (LOCAL + ONLINE) ==========
    async saveEmployees(employees) {
        this.saveEmployeesLocal(employees);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                // Salvar cada colaborador no Firestore
                const batch = this.db.batch();
                employees.forEach(employee => {
                    const empRef = this.db.collection('employees').doc(employee.id.toString());
                    batch.set(empRef, {
                        name: employee.name,
                        role: employee.role
                    });
                });
                await batch.commit();
                console.log('Colaboradores salvos no Firestore');
            } catch (error) {
                console.error('Erro ao salvar colaboradores no Firestore:', error);
            }
        }
    }

    async saveShifts(shifts) {
        this.saveShiftsLocal(shifts);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                shifts.forEach(shift => {
                    const shiftRef = this.db.collection('shifts').doc(shift.id.toString());
                    batch.set(shiftRef, {
                        name: shift.name,
                        time: shift.time,
                        color: shift.color
                    });
                });
                await batch.commit();
                console.log('Turnos salvos no Firestore');
            } catch (error) {
                console.error('Erro ao salvar turnos no Firestore:', error);
            }
        }
    }

    async saveSectors(sectors) {
        this.saveSectorsLocal(sectors);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                sectors.forEach(sector => {
                    const sectorRef = this.db.collection('sectors').doc(sector.id.toString());
                    batch.set(sectorRef, {
                        name: sector.name,
                        color: sector.color
                    });
                });
                await batch.commit();
                console.log('Setores salvos no Firestore');
            } catch (error) {
                console.error('Erro ao salvar setores no Firestore:', error);
            }
        }
    }

    async saveSchedule(schedule) {
        this.saveScheduleLocal(schedule);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                Object.keys(schedule).forEach(weekKey => {
                    const scheduleRef = this.db.collection('schedule').doc(weekKey);
                    batch.set(scheduleRef, schedule[weekKey]);
                });
                await batch.commit();
                console.log('Escala salva no Firestore');
            } catch (error) {
                console.error('Erro ao salvar escala no Firestore:', error);
            }
        }
    }

    async saveSectorSchedule(schedule) {
        this.saveSectorScheduleLocal(schedule);
        
        if (this.isOnline && this.isFirebaseInitialized) {
            try {
                const batch = this.db.batch();
                Object.keys(schedule).forEach(weekKey => {
                    const scheduleRef = this.db.collection('sectorSchedule').doc(weekKey);
                    batch.set(scheduleRef, schedule[weekKey]);
                });
                await batch.commit();
                console.log('Escala de setores salva no Firestore');
            } catch (error) {
                console.error('Erro ao salvar escala de setores no Firestore:', error);
            }
        }
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

    // ========== CRUD OPERAÇÕES ==========
    async addEmployee(employee) {
        const employees = this.getEmployees();
        const newId = (employees.length > 0 ? Math.max(...employees.map(e => parseInt(e.id))) + 1 : 1).toString();
        employee.id = newId;
        employees.push(employee);
        await this.saveEmployees(employees);
        return employee;
    }

    async removeEmployee(id) {
        let employees = this.getEmployees();
        employees = employees.filter(emp => emp.id !== id);
        await this.saveEmployees(employees);
        
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
        
        await this.saveSchedule(schedule);
        await this.saveSectorSchedule(sectorSchedule);
        
        return true;
    }

    async addShift(shift) {
        const shifts = this.getShifts();
        const newId = (shifts.length > 0 ? Math.max(...shifts.map(s => parseInt(s.id))) + 1 : 1).toString();
        shift.id = newId;
        shifts.push(shift);
        await this.saveShifts(shifts);
        return shift;
    }

    async removeShift(id) {
        let shifts = this.getShifts();
        shifts = shifts.filter(shift => shift.id !== id);
        await this.saveShifts(shifts);
        
        // Atualizar escalas
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
        await this.saveSchedule(schedule);
        
        return true;
    }

    async addSector(sector) {
        const sectors = this.getSectors();
        const newId = (sectors.length > 0 ? Math.max(...sectors.map(s => parseInt(s.id))) + 1 : 1).toString();
        sector.id = newId;
        sector.color = this.generateColor(parseInt(newId));
        sectors.push(sector);
        await this.saveSectors(sectors);
        return sector;
    }

    async removeSector(id) {
        let sectors = this.getSectors();
        sectors = sectors.filter(sector => sector.id !== id);
        await this.saveSectors(sectors);
        
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
        await this.saveSectorSchedule(sectorSchedule);
        
        return true;
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
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Festa-feira', 'Sábado'];
        return days[date.getDay()];
    }

    // ========== EXPORT/IMPORT ==========
    exportData() {
        const data = {
            employees: this.getEmployees(),
            shifts: this.getShifts(),
            sectors: this.getSectors(),
            schedule: this.getSchedule(),
            sectorSchedule: this.getSectorSchedule(),
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `escala-backup-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
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
            
            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }
}

// Criar instância global
const db = new Database();