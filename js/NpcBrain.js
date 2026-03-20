export class NpcBrain {
    constructor() {
        this.npcCommands = { forward: false, backward: false, left: false, right: false, jump: false };
        this.statusEl = document.getElementById('npc-status');
        this._runNPCBrain();
    }

    async _runNPCBrain() {
            try {

                const response = await fetch("https://citations-positions-properties-weather.trycloudflare.com/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "openai/gpt-4o-mini",
                        messages: [
                            { 
                                role: "system", 
                                content: "Você é o cérebro de um NPC. Responda APENAS com um JSON contendo uma lista de 10 movimentos aleatórios e variados para explorar o escritório. " +
                                        "Cada movimento deve ter uma duração entre 500 e 2000ms. " +
                                        "Formato: {\"actions\": [{\"forward\":bool, \"backward\":bool, \"left\":bool, \"right\":bool, \"jump\":bool, \"duration\":ms}, ...]}" 
                            },
                            { role: "user", content: "Gere o plano de 10 movimentos agora." }
                        ]
                    })
                });

                const data = await response.json();
                const content = data.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    const actions = result.actions; // Lista de 10 comandos

                    addMessage(`NPC recebeu plano de ${actions.length} movimentos.`, 'pc-msg');

                    // --- LOOP DE EXECUÇÃO DO LOTE ---
                    for (let i = 0; i < actions.length; i++) {
                        const action = actions[i];
                        
                        // Aplica o comando atual da lista
                        npcCommands = { ...action };
                        statusEl.innerText = `NPC: Ação ${i+1}/10`;

                        // Converte duração se a IA mandou em segundos
                        let duration = action.duration > 20 ? action.duration : action.duration * 1000;

                        // Espera a execução da ação atual
                        await new Promise(r => setTimeout(r, duration));

                        // Reset curto entre ações para o movimento não ficar "colado" e parecer mais natural
                        npcCommands = { forward: false, backward: false, left: false, right: false, jump: false };
                        await new Promise(r => setTimeout(r, 200)); 
                    }
                }
            } catch (e) {
                console.error("Erro NPC Batch:", e);
                statusEl.innerText = "NPC: Erro de Rede";
            } finally {
                // Garantia de parada total ao fim do lote
                npcCommands = { forward: false, backward: false, left: false, right: false, jump: false };
                statusEl.innerText = "NPC: Ocioso";
                
                // Espera 5 segundos antes de pedir o próximo lote de 10
                setTimeout(runNPCBrain, 5000);
            }
        }
    
}