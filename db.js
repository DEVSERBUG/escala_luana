// // Banco de dados local com integração Supabase
// class Database {
//     constructor() {
//         this.supabase = null;
//         this.initializeDB();
//     }

//     async initializeDB() {
//         console.log('Inicializando banco de dados...');
        
//         // Verificar se existe usuário logado
//         const userData = sessionStorage.getItem('user');
//         this.user = userData ? JSON.parse(userData) : null;
        
//         // Inicializar Supabase (opcional)
//         this.supabase = window.supabaseDB;
        
//         // Tentar carregar dados do Supabase
//         if (this.supabase && this.supabase.isOnline) {
//             try {
//                 await this.supabase.loadData();
//                 console.log('Dados carregados do Supabase');
//             } catch (error) {
//                 console.log('Usando dados locais');
//             }
//         }
        
//         // Inicializar dados padrão se não existirem
//         if (!localStorage.getItem('escala_employees') || this.getEmployees().length === 0) {
//             const defaultEmployees = [
//                 { id: 1, name: "BEATRIZ XIMENES", role: "ASSISTENTE DE LOJA" },
//                 { id: 2, name: "FABRICIO", role: "ASSISTENTE DE LOJA" },
//                 { id: 3, name: "MARINA", role: "Caixa" },
//                 { id: 4, name: "GABRIEL", role: "Estoquista" },
//                 { id: 5, name: "KEVEN", role: "Gerente" }
//             ];
//             this.saveEmployees(defaultEmployees);
//             console.log('Colaboradores padrão criados');
//         }

//         if (!localStorage.getItem('escala_shifts') || this.getShifts().length === 0) {
//             const defaultShifts = [
//                 { id: 1, name: "Abertura", time: "06:00 - 14:00", color: "#3498db" },
//                 { id: 2, name: "Intermediário", time: "14:00 - 22:00", color: "#f39c12" },
//                 { id: 3, name: "Fechamento", time: "22:00 - 06:00", color: "#e74c3c" },
//                 { id: 4, name: "Folga", time: "Dia Livre", color: "#95a5a6" }
//             ];
//             this.saveShifts(defaultShifts);
//             console.log('Turnos padrão criados');
//         }

//         if (!localStorage.getItem('escala_sectors') || this.getSectors().length === 0) {
//             const defaultSectors = [
//                 { id: 1, name: "Masculino", color: this.generateColor(1) },
//                 { id: 2, name: "Feminino", color: this.generateColor(2) },
//                 { id: 3, name: "Infantil", color: this.generateColor(3) },
//                 { id: 4, name: "Calçados", color: this.generateColor(4) },
//                 { id: 5, name: "Caixa", color: this.generateColor(5) },
//                 { id: 6, name: "Estoque", color: this.generateColor(6) }
//             ];
//             this.saveSectors(defaultSectors);
//             console.log('Setores padrão criados');
//         }

//         if (!localStorage.getItem('escala_schedule')) {
//             this.saveSchedule({});
//             console.log('Escala inicializada');
//         }

//         if (!localStorage.getItem('escala_sector_schedule')) {
//             this.saveSectorSchedule({});
//             console.log('Escala de setores inicializada');
//         }

//         // Sincronizar com Supabase se disponível
//         this.syncWithSupabase();
        
//         console.log('✅ Banco de dados inicializado com sucesso!');
//     }

//     async syncWithSupabase() {
//         if (this.supabase && this.supabase.isOnline) {
//             setTimeout(async () => {
//                 await this.supabase.saveAllData();
//             }, 2000);
//         }
//     }

//     // ========== FUNCIONÁRIOS ==========
//     getEmployees() {
//         try {
//             const data = localStorage.getItem('escala_employees');
//             return data ? JSON.parse(data) : [];
//         } catch (error) {
//             console.error('Erro ao carregar colaboradores:', error);
//             return [];
//         }
//     }

//     async saveEmployees(employees) {
//         localStorage.setItem('escala_employees', JSON.stringify(employees));
        
