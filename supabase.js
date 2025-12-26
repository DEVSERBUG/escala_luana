// // Configuração SIMPLIFICADA do Supabase
// class SupabaseDB {
//     constructor() {
//         this.supabase = null;
//         this.isOnline = false;
//         this.init();
//     }

//     async init() {
//         try {
//             // URL e Key DO SEU PROJETO (você já colocou)
//             const supabaseUrl = 'https://gwotyeszkhddyfzhqbop.supabase.co'; // SUA_URL_AQUI
//             const supabaseKey = 'sb_publishable_Qs_9TZ9Xs9NDMpU4XzrD-w_B1IHguqk'; // SUA_KEY_AQUI
            
//             // Importar cliente Supabase
//             const { createClient } = window.supabase ? 
//                 { createClient: window.supabase.createClient } : 
//                 await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
            
//             this.supabase = createClient(supabaseUrl, supabaseKey);
            
//             // Testar conexão de forma SIMPLES
//             const { error } = await this.supabase
//                 .from('escala_data')
//                 .select('count', { count: 'exact', head: true })
//                 .limit(1);
            
//             this.isOnline = !error;
//             console.log('✅ Supabase:', this.isOnline ? 'CONECTADO' : 'OFFLINE');
            
//             // Se offline, tentar reconectar a cada 10s
//             if (!this.isOnline) {
//                 setTimeout(() => this.init(), 10000);
//             }
            
//         } catch (error) {
//             console.warn('⚠️ Supabase offline:', error.message);
//             this.isOnline = false;
//         }
//     }

//     // Salvar todos os dados
//     async saveAllData() {
//         if (!this.isOnline) {
//             console.log('📴 Offline - Salvando apenas localmente');
//             return false;
//         }

//         try {
//             const allData = {
//                 employees: JSON.parse(localStorage.getItem('escala_employees') || '[]'),
//                 shifts: JSON.parse(localStorage.getItem('escala_shifts') || '[]'),
//                 sectors: JSON.parse(localStorage.getItem('escala_sectors') || '[]'),
//                 schedule: JSON.parse(localStorage.getItem('escala_schedule') || '{}'),
//                 sectorSchedule: JSON.parse(localStorage.getItem('escala_sector_schedule') || '{}'),
//                 lastSync: new Date().toISOString()
//             };

//             const { error } = await this.supabase
//                 .from('escala_data')
//                 .upsert({
//                     company_id: 'default',
//                     data: allData,
//                     updated_at: new Date().toISOString()
//                 }, {
//                     onConflict: 'company_id'
//                 });

//             if (error) throw error;

//             localStorage.setItem('escala_last_sync', new Date().toISOString());
//             console.log('💾 Dados salvos no Supabase');
//             return true;
            
//         } catch (error) {
//             console.error('❌ Erro ao salvar no Supabase:', error);
//             this.isOnline = false;
//             return false;
//         }
//     }

//     // Carregar dados
//     async loadData() {
//         if (!this.isOnline) {
//             console.log('📴 Offline - Carregando dados locais');
//             return false;
//         }

//         try {
//             const { data, error } = await this.supabase
//                 .from('escala_data')
//                 .select('*')
//                 .eq('company_id', 'default')
//                 .single();

//             if (error) throw error;

//             if (data && data.data) {
//                 // Salvar no localStorage
//                 localStorage.setItem('escala_employees', JSON.stringify(data.data.employees || []));
//                 localStorage.setItem('escala_shifts', JSON.stringify(data.data.shifts || []));
//                 localStorage.setItem('escala_sectors', JSON.stringify(data.data.sectors || []));
//                 localStorage.setItem('escala_schedule', JSON.stringify(data.data.schedule || {}));
//                 localStorage.setItem('escala_sector_schedule', JSON.stringify(data.data.sectorSchedule || {}));
//                 localStorage.setItem('escala_last_sync', data.updated_at);
                
//                 console.log('📥 Dados carregados do Supabase');
//                 return true;
//             }
            
//         } catch (error) {
//             console.error('❌ Erro ao carregar:', error);
//         }
//         return false;
//     }

//     // Sincronização automática
//     startAutoSync() {
//         // Sincronizar a cada 30 segundos
//         setInterval(async () => {
//             if (this.isOnline) {
//                 await this.saveAllData();
//             }
//         }, 30000);
        