//         // Sincronizar com Supabase
//         if (this.supabase && this.supabase.isOnline) {
//             await this.supabase.saveAllData();
//         }
        
//         console.log('Colaboradores salvos:', employees.length);
//     }

//     async addEmployee(employee) {
//         const employees = this.getEmployees();
//         const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
//         employee.id = newId;
//         employees.push(employee);
        
//         await this.saveEmployees(employees);
//         console.log('Colaborador adicionado:', employee);
//         return employee;
//     }

//     async removeEmployee(id) {
//         let employees = this.getEmployees();
//         const employee = employees.find(e => e.id === id);
//         employees = employees.filter(emp => emp.id !== id);
        
//         await this.saveEmployees(employees);
        
//         // Remover das escalas
//         const schedule = this.getSchedule();
//         const sectorSchedule = this.getSectorSchedule();
        
//         for (const weekKey in schedule) {
//             if (schedule[weekKey][id]) {
//                 delete schedule[weekKey][id];
//             }
//         }
        
//         for (const weekKey in sectorSchedule) {
//             if (sectorSchedule[weekKey][id]) {
//                 delete sectorSchedule[weekKey][id];
//             }
//         }
        
//         this.saveSchedule(schedule);
//         this.saveSectorSchedule(sectorSchedule);
        
//         console.log('Colaborador removido:', employee);
//         return true;
//     }

//     // ========== TURNOS ==========
//     getShifts() {
//         try {
//             const data = localStorage.getItem('escala_shifts');
//             return data ? JSON.parse(data) : [];
//         } catch (error) {
//             console.error('Erro ao carregar turnos:', error);
//             return [];
//         }
//     }

//     async saveShifts(shifts) {
//         localStorage.setItem('escala_shifts', JSON.stringify(shifts));
        
//         if (this.supabase && this.supabase.isOnline) {
//             await this.supabase.saveAllData();
//         }
        
//         console.log('Turnos salvos:', shifts.length);
//     }

//     async addShift(shift) {
//         const shifts = this.getShifts();
//         const newId = shifts.length > 0 ? Math.max(...shifts.map(s => s.id)) + 1 : 1;
//         shift.id = newId;
//         shifts.push(shift);
        
//         await this.saveShifts(shifts);
//         console.log('Turno adicionado:', shift);
//         return shift;
//     }

//     async removeShift(id) {
//         let shifts = this.getShifts();
//         const shift = shifts.find(s => s.id === id);
//         shifts = shifts.filter(s => s.id !== id);
        
//         await this.saveShifts(shifts);
        
//         // Atualizar escalas que usavam este turno
//         const schedule = this.getSchedule();
//         for (const weekKey in schedule) {
//             for (const empId in schedule[weekKey]) {
//                 for (const dayIndex in schedule[weekKey][empId]) {
//                     if (schedule[weekKey][empId][dayIndex] === id) {
//                         delete schedule[weekKey][empId][dayIndex];
//                     }
//                 }
//             }
//         }
//         this.saveSchedule(schedule);
        
//         console.log('Turno removido:', shift);
//         return true;
//     }

//     // ========== SETORES ==========
//     getSectors() {
//         try {
//             const data = localStorage.getItem('escala_sectors');
//             const sectors = data ? JSON.parse(data) : [];
//             // Garantir que todos os setores tenham cor
//             return sectors.map(sector => ({
//                 ...sector,
//                 color: sector.color || this.generateColor(sector.id)
//             }));
//         } catch (error) {
//             console.error('Erro ao carregar setores:', error);
//             return [];
//         }
//     }

//     async saveSectors(sectors) {
//         localStorage.setItem('escala_sectors', JSON.stringify(sectors));
        
//         if (this.supabase && this.supabase.isOnline) {
//             await this.supabase.saveAllData();
//         }
        
//         console.log('Setores salvos:', sectors.length);
//     }

//     async addSector(sector) {
//         const sectors = this.getSectors();
//         const newId = sectors.length > 0 ? Math.max(...sectors.map(s => s.id)) + 1 : 1;
//         sector.id = newId;
//         sector.color = this.generateColor(newId);
//         sectors.push(sector);
        
//         await this.saveSectors(sectors);
//         console.log('Setor adicionado:', sector);
//         return sector;
//     }

//     async removeSector(id) {
//         let sectors = this.getSectors();
//         const sector = sectors.find(s => s.id === id);
//         sectors = sectors.filter(s => s.id !== id);
        
//         await this.saveSectors(sectors);
        
//         // Atualizar escalas de setores
//         const sectorSchedule = this.getSectorSchedule();
//         for (const weekKey in sectorSchedule) {
//             for (const empId in sectorSchedule[weekKey]) {
//                 for (const dayIndex in sectorSchedule[weekKey][empId]) {
//                     if (sectorSchedule[weekKey][empId][dayIndex] === id) {
//                         delete sectorSchedule[weekKey][empId][dayIndex];
//                     }
//                 }
//             }
//         }
//         this.saveSectorSchedule(sectorSchedule);
        
//         console.log('Setor removido:', sector);
//         return true;
//     }

//     // ========== ESCALAS ==========
//     getSchedule() {
//         try {
//             const data = localStorage.getItem('escala_schedule');
//             return data ? JSON.parse(data) : {};
//         } catch (error) {
//             console.error('Erro ao carregar escala:', error);
//             return {};
//         }
//     }

//     async saveSchedule(schedule) {
//         localStorage.setItem('escala_schedule', JSON.stringify(schedule));
        
//         if (this.supabase && this.supabase.isOnline) {
//             await this.supabase.saveAllData();
//         }
//     }

//     getSectorSchedule() {
//         try {
//             const data = localStorage.getItem('escala_sector_schedule');
//             return data ? JSON.parse(data) : {};
//         } catch (error) {
//             console.error('Erro ao carregar escala de setores:', error);
//             return {};
//         }
//     }

//     async saveSectorSchedule(schedule) {
//         localStorage.setItem('escala_sector_schedule', JSON.stringify(schedule));
        
//         if (this.supabase && this.supabase.isOnline) {
//             await this.supabase.saveAllData();
//         }
//     }

//     // ========== UTILIDADES ==========
//     generateColor(id) {
//         const colors = [
//             '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
//             '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
//             '#27ae60', '#2980b9', '#f1c40f', '#e67e22', '#34495e',
//             '#7f8c8d', '#2c3e50', '#95a5a6', '#bdc3c7'
//         ];
//         return colors[id % colors.length];
//     }

//     getSectorColor(sectorId) {
//         const sector = this.getSectors().find(s => s.id === sectorId);
//         return sector ? sector.color : '#95a5a6';
//     }

//     getWeekStartDate(date) {
//         const d = new Date(date);
//         const day = d.getDay();
//         const diff = d.getDate() - day + (day === 0 ? -6 : 1);
//         const weekStart = new Date(d.setDate(diff));
//         weekStart.setHours(0, 0, 0, 0);
//         return weekStart;
//     }

//     getWeekKey(date) {
//         const year = date.getFullYear();
//         const weekNumber = this.getWeekNumber(date);
//         return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
//     }

//     getWeekNumber(date) {
//         const d = new Date(date);
//         d.setHours(0, 0, 0, 0);
//         d.setDate(d.getDate() + 4 - (d.getDay() || 7));
//         const yearStart = new Date(d.getFullYear(), 0, 1);
//         const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
//         return weekNo;
//     }

//     getWeekDates(startDate) {
//         const dates = [];
//         const current = new Date(startDate);
        
//         for (let i = 0; i < 7; i++) {
//             const date = new Date(current);
//             date.setDate(current.getDate() + i);
//             dates.push(date);
//         }
        
//         return dates;
//     }