//         // Sincronizar ao salvar dados localmente
//         const originalSave = localStorage.setItem;
//         localStorage.setItem = function(key, value) {
//             originalSave.apply(this, arguments);
//             if (key.startsWith('escala_')) {
//                 setTimeout(() => {
//                     if (window.supabaseDB && window.supabaseDB.isOnline) {
//                         window.supabaseDB.saveAllData();
//                     }
//                 }, 1000);
//             }
//         };
//     }
// }

// // Instância global
// let supabaseDB = null;

// // Inicializar quando a página carregar
// window.addEventListener('DOMContentLoaded', () => {
//     supabaseDB = new SupabaseDB();
//     window.supabaseDB = supabaseDB;
    
//     // Tentar carregar dados do Supabase após 2 segundos
//     setTimeout(async () => {
//         if (supabaseDB.isOnline) {
//             await supabaseDB.loadData();
//             supabaseDB.startAutoSync();
            
//             // Recarregar a página para mostrar dados atualizados
//             if (window.location.pathname.includes('dashboard')) {
//                 setTimeout(() => location.reload(), 500);
//             }
//         }
//     }, 2000);
// });

// // Exportar para outros arquivos
// window.initSupabase = () => supabaseDB;















// Configuração CORRIGIDA do Supabase - SEM LOOP INFINITO
class SupabaseDB {
    constructor() {
        this.supabase = null;
        this.isOnline = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Inicializando Supabase...');
            
            // SUAS CREDENCIAIS
            const supabaseUrl = 'https://gwotyeszkhddyfzhqbop.supabase.co';
            const supabaseKey = 'sb_publishable_Qs_9TZ9Xs9NDMpU4XzrD-w_B1IHguqk';
            
            // Carregar cliente Supabase
            let createClient;
            try {
                const { createClient: supabaseCreateClient } = await import(
                    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/+esm'
                );
                createClient = supabaseCreateClient;
            } catch (error) {
                console.warn('⚠️ Não foi possível carregar Supabase via ES module');
                return;
            }
            
            this.supabase = createClient(supabaseUrl, supabaseKey);
            
            // Testar conexão de forma SIMPLES e SEGURA
            const { error } = await this.supabase
                .from('escala_data')
                .select('count', { count: 'exact', head: true })
                .limit(1);
            
            if (error) {
                console.warn('⚠️ Erro na conexão Supabase:', error.message);
                this.isOnline = false;
            } else {
                this.isOnline = true;
                this.reconnectAttempts = 0; // Resetar tentativas
                console.log('✅ Supabase CONECTADO com sucesso!');
            }
            
        } catch (error) {
            console.warn('⚠️ Erro ao inicializar Supabase:', error.message);
            this.isOnline = false;
            this.handleReconnection();
        }
    }

    handleReconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts} em 5s...`);
            
            // Reconectar apenas UMA VEZ, não em loop
            setTimeout(() => {
                if (!this.isOnline) {
                    this.testConnectionOnly();
                }
            }, 5000);
        } else {
            console.log('📴 Supabase offline - usando apenas localStorage');
        }
    }

    // Função SEGURA apenas para testar conexão
    async testConnectionOnly() {
        try {
            const { error } = await this.supabase
                .from('escala_data')
                .select('company_id')
                .limit(1);
            
            this.isOnline = !error;
            if (this.isOnline) {
                console.log('✅ Reconexão bem-sucedida!');
            }
        } catch (error) {
            this.isOnline = false;
        }
    }

    // Salvar todos os dados
    async saveAllData() {
        if (!this.isOnline) {
            console.log('📴 Offline - Salvando apenas localmente');
            return false;
        }

        try {
            // Obter todos os dados do localStorage
            const allData = {
                employees: this.getLocalStorageItem('escala_employees', []),
                shifts: this.getLocalStorageItem('escala_shifts', []),
                sectors: this.getLocalStorageItem('escala_sectors', []),
                schedule: this.getLocalStorageItem('escala_schedule', {}),
                sectorSchedule: this.getLocalStorageItem('escala_sector_schedule', {}),
                lastSync: new Date().toISOString(),
                version: '2.0'
            };

            console.log('💾 Tentando salvar no Supabase...', allData);

            const { error } = await this.supabase
                .from('escala_data')
                .upsert({
                    company_id: 'default',
                    data: allData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'company_id'
                });

            if (error) {
                console.error('❌ Erro ao salvar no Supabase:', error);
                this.isOnline = false;
                return false;
            }

            localStorage.setItem('escala_last_sync', new Date().toISOString());
            console.log('✅ Dados salvos no Supabase com sucesso!');
            return true;
            
        } catch (error) {
            console.error('❌ Erro fatal ao salvar:', error);
            this.isOnline = false;
            return false;
        }
    }

    // Carregar dados do Supabase
    async loadData() {
        if (!this.isOnline) {
            console.log('📴 Offline - Não é possível carregar dados');
            return false;
        }

        try {
            console.log('📥 Tentando carregar dados do Supabase...');
            
            const { data, error } = await this.supabase
                .from('escala_data')
                .select('*')
                .eq('company_id', 'default')
                .maybeSingle(); // Usar maybeSingle para evitar erro se não houver dados

            if (error) {
                console.error('❌ Erro ao carregar dados:', error);
                return false;
            }

            if (data && data.data) {
                console.log('📦 Dados encontrados no Supabase, atualizando localStorage...');
                
                // Atualizar localStorage apenas se os dados forem válidos
                if (data.data.employees) {
                    localStorage.setItem('escala_employees', JSON.stringify(data.data.employees));
                }
                if (data.data.shifts) {
                    localStorage.setItem('escala_shifts', JSON.stringify(data.data.shifts));
                }
                if (data.data.sectors) {
                    localStorage.setItem('escala_sectors', JSON.stringify(data.data.sectors));
                }
                if (data.data.schedule) {
                    localStorage.setItem('escala_schedule', JSON.stringify(data.data.schedule));
                }
                if (data.data.sectorSchedule) {
                    localStorage.setItem('escala_sector_schedule', JSON.stringify(data.data.sectorSchedule));
                }
                
                localStorage.setItem('escala_last_sync', data.updated_at || new Date().toISOString());
                
                console.log('✅ Dados carregados do Supabase com sucesso!');
                return true;
            } else {
                console.log('ℹ️ Nenhum dado encontrado no Supabase, usando dados locais');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Erro fatal ao carregar:', error);
            return false;
        }
    }

    // Helper para obter dados do localStorage de forma segura
    getLocalStorageItem(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`⚠️ Erro ao ler ${key} do localStorage:`, error);
            return defaultValue;
        }
    }

    // Sincronização automática SEGURA (sem loops infinitos)
    startAutoSync() {
        console.log('🔧 Iniciando sincronização automática...');
        
        // Sincronizar apenas quando houver mudanças
        const syncData = async () => {
            if (this.isOnline) {
                try {
                    await this.saveAllData();
                } catch (error) {
                    console.warn('⚠️ Erro na sincronização automática:', error);
                }
            }
        };

        // Ouvir eventos de armazenamento local (mudanças nos dados)
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith('escala_')) {
                setTimeout(syncData, 1000);
            }
        });

        // Sincronizar a cada 2 minutos (120000ms) - NÃO A CADA 30s
        setInterval(syncData, 120000);
        
        console.log('✅ Sincronização automática configurada (a cada 2 minutos)');
    }
}

// Instância global
let supabaseDB = null;

// Inicializar quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, inicializando Supabase...');
    
    supabaseDB = new SupabaseDB();
    window.supabaseDB = supabaseDB;
    
    // Aguardar inicialização do Supabase
    setTimeout(async () => {
        console.log('⏳ Aguardando conexão Supabase...');
        
        // Aguardar até 5 segundos pela conexão
        const waitForConnection = async (maxWait = 5000) => {
            const start = Date.now();
            while (!supabaseDB.isOnline && Date.now() - start < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return supabaseDB.isOnline;
        };
        
        const connected = await waitForConnection();
        
        if (connected) {
            console.log('🔗 Conexão estabelecida, carregando dados...');
            
            // Carregar dados do Supabase
            const dataLoaded = await supabaseDB.loadData();
            
            if (dataLoaded) {
                console.log('🔄 Dados carregados, verificando se precisa atualizar página...');
                
                // Verificar se estamos no dashboard e se os dados são diferentes
                if (window.location.pathname.includes('dashboard.html')) {
                    // Apenas recarregar se realmente necessário
                    const shouldReload = confirm('Dados atualizados do servidor. Deseja recarregar a página?');
                    if (shouldReload) {
                        console.log('🔄 Recarregando página...');
                        setTimeout(() => location.reload(), 100);
                    }
                }
            }
            
            // Iniciar sincronização automática
            supabaseDB.startAutoSync();
            
        } else {
            console.log('📴 Modo offline - usando apenas localStorage');
        }
    }, 1000); // Aguardar 1 segundo antes de tentar carregar dados
});

// Exportar para outros arquivos
window.initSupabase = () => supabaseDB;