//     formatDate(date) {
//         return date.toLocaleDateString('pt-BR', { 
//             day: '2-digit', 
//             month: '2-digit', 
//             year: 'numeric' 
//         });
//     }

//     formatDayName(date) {
//         const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
//         return days[date.getDay()];
//     }

//     // ========== EXPORT/IMPORT ==========
//     exportData() {
//         const data = {
//             employees: this.getEmployees(),
//             shifts: this.getShifts(),
//             sectors: this.getSectors(),
//             schedule: this.getSchedule(),
//             sectorSchedule: this.getSectorSchedule(),
//             exportDate: new Date().toISOString(),
//             version: '2.0'
//         };
        
//         const dataStr = JSON.stringify(data, null, 2);
//         const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
//         const link = document.createElement('a');
//         link.setAttribute('href', dataUri);
//         link.setAttribute('download', `escala-backup-${new Date().toISOString().split('T')[0]}.json`);
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
        
//         console.log('Dados exportados');
//         return data;
//     }

//     importData(jsonData) {
//         try {
//             const data = JSON.parse(jsonData);
            
//             if (data.employees) localStorage.setItem('escala_employees', JSON.stringify(data.employees));
//             if (data.shifts) localStorage.setItem('escala_shifts', JSON.stringify(data.shifts));
//             if (data.sectors) localStorage.setItem('escala_sectors', JSON.stringify(data.sectors));
//             if (data.schedule) localStorage.setItem('escala_schedule', JSON.stringify(data.schedule));
//             if (data.sectorSchedule) localStorage.setItem('escala_sector_schedule', JSON.stringify(data.sectorSchedule));
            
//             // Sincronizar com Supabase
//             this.syncWithSupabase();
            
//             console.log('✅ Dados importados com sucesso');
//             return true;
//         } catch (error) {
//             console.error('❌ Erro ao importar dados:', error);
//             return false;
//         }
//     }

//     // ========== OBTER TODOS OS DADOS ==========
//     getAllData() {
//         return {
//             employees: this.getEmployees(),
//             shifts: this.getShifts(),
//             sectors: this.getSectors(),
//             schedule: this.getSchedule(),
//             sectorSchedule: this.getSectorSchedule(),
//             lastSync: new Date().toISOString()
//         };
//     }
// }

// // Criar instância global do banco de dados
// const db = new Database();











// Banco de dados local com integração Supabase
class Database {
    constructor() {
        this.supabase = null;
        this.initializeDB();
    }

    async initializeDB() {
        console.log('Inicializando banco de dados...');
        
        // Verificar se existe usuário logado
        const userData = sessionStorage.getItem('user');
        this.user = userData ? JSON.parse(userData) : null;
        
        // Inicializar Supabase (opcional)
        this.supabase = window.supabaseDB;
        
        // Tentar carregar dados do Supabase
        if (this.supabase && this.supabase.isOnline) {
            try {
                await this.supabase.loadData();
                console.log('Dados carregados do Supabase');
            } catch (error) {
                console.log('Usando dados locais');
            }
        }
        
        // Inicializar dados padrão se não existirem
        if (!localStorage.getItem('escala_employees') || this.getEmployees().length === 0) {
            const defaultEmployees = [
                { id: 1, name: "BEATRIZ XIMENES", role: "ASSISTENTE DE LOJA" },
                { id: 2, name: "FABRICIO", role: "ASSISTENTE DE LOJA" },
                { id: 3, name: "MARINA", role: "Caixa" },
                { id: 4, name: "GABRIEL", role: "Estoquista" },
                { id: 5, name: "KEVEN", role: "Gerente" }
            ];
            this.saveEmployees(defaultEmployees);
            console.log('Colaboradores padrão criados');
        }

        if (!localStorage.getItem('escala_shifts') || this.getShifts().length === 0) {
            const defaultShifts = [
                { id: 1, name: "Abertura", time: "06:00 - 14:00", color: "#3498db" },
                { id: 2, name: "Intermediário", time: "14:00 - 22:00", color: "#f39c12" },
                { id: 3, name: "Fechamento", time: "22:00 - 06:00", color: "#e74c3c" },
                { id: 4, name: "Folga", time: "Dia Livre", color: "#95a5a6" }
            ];
            this.saveShifts(defaultShifts);
            console.log('Turnos padrão criados');
        }

        if (!localStorage.getItem('escala_sectors') || this.getSectors().length === 0) {
            const defaultSectors = [
                { id: 1, name: "Masculino", color: this.generateColor(1) },
                { id: 2, name: "Feminino", color: this.generateColor(2) },
                { id: 3, name: "Infantil", color: this.generateColor(3) },
                { id: 4, name: "Calçados", color: this.generateColor(4) },
                { id: 5, name: "Caixa", color: this.generateColor(5) },
                { id: 6, name: "Estoque", color: this.generateColor(6) }
            ];
            this.saveSectors(defaultSectors);
            console.log('Setores padrão criados');
        }

        if (!localStorage.getItem('escala_schedule')) {
            this.saveSchedule({});
            console.log('Escala inicializada');
        }

        if (!localStorage.getItem('escala_sector_schedule')) {
            this.saveSectorSchedule({});
            console.log('Escala de setores inicializada');
        }

        // Sincronizar com Supabase se disponível
        this.syncWithSupabase();
        
        console.log('✅ Banco de dados inicializado com sucesso!');
    }

    async syncWithSupabase() {
        if (this.supabase && this.supabase.isOnline) {
            // Aguardar um pouco antes da primeira sincronização
            setTimeout(async () => {
                try {
                    await this.supabase.saveAllData();
                    console.log('✅ Dados sincronizados com Supabase');
                } catch (error) {
                    console.warn('⚠️ Não foi possível sincronizar com Supabase:', error);
                }
            }, 3000); // 3 segundos
        }
    }

    // ========== FUNCIONÁRIOS ==========
    getEmployees() {
        try {
            const data = localStorage.getItem('escala_employees');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Erro ao carregar colaboradores:', error);
            return [];
        }
    }

    async saveEmployees(employees) {
        localStorage.setItem('escala_employees', JSON.stringify(employees));
        
        // Sincronizar com Supabase
        if (this.supabase && this.supabase.isOnline) {
            await this.supabase.saveAllData();
        }
        
        console.log('Colaboradores salvos:', employees.length);
    }

    async addEmployee(employee) {
        const employees = this.getEmployees();
        const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
        employee.id = newId;
        employees.push(employee);
        
        await this.saveEmployees(employees);
        console.log('Colaborador adicionado:', employee);
        return employee;
    }

    async removeEmployee(id) {
        let employees = this.getEmployees();
        const employee = employees.find(e => e.id === id);
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
        
        this.saveSchedule(schedule);
        this.saveSectorSchedule(sectorSchedule);
        
        console.log('Colaborador removido:', employee);
        return true;
    }

    // ========== TURNOS ==========
    getShifts() {
        try {
            const data = localStorage.getItem('escala_shifts');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Erro ao carregar turnos:', error);
            return [];
        }
    }

    async saveShifts(shifts) {
        localStorage.setItem('escala_shifts', JSON.stringify(shifts));
        
        if (this.supabase && this.supabase.isOnline) {
            await this.supabase.saveAllData();
        }
        
        console.log('Turnos salvos:', shifts.length);
    }

    async addShift(shift) {
        const shifts = this.getShifts();
        const newId = shifts.length > 0 ? Math.max(...shifts.map(s => s.id)) + 1 : 1;
        shift.id = newId;
        shifts.push(shift);
        
        await this.saveShifts(shifts);
        console.log('Turno adicionado:', shift);
        return shift;
    }

    async removeShift(id) {
        let shifts = this.getShifts();
        const shift = shifts.find(s => s.id === id);
        shifts = shifts.filter(s => s.id !== id);
        
        await this.saveShifts(shifts);
        
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
        
        console.log('Turno removido:', shift);
        return true;
    }

    // ========== SETORES ==========
    getSectors() {
        try {
            const data = localStorage.getItem('escala_sectors');
            const sectors = data ? JSON.parse(data) : [];
            // Garantir que todos os setores tenham cor
            return sectors.map(sector => ({
                ...sector,
                color: sector.color || this.generateColor(sector.id)
            }));
        } catch (error) {
            console.error('Erro ao carregar setores:', error);
            return [];
        }
    }

    async saveSectors(sectors) {
        localStorage.setItem('escala_sectors', JSON.stringify(sectors));
        
        if (this.supabase && this.supabase.isOnline) {
            await this.supabase.saveAllData();
        }
        
        console.log('Setores salvos:', sectors.length);
    }

    async addSector(sector) {
        const sectors = this.getSectors();
        const newId = sectors.length > 0 ? Math.max(...sectors.map(s => s.id)) + 1 : 1;
        sector.id = newId;
        sector.color = this.generateColor(newId);
        sectors.push(sector);
        
        await this.saveSectors(sectors);
        console.log('Setor adicionado:', sector);
        return sector;
    }

    async removeSector(id) {
        let sectors = this.getSectors();
        const sector = sectors.find(s => s.id === id);
        sectors = sectors.filter(s => s.id !== id);
        
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
        this.saveSectorSchedule(sectorSchedule);
        
        console.log('Setor removido:', sector);
        return true;
    }

    // ========== ESCALAS ==========
    getSchedule() {
        try {
            const data = localStorage.getItem('escala_schedule');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Erro ao carregar escala:', error);
            return {};
        }
    }

    async saveSchedule(schedule) {
        localStorage.setItem('escala_schedule', JSON.stringify(schedule));
        
        if (this.supabase && this.supabase.isOnline) {
            await this.supabase.saveAllData();
        }
    }

    getSectorSchedule() {
        try {
            const data = localStorage.getItem('escala_sector_schedule');
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Erro ao carregar escala de setores:', error);
            return {};
        }
    }

    async saveSectorSchedule(schedule) {
        localStorage.setItem('escala_sector_schedule', JSON.stringify(schedule));
        
        if (this.supabase && this.supabase.isOnline) {
            await this.supabase.saveAllData();
        }
    }

    // ========== UTILIDADES ==========
    generateColor(id) {
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad',
            '#27ae60', '#2980b9', '#f1c40f', '#e67e22', '#34495e',
            '#7f8c8d', '#2c3e50', '#95a5a6', '#bdc3c7'
        ];
        return colors[id % colors.length];
    }

    getSectorColor(sectorId) {
        const sector = this.getSectors().find(s => s.id === sectorId);
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
        return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
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

    // ========== EXPORT/IMPORT ==========
    exportData() {
        const data = {
            employees: this.getEmployees(),
            shifts: this.getShifts(),
            sectors: this.getSectors(),
            schedule: this.getSchedule(),
            sectorSchedule: this.getSectorSchedule(),
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `escala-backup-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Dados exportados');
        return data;
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.employees) localStorage.setItem('escala_employees', JSON.stringify(data.employees));
            if (data.shifts) localStorage.setItem('escala_shifts', JSON.stringify(data.shifts));
            if (data.sectors) localStorage.setItem('escala_sectors', JSON.stringify(data.sectors));
            if (data.schedule) localStorage.setItem('escala_schedule', JSON.stringify(data.schedule));
            if (data.sectorSchedule) localStorage.setItem('escala_sector_schedule', JSON.stringify(data.sectorSchedule));
            
            // Sincronizar com Supabase
            this.syncWithSupabase();
            
            console.log('✅ Dados importados com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao importar dados:', error);
            return false;
        }
    }

    // ========== OBTER TODOS OS DADOS ==========
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
}

// Criar instância global do banco de dados
const db = new Database